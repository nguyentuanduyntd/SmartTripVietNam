import "server-only";

import {
    buildAiItineraryJsonSchema,
} from "@/src/lib/ai/ai-itinerary-json-schema";

import {
    generateGeminiJson,
} from "@/src/lib/ai/gemini";

import {
    AiItineraryGenerationProofError,
    createAiItineraryGenerationProof,
    verifyAiItineraryGenerationProof,
} from "@/src/lib/ai/itinerary-generation-proof";

import {
    createAiItinerary,
    findAiCuisinesByIds,
    findAiDestinationsByIds,
    findAiPlannerLocationById,
} from "@/src/repositories/ai-itinerary.repository";

import {
    aiItineraryPlanSchema,
    type AiItineraryPlan,
    type AiPlannerRequest,
} from "@/src/schemas/ai-itinerary.schema";

import {
    retrieveTravelContextService,
} from "@/src/services/rag.service";

/* -------------------------------------------------------------------------- */
/* Error                                                                      */
/* -------------------------------------------------------------------------- */

export class AiItineraryServiceError extends Error {
    constructor(
        message: string,
        public readonly status:
            | 400
            | 404
            | 422
            | 500,
    ) {
        super(message);

        this.name =
            "AiItineraryServiceError";
    }
}

/* -------------------------------------------------------------------------- */
/* Pace                                                                       */
/* -------------------------------------------------------------------------- */

const PACE_LABELS = {
    relaxed:
        "thư thả, ít điểm đến, có nhiều thời gian nghỉ",

    balanced:
        "cân bằng, vừa tham quan vừa nghỉ ngơi",

    packed:
        "nhiều trải nghiệm, lịch trình khá dày",
} as const;

const PACE_ACTIVITY_TARGET = {
    relaxed: 2,
    balanced: 3,
    packed: 4,
} as const;

/* -------------------------------------------------------------------------- */
/* Timing                                                                     */
/* -------------------------------------------------------------------------- */

function nowMs() {
    return performance.now();
}

function logAiTiming(
    label: string,
    startedAt: number,
    extra?: unknown,
) {
    const elapsed = Math.round(
        nowMs() - startedAt,
    );

    if (extra === undefined) {
        console.info(
            `[AI TIMING] ${label}: ${elapsed}ms`,
        );

        return;
    }

    console.info(
        `[AI TIMING] ${label}: ${elapsed}ms`,
        extra,
    );
}

/* -------------------------------------------------------------------------- */
/* RAG limits                                                                 */
/* -------------------------------------------------------------------------- */

function getRagRetrievalLimits(
    request: AiPlannerRequest,
) {
    const activitiesPerDay =
        PACE_ACTIVITY_TARGET[
            request.pace
        ];

    const desiredDestinations =
        request.dayCount *
            activitiesPerDay +
        2;

    const destinationLimit =
        Math.min(
            Math.max(
                desiredDestinations,
                6,
            ),
            20,
        );

    const cuisineLimit =
        Math.min(
            Math.max(
                request.dayCount + 2,
                3,
            ),
            6,
        );

    return {
        destinationLimit,
        cuisineLimit,

        totalLimit:
            destinationLimit +
            cuisineLimit,
    };
}

/* -------------------------------------------------------------------------- */
/* Canonical validation                                                       */
/* -------------------------------------------------------------------------- */

async function validateCanonicalIds(
    plan: AiItineraryPlan,
    locationId: string,
    allowedDestinationIds?: Set<string>,
    allowedCuisineIds?: Set<string>,
) {
    const destinationIds = [
        ...new Set(
            plan.days.flatMap(
                (day) =>
                    day.activities.map(
                        (activity) =>
                            activity.destinationId,
                    ),
            ),
        ),
    ];

    const cuisineIds = [
        ...new Set(
            plan.days.flatMap(
                (day) =>
                    day.meals.flatMap(
                        (meal) =>
                            meal.cuisines.map(
                                (cuisine) =>
                                    cuisine.cuisineId,
                            ),
                    ),
            ),
        ),
    ];

    if (allowedDestinationIds) {
        for (
            const id of
            destinationIds
        ) {
            if (
                !allowedDestinationIds.has(
                    id,
                )
            ) {
                throw new AiItineraryServiceError(
                    `AI đã sử dụng destination ngoài RAG context: ${id}`,
                    422,
                );
            }
        }
    }

    if (allowedCuisineIds) {
        for (
            const id of
            cuisineIds
        ) {
            if (
                !allowedCuisineIds.has(
                    id,
                )
            ) {
                throw new AiItineraryServiceError(
                    `AI đã sử dụng cuisine ngoài RAG context: ${id}`,
                    422,
                );
            }
        }
    }

    const [
        destinations,
        cuisines,
    ] = await Promise.all([
        findAiDestinationsByIds(
            destinationIds,
        ),

        findAiCuisinesByIds(
            cuisineIds,
        ),
    ]);

    if (
        destinations.length !==
        destinationIds.length
    ) {
        throw new AiItineraryServiceError(
            "AI trả về destination ID không tồn tại.",
            422,
        );
    }

    if (
        destinations.some(
            (destination) =>
                destination.locationId !==
                locationId,
        )
    ) {
        throw new AiItineraryServiceError(
            "Lịch trình chứa điểm đến ngoài khu vực đã chọn.",
            422,
        );
    }

    if (
        cuisines.length !==
        cuisineIds.length
    ) {
        throw new AiItineraryServiceError(
            "AI trả về cuisine ID không tồn tại.",
            422,
        );
    }

    const destinationById =
        new Map(
            destinations.map(
                (destination) => [
                    destination.id,
                    destination,
                ],
            ),
        );

    const cuisineById =
        new Map(
            cuisines.map(
                (cuisine) => [
                    cuisine.id,
                    cuisine,
                ],
            ),
        );

    for (
        const day of
        plan.days
    ) {
        for (
            const activity of
            day.activities
        ) {
            const canonical =
                destinationById.get(
                    activity.destinationId,
                );

            if (canonical) {
                activity.destinationName =
                    canonical.name;
            }
        }

        for (
            const meal of
            day.meals
        ) {
            for (
                const cuisine of
                meal.cuisines
            ) {
                const canonical =
                    cuisineById.get(
                        cuisine.cuisineId,
                    );

                if (canonical) {
                    cuisine.cuisineName =
                        canonical.name;
                }
            }
        }
    }

    return plan;
}

/* -------------------------------------------------------------------------- */
/* RAG short-key context                                                      */
/* -------------------------------------------------------------------------- */

type RetrievedTravelItem =
    Awaited<
        ReturnType<
            typeof retrieveTravelContextService
        >
    >["results"][number];

type CanonicalKeyEntity = {
    id: string;
    name: string;
};

type RagKeyContext = {
    destinationKeyToEntity: Map<
        string,
        CanonicalKeyEntity
    >;

    cuisineKeyToEntity: Map<
        string,
        CanonicalKeyEntity
    >;

    destinationKeys: string[];
    cuisineKeys: string[];

    contextText: string;
};

function makeShortKey(
    prefix: "D" | "C",
    index: number,
) {
    return `${prefix}${String(
        index + 1,
    ).padStart(2, "0")}`;
}

function compactRagContent(
    content: string,
) {
    return content
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

function buildRagKeyContext(
    results: RetrievedTravelItem[],
): RagKeyContext {
    const destinationKeyToEntity =
        new Map<
            string,
            CanonicalKeyEntity
        >();

    const cuisineKeyToEntity =
        new Map<
            string,
            CanonicalKeyEntity
        >();

    const destinationKeys:
        string[] = [];

    const cuisineKeys:
        string[] = [];

    const destinationBlocks:
        string[] = [];

    const cuisineBlocks:
        string[] = [];

    let destinationIndex = 0;
    let cuisineIndex = 0;

    for (
        const item of
        results
    ) {
        if (
            item.kind ===
            "destination"
        ) {
            const key =
                makeShortKey(
                    "D",
                    destinationIndex,
                );

            destinationIndex++;

            destinationKeys.push(
                key,
            );

            destinationKeyToEntity.set(
                key,
                {
                    id: item.id,
                    name: item.name,
                },
            );

            destinationBlocks.push(
                [
                    `[${key}] ${item.name}`,

                    compactRagContent(
                        item.content,
                    ),
                ].join("\n"),
            );

            continue;
        }

        const key =
            makeShortKey(
                "C",
                cuisineIndex,
            );

        cuisineIndex++;

        cuisineKeys.push(
            key,
        );

        cuisineKeyToEntity.set(
            key,
            {
                id: item.id,
                name: item.name,
            },
        );

        cuisineBlocks.push(
            [
                `[${key}] ${item.name}`,

                item.avgPrice !==
                null
                    ? `AVG_PRICE: ${item.avgPrice}`
                    : null,

                compactRagContent(
                    item.content,
                ),
            ]
                .filter(
                    (
                        value,
                    ): value is string =>
                        value !==
                        null,
                )
                .join("\n"),
        );
    }

    const contextText = [
        "DESTINATIONS:",

        destinationBlocks.join(
            "\n\n",
        ),

        "",

        "CUISINES:",

        cuisineBlocks.length > 0
            ? cuisineBlocks.join(
                  "\n\n",
              )
            : "(không có cuisine phù hợp trong RAG)",
    ].join("\n");

    return {
        destinationKeyToEntity,
        cuisineKeyToEntity,
        destinationKeys,
        cuisineKeys,
        contextText,
    };
}

/* -------------------------------------------------------------------------- */
/* Gemini generated types                                                     */
/* -------------------------------------------------------------------------- */

type AiActivity =
    AiItineraryPlan[
        "days"
    ][number][
        "activities"
    ][number];

type AiMeal =
    AiItineraryPlan[
        "days"
    ][number][
        "meals"
    ][number];

type AiCuisine =
    AiMeal[
        "cuisines"
    ][number];

type GeneratedActivity =
    Omit<
        AiActivity,
        | "destinationId"
        | "destinationName"
    > & {
        destinationKey:
            string;
    };

type GeneratedCuisine =
    Omit<
        AiCuisine,
        | "cuisineId"
        | "cuisineName"
    > & {
        cuisineKey:
            string;
    };

type GeneratedMeal =
    Omit<
        AiMeal,
        "cuisines"
    > & {
        cuisines:
            GeneratedCuisine[];
    };

type GeneratedDay =
    Omit<
        AiItineraryPlan[
            "days"
        ][number],
        | "activities"
        | "meals"
    > & {
        activities:
            GeneratedActivity[];

        meals:
            GeneratedMeal[];
    };

type GeneratedPlan =
    Omit<
        AiItineraryPlan,
        "days"
    > & {
        days:
            GeneratedDay[];
    };

/* -------------------------------------------------------------------------- */
/* Normalize time                                                             */
/* -------------------------------------------------------------------------- */

function normalizeTime(
    value: string,
) {
    const normalized =
        value.trim();

    const match =
        /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(
            normalized,
        );

    if (!match) {
        return normalized;
    }

    const hour =
        Number(
            match[1],
        );

    const minute =
        Number(
            match[2],
        );

    if (
        !Number.isInteger(
            hour,
        ) ||
        !Number.isInteger(
            minute,
        ) ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59
    ) {
        return normalized;
    }

    return `${String(
        hour,
    ).padStart(
        2,
        "0",
    )}:${String(
        minute,
    ).padStart(
        2,
        "0",
    )}`;
}

/* -------------------------------------------------------------------------- */
/* Hydrate Gemini output                                                      */
/* -------------------------------------------------------------------------- */

function hydrateGeneratedPlan(
    raw: unknown,
    keyContext:
        RagKeyContext,
): unknown {
    try {
        if (
            raw === null ||
            typeof raw !==
                "object"
        ) {
            throw new Error(
                "Root output không phải object.",
            );
        }

        const generated =
            raw as GeneratedPlan;

        if (
            !Array.isArray(
                generated.days,
            )
        ) {
            throw new Error(
                "days không phải array.",
            );
        }

        return {
            title:
                generated.title,

            description:
                generated.description,

            days:
                generated.days.map(
                    (
                        day,
                        dayIndex,
                    ) => {
                        if (
                            !Array.isArray(
                                day.activities,
                            ) ||
                            !Array.isArray(
                                day.meals,
                            )
                        ) {
                            throw new Error(
                                `Ngày ${dayIndex + 1} có activities/meals không hợp lệ.`,
                            );
                        }

                        return {
                            /**
                             * dayNumber sai không cần gọi
                             * Gemini lại.
                             */
                            dayNumber:
                                dayIndex +
                                1,

                            title:
                                day.title,

                            description:
                                day.description,

                            activities:
                                day.activities.map(
                                    (
                                        activity,
                                    ) => {
                                        const destination =
                                            keyContext.destinationKeyToEntity.get(
                                                activity.destinationKey,
                                            );

                                        if (
                                            !destination
                                        ) {
                                            throw new AiItineraryServiceError(
                                                `AI trả về destinationKey không thuộc RAG context: ${activity.destinationKey}`,
                                                422,
                                            );
                                        }

                                        return {
                                            destinationId:
                                                destination.id,

                                            destinationName:
                                                destination.name,

                                            title:
                                                activity.title,

                                            description:
                                                activity.description,

                                            startTime:
                                                normalizeTime(
                                                    activity.startTime,
                                                ),

                                            endTime:
                                                normalizeTime(
                                                    activity.endTime,
                                                ),

                                            transportMethod:
                                                activity.transportMethod,

                                            estimatedTravelMinutes:
                                                activity.estimatedTravelMinutes,
                                        };
                                    },
                                ),

                            meals:
                                day.meals.map(
                                    (
                                        meal,
                                    ) => ({
                                        mealType:
                                            meal.mealType,

                                        startTime:
                                            normalizeTime(
                                                meal.startTime,
                                            ),

                                        note:
                                            meal.note,

                                        cuisines:
                                            meal.cuisines.map(
                                                (
                                                    cuisine,
                                                ) => {
                                                    const canonical =
                                                        keyContext.cuisineKeyToEntity.get(
                                                            cuisine.cuisineKey,
                                                        );

                                                    if (
                                                        !canonical
                                                    ) {
                                                        throw new AiItineraryServiceError(
                                                            `AI trả về cuisineKey không thuộc RAG context: ${cuisine.cuisineKey}`,
                                                            422,
                                                        );
                                                    }

                                                    return {
                                                        cuisineId:
                                                            canonical.id,

                                                        cuisineName:
                                                            canonical.name,
                                                    };
                                                },
                                            ),
                                    }),
                                ),
                        };
                    },
                ),

            estimatedCosts:
                generated.estimatedCosts,
        };
    } catch (error) {
        if (
            error instanceof
            AiItineraryServiceError
        ) {
            throw error;
        }

        console.error(
            "[AI PLAN HYDRATION ERROR]",
            error,
        );

        throw new AiItineraryServiceError(
            "AI trả về cấu trúc lịch trình không hợp lệ.",
            422,
        );
    }
}

/* -------------------------------------------------------------------------- */
/* Prompt                                                                     */
/* -------------------------------------------------------------------------- */

function buildAiPlannerPrompt(
    input: {
        request:
            AiPlannerRequest;

        locationName:
            string;

        ragContext:
            string;

        cuisineKeysAvailable:
            boolean;

        outputSchema:
            Record<
                string,
                unknown
            >;
    },
) {
    const {
        request,
        locationName,
        ragContext,
        cuisineKeysAvailable,
        outputSchema,
    } = input;

    const nightCount =
        Math.max(
            request.dayCount -
                1,
            1,
        );

    /**
     * Schema được minify thay vì pretty-print.
     *
     * Mục tiêu:
     * - Gemini vẫn biết chính xác field/enum/key hợp lệ.
     * - Không làm prompt phình gần gấp đôi như fallback cũ.
     */
    const compactOutputSchema =
        JSON.stringify(
            outputSchema,
        );

    return `
Bạn là hệ thống lập lịch trình du lịch SmartTripVietNam.

NHIỆM VỤ
Tạo lịch trình ${request.dayCount} ngày tại ${locationName}.

THÔNG TIN CHUYẾN ĐI
- Ngày khởi hành: ${request.startDate}
- Người lớn: ${request.adultCount}
- Trẻ em: ${request.childCount}
- Số phòng: ${request.roomCount}
- Nhịp độ: ${PACE_LABELS[request.pace]}
- Sở thích: ${request.interests.join(", ")}
- Ngân sách: ${
        request.budget !==
        undefined
            ? `${request.budget.toLocaleString(
                  "vi-VN",
              )} VNĐ`
            : "không giới hạn cụ thể"
    }
- Yêu cầu thêm: ${
        request.note ||
        "không có"
    }

QUY TẮC RAG
1. destinationKey chỉ được chọn từ mã Dxx trong CONTEXT.
2. Không tự tạo destinationKey mới và không dùng địa điểm ngoài ${locationName}.
3. cuisineKey chỉ được chọn từ mã Cxx trong CONTEXT.
4. ${
        cuisineKeysAvailable
            ? "Nếu bữa ăn không cần gắn món cụ thể thì cuisines có thể là []."
            : "Không có cuisine trong context, vì vậy mọi cuisines phải là []."
    }
5. Không bịa nhà hàng, khách sạn hoặc địa chỉ cụ thể ngoài CONTEXT.
6. Hạn chế lặp destination giữa nhiều ngày nếu không cần thiết.

QUY TẮC LỊCH TRÌNH
1. days phải có chính xác ${request.dayCount} phần tử.
2. Mỗi ngày có ít nhất 1 activity; ưu tiên 2-4 activity tùy nhịp độ.
3. Không xếp hai activity trùng thời gian.
4. startTime phải nhỏ hơn endTime và dùng định dạng HH:mm.
5. Lịch phải thực tế, có thời gian nghỉ và di chuyển hợp lý.
6. Không chép dài nội dung CONTEXT vào description.

CHI PHÍ
1. estimatedCosts phải có ít nhất 1 phần tử và chỉ là dự toán tham khảo.
2. Với món ăn có AVG_PRICE trong CONTEXT thì ưu tiên dùng AVG_PRICE.
3. Food: calculationUnit="per_person", travelerScope="all" khi phù hợp.
4. Transport có thể dùng calculationUnit="per_group".
5. Nếu chuyến đi từ 2 ngày trở lên, nên có accommodation.
6. Accommodation: calculationUnit="per_room", nightCount=${nightCount}.
7. quantity thông thường bằng 1.
8. Nếu phải tự ước tính giá, note phải ghi rõ "AI ước tính".

GIỚI HẠN OUTPUT ĐỂ PHẢN HỒI NHANH
- title toàn plan: ngắn gọn, khoảng tối đa 80 ký tự.
- description toàn plan: khoảng tối đa 180 ký tự.
- title mỗi ngày: khoảng tối đa 70 ký tự.
- description mỗi ngày: khoảng tối đa 140 ký tự.
- activity title: khoảng tối đa 60 ký tự.
- activity description: khoảng tối đa 120 ký tự.
- meal note: khoảng tối đa 80 ký tự.
- cost note: khoảng tối đa 80 ký tự.
- estimatedCosts chỉ nên có khoảng 4-8 khoản tổng hợp.
- Không thêm prose, markdown hoặc code fence ngoài JSON.

OUTPUT
Trả DUY NHẤT một JSON object hợp lệ và tuân thủ chính xác JSON Schema compact sau:
${compactOutputSchema}

CONTEXT
${ragContext}
`.trim();
}

/* -------------------------------------------------------------------------- */
/* Generate                                                                   */
/* -------------------------------------------------------------------------- */

export async function generateAiItineraryService(
    request:
        AiPlannerRequest,

    userId:
        string,
) {
    const totalStartedAt =
        nowMs();

    /* ---------------------------------------------------------------------- */
    /* Location                                                               */
    /* ---------------------------------------------------------------------- */

    const locationStartedAt =
        nowMs();

    const location =
        await findAiPlannerLocationById(
            request.locationId,
        );

    logAiTiming(
        "location lookup",
        locationStartedAt,
    );

    if (!location) {
        throw new AiItineraryServiceError(
            "Không tìm thấy khu vực.",
            404,
        );
    }

    /* ---------------------------------------------------------------------- */
    /* RAG query                                                              */
    /* ---------------------------------------------------------------------- */

    const query = [
        `Du lịch ${location.name}`,

        `${request.dayCount} ngày`,

        `Nhịp độ: ${
            PACE_LABELS[
                request.pace
            ]
        }`,

        `Sở thích: ${request.interests.join(
            ", ",
        )}`,

        request.budget !==
        undefined
            ? `Ngân sách khoảng ${request.budget.toLocaleString(
                  "vi-VN",
              )} VNĐ`
            : null,

        request.note
            ? `Yêu cầu thêm: ${request.note}`
            : null,
    ]
        .filter(
            (
                value,
            ): value is string =>
                Boolean(value),
        )
        .join(". ");

    /* ---------------------------------------------------------------------- */
    /* RAG                                                                    */
    /* ---------------------------------------------------------------------- */

    const ragLimits =
        getRagRetrievalLimits(
            request,
        );

    const ragStartedAt =
        nowMs();

    const rag =
        await retrieveTravelContextService(
            query,
            {
                locationId:
                    location.id,

                limit:
                    ragLimits.totalLimit,

                destinationLimit:
                    ragLimits.destinationLimit,

                cuisineLimit:
                    ragLimits.cuisineLimit,

                minSimilarity:
                    0.3,
            },
        );

    logAiTiming(
        "RAG retrieval",
        ragStartedAt,
        rag.retrievalStats,
    );

    const destinations =
        rag.results.filter(
            (item) =>
                item.kind ===
                "destination",
        );

    if (
        destinations.length <
        2
    ) {
        throw new AiItineraryServiceError(
            `Knowledge base của ${location.name} chưa đủ điểm đến để tự lập hành trình.`,
            422,
        );
    }

    /* ---------------------------------------------------------------------- */
    /* Short key                                                              */
    /* ---------------------------------------------------------------------- */

    const keyContext =
        buildRagKeyContext(
            rag.results,
        );

    const allowedDestinationIds =
        new Set(
            rag.results
                .filter(
                    (item) =>
                        item.kind ===
                        "destination",
                )
                .map(
                    (item) =>
                        item.id,
                ),
        );

    const allowedCuisineIds =
        new Set(
            rag.results
                .filter(
                    (item) =>
                        item.kind ===
                        "cuisine",
                )
                .map(
                    (item) =>
                        item.id,
                ),
        );

    /* ---------------------------------------------------------------------- */
    /* Prompt/schema                                                          */
    /* ---------------------------------------------------------------------- */

    const generationSchema =
        buildAiItineraryJsonSchema({
            dayCount:
                request.dayCount,

            destinationKeys:
                keyContext
                    .destinationKeys,

            cuisineKeys:
                keyContext
                    .cuisineKeys,
        });

    const prompt =
        buildAiPlannerPrompt({
            request,

            locationName:
                location.name,

            ragContext:
                keyContext.contextText,

            cuisineKeysAvailable:
                keyContext
                    .cuisineKeys
                    .length >
                0,

            outputSchema:
                generationSchema,
        });

    /* ---------------------------------------------------------------------- */
    /* Gemini                                                                 */
    /* ---------------------------------------------------------------------- */

    const geminiStartedAt =
        nowMs();

    const raw =
        await generateGeminiJson({
            prompt,

            schema:
                generationSchema,
        });

    logAiTiming(
        "Gemini generation",
        geminiStartedAt,
    );

    /* ---------------------------------------------------------------------- */
    /* Hydrate + Zod                                                          */
    /* ---------------------------------------------------------------------- */

    const hydrationStartedAt =
        nowMs();

    const hydrated =
        hydrateGeneratedPlan(
            raw,
            keyContext,
        );

    const parsed =
        aiItineraryPlanSchema.safeParse(
            hydrated,
        );

    if (
        !parsed.success
    ) {
        const flattened =
            parsed.error.flatten();

        console.error(
            "[AI PLAN VALIDATION ERROR]",
            flattened,
        );

        if (
            process.env
                .NODE_ENV !==
            "production"
        ) {
            console.error(
                "[AI PLAN RAW RESPONSE]",

                JSON.stringify(
                    raw,
                    null,
                    2,
                ),
            );

            console.error(
                "[AI PLAN HYDRATED RESPONSE]",

                JSON.stringify(
                    hydrated,
                    null,
                    2,
                ),
            );
        }

        throw new AiItineraryServiceError(
            "AI trả về lịch trình chưa hợp lệ. Vui lòng thử lại.",
            422,
        );
    }

    if (
        parsed.data.days
            .length !==
        request.dayCount
    ) {
        throw new AiItineraryServiceError(
            `AI tạo ${parsed.data.days.length} ngày nhưng cần chính xác ${request.dayCount} ngày.`,
            422,
        );
    }

    logAiTiming(
        "hydrate + Zod validation",
        hydrationStartedAt,
    );

    /**
     * Không query DB lần nữa sau Gemini.
     *
     * ID đã được map từ chính RAG result.
     * Khi Save vẫn validate DB + signed proof.
     */
    const finalPlan =
        parsed.data;

    /* ---------------------------------------------------------------------- */
    /* Proof                                                                  */
    /* ---------------------------------------------------------------------- */

    const generationProof =
        createAiItineraryGenerationProof(
            {
                userId,

                request,

                plan:
                    finalPlan,

                allowedDestinationIds,

                allowedCuisineIds,
            },
        );

    logAiTiming(
        "TOTAL generate itinerary",
        totalStartedAt,
        {
            ragSources:
                rag.resultCount,

            destinations:
                keyContext
                    .destinationKeys
                    .length,

            cuisines:
                keyContext
                    .cuisineKeys
                    .length,
        },
    );

    /* ---------------------------------------------------------------------- */
    /* Response                                                               */
    /* ---------------------------------------------------------------------- */

    return {
        request,

        location,

        plan:
            finalPlan,

        generationProof,

        rag: {
            query:
                rag.query,

            sourceCount:
                rag.resultCount,

            sources:
                rag.results.map(
                    (result) => ({
                        kind:
                            result.kind,

                        id:
                            result.id,

                        name:
                            result.name,

                        similarity:
                            result.similarity,
                    }),
                ),
        },
    };
}

/* -------------------------------------------------------------------------- */
/* Save                                                                       */
/* -------------------------------------------------------------------------- */

export async function saveAiItineraryService(
    input: {
        userId:
            string;

        request:
            AiPlannerRequest;

        plan:
            AiItineraryPlan;

        generationProof:
            string;
    },
) {
    const location =
        await findAiPlannerLocationById(
            input.request
                .locationId,
        );

    if (!location) {
        throw new AiItineraryServiceError(
            "Không tìm thấy khu vực.",
            404,
        );
    }

    /* ---------------------------------------------------------------------- */
    /* Verify proof                                                           */
    /* ---------------------------------------------------------------------- */

    let proofContext:
        ReturnType<
            typeof verifyAiItineraryGenerationProof
        >;

    try {
        proofContext =
            verifyAiItineraryGenerationProof(
                {
                    proof:
                        input.generationProof,

                    userId:
                        input.userId,

                    request:
                        input.request,

                    plan:
                        input.plan,
                },
            );
    } catch (error) {
        if (
            error instanceof
            AiItineraryGenerationProofError
        ) {
            throw new AiItineraryServiceError(
                error.message,
                422,
            );
        }

        throw error;
    }

    /* ---------------------------------------------------------------------- */
    /* Canonical revalidation                                                 */
    /* ---------------------------------------------------------------------- */

    const planToSave =
        structuredClone(
            input.plan,
        );

    const validatedPlan =
        await validateCanonicalIds(
            planToSave,

            location.id,

            proofContext
                .allowedDestinationIds,

            proofContext
                .allowedCuisineIds,
        );

    if (
        validatedPlan.days
            .length !==
        input.request.dayCount
    ) {
        throw new AiItineraryServiceError(
            "Số ngày của lịch trình không hợp lệ.",
            422,
        );
    }

    /* ---------------------------------------------------------------------- */
    /* Save                                                                   */
    /* ---------------------------------------------------------------------- */

    return createAiItinerary({
        userId:
            input.userId,

        request:
            input.request,

        location,

        plan:
            validatedPlan,
    });
}