import "server-only";

import { z } from "zod";

import {
    FOOD_DEMO_LOCATIONS,
    type FoodDemoLocation,
} from "@/src/constants/food-demo-locations";
import { generateGeminiLooseJson } from "@/src/lib/ai/gemini";
import type { AiFoodSearchRequest } from "@/src/schemas/ai-food-search.schema";
import { searchNearbyRestaurantsService } from "@/src/services/restaurant.service";

const ALLOWED_TAGS = [
    "local",
    "family",
    "mild",
    "spicy",
    "street-food",
    "budget",
    "night",
    "riverside",
    "quiet",
    "walking",
    "vegetarian-friendly",
    "breakfast",
    "lunch",
    "dinner",
] as const;

type AllowedTag = (typeof ALLOWED_TAGS)[number];

type FoodSort =
    | "best_match"
    | "distance"
    | "rating";

type FoodPreferencePatch = {
    maxPrice?: number;
    openLate?: boolean;
    familyFriendly?: boolean;
    localOnly?: boolean;
    tags?: AllowedTag[];
    sort?: FoodSort;
    radiusKm?: number;
};

const aiFoodExtractionSchema = z.object({
    filters: z
        .object({
            maxPrice: z.coerce
                .number()
                .int()
                .positive()
                .max(20_000_000)
                .nullable()
                .optional(),
            openLate: z
                .boolean()
                .optional(),
            familyFriendly: z
                .boolean()
                .optional(),
            localOnly: z
                .boolean()
                .optional(),
            tags: z
                .array(
                    z.enum(ALLOWED_TAGS),
                )
                .max(8)
                .optional(),
            sort: z
                .enum([
                    "best_match",
                    "distance",
                    "rating",
                ])
                .optional(),
            radiusKm: z.coerce
                .number()
                .min(0.5)
                .max(20)
                .nullable()
                .optional(),
        })
        .optional(),
    recommendations: z
        .array(
            z.object({
                key: z
                    .string()
                    .regex(/^R\d{2}$/),
                reason: z
                    .string()
                    .trim()
                    .min(1)
                    .max(220),
                tags: z
                    .array(z.string())
                    .max(4)
                    .optional(),
            }),
        )
        .max(8)
        .optional(),
    summary: z
        .string()
        .trim()
        .min(1)
        .max(400)
        .optional(),
});

function normalizeText(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .replace(/[^a-z0-9\s.-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function clampRadius(value: number) {
    return Math.min(
        20,
        Math.max(0.5, value),
    );
}

function parseMoney(
    rawNumber: string,
    rawUnit?: string,
) {
    const normalizedNumber = rawNumber
        .replace(/,/g, ".")
        .trim();
    const number = Number(normalizedNumber);

    if (!Number.isFinite(number)) {
        return undefined;
    }

    const unit = normalizeText(
        rawUnit ?? "",
    );

    if (
        unit === "trieu" ||
        unit === "m"
    ) {
        return Math.round(
            number * 1_000_000,
        );
    }

    if (
        unit === "k" ||
        unit === "nghin" ||
        unit === "ngan"
    ) {
        return Math.round(
            number * 1_000,
        );
    }

    /**
     * Trong ngữ cảnh giá món ăn, các số 20–500 thường là nghìn đồng.
     * Chỉ áp dụng khi pattern đã có từ khóa giá/ngân sách ở deterministic parser.
     */
    if (number >= 20 && number <= 500) {
        return Math.round(
            number * 1_000,
        );
    }

    return Math.round(number);
}

function resolveDemoLocationFromMessage(
    message: string,
): FoodDemoLocation | null {
    const normalized = normalizeText(message);

    const aliasGroups: Array<{
        locationId: string;
        aliases: string[];
    }> = [
        {
            locationId:
                "demo-da-nang-dragon-bridge",
            aliases: [
                "cau rong",
                "dragon bridge",
                "trung tam da nang",
                "da nang",
            ],
        },
        {
            locationId:
                "demo-da-nang-my-khe",
            aliases: [
                "my khe",
                "bien my khe",
            ],
        },
        {
            locationId:
                "demo-hoi-an-old-town",
            aliases: [
                "pho co hoi an",
                "hoi an",
            ],
        },
        {
            locationId:
                "demo-hue-imperial-city",
            aliases: [
                "dai noi hue",
                "dai noi",
                "kinh thanh hue",
                "hue",
            ],
        },
        {
            locationId:
                "demo-hue-dong-ba",
            aliases: [
                "cho dong ba",
                "dong ba",
            ],
        },
    ];

    /** Alias cụ thể dài hơn được ưu tiên. */
    const matches = aliasGroups
        .flatMap((group) =>
            group.aliases.map(
                (alias) => ({
                    ...group,
                    alias,
                }),
            ),
        )
        .filter((entry) =>
            normalized.includes(
                entry.alias,
            ),
        )
        .sort(
            (a, b) =>
                b.alias.length -
                a.alias.length,
        );

    const targetId =
        matches[0]?.locationId;

    if (!targetId) {
        return null;
    }

    return (
        FOOD_DEMO_LOCATIONS.find(
            (item) =>
                item.id === targetId,
        ) ?? null
    );
}

function parseDeterministicPreferences(
    message: string,
): FoodPreferencePatch {
    const normalized = normalizeText(message);
    const patch: FoodPreferencePatch = {};

    const priceMatch = normalized.match(
        /(?:duoi|toi da|khong qua|ngan sach|gia|tam|khoang)\s*(?:la\s*)?(\d+(?:[.,]\d+)?)\s*(trieu|nghin|ngan|k|m)?\b/,
    );

    if (priceMatch) {
        const maxPrice = parseMoney(
            priceMatch[1],
            priceMatch[2],
        );

        if (maxPrice) {
            patch.maxPrice = maxPrice;
        }
    }

    const radiusMatch = normalized.match(
        /(?:ban kinh|trong vong|quanh day|gan day)?\s*(\d+(?:[.,]\d+)?)\s*km\b/,
    );

    if (radiusMatch) {
        const radius = Number(
            radiusMatch[1].replace(
                ",",
                ".",
            ),
        );

        if (Number.isFinite(radius)) {
            patch.radiusKm =
                clampRadius(radius);
        }
    }

    if (
        /\b(an dem|dem muon|toi muon|khuya|mo muon|sau 21|sau 22)\b/.test(
            normalized,
        )
    ) {
        patch.openLate = true;
    }

    if (
        /\b(gia dinh|tre em|tre nho|con nho|em be|di voi con|cho be)\b/.test(
            normalized,
        )
    ) {
        patch.familyFriendly = true;
    }

    if (
        /\b(local|dia phuong|dac san|ban dia|nguoi dia phuong)\b/.test(
            normalized,
        )
    ) {
        patch.localOnly = true;
    }

    if (
        /\b(gan nhat|gan toi nhat|di bo gan)\b/.test(
            normalized,
        )
    ) {
        patch.sort = "distance";
    } else if (
        /\b(rating cao|danh gia cao|nhieu sao|tot nhat)\b/.test(
            normalized,
        )
    ) {
        patch.sort = "rating";
    }

    const tags = new Set<AllowedTag>();

    if (patch.localOnly) {
        tags.add("local");
    }
    if (patch.familyFriendly) {
        tags.add("family");
    }
    if (patch.openLate) {
        tags.add("night");
    }

    /**
     * Cay / ít cay là hai tín hiệu loại trừ nhau.
     *
     * Bản cũ có regex `\b(cay|...)\b` nên câu "ít cay"
     * vừa match `mild` vừa match `spicy`. Xử lý riêng trước
     * để deterministic parser luôn ưu tiên ý phủ định / giảm cay.
     */
    const mildRequested =
        /\b(it cay|khong cay|nhe vi|vi nhe|cay nhe)\b/.test(
            normalized,
        );

    const spicyRequested =
        !mildRequested &&
        /\b(rat cay|cay nhieu|thich cay|muon cay|an cay)\b/.test(
            normalized,
        );

    if (mildRequested) {
        tags.add("mild");
    } else if (spicyRequested) {
        tags.add("spicy");
    }

    const tagSignals: Array<{
        pattern: RegExp;
        tag: AllowedTag;
    }> = [
        {
            pattern:
                /\b(an vat|street food|via he|duong pho)\b/,
            tag: "street-food",
        },
        {
            pattern:
                /\b(re|binh dan|tiet kiem|budget)\b/,
            tag: "budget",
        },
        {
            pattern:
                /\b(ven song|song han|bo song)\b/,
            tag: "riverside",
        },
        {
            pattern:
                /\b(yen tinh|nhe nhang)\b/,
            tag: "quiet",
        },
        {
            pattern:
                /\b(di bo|walking)\b/,
            tag: "walking",
        },
        {
            pattern:
                /\b(chay|vegetarian|rau cu)\b/,
            tag: "vegetarian-friendly",
        },
        {
            pattern:
                /\b(an sang|breakfast)\b/,
            tag: "breakfast",
        },
        {
            pattern:
                /\b(an trua|bua trua|lunch)\b/,
            tag: "lunch",
        },
        {
            pattern:
                /\b(an toi|bua toi|dinner)\b/,
            tag: "dinner",
        },
    ];

    for (const signal of tagSignals) {
        if (
            signal.pattern.test(
                normalized,
            )
        ) {
            tags.add(signal.tag);
        }
    }

    if (tags.size > 0) {
        patch.tags = Array.from(tags);
    }

    return patch;
}

function mergePreferences(
    ai: FoodPreferencePatch,
    deterministic: FoodPreferencePatch,
    defaultRadius: number,
) {
    const tagSet = new Set<AllowedTag>(
        [
            ...(ai.tags ?? []),
            ...(deterministic.tags ?? []),
        ].filter(
            (tag): tag is AllowedTag =>
                ALLOWED_TAGS.includes(
                    tag as AllowedTag,
                ),
        ),
    );

    /**
     * Deterministic parser được ưu tiên khi có mâu thuẫn.
     * Gemini đôi lúc có thể trả cả `mild` và `spicy` dù user
     * nói "ít cay". Không để hai tag đối nghịch cùng tồn tại.
     */
    const deterministicTags = new Set(
        deterministic.tags ?? [],
    );

    if (deterministicTags.has("mild")) {
        tagSet.delete("spicy");
    } else if (
        deterministicTags.has("spicy")
    ) {
        tagSet.delete("mild");
    } else if (
        tagSet.has("mild") &&
        tagSet.has("spicy")
    ) {
        // Không có tín hiệu deterministic để phân xử: ưu tiên mild
        // vì đây là lựa chọn an toàn hơn cho recommendation gia đình.
        tagSet.delete("spicy");
    }

    const tags = Array.from(tagSet);

    return {
        maxPrice:
            deterministic.maxPrice ??
            ai.maxPrice,
        openLate:
            deterministic.openLate ??
            ai.openLate ??
            false,
        familyFriendly:
            deterministic.familyFriendly ??
            ai.familyFriendly ??
            false,
        localOnly:
            deterministic.localOnly ??
            ai.localOnly ??
            false,
        tags,
        sort:
            deterministic.sort ??
            ai.sort ??
            "best_match",
        radiusKm:
            deterministic.radiusKm ??
            ai.radiusKm ??
            defaultRadius,
    } satisfies Required<
        Omit<
            FoodPreferencePatch,
            "maxPrice"
        >
    > & {
        maxPrice?: number;
    };
}

function candidateText(
    item: Awaited<
        ReturnType<
            typeof searchNearbyRestaurantsService
        >
    >["items"][number],
) {
    return normalizeText(
        [
            item.name,
            item.description,
            item.address,
            ...(item.tags ?? []),
            ...item.cuisines.flatMap(
                (cuisine) => [
                    cuisine.name,
                    cuisine.nameEn,
                    cuisine.slug,
                ],
            ),
        ]
            .filter(Boolean)
            .join(" "),
    );
}

function getQueryKeywords(message: string) {
    const stopWords = new Set([
        "tim",
        "quan",
        "an",
        "mon",
        "gan",
        "toi",
        "cho",
        "minh",
        "muon",
        "thich",
        "duoi",
        "khoang",
        "gia",
        "ngan",
        "sach",
        "dia",
        "phuong",
        "local",
        "ngon",
        "phu",
        "hop",
        "nhat",
        "o",
        "tai",
        "va",
        "voi",
        "cua",
        "trong",
        "ban",
        "kinh",
        "km",
        "nguoi",
        "gia",
        "dinh",
    ]);

    return normalizeText(message)
        .split(" ")
        .filter(
            (token) =>
                token.length >= 3 &&
                !stopWords.has(token) &&
                !/^\d/.test(token),
        )
        .slice(0, 10);
}

function keywordScore(
    message: string,
    text: string,
) {
    const keywords =
        getQueryKeywords(message);

    if (keywords.length === 0) {
        return 0;
    }

    const matched = keywords.filter(
        (keyword) =>
            text.includes(keyword),
    ).length;

    return matched / keywords.length;
}

function passesHardFilters(
    item: Awaited<
        ReturnType<
            typeof searchNearbyRestaurantsService
        >
    >["items"][number],
    filters: ReturnType<
        typeof mergePreferences
    >,
) {
    if (
        filters.maxPrice &&
        (item.priceMin === null ||
            item.priceMin === undefined ||
            item.priceMin > filters.maxPrice)
    ) {
        return false;
    }

    if (
        filters.openLate &&
        !item.isOpenLate
    ) {
        return false;
    }

    if (
        filters.familyFriendly &&
        !item.isFamilyFriendly
    ) {
        return false;
    }

    if (
        filters.localOnly &&
        !(item.tags ?? []).includes(
            "local",
        )
    ) {
        return false;
    }

    if (
        item.distanceKm >
        filters.radiusKm
    ) {
        return false;
    }

    return true;
}

function buildFallbackReason(
    item: Awaited<
        ReturnType<
            typeof searchNearbyRestaurantsService
        >
    >["items"][number],
    filters: ReturnType<
        typeof mergePreferences
    >,
) {
    const reasons: string[] = [];

    if (item.distanceKm <= 1) {
        reasons.push(
            `chỉ cách khoảng ${Math.round(
                item.distanceKm * 1000,
            )} m`,
        );
    }

    if (
        filters.maxPrice &&
        item.priceMin !== null &&
        item.priceMin !== undefined
    ) {
        reasons.push(
            `có món từ ${new Intl.NumberFormat(
                "vi-VN",
            ).format(item.priceMin)}đ`,
        );
    }

    if (
        filters.familyFriendly &&
        item.isFamilyFriendly
    ) {
        reasons.push(
            "phù hợp nhóm gia đình",
        );
    }

    if (
        filters.openLate &&
        item.isOpenLate
    ) {
        reasons.push(
            "phục vụ tối muộn",
        );
    }

    const cuisine =
        item.cuisines[0]?.name;
    if (cuisine) {
        reasons.push(
            `có ${cuisine}`,
        );
    }

    return reasons.length > 0
        ? `SmartTrip ưu tiên quán này vì ${reasons
              .slice(0, 3)
              .join(", ")}.`
        : "Quán có điểm phù hợp tốt dựa trên khoảng cách, đánh giá và dữ liệu ẩm thực hiện có.";
}

function sanitizeAiResult(
    raw: unknown,
) {
    const parsed =
        aiFoodExtractionSchema.safeParse(
            raw,
        );

    if (!parsed.success) {
        return null;
    }

    const filters =
        parsed.data.filters ?? {};

    const patch: FoodPreferencePatch = {
        ...(filters.maxPrice
            ? {
                  maxPrice:
                      filters.maxPrice,
              }
            : {}),
        ...(filters.openLate !==
        undefined
            ? {
                  openLate:
                      filters.openLate,
              }
            : {}),
        ...(filters.familyFriendly !==
        undefined
            ? {
                  familyFriendly:
                      filters.familyFriendly,
              }
            : {}),
        ...(filters.localOnly !==
        undefined
            ? {
                  localOnly:
                      filters.localOnly,
              }
            : {}),
        ...(filters.tags
            ? {
                  tags:
                      filters.tags,
              }
            : {}),
        ...(filters.sort
            ? {
                  sort:
                      filters.sort,
              }
            : {}),
        ...(filters.radiusKm
            ? {
                  radiusKm:
                      clampRadius(
                          filters.radiusKm,
                      ),
              }
            : {}),
    };

    return {
        patch,
        recommendations:
            parsed.data.recommendations ??
            [],
        summary:
            parsed.data.summary,
    };
}

export async function searchFoodWithAiService(
    input: AiFoodSearchRequest,
) {
    const deterministic =
        parseDeterministicPreferences(
            input.message,
        );

    const mentionedDemoLocation =
        resolveDemoLocationFromMessage(
            input.message,
        );

    const location =
        mentionedDemoLocation
            ? {
                  label:
                      mentionedDemoLocation.label,
                  latitude:
                      mentionedDemoLocation.latitude,
                  longitude:
                      mentionedDemoLocation.longitude,
                  source:
                      "demo" as const,
                  demoLocationId:
                      mentionedDemoLocation.id,
              }
            : {
                  label:
                      input.locationLabel ??
                      "Vị trí đang chọn",
                  latitude:
                      input.latitude,
                  longitude:
                      input.longitude,
                  source:
                      input.source,
                  demoLocationId:
                      undefined,
              };

    const initialRadius =
        deterministic.radiusKm ??
        input.radiusKm;

    /**
     * DB là source of truth. Lấy candidate trước rồi mới cho Gemini xếp hạng.
     * Gemini không được tự tạo tên quán ngoài candidate list.
     */
    const candidateResult =
        await searchNearbyRestaurantsService({
            latitude:
                location.latitude,
            longitude:
                location.longitude,
            radiusKm:
                initialRadius,
            source:
                location.source,
            sort:
                "best_match",
            limit:
                18,
        });

    console.info(
        "[AI FOOD SEARCH] candidates",
        {
            query: input.message,
            location: location.label,
            source: location.source,
            radiusKm: initialRadius,
            candidateCount:
                candidateResult.items.length,
        },
    );

    const candidateKeys =
        new Map<
            string,
            (typeof candidateResult.items)[number]
        >();

    const candidatePromptLines =
        candidateResult.items.map(
            (item, index) => {
                const key = `R${String(
                    index + 1,
                ).padStart(2, "0")}`;

                candidateKeys.set(
                    key,
                    item,
                );

                return [
                    key,
                    item.name,
                    `distance=${item.distanceKm}km`,
                    `rating=${item.rating ?? "?"}`,
                    `reviews=${item.reviewCount ?? 0}`,
                    `price=${item.priceMin ?? "?"}-${item.priceMax ?? "?"} VND`,
                    `tags=${(item.tags ?? []).join(",") || "none"}`,
                    `cuisines=${item.cuisines
                        .map(
                            (cuisine) =>
                                cuisine.name,
                        )
                        .join(",") || "none"}`,
                ].join(" | ");
            },
        );

    let aiResult: ReturnType<
        typeof sanitizeAiResult
    > = null;
    let generatedBy:
        | "gemini"
        | "fallback" = "fallback";

    if (
        candidatePromptLines.length > 0
    ) {
        const prompt = `
Bạn là SmartTrip AI Food Concierge cho du lịch miền Trung Việt Nam.

NHIỆM VỤ:
1. Hiểu yêu cầu tự nhiên của user.
2. Chỉ được chọn/xếp hạng các nhà hàng trong CANDIDATES bên dưới.
3. Không được bịa tên quán, giá, rating, khoảng cách hay món ăn.
4. Trích xuất filter và đưa ra tối đa 5 recommendation phù hợp nhất.

VỊ TRÍ ĐANG DÙNG:
${location.label} (${location.latitude}, ${location.longitude})

USER:
${input.message}

CANDIDATES:
${candidatePromptLines.join("\n")}

OUTPUT JSON DUY NHẤT:
{
  "filters": {
    "maxPrice": number|null,
    "openLate": boolean,
    "familyFriendly": boolean,
    "localOnly": boolean,
    "tags": ["local"|"family"|"mild"|"spicy"|"street-food"|"budget"|"night"|"riverside"|"quiet"|"walking"|"vegetarian-friendly"|"breakfast"|"lunch"|"dinner"],
    "sort": "best_match"|"distance"|"rating",
    "radiusKm": number|null
  },
  "recommendations": [
    {
      "key": "R01",
      "reason": "Lý do ngắn gọn dựa đúng dữ liệu candidate",
      "tags": ["2-4 nhãn tiếng Việt ngắn"]
    }
  ],
  "summary": "1-2 câu tiếng Việt giải thích SmartTrip hiểu user muốn gì và đã ưu tiên thế nào"
}

QUY TẮC:
- "dưới 150k" => maxPrice=150000.
- "đi với trẻ nhỏ/con/gia đình" => familyFriendly=true.
- "ăn đêm/khuya/tối muộn" => openLate=true.
- "đặc sản/local/địa phương" => localOnly=true và tags nên có local.
- "ít cay/không cay" => tags có mild.
- Nếu user không nói một filter thì để false, [] hoặc null hợp lý.
- recommendations chỉ dùng key có trong CANDIDATES.
- Không markdown, không code fence.
`.trim();

        try {
            const raw =
                await generateGeminiLooseJson({
                    prompt,
                });

            aiResult =
                sanitizeAiResult(raw);

            if (aiResult) {
                generatedBy =
                    "gemini";
            }
        } catch (error) {
            console.warn(
                "[AI FOOD SEARCH] Gemini unavailable, using deterministic fallback",
                error,
            );
        }
    }

    const filters = mergePreferences(
        aiResult?.patch ?? {},
        deterministic,
        initialRadius,
    );

    const recommendationOrder =
        new Map<
            string,
            {
                rank: number;
                reason: string;
                tags: string[];
            }
        >();

    for (
        const [
            index,
            recommendation,
        ] of (
            aiResult?.recommendations ??
            []
        ).entries()
    ) {
        if (
            !candidateKeys.has(
                recommendation.key,
            )
        ) {
            continue;
        }

        recommendationOrder.set(
            recommendation.key,
            {
                rank: index + 1,
                reason:
                    recommendation.reason,
                tags:
                    recommendation.tags ??
                    [],
            },
        );
    }

    const itemToKey = new Map<
        string,
        string
    >();
    for (const [key, item] of candidateKeys) {
        itemToKey.set(item.id, key);
    }

    const filtered = candidateResult.items
        .filter((item) =>
            passesHardFilters(
                item,
                filters,
            ),
        )
        .map((item) => {
            const key =
                itemToKey.get(
                    item.id,
                );
            const aiRecommendation = key
                ? recommendationOrder.get(
                      key,
                  )
                : undefined;

            const tags =
                item.tags ?? [];
            const preferenceTagMatches =
                filters.tags.filter(
                    (tag) =>
                        tags.includes(tag),
                ).length;

            const textScore =
                keywordScore(
                    input.message,
                    candidateText(item),
                );

            const fallbackScore =
                item.matchScore +
                preferenceTagMatches * 8 +
                textScore * 30;

            return {
                ...item,
                aiRecommended:
                    Boolean(
                        aiRecommendation,
                    ),
                recommendationRank:
                    aiRecommendation?.rank,
                aiReason:
                    aiRecommendation?.reason ??
                    buildFallbackReason(
                        item,
                        filters,
                    ),
                aiTags:
                    aiRecommendation?.tags ??
                    [],
                _rank:
                    aiRecommendation
                        ? 10_000 -
                          aiRecommendation.rank *
                              100
                        : fallbackScore,
            };
        });

    if (filters.sort === "distance") {
        filtered.sort(
            (a, b) =>
                a.distanceKm -
                b.distanceKm,
        );
    } else if (
        filters.sort === "rating"
    ) {
        filtered.sort(
            (a, b) =>
                (b.rating ?? 0) -
                    (a.rating ?? 0) ||
                a.distanceKm -
                    b.distanceKm,
        );
    } else {
        filtered.sort(
            (a, b) =>
                b._rank - a._rank,
        );
    }

    const items = filtered
        .slice(0, 6)
        .map(
            ({ _rank, ...item }) =>
                item,
        );

    const summary =
        aiResult?.summary ??
        (items.length > 0
            ? `SmartTrip tìm thấy ${items.length} lựa chọn phù hợp nhất quanh ${location.label} dựa trên vị trí, ngân sách và sở thích bạn vừa mô tả.`
            : `SmartTrip chưa tìm thấy quán nào đáp ứng đủ yêu cầu quanh ${location.label}. Bạn có thể nới ngân sách hoặc bỏ bớt một điều kiện.`);

    console.info(
        "[AI FOOD SEARCH] result",
        {
            generatedBy,
            location: location.label,
            interpreted: filters,
            matched: filtered.length,
            returned: items.length,
        },
    );

    return {
        query: input.message,
        summary,
        interpreted: {
            maxPrice:
                filters.maxPrice,
            openLate:
                filters.openLate,
            familyFriendly:
                filters.familyFriendly,
            localOnly:
                filters.localOnly,
            tags:
                filters.tags,
            sort:
                filters.sort,
            radiusKm:
                filters.radiusKm,
        },
        location,
        items,
        meta: {
            generatedBy,
            totalCandidates:
                candidateResult.items
                    .length,
            totalMatched:
                filtered.length,
            returned:
                items.length,
            isDemoData:
                items.some(
                    (item) =>
                        item.source ===
                        "demo",
                ),
        },
    };
}