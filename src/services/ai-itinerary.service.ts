import "server-only";

import {
    AI_ITINERARY_JSON_SCHEMA,
} from "@/src/lib/ai/ai-itinerary-json-schema";

import {
    generateGeminiJson,
} from "@/src/lib/ai/gemini";

import {
    createAiItinerary,
    findAiCuisinesByIds,
    findAiDestinationsByIds,
    findAiPlannerLocationById,
} from "@/src/repositories/ai-itinerary.repository";

import {
    retrieveTravelContextService,
} from "@/src/services/rag.service";

import {
    aiItineraryPlanSchema,
    type AiItineraryPlan,
    type AiPlannerRequest,
} from "@/src/schemas/ai-itinerary.schema";

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

const PACE_LABELS = {
    relaxed:
        "thư thả, ít điểm đến, có nhiều thời gian nghỉ",

    balanced:
        "cân bằng, vừa tham quan vừa nghỉ ngơi",

    packed:
        "nhiều trải nghiệm, lịch trình khá dày",
} as const;

/* -------------------------------------------------------------------------- */
/* Canonical validation                                                       */
/* -------------------------------------------------------------------------- */

async function validateCanonicalIds(
    plan: AiItineraryPlan,
    locationId: string,
    allowedDestinationIds?: Set<string>,
    allowedCuisineIds?: Set<string>,
) {
    const destinationIds =
        [
            ...new Set(
                plan.days.flatMap(
                    (day) =>
                        day.activities.map(
                            (
                                item,
                            ) =>
                                item.destinationId,
                        ),
                ),
            ),
        ];

    const cuisineIds = [
        ...new Set(
            plan.days.flatMap(
                (day) =>
                    day.meals.flatMap(
                        (
                            meal,
                        ) =>
                            meal.cuisines.map(
                                (
                                    cuisine,
                                ) =>
                                    cuisine.cuisineId,
                            ),
                    ),
            ),
        ),
    ];

    /**
     * Khi validate ngay sau generation:
     * ID phải thuộc chính retrieval context.
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
     * Bảo vệ lần hai:
     * kể cả client sửa JSON trước khi Save,
     * destination vẫn bắt buộc thuộc location user đã chọn.
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
                (
                    destination,
                ) => [
                    destination.id,
                    destination,
                ],
            ),
        );

    const cuisineById =
        new Map(
            cuisines.map(
                (
                    cuisine,
                ) => [
                    cuisine.id,
                    cuisine,
                ],
            ),
        );

    /**
     * Không tin name Gemini.
     * Ghi đè bằng tên canonical trong DB.
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

                if (
                    canonical
                ) {
                    cuisine.cuisineName =
                        canonical.name;
                }
            }
        }
    }

    return plan;
}

/* -------------------------------------------------------------------------- */
/* Generate                                                                   */
/* -------------------------------------------------------------------------- */

export async function generateAiItineraryService(
    request: AiPlannerRequest,
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
        request.budget
            ? `Ngân sách khoảng ${request.budget.toLocaleString(
                  "vi-VN",
              )} VNĐ`
            : null,
        request.note
            ? `Yêu cầu thêm: ${request.note}`
            : null,
    ]
        .filter(Boolean)
        .join(". ");

    const rag =
        await retrieveTravelContextService(
            query,
            {
                /**
                 * Đây chính là phần hybrid RAG:
                 * semantic similarity + metadata filter.
                 */
                locationId:
                    location.id,

                limit: 20,

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

    const allowedDestinationIds =
        new Set(
            rag.results
                .filter(
                    (
                        item,
                    ) =>
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
                    (
                        item,
                    ) =>
                        item.kind ===
                        "cuisine",
                )
                .map(
                    (item) =>
                        item.id,
                ),
        );

    const prompt = ` Bạn là hệ thống lập lịch trình du lịch cho SmartTripVietNam.

NHIỆM VỤ:
Tạo lịch trình ${request.dayCount} ngày tại ${location.name}.

THÔNG TIN NGƯỜI DÙNG:
- Ngày khởi hành: ${request.startDate}
- Người lớn: ${request.adultCount}
- Trẻ em: ${request.childCount}
- Số phòng: ${request.roomCount}
- Nhịp độ: ${PACE_LABELS[request.pace]}
- Sở thích: ${request.interests.join(", ")}
- Ngân sách: ${
        request.budget
            ? `${request.budget.toLocaleString(
                  "vi-VN",
              )} VNĐ`
            : "không giới hạn cụ thể"
    }
- Yêu cầu bổ sung: ${request.note || "không có"}

QUY TẮC RAG BẮT BUỘC:

1. Chỉ được sử dụng destination có DATABASE_ID xuất hiện trong RAG CONTEXT.
2. Không được tự tạo destinationId.
3. Không được sử dụng địa điểm ngoài ${location.name}.
4. Cuisine cũng chỉ được sử dụng DATABASE_ID xuất hiện trong RAG CONTEXT.
5. Không bịa tên nhà hàng, khách sạn hoặc địa chỉ không có trong context.
6. destinationName và cuisineName phải tương ứng ID nguồn.
7. Lịch trình phải có chính xác ${request.dayCount} ngày.
8. dayNumber lần lượt từ 1 đến ${request.dayCount}.
9. Mỗi ngày nên có 2-4 hoạt động tùy nhịp độ.
10. Không xếp hai hoạt động trùng thời gian.
11. startTime phải nhỏ hơn endTime.
12. Ưu tiên bố trí hợp lý theo khu vực, thời gian và trải nghiệm.
13. Không lặp một destination trong nhiều ngày nếu không thực sự cần.
14. Chỉ trả JSON theo schema. Không markdown, không giải thích ngoài JSON.
15. Phải tạo estimatedCosts để dự toán chi phí chuyến đi.
16. estimatedCosts phải cố gắng bao gồm:
- Ăn uống
- Di chuyển
- Vé tham quan nếu cần
- Hoạt động nếu có chi phí
- Lưu trú nếu hành trình dài hơn 1 ngày
17. Đây là DỰ TOÁN, không khẳng định là giá thực tế.
18. Với món ăn:
- Nếu RAG CONTEXT có AVG_PRICE thì ưu tiên dùng AVG_PRICE.
- calculationUnit = "per_person".
- travelerScope = "all".
19. Với vé tham quan:
- Nếu không có giá chính xác trong context thì chỉ đưa ra mức ước tính hợp lý.
- note phải ghi rõ "AI ước tính".
20. Với phương tiện di chuyển:
- Có thể dùng calculationUnit = "per_group".
- Không được tạo mức giá vô lý so với ngân sách người dùng.
21. Với lưu trú:
- Nếu chuyến đi từ 2 ngày trở lên thì phải có một khoản accommodation.
- calculationUnit = "per_room".
- nightCount = số đêm của chuyến đi.
- Giá unitPrice là giá dự kiến cho 1 phòng / 1 đêm.
22. quantity thông thường bằng 1.
23. Các khoản per_person phải dùng travelerScope phù hợp.
24. Tổng dự toán nên phù hợp với ngân sách người dùng nếu họ có cung cấp ngân sách.
CÁCH TÍNH CHI PHÍ CỦA HỆ THỐNG:

- per_person:
  unitPrice × quantity × số hành khách

- per_group:
  unitPrice × quantity

- fixed:
  unitPrice × quantity

- per_room:
  unitPrice × số phòng × số đêm

Số người lớn: ${request.adultCount}
Số trẻ em: ${request.childCount}
Số phòng: ${request.roomCount}
Số đêm dự kiến: ${Math.max(
    request.dayCount - 1,
    1,
)}
RAG CONTEXT:

${rag.contextText}
`;

    const raw =
        await generateGeminiJson({
            prompt,

            schema:
                AI_ITINERARY_JSON_SCHEMA,
        });

    const parsed =
        aiItineraryPlanSchema.safeParse(
            raw,
        );

    if (
        !parsed.success
    ) {
        console.error(
            "[AI PLAN VALIDATION ERROR]",
            parsed.error.flatten(),
        );

        throw new AiItineraryServiceError(
            "AI tạo lịch trình không đúng cấu trúc.",
            422,
        );
    }

    if (
        parsed.data.days
            .length !==
        request.dayCount
    ) {
        throw new AiItineraryServiceError(
            `AI phải tạo chính xác ${request.dayCount} ngày.`,
            422,
        );
    }

    const plan =
        await validateCanonicalIds(
            parsed.data,
            location.id,
            allowedDestinationIds,
            allowedCuisineIds,
        );

    return {
        request,

        location,

        plan,

        rag: {
            query:
                rag.query,

            sourceCount:
                rag.resultCount,

            sources:
                rag.results.map(
                    (
                        result,
                    ) => ({
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
        request: AiPlannerRequest;
        plan: AiItineraryPlan;
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

    const validatedPlan =
        await validateCanonicalIds(
            structuredClone(
                input.plan,
            ),
            location.id,
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