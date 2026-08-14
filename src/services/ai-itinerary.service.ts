import "server-only";

import {
    AI_ITINERARY_JSON_SCHEMA,
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

/**
 * Dùng để ước lượng số destination
 * cần lấy từ RAG.
 */
const PACE_ACTIVITY_TARGET = {
    relaxed: 2,
    balanced: 3,
    packed: 4,
} as const;

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

    /**
     * Cho AI thêm một ít destination
     * ngoài số activity dự kiến để
     * có lựa chọn thay thế.
     */
    const desiredDestinations =
        request.dayCount *
            activitiesPerDay +
        4;

    const destinationLimit =
        Math.min(
            Math.max(
                desiredDestinations,
                8,
            ),
            32,
        );

    /**
     * Cuisine tăng theo số ngày nhưng
     * không cần tăng nhanh như destination.
     */
    const cuisineLimit =
        Math.min(
            Math.max(
                request.dayCount +
                    3,
                5,
            ),
            10,
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

    /**
     * Khi validate ngay sau generation
     * hoặc lúc Save với proof:
     *
     * tất cả IDs phải nằm trong
     * chính RAG context đã cho AI.
     */
    if (
        allowedDestinationIds
    ) {
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

    if (
        allowedCuisineIds
    ) {
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

    /**
     * Destination ID phải tồn tại.
     */
    if (
        destinations.length !==
        destinationIds.length
    ) {
        throw new AiItineraryServiceError(
            "AI trả về destination ID không tồn tại.",
            422,
        );
    }

    /**
     * Destination phải thuộc đúng
     * location user đã chọn.
     */
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

    /**
     * Cuisine ID phải tồn tại.
     */
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

    /**
     * Không tin các trường name do AI tạo.
     *
     * ID là canonical key,
     * name sẽ lấy lại từ database.
     */
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
    },
) {
    const {
        request,
        locationName,
        ragContext,
    } = input;

    const nightCount =
        Math.max(
            request.dayCount - 1,
            1,
        );

    return `
Bạn là hệ thống lập lịch trình du lịch cho SmartTripVietNam.

NHIỆM VỤ:
Tạo lịch trình ${request.dayCount} ngày tại ${locationName}.

THÔNG TIN NGƯỜI DÙNG:
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
- Yêu cầu bổ sung: ${
        request.note ||
        "không có"
    }

QUY TẮC RAG BẮT BUỘC:

1. Chỉ được sử dụng destination có DATABASE_ID xuất hiện trong RAG CONTEXT.
2. Không được tự tạo destinationId.
3. Không được sử dụng destination ngoài ${locationName}.
4. Cuisine chỉ được sử dụng DATABASE_ID xuất hiện trong RAG CONTEXT.
5. Không bịa destinationId hoặc cuisineId.
6. destinationName và cuisineName phải tương ứng với DATABASE_ID.
7. Không bịa nhà hàng, khách sạn hoặc địa chỉ cụ thể không có trong context.

QUY TẮC LỊCH TRÌNH:

8. days phải có CHÍNH XÁC ${request.dayCount} phần tử.
9. Tuyệt đối không trả "days": [].
10. dayNumber phải lần lượt từ 1 đến ${request.dayCount}.
11. Mỗi ngày phải có ít nhất 1 activity.
12. Mỗi ngày nên có từ 2 đến 4 activity tùy nhịp độ.
13. Không xếp hai activity trùng thời gian.
14. startTime phải nhỏ hơn endTime.
15. Thời gian phải ở định dạng HH:mm.
16. Ưu tiên sắp xếp địa điểm hợp lý theo khu vực.
17. Không lặp một destination ở nhiều ngày nếu không thật sự cần.

QUY TẮC CHI PHÍ:

18. estimatedCosts phải có ít nhất một phần tử.
19. Đây chỉ là DỰ TOÁN, không khẳng định là giá thực tế.

20. estimatedCosts nên bao gồm khi phù hợp:
- ăn uống
- di chuyển
- vé tham quan
- hoạt động
- lưu trú

21. Với món ăn:
- Nếu RAG CONTEXT có AVG_PRICE thì ưu tiên AVG_PRICE.
- calculationUnit = "per_person".
- travelerScope = "all".

22. Với vé tham quan:
- Nếu context không có giá chính xác thì có thể ước tính.
- Khi ước tính, note phải ghi rõ "AI ước tính".

23. Với phương tiện:
- Có thể dùng calculationUnit = "per_group".

24. Với lưu trú:
- Nếu chuyến đi từ 2 ngày trở lên thì phải có khoản accommodation.
- calculationUnit = "per_room".
- nightCount = ${nightCount}.
- unitPrice là giá dự kiến cho một phòng / một đêm.

25. quantity thông thường bằng 1.

CÁCH HỆ THỐNG TÍNH CHI PHÍ:

- per_person:
  unitPrice × quantity × số hành khách phù hợp travelerScope

- per_group:
  unitPrice × quantity

- fixed:
  unitPrice × quantity

- per_room:
  unitPrice × số phòng × nightCount

Số người lớn: ${request.adultCount}
Số trẻ em: ${request.childCount}
Số phòng: ${request.roomCount}
Số đêm dự kiến: ${nightCount}

OUTPUT:

- Chỉ trả JSON theo schema.
- Không markdown.
- Không đặt JSON trong code block.
- Không giải thích ngoài JSON.
- Không được để days rỗng.
- Phải tạo đủ ${request.dayCount} ngày.

RAG CONTEXT:

${ragContext}
`.trim();
}

/* -------------------------------------------------------------------------- */
/* Retry prompt                                                               */
/* -------------------------------------------------------------------------- */

function buildRetryPrompt(
    input: {
        originalPrompt:
            string;

        request:
            AiPlannerRequest;

        reason:
            string;
    },
) {
    return `${input.originalPrompt}

----------------------------------------

LẦN TRƯỚC OUTPUT KHÔNG VƯỢT QUA VALIDATION.

LÝ DO:
${input.reason}

HÃY TẠO LẠI TOÀN BỘ JSON TỪ ĐẦU.

YÊU CẦU BẮT BUỘC:
- days phải có CHÍNH XÁC ${input.request.dayCount} phần tử.
- Không được trả "days": [].
- dayNumber phải lần lượt từ 1 đến ${input.request.dayCount}.
- Mỗi ngày phải có ít nhất 1 activity.
- destinationId chỉ lấy từ DATABASE_ID destination trong RAG CONTEXT.
- cuisineId chỉ lấy từ DATABASE_ID cuisine trong RAG CONTEXT.
- Không tự tạo UUID.
- estimatedCosts phải có ít nhất 1 phần tử.
- Chỉ trả JSON.
- Không markdown.
- Không giải thích.`.trim();
}

/* -------------------------------------------------------------------------- */
/* Generate                                                                   */
/* -------------------------------------------------------------------------- */

export async function generateAiItineraryService(
    request: AiPlannerRequest,
    userId: string,
) {
    const location =
        await findAiPlannerLocationById(
            request.locationId,
        );

    if (!location) {
        throw new AiItineraryServiceError(
            "Không tìm thấy khu vực.",
            404,
        );
    }

    /* ---------------------------------------------------------------------- */
    /* Build RAG query                                                        */
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
    /* Dynamic RAG retrieval                                                  */
    /* ---------------------------------------------------------------------- */

    const ragLimits =
        getRagRetrievalLimits(
            request,
        );

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

                /**
                 * Tạm giữ threshold hiện tại.
                 * Benchmark threshold sẽ làm
                 * ở bước riêng.
                 */
                minSimilarity:
                    0.3,
            },
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
    /* Allowed canonical IDs                                                  */
    /* ---------------------------------------------------------------------- */

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
    /* Prompt                                                                 */
    /* ---------------------------------------------------------------------- */

    const prompt =
        buildAiPlannerPrompt({
            request,

            locationName:
                location.name,

            ragContext:
                rag.contextText,
        });

    /* ---------------------------------------------------------------------- */
    /* Gemini + validation retry                                              */
    /* ---------------------------------------------------------------------- */

    const MAX_GENERATION_ATTEMPTS =
        2;

    let finalPlan:
        AiItineraryPlan | null =
        null;

    let lastRaw:
        unknown = null;

    let lastFailureReason =
        "Output không hợp lệ.";

    for (
        let attempt = 1;
        attempt <=
        MAX_GENERATION_ATTEMPTS;
        attempt++
    ) {
        const attemptPrompt =
            attempt === 1
                ? prompt
                : buildRetryPrompt(
                      {
                          originalPrompt:
                              prompt,

                          request,

                          reason:
                              lastFailureReason,
                      },
                  );

        const raw =
            await generateGeminiJson({
                prompt:
                    attemptPrompt,

                /**
                 * Không thêm minItems /
                 * maxItems vào schema này.
                 *
                 * Validation chi tiết
                 * được thực hiện bằng Zod.
                 */
                schema:
                    AI_ITINERARY_JSON_SCHEMA,
            });

        lastRaw =
            raw;

        /* ------------------------------------------------------------------ */
        /* Zod                                                                */
        /* ------------------------------------------------------------------ */

        const parsed =
            aiItineraryPlanSchema.safeParse(
                raw,
            );

        if (
            !parsed.success
        ) {
            const flattened =
                parsed.error.flatten();

            console.error(
                `[AI PLAN VALIDATION ERROR] attempt=${attempt}`,
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
            }

            lastFailureReason =
                JSON.stringify(
                    flattened,
                );

            continue;
        }

        /* ------------------------------------------------------------------ */
        /* Exact day count                                                    */
        /* ------------------------------------------------------------------ */

        if (
            parsed.data.days
                .length !==
            request.dayCount
        ) {
            lastFailureReason =
                `AI tạo ${parsed.data.days.length} ngày nhưng cần chính xác ${request.dayCount} ngày.`;

            console.error(
                `[AI PLAN DAY COUNT ERROR] attempt=${attempt}`,
                {
                    expected:
                        request.dayCount,

                    actual:
                        parsed.data.days
                            .length,
                },
            );

            continue;
        }

        /* ------------------------------------------------------------------ */
        /* dayNumber sequence                                                 */
        /* ------------------------------------------------------------------ */

        const validDayNumbers =
            parsed.data.days.every(
                (
                    day,
                    index,
                ) =>
                    day.dayNumber ===
                    index + 1,
            );

        if (
            !validDayNumbers
        ) {
            lastFailureReason =
                `dayNumber phải lần lượt từ 1 đến ${request.dayCount}.`;

            console.error(
                `[AI PLAN DAY NUMBER ERROR] attempt=${attempt}`,
                parsed.data.days.map(
                    (day) =>
                        day.dayNumber,
                ),
            );

            continue;
        }

        /* ------------------------------------------------------------------ */
        /* Canonical validation                                               */
        /* ------------------------------------------------------------------ */

        try {
            /**
             * Clone vì canonical validation
             * sẽ ghi đè name bằng DB value.
             */
            const candidate =
                structuredClone(
                    parsed.data,
                );

            finalPlan =
                await validateCanonicalIds(
                    candidate,

                    location.id,

                    allowedDestinationIds,

                    allowedCuisineIds,
                );

            break;
        } catch (error) {
            /**
             * Nếu AI hallucinate ID thì
             * cho model thêm một cơ hội.
             */
            if (
                error instanceof
                    AiItineraryServiceError &&
                error.status ===
                    422
            ) {
                lastFailureReason =
                    error.message;

                console.error(
                    `[AI PLAN CANONICAL VALIDATION ERROR] attempt=${attempt}`,
                    error.message,
                );

                continue;
            }

            throw error;
        }
    }

    /* ---------------------------------------------------------------------- */
    /* All attempts failed                                                    */
    /* ---------------------------------------------------------------------- */

    if (!finalPlan) {
        if (
            process.env
                .NODE_ENV !==
            "production"
        ) {
            console.error(
                "[AI PLAN FINAL INVALID RESPONSE]",
                JSON.stringify(
                    lastRaw,
                    null,
                    2,
                ),
            );
        }

        throw new AiItineraryServiceError(
            `AI không thể tạo lịch trình hợp lệ sau ${MAX_GENERATION_ATTEMPTS} lần thử.`,
            422,
        );
    }

    /* ---------------------------------------------------------------------- */
    /* Signed generation proof                                                */
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
        userId: string;

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
    /* Verify generation proof                                                */
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

        /**
         * Ví dụ server chưa cấu hình
         * AI_ITINERARY_PROOF_SECRET.
         */
        throw error;
    }

    /* ---------------------------------------------------------------------- */
    /* Revalidate against original RAG IDs                                    */
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
    /* Save DB                                                                */
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