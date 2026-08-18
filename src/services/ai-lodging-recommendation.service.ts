import "server-only";

import { generateGeminiJson } from "@/src/lib/ai/gemini";

import type {
    HotelSearchInput,
    HotelSearchItem,
    HotelSearchResult,
} from "@/src/services/travel-lodging/types";

const MAX_AI_RECOMMENDATIONS = 3;
const MAX_AI_TAGS = 3;

type AiLodgingRecommendation = {
    hotelKey: string;
    reason: string;
    tags: string[];
};

type AiLodgingRecommendationPayload = {
    summary: string;
    recommendations: AiLodgingRecommendation[];
};

export type RecommendedHotelSearchItem = HotelSearchItem & {
    googleMapsUrl: string;
    aiRecommended?: boolean;
    recommendationRank?: number;
    aiReason?: string;
    aiTags?: string[];
};

export type RecommendedHotelSearchResult = Omit<
    HotelSearchResult,
    "items"
> & {
    items: RecommendedHotelSearchItem[];
    aiRecommendation?: {
        generatedBy: "gemini" | "fallback";
        summary: string;
        recommendedCount: number;
    };
};

function makeHotelKey(index: number) {
    return `H${String(index + 1).padStart(2, "0")}`;
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function buildGoogleMapsUrl(
    hotel: HotelSearchItem,
    locationName: string,
) {
    // LiteAPI không có Google Place ID nên ưu tiên:
    // tên khách sạn + địa chỉ.
    // Nếu thiếu địa chỉ thì dùng tọa độ.
    const query = hotel.address?.trim()
        ? `${hotel.name}, ${hotel.address}`
        : isFiniteNumber(hotel.latitude) &&
            isFiniteNumber(hotel.longitude)
          ? `${hotel.name}, ${hotel.latitude},${hotel.longitude}`
          : `${hotel.name}, ${locationName}`;

    const params = new URLSearchParams({
        api: "1",
        query,
        utm_source: "SmartTripVietNam",
        utm_campaign: "lodging_recommendation",
    });

    return `https://www.google.com/maps/search/?${params.toString()}`;
}

function formatPrice(
    value: number | undefined,
    currency: string | undefined,
) {
    if (!isFiniteNumber(value)) {
        return "unknown";
    }

    return `${Math.round(value)} ${currency ?? "VND"}`;
}

function formatCandidate(
    hotel: HotelSearchItem,
    hotelKey: string,
) {
    return [
        `${hotelKey}: ${hotel.name}`,
        `address=${hotel.address ?? "unknown"}`,
        `rating=${isFiniteNumber(hotel.rating) ? hotel.rating : "unknown"}`,
        `pricePerNight=${formatPrice(hotel.pricePerNight, hotel.currency)}`,
        `totalPrice=${formatPrice(hotel.totalPrice, hotel.currency)}`,
        `room=${hotel.roomDescription ?? "unknown"}`,
        `board=${hotel.boardName ?? "unknown"}`,
        `refundable=${hotel.refundable ?? "unknown"}`,
        `taxesIncluded=${hotel.taxesIncluded ?? "unknown"}`,
    ].join(" | ");
}

function buildRecommendationPrompt(
    input: HotelSearchInput,
    candidates: Array<{
        hotelKey: string;
        hotel: HotelSearchItem;
    }>,
) {
    const preferenceLabel =
        input.preference === "hotel"
            ? "khách sạn"
            : input.preference === "homestay"
              ? "homestay/guesthouse"
              : "khách sạn hoặc homestay";

    return `Bạn là AI travel planner của SmartTrip Việt Nam.
Hãy CHỈ xếp hạng chỗ ở từ danh sách Hxx bên dưới. Tuyệt đối không tạo thêm khách sạn/homestay mới.

YÊU CẦU NGƯỜI DÙNG
- Điểm đến: ${input.locationName}
- Check-in: ${input.checkInDate}
- Check-out: ${input.checkOutDate}
- Người lớn: ${input.adultCount}
- Trẻ em: ${input.childCount}
- Số phòng: ${input.roomCount}
- Loại lưu trú mong muốn: ${preferenceLabel}
- Ngân sách tối đa/đêm: ${
        input.maxPricePerNight
            ? `${input.maxPricePerNight} VND`
            : "không giới hạn cụ thể"
    }

DỮ LIỆU LITEAPI
${candidates
    .map(({ hotelKey, hotel }) => formatCandidate(hotel, hotelKey))
    .join("\n")}

QUY TẮC
1. Chọn tối đa ${MAX_AI_RECOMMENDATIONS} lựa chọn phù hợp nhất.
2. hotelKey chỉ được lấy từ danh sách Hxx đã cung cấp.
3. Không tự bịa tên, địa chỉ, giá, rating, tiện ích hay điều kiện hoàn hủy.
4. Ưu tiên đúng ngân sách, loại lưu trú, rating tốt và điều kiện phòng hợp lý.
5. Nếu giá hoặc thông tin nào thiếu, không suy đoán.
6. reason phải ngắn gọn, tự nhiên, bằng tiếng Việt và giải thích điểm phù hợp thực tế.
7. tags tối đa ${MAX_AI_TAGS} nhãn ngắn, ví dụ: "Đúng ngân sách", "Rating tốt", "Có hoàn hủy".
8. Không chọn trùng hotelKey.
9. summary chỉ 1 câu ngắn mô tả cách AI đã ưu tiên lựa chọn.

Chỉ trả JSON đúng schema.`;
}

function normalizeText(
    value: unknown,
    maxLength: number,
) {
    if (typeof value !== "string") {
        return "";
    }

    return value
        .trim()
        .slice(0, maxLength);
}

function normalizeTags(value: unknown) {
    if (!Array.isArray(value)) {
        return [] as string[];
    }

    return value
        .map((tag) =>
            normalizeText(
                tag,
                36,
            ),
        )
        .filter(Boolean)
        .slice(
            0,
            MAX_AI_TAGS,
        );
}

function parseAiPayload(
    value: unknown,
    allowedKeys: Set<string>,
): AiLodgingRecommendationPayload | null {
    if (
        !value ||
        typeof value !== "object"
    ) {
        return null;
    }

    const raw = value as {
        summary?: unknown;
        recommendations?: unknown;
    };

    if (
        !Array.isArray(
            raw.recommendations,
        )
    ) {
        return null;
    }

    const usedKeys =
        new Set<string>();

    const recommendations: AiLodgingRecommendation[] =
        [];

    for (const item of raw.recommendations) {
        if (
            !item ||
            typeof item !== "object"
        ) {
            continue;
        }

        const candidate =
            item as {
                hotelKey?: unknown;
                reason?: unknown;
                tags?: unknown;
            };

        const hotelKey =
            normalizeText(
                candidate.hotelKey,
                8,
            );

        if (
            !allowedKeys.has(
                hotelKey,
            ) ||
            usedKeys.has(
                hotelKey,
            )
        ) {
            continue;
        }

        const reason =
            normalizeText(
                candidate.reason,
                240,
            );

        if (!reason) {
            continue;
        }

        usedKeys.add(
            hotelKey,
        );

        recommendations.push(
            {
                hotelKey,
                reason,
                tags: normalizeTags(
                    candidate.tags,
                ),
            },
        );

        if (
            recommendations.length >=
            MAX_AI_RECOMMENDATIONS
        ) {
            break;
        }
    }

    if (
        recommendations.length ===
        0
    ) {
        return null;
    }

    return {
        summary:
            normalizeText(
                raw.summary,
                220,
            ) ||
            "AI đã ưu tiên các lựa chọn phù hợp nhất từ dữ liệu LiteAPI.",

        recommendations,
    };
}

function scoreFallbackHotel(
    hotel: HotelSearchItem,
    input: HotelSearchInput,
) {
    let score = 0;

    if (hotel.available) {
        score += 3;
    }

    if (
        isFiniteNumber(
            hotel.rating,
        )
    ) {
        const normalizedRating =
            hotel.rating > 5
                ? hotel.rating /
                  2
                : hotel.rating;

        score += Math.min(
            5,
            Math.max(
                0,
                normalizedRating,
            ),
        );
    }

    if (
        input.maxPricePerNight &&
        hotel.currency ===
            "VND" &&
        isFiniteNumber(
            hotel.pricePerNight,
        )
    ) {
        if (
            hotel.pricePerNight <=
            input.maxPricePerNight
        ) {
            score += 4;
        } else {
            score -= 4;
        }
    }

    if (
        hotel.refundable ===
        true
    ) {
        score += 0.75;
    }

    if (
        hotel.taxesIncluded ===
        true
    ) {
        score += 0.25;
    }

    return score;
}

function fallbackRecommendations(
    input: HotelSearchInput,
    items: HotelSearchItem[],
) {
    return items
        .map(
            (
                hotel,
                index,
            ) => ({
                hotelKey:
                    makeHotelKey(
                        index,
                    ),
                hotel,
                score: scoreFallbackHotel(
                    hotel,
                    input,
                ),
            }),
        )
        .sort(
            (
                a,
                b,
            ) =>
                b.score -
                a.score,
        )
        .slice(
            0,
            MAX_AI_RECOMMENDATIONS,
        )
        .map(
            ({
                hotelKey,
                hotel,
            }) => {
                const reasons: string[] =
                    [];

                if (
                    input.maxPricePerNight &&
                    hotel.currency ===
                        "VND" &&
                    isFiniteNumber(
                        hotel.pricePerNight,
                    ) &&
                    hotel.pricePerNight <=
                        input.maxPricePerNight
                ) {
                    reasons.push(
                        "nằm trong ngân sách bạn đặt ra",
                    );
                }

                if (
                    isFiniteNumber(
                        hotel.rating,
                    )
                ) {
                    reasons.push(
                        "có rating tốt trong nhóm kết quả",
                    );
                }

                if (
                    hotel.refundable ===
                    true
                ) {
                    reasons.push(
                        "có lựa chọn hoàn hủy",
                    );
                }

                return {
                    hotelKey,

                    reason:
                        reasons.length >
                        0
                            ? `Lựa chọn này ${reasons.join(
                                  ", ",
                              )}.`
                            : "Đây là một trong các lựa chọn phù hợp nhất từ kết quả LiteAPI hiện có.",

                    tags: [
                        input.maxPricePerNight &&
                        hotel.currency ===
                            "VND" &&
                        isFiniteNumber(
                            hotel.pricePerNight,
                        ) &&
                        hotel.pricePerNight <=
                            input.maxPricePerNight
                            ? "Đúng ngân sách"
                            : "LiteAPI đề xuất",

                        isFiniteNumber(
                            hotel.rating,
                        )
                            ? "Rating tốt"
                            : "Có phòng",

                        hotel.refundable ===
                        true
                            ? "Có hoàn hủy"
                            : "",
                    ].filter(
                        Boolean,
                    ),
                } satisfies AiLodgingRecommendation;
            },
        );
}

function mergeRecommendations(
    result: HotelSearchResult,
    recommendations: AiLodgingRecommendation[],
) {
    const recommendationMap =
        new Map(
            recommendations.map(
                (
                    item,
                    index,
                ) => [
                    item.hotelKey,
                    {
                        ...item,
                        rank:
                            index +
                            1,
                    },
                ],
            ),
        );

    const enriched =
        result.items.map(
            (
                hotel,
                index,
            ) => {
                const hotelKey =
                    makeHotelKey(
                        index,
                    );

                const recommendation =
                    recommendationMap.get(
                        hotelKey,
                    );

                return {
                    ...hotel,

                    googleMapsUrl:
                        buildGoogleMapsUrl(
                            hotel,
                            result.locationName,
                        ),

                    aiRecommended:
                        Boolean(
                            recommendation,
                        ),

                    recommendationRank:
                        recommendation?.rank,

                    aiReason:
                        recommendation?.reason,

                    aiTags:
                        recommendation?.tags,
                } satisfies RecommendedHotelSearchItem;
            },
        );

    return enriched.sort(
        (
            a,
            b,
        ) => {
            const rankA =
                a.recommendationRank ??
                Number.MAX_SAFE_INTEGER;

            const rankB =
                b.recommendationRank ??
                Number.MAX_SAFE_INTEGER;

            return (
                rankA -
                rankB
            );
        },
    );
}

export async function recommendTravelLodgingWithAiService(
    input: {
        searchInput: HotelSearchInput;
        searchResult: HotelSearchResult;
    },
): Promise<RecommendedHotelSearchResult> {
    const {
        searchInput,
        searchResult,
    } = input;

    if (
        searchResult.items
            .length === 0
    ) {
        return {
            ...searchResult,
            items: [],
        };
    }

    const candidates =
        searchResult.items.map(
            (
                hotel,
                index,
            ) => ({
                hotelKey:
                    makeHotelKey(
                        index,
                    ),
                hotel,
            }),
        );

    const allowedKeys =
        new Set(
            candidates.map(
                (
                    candidate,
                ) =>
                    candidate.hotelKey,
            ),
        );

    try {
        const aiRaw =
            await generateGeminiJson(
                {
                    prompt:
                        buildRecommendationPrompt(
                            searchInput,
                            candidates,
                        ),

                    schema: {
                        type: "object",

                        additionalProperties:
                            false,

                        required: [
                            "summary",
                            "recommendations",
                        ],

                        properties:
                            {
                                summary:
                                    {
                                        type: "string",
                                    },

                                recommendations:
                                    {
                                        type: "array",

                                        maxItems:
                                            MAX_AI_RECOMMENDATIONS,

                                        items: {
                                            type: "object",

                                            additionalProperties:
                                                false,

                                            required:
                                                [
                                                    "hotelKey",
                                                    "reason",
                                                    "tags",
                                                ],

                                            properties:
                                                {
                                                    hotelKey:
                                                        {
                                                            type: "string",

                                                            enum: Array.from(
                                                                allowedKeys,
                                                            ),
                                                        },

                                                    reason:
                                                        {
                                                            type: "string",
                                                        },

                                                    tags: {
                                                        type: "array",

                                                        maxItems:
                                                            MAX_AI_TAGS,

                                                        items: {
                                                            type: "string",
                                                        },
                                                    },
                                                },
                                        },
                                    },
                            },
                    },
                },
            );

        const parsed =
            parseAiPayload(
                aiRaw,
                allowedKeys,
            );

        if (!parsed) {
            throw new Error(
                "AI lodging recommendation payload không hợp lệ.",
            );
        }

        return {
            ...searchResult,

            items: mergeRecommendations(
                searchResult,
                parsed.recommendations,
            ),

            aiRecommendation:
                {
                    generatedBy:
                        "gemini",

                    summary:
                        parsed.summary,

                    recommendedCount:
                        parsed
                            .recommendations
                            .length,
                },
        };
    } catch (error) {
        console.error(
            "[AI LODGING RECOMMENDATION ERROR]",
            error,
        );

        const fallback =
            fallbackRecommendations(
                searchInput,
                searchResult.items,
            );

        return {
            ...searchResult,

            items: mergeRecommendations(
                searchResult,
                fallback,
            ),

            aiRecommendation:
                {
                    generatedBy:
                        "fallback",

                    summary:
                        "SmartTrip đã ưu tiên các lựa chọn phù hợp nhất từ dữ liệu LiteAPI hiện có.",

                    recommendedCount:
                        fallback.length,
                },
        };
    }
}