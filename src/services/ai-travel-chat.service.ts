import "server-only";

import {
    generateGeminiLooseJson,
} from "@/src/lib/ai/gemini";

import type {
    AiTravelChatRequest,
    PlannerConversationStateInput,
} from "@/src/schemas/ai-travel-chat.schema";

import type {
    TravelChatAction,
    TravelChatIntent,
    TravelChatServerResponse,
    TravelQuickReply,
} from "@/src/components/planner/ai/chat/ai-travel-chat.types";

type StatePatch =
    Partial<PlannerConversationStateInput> & {
        locationName?: string;
    };

type ConversationScope =
    | "travel"
    | "unsupported_destination"
    | "off_topic";

type AiExtraction = {
    patch?: StatePatch;
    intent?: TravelChatIntent;
    scope?: ConversationScope;
    removeLodgingRequirements?: string[];
    requestedLocationName?: string;
};

const INTEREST_RULES: Array<{
    value: string;
    keywords: string[];
}> = [
    {
        value: "Biển",
        keywords: [
            "bien",
            "bai bien",
            "tam bien",
        ],
    },
    {
        value: "Ẩm thực",
        keywords: [
            "an uong",
            "am thuc",
            "food",
            "hai san",
            "mon ngon",
        ],
    },
    {
        value: "Văn hóa - lịch sử",
        keywords: [
            "van hoa",
            "lich su",
            "bao tang",
            "di tich",
        ],
    },
    {
        value: "Thiên nhiên",
        keywords: [
            "thien nhien",
            "nui",
            "rung",
            "mat me",
            "mat ma",
            "thac",
        ],
    },
    {
        value: "Tâm linh",
        keywords: [
            "tam linh",
            "chua",
            "den",
            "thien vien",
        ],
    },
    {
        value: "Chụp ảnh",
        keywords: [
            "chup anh",
            "song ao",
            "check in",
            "check-in",
        ],
    },
    {
        value: "Chợ - mua sắm",
        keywords: [
            "cho",
            "mua sam",
            "shopping",
        ],
    },
    {
        value: "Trải nghiệm địa phương",
        keywords: [
            "dia phuong",
            "ve dem",
            "ban dem",
            "night",
            "chill",
            "local",
        ],
    },
];

const LODGING_REQUIREMENT_RULES = [
    {
        value: "Gần biển",
        keywords: [
            "gan bien",
            "sat bien",
            "gan bai bien",
            "ven bien",
            "beachfront",
            "near beach",
        ],
    },
    {
        value: "Yên tĩnh",
        keywords: [
            "yen tinh",
            "it on",
            "khong on",
            "quiet",
        ],
    },
    {
        value: "View đẹp",
        keywords: [
            "view dep",
            "view bien",
            "view nui",
            "view thanh pho",
            "scenic view",
        ],
    },
    {
        value: "Có chỗ đậu xe",
        keywords: [
            "cho dau xe",
            "bai dau xe",
            "dau o to",
            "parking",
        ],
    },
    {
        value: "Có hồ bơi",
        keywords: [
            "ho boi",
            "be boi",
            "pool",
            "swimming pool",
        ],
    },
    {
        value: "Có ăn sáng",
        keywords: [
            "an sang",
            "bao gom an sang",
            "breakfast",
        ],
    },
    {
        value: "Gần trung tâm",
        keywords: [
            "gan trung tam",
            "trung tam thanh pho",
            "city center",
            "city centre",
        ],
    },
    {
        value: "Gần khu ẩm thực",
        keywords: [
            "gan quan an",
            "gan khu an uong",
            "gan am thuc",
            "nhieu quan an",
        ],
    },
    {
        value: "Phù hợp gia đình",
        keywords: [
            "gia dinh",
            "family friendly",
            "phu hop tre em",
        ],
    },
    {
        value: "Có ban công",
        keywords: [
            "ban cong",
            "balcony",
        ],
    },
    {
        value: "Cho phép thú cưng",
        keywords: [
            "thu cung",
            "pet friendly",
            "cho cho meo",
        ],
    },
    {
        value: "Gần sân bay",
        keywords: [
            "gan san bay",
            "near airport",
        ],
    },
];


function canonicalizeLodgingRequirement(
    value: string,
) {
    const normalized =
        normalizeText(
            value,
        );

    if (!normalized) {
        return "";
    }

    for (
        const rule of
        LODGING_REQUIREMENT_RULES
    ) {
        if (
            normalizeText(
                rule.value,
            ) ===
                normalized ||
            rule.keywords.some(
                (keyword) =>
                    normalized.includes(
                        normalizeText(
                            keyword,
                        ),
                    ) ||
                    normalizeText(
                        keyword,
                    ).includes(
                        normalized,
                    ),
            )
        ) {
            return rule.value;
        }
    }

    return value
        .trim()
        .slice(
            0,
            100,
        );
}

/* -------------------------------------------------------------------------- */
/* Text helpers                                                               */
/* -------------------------------------------------------------------------- */

function normalizeText(
    value: string,
) {
    return value
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            "",
        )
        .replace(
            /đ/g,
            "d",
        )
        .replace(
            /Đ/g,
            "D",
        )
        .toLowerCase()
        .replace(
            /[^a-z0-9\s./-]/g,
            " ",
        )
        .replace(
            /\s+/g,
            " ",
        )
        .trim();
}

function getVietnamToday() {
    const parts =
        new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone:
                    "Asia/Ho_Chi_Minh",
                year:
                    "numeric",
                month:
                    "2-digit",
                day:
                    "2-digit",
            },
        ).formatToParts(
            new Date(),
        );

    const year =
        parts.find(
            (part) =>
                part.type ===
                "year",
        )?.value;

    const month =
        parts.find(
            (part) =>
                part.type ===
                "month",
        )?.value;

    const day =
        parts.find(
            (part) =>
                part.type ===
                "day",
        )?.value;

    return `${year}-${month}-${day}`;
}

function toIsoDate(
    day: number,
    month: number,
    year: number,
) {
    const date =
        new Date(
            Date.UTC(
                year,
                month - 1,
                day,
            ),
        );

    if (
        date.getUTCFullYear() !==
            year ||
        date.getUTCMonth() !==
            month - 1 ||
        date.getUTCDate() !==
            day
    ) {
        return undefined;
    }

    return `${year}-${String(
        month,
    ).padStart(
        2,
        "0",
    )}-${String(
        day,
    ).padStart(
        2,
        "0",
    )}`;
}

function addDaysToIso(
    iso: string,
    days: number,
) {
    const [
        year,
        month,
        day,
    ] =
        iso
            .split("-")
            .map(
                Number,
            );

    const date =
        new Date(
            Date.UTC(
                year,
                month - 1,
                day,
            ),
        );

    date.setUTCDate(
        date.getUTCDate() +
            days,
    );

    return date
        .toISOString()
        .slice(
            0,
            10,
        );
}

function sanitizeChildAges(
    values: unknown[],
) {
    return values
        .filter(
            (
                value,
            ): value is number =>
                typeof value ===
                    "number" &&
                Number.isFinite(
                    value,
                ),
        )
        .map(
            (value) =>
                Math.trunc(
                    value,
                ),
        )
        .filter(
            (value) =>
                value >= 0 &&
                value <= 17,
        )
        .slice(
            0,
            20,
        );
}

function extractChildAgesFromMessage(
    normalized: string,
    knownChildCount: number,
) {
    const hasChildContext =
        knownChildCount >
            0 ||
        /\b(con|be|tre|tre em)\b/.test(
            normalized,
        );

    if (
        !hasChildContext
    ) {
        return [];
    }

    /**
     * Case:
     *
     * "5 và 8 tuổi"
     * "5 8 tuổi"
     *
     * Dấu "," đã bị normalizeText bỏ đi,
     * nên "5, 8 tuổi" có thể thành "5 8 tuoi".
     */
    const compactPair =
        normalized.match(
            /\b(\d{1,2})\s+(?:va\s+)?(\d{1,2})\s*tuoi\b/,
        );

    if (
        compactPair
    ) {
        return sanitizeChildAges(
            [
                Number(
                    compactPair[
                        1
                    ],
                ),
                Number(
                    compactPair[
                        2
                    ],
                ),
            ],
        );
    }

    /**
     * Case:
     *
     * "5 tuổi"
     * "bé 5 tuổi"
     * "con tôi 5 tuổi"
     * "bé 5 tuổi và bé 8 tuổi"
     */
    const explicitAges =
        Array.from(
            normalized.matchAll(
                /\b(\d{1,2})\s*tuoi\b/g,
            ),
        ).map(
            (match) =>
                Number(
                    match[1],
                ),
        );

    if (
        explicitAges.length >
        0
    ) {
        return sanitizeChildAges(
            explicitAges,
        );
    }

    /**
     * Hỗ trợ thêm dạng:
     *
     * "bé 5"
     * "bé 5, bé 8"
     *
     * Chỉ chạy khi conversation đã có child context.
     */
    const shortAges =
        Array.from(
            normalized.matchAll(
                /\b(?:be|con)\s+(\d{1,2})\b/g,
            ),
        ).map(
            (match) =>
                Number(
                    match[1],
                ),
        );

    return sanitizeChildAges(
        shortAges,
    );
}

function mergeChildAges(
    currentAges: number[],
    incomingAges: number[],
    childCount: number,
) {
    if (
        childCount <= 0
    ) {
        return [];
    }

    const current =
        sanitizeChildAges(
            currentAges,
        ).slice(
            0,
            childCount,
        );

    const incoming =
        sanitizeChildAges(
            incomingAges,
        );

    if (
        incoming.length ===
        0
    ) {
        return current;
    }

    /**
     * User vừa gửi đầy đủ tuổi tất cả trẻ
     * -> lấy dữ liệu mới.
     */
    if (
        incoming.length >=
        childCount
    ) {
        return incoming.slice(
            0,
            childCount,
        );
    }

    /**
     * Chỉ có 1 trẻ và user nói lại tuổi
     * -> hiểu là cập nhật/correction.
     */
    if (
        childCount ===
            1 &&
        current.length ===
            1
    ) {
        return [
            incoming[0],
        ];
    }

    /**
     * Conversation đang thiếu tuổi.
     *
     * Ví dụ:
     *
     * childCount = 2
     * current = [5]
     *
     * user: "8 tuổi"
     *
     * => [5, 8]
     */
    if (
        current.length <
        childCount
    ) {
        return [
            ...current,
            ...incoming,
        ].slice(
            0,
            childCount,
        );
    }

    return current;
}

function hasRecentLodgingContext(
    input: AiTravelChatRequest,
) {
    if (
        input.state
            .lodgingBudgetPerNight
    ) {
        return true;
    }

    const recentText =
        (
            input.history ??
            []
        )
            .slice(
                -6,
            )
            .map(
                (item) =>
                    item.content,
            )
            .join(
                " ",
            );

    const normalized =
        normalizeText(
            recentText,
        );

    return /\b(hotel|khach san|homestay|phong|cho o|luu tru|liteapi|gia phong)\b/.test(
        normalized,
    );
}

/* -------------------------------------------------------------------------- */
/* Scope helpers                                                              */
/* -------------------------------------------------------------------------- */

function findSupportedLocation(
    locationName: string,
    input: AiTravelChatRequest,
) {
    const target =
        normalizeText(
            locationName,
        );

    if (!target) {
        return null;
    }

    return (
        input.locations.find(
            (location) => {
                const name =
                    normalizeText(
                        location.name,
                    );

                const slug =
                    normalizeText(
                        location.slug.replace(
                            /-/g,
                            " ",
                        ),
                    );

                return (
                    name ===
                        target ||
                    slug ===
                        target ||
                    name.includes(
                        target,
                    ) ||
                    target.includes(
                        name,
                    )
                );
            },
        ) ??
        null
    );
}

function supportedLocationQuickReplies(
    input: AiTravelChatRequest,
    limit = 4,
): TravelQuickReply[] {
    return input.locations
        .slice(
            0,
            limit,
        )
        .map(
            (location) => ({
                label:
                    location.name,

                value:
                    `Tôi muốn đi ${location.name}`,

                action:
                    "send" as const,
            }),
        );
}

function buildSupportedLocationNames(
    input: AiTravelChatRequest,
) {
    const names =
        input.locations
            .slice(
                0,
                8,
            )
            .map(
                (location) =>
                    location.name,
            );

    if (
        names.length ===
        0
    ) {
        return "";
    }

    return names.join(
        ", ",
    );
}

/**
 * Guard cực nhanh cho một số câu chắc chắn là trạng thái/casual chat,
 * không có yêu cầu du lịch.
 *
 * Mục tiêu:
 * - "tôi buồn ngủ"
 * - "tôi mệt quá"
 * - "tôi chán"
 *
 * Những câu như:
 * "tôi mệt nên ngày 2 đi nhẹ thôi"
 * KHÔNG bị block vì regex yêu cầu gần như toàn bộ câu chỉ là trạng thái.
 */
function isClearlyOffTopicCasual(
    message: string,
) {
    const normalized =
        normalizeText(
            message,
        );

    return /^(?:toi\s+)?(?:dang\s+)?(?:rat\s+|hoi\s+)?(?:buon ngu|met|met qua|chan|chan qua|buon|vui|doi bung|khat nuoc)(?:\s+qua)?$/.test(
        normalized,
    );
}

function createOffTopicResponse(
    input: AiTravelChatRequest,
): TravelChatServerResponse {
    const hasCurrentTrip =
        Boolean(
            input.state.locationId,
        );

    return {
        /**
         * Giữ nguyên state.
         * Tin nhắn ngoài chủ đề tuyệt đối không được ghi vào note.
         */
        state:
            input.state,

        reply:
            hasCurrentTrip
                ? "Mình chuyên hỗ trợ lên kế hoạch du lịch cho SmartTrip. Nếu câu này có liên quan đến chuyến đi, bạn có thể nói rõ hơn, ví dụ: “Tôi mệt nên ngày 2 cho lịch nhẹ hơn” hoặc “Tôi muốn nghỉ trưa nhiều hơn”."
                : "Mình là trợ lý lập kế hoạch du lịch của SmartTrip nên mình tập trung vào điểm đến, lịch trình, chỗ ở, ngân sách và thời tiết. Bạn có thể bắt đầu bằng cách nói nơi bạn muốn đi.",

        intent:
            "out_of_scope",

        action:
            "none",

        readyToGenerate:
            isReady(
                input.state,
            ),

        quickReplies:
            hasCurrentTrip
                ? [
                      {
                          label:
                              "Lịch trình thư thả hơn",

                          value:
                              "Hãy điều chỉnh lịch trình theo nhịp thư thả hơn",

                          action:
                              "send",
                      },
                  ]
                : supportedLocationQuickReplies(
                      input,
                      4,
                  ),
    };
}

function createUnsupportedDestinationResponse(
    input: AiTravelChatRequest,
    requestedLocationName?: string,
): TravelChatServerResponse {
    const supportedNames =
        buildSupportedLocationNames(
            input,
        );

    return {
        /**
         * Không thay destination hiện tại nếu user nhắc tới
         * một khu vực mà SmartTrip chưa hỗ trợ.
         */
        state:
            input.state,

        reply:
            requestedLocationName
                ? `Hiện SmartTrip AI chưa có dữ liệu RAG để lập lịch trình cho ${requestedLocationName}. Mình chỉ có thể lên plan cho các khu vực đã được hệ thống hỗ trợ${supportedNames ? `, chẳng hạn: ${supportedNames}` : ""}.`
                : `Điểm đến này hiện chưa nằm trong phạm vi dữ liệu của SmartTrip AI${supportedNames ? `. Các khu vực đang hỗ trợ gồm: ${supportedNames}` : ""}.`,

        intent:
            "unsupported_destination",

        action:
            "none",

        readyToGenerate:
            isReady(
                input.state,
            ),

        quickReplies:
            supportedLocationQuickReplies(
                input,
                4,
            ),
    };
}

/* -------------------------------------------------------------------------- */
/* Deterministic extraction                                                   */
/* -------------------------------------------------------------------------- */

function parseDeterministicPatch(
    message: string,
    input: AiTravelChatRequest,
): StatePatch {
    const normalized =
        normalizeText(
            message,
        );

    const patch:
        StatePatch = {};

    const location =
        input.locations.find(
            (item) => {
                const normalizedName =
                    normalizeText(
                        item.name,
                    );

                const normalizedSlug =
                    normalizeText(
                        item.slug.replace(
                            /-/g,
                            " ",
                        ),
                    );

                return (
                    normalized.includes(
                        normalizedName,
                    ) ||
                    normalized.includes(
                        normalizedSlug,
                    )
                );
            },
        );

    if (location) {
        patch.locationId =
            location.id;

        patch.locationName =
            location.name;
    }

    const dayMatch =
        normalized.match(
            /\b(1|2|3|4|5|6|7)\s*ngay\b/,
        );

    if (dayMatch) {
        patch.dayCount =
            Number(
                dayMatch[1],
            );
    }

    /* ---------------------------------------------------------------------- */
    /* Traveler composition                                                    */
    /* ---------------------------------------------------------------------- */

    /**
     * Số trẻ được nói rõ:
     *
     * "1 bé"
     * "2 trẻ"
     * "2 con"
     */
    const explicitChildMatch =
        normalized.match(
            /\b(\d{1,2})\s*(?:tre em|tre|be|con)\b/,
        );

    if (
        explicitChildMatch
    ) {
        patch.childCount =
            Math.min(
                Number(
                    explicitChildMatch[
                        1
                    ],
                ),
                20,
            );
    }

    /**
     * Quan hệ gia đình dạng tự nhiên.
     *
     * Ví dụ:
     *
     * "tôi đi với vợ và con"
     * "tôi đi với chồng và con"
     * "con tôi 5 tuổi"
     *
     * Nếu không nói số lượng cụ thể,
     * hiểu ít nhất có 1 trẻ.
     */
    const hasSingularChildRelation =
        /\b(con toi|con minh|con nha toi|con nha minh|vo va con|chong va con|voi vo va con|voi chong va con|di voi con|cung con)\b/.test(
            normalized,
        );

    if (
        patch.childCount ===
            undefined &&
        hasSingularChildRelation
    ) {
        patch.childCount =
            Math.max(
                input.state
                    .childCount ??
                    0,
                1,
            );
    }

    /**
     * "2 người lớn" nghĩa là adultCount = 2 trực tiếp.
     */
    const explicitAdultMatch =
        normalized.match(
            /\b(\d{1,2})\s*(?:nguoi lon|ng lon)\b/,
        );

    if (
        explicitAdultMatch
    ) {
        patch.adultCount =
            Math.min(
                Math.max(
                    Number(
                        explicitAdultMatch[
                            1
                        ],
                    ),
                    1,
                ),
                20,
            );
    }

    /**
     * "3 người" là TỔNG số khách.
     *
     * Ví dụ:
     * "3 người, tôi đi với vợ và con"
     *
     * childCount = 1
     * total = 3
     * => adultCount = 2
     */
    const peopleMatch =
        normalized.match(
            /\b(\d{1,2})\s*nguoi\b/,
        );

    if (
        peopleMatch &&
        !explicitAdultMatch
    ) {
        const total =
            Math.min(
                Number(
                    peopleMatch[
                        1
                    ],
                ),
                20,
            );

        const childCount =
            patch.childCount ??
            input.state
                .childCount ??
            0;

        patch.adultCount =
            Math.max(
                1,
                total -
                    childCount,
            );
    }

    /**
     * "tôi đi với vợ/chồng" => ít nhất 2 người lớn:
     * user + spouse.
     *
     * Chỉ áp dụng khi message không nói số người lớn/tổng người rõ ràng.
     */
    const spouseContext =
        /\btoi\b/.test(
            normalized,
        ) &&
        /\b(vo|chong)\b/.test(
            normalized,
        );

    if (
        spouseContext &&
        patch.adultCount ===
            undefined
    ) {
        patch.adultCount =
            Math.max(
                input.state
                    .adultCount ??
                    0,
                2,
            );
    }

    /**
     * Parse tuổi trẻ em.
     *
     * Nếu state đang có childCount > 0,
     * một câu ngắn như "5 tuổi" vẫn phải được hiểu
     * là tuổi của trẻ.
     */
    const knownChildCount =
        patch.childCount ??
        input.state
            .childCount ??
        0;

    const childAges =
        extractChildAgesFromMessage(
            normalized,
            knownChildCount,
        );

    if (
        childAges.length >
        0
    ) {
        patch.childAges =
            childAges;
    }

    const lodgingContext =
        /\b(hotel|khach san|homestay|phong|cho o|luu tru|nha nghi)\b/.test(
            normalized,
        );

    const hasExistingLodgingContext =
        input.state
            .lodgingPreference !==
            "any" ||
        Boolean(
            input.state
                .lodgingBudgetPerNight,
        ) ||
        (
            input.state
                .lodgingRequirements
                ?.length ??
            0
        ) > 0;

    const perNightContext =
        /\b(dem|moi dem|mot dem|night|per night)\b/.test(
            normalized,
        );

    const millionMatch =
        normalized.match(
            /(\d+(?:[.,]\d+)?)\s*(?:trieu|tr)\b/,
        );

    const thousandMatch =
        normalized.match(
            /(\d+(?:[.,]\d+)?)\s*(?:nghin|ngan|k)\b/,
        );

    const parsedMoney =
        millionMatch
            ? Math.round(
                  Number(
                      millionMatch[
                          1
                      ].replace(
                          ",",
                          ".",
                      ),
                  ) *
                      1_000_000,
              )
            : thousandMatch
              ? Math.round(
                    Number(
                        thousandMatch[
                            1
                        ].replace(
                            ",",
                            ".",
                        ),
                    ) *
                        1_000,
                )
              : undefined;

    if (parsedMoney) {
        if (
            (
                lodgingContext ||
                hasExistingLodgingContext
            ) &&
            perNightContext
        ) {
            patch.lodgingBudgetPerNight =
                parsedMoney;
        } else {
            patch.budget =
                parsedMoney;
        }
    }

    if (
        /\bhomestay\b/.test(
            normalized,
        )
    ) {
        patch.lodgingPreference =
            "homestay";
    } else if (
        /\b(hotel|khach san)\b/.test(
            normalized,
        )
    ) {
        patch.lodgingPreference =
            "hotel";
    }

    /*
     * Deterministic lodging extraction:
     * - Bắt được ngay cả khi Gemini lỗi.
     * - Nếu user đang có lodging context, câu nối tiếp như
     *   "thêm hồ bơi và parking" vẫn được hiểu đúng.
     *
     * Việc XÓA requirement được Gemini trả qua
     * removeLodgingRequirements và xử lý ở mergeState().
     */
    if (
        lodgingContext ||
        hasExistingLodgingContext
    ) {
        const requirements =
            new Map<
                string,
                string
            >();

        for (
            const requirement of
            input.state
                .lodgingRequirements ??
                []
        ) {
            const canonical =
                canonicalizeLodgingRequirement(
                    requirement,
                );

            if (canonical) {
                requirements.set(
                    normalizeText(
                        canonical,
                    ),
                    canonical,
                );
            }
        }

        for (
            const rule of
            LODGING_REQUIREMENT_RULES
        ) {
            if (
                rule.keywords.some(
                    (keyword) =>
                        normalized.includes(
                            normalizeText(
                                keyword,
                            ),
                        ),
                )
            ) {
                requirements.set(
                    normalizeText(
                        rule.value,
                    ),
                    rule.value,
                );
            }
        }

        if (
            requirements.size >
            0
        ) {
            patch.lodgingRequirements =
                Array.from(
                    requirements.values(),
                ).slice(
                    0,
                    12,
                );
        }
    }

    const dateMatch =
        normalized.match(
            /\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?\b/,
        );

    if (dateMatch) {
        const today =
            getVietnamToday();

        const currentYear =
            Number(
                today.slice(
                    0,
                    4,
                ),
            );

        const iso =
            toIsoDate(
                Number(
                    dateMatch[1],
                ),
                Number(
                    dateMatch[2],
                ),
                dateMatch[3]
                    ? Number(
                          dateMatch[3],
                      )
                    : currentYear,
            );

        if (iso) {
            patch.startDate =
                iso;
        }
    } else if (
        /\b(ngay mai|mai)\b/.test(
            normalized,
        )
    ) {
        patch.startDate =
            addDaysToIso(
                getVietnamToday(),
                1,
            );
    } else if (
        /\bhom nay\b/.test(
            normalized,
        )
    ) {
        patch.startDate =
            getVietnamToday();
    }

    if (
        /\b(thu tha|nghi duong|cham rai|nhe nhang)\b/.test(
            normalized,
        )
    ) {
        patch.pace =
            "relaxed";
    } else if (
        /\b(di nhieu|kham pha nhieu|lich day|that nhieu diem)\b/.test(
            normalized,
        )
    ) {
        patch.pace =
            "packed";
    } else if (
        /\b(can bang|vua phai)\b/.test(
            normalized,
        )
    ) {
        patch.pace =
            "balanced";
    }

    const interests =
        new Set(
            input.state
                .interests ??
                [],
        );

    for (
        const rule of
        INTEREST_RULES
    ) {
        if (
            rule.keywords.some(
                (keyword) =>
                    normalized.includes(
                        keyword,
                    ),
            )
        ) {
            interests.add(
                rule.value,
            );
        }
    }

    if (
        interests.size >
        0
    ) {
        patch.interests =
            Array.from(
                interests,
            );
    }

    return patch;
}

/* -------------------------------------------------------------------------- */
/* AI extraction sanitization                                                 */
/* -------------------------------------------------------------------------- */

function sanitizeAiPatch(
    raw: unknown,
    input: AiTravelChatRequest,
): AiExtraction {
    if (
        !raw ||
        typeof raw !==
            "object"
    ) {
        return {};
    }

    const source =
        raw as Record<
            string,
            unknown
        >;

    const rawPatch =
        source.patch &&
        typeof source.patch ===
            "object"
            ? (
                  source.patch as Record<
                      string,
                      unknown
                  >
              )
            : {};

    const patch:
        StatePatch = {};

    const requestedLocationName =
        typeof source.requestedLocationName ===
            "string"
            ? source.requestedLocationName
                  .trim()
                  .slice(
                      0,
                      120,
                  )
            : undefined;

    const locationName =
        typeof rawPatch.locationName ===
        "string"
            ? rawPatch.locationName.trim()
            : "";

    if (locationName) {
        const match =
            findSupportedLocation(
                locationName,
                input,
            );

        if (match) {
            patch.locationId =
                match.id;

            patch.locationName =
                match.name;
        }
    }

    if (
        typeof rawPatch.startDate ===
            "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(
            rawPatch.startDate,
        )
    ) {
        patch.startDate =
            rawPatch.startDate;
    }

    for (
        const field of
        [
            "dayCount",
            "adultCount",
            "childCount",
            "roomCount",
            "budget",
            "lodgingBudgetPerNight",
        ] as const
    ) {
        const value =
            rawPatch[
                field
            ];

        if (
            typeof value ===
                "number" &&
            Number.isFinite(
                value,
            )
        ) {
            if (
                field ===
                    "dayCount" &&
                value >= 1 &&
                value <= 7
            ) {
                patch.dayCount =
                    Math.trunc(
                        value,
                    );
            } else if (
                field ===
                    "adultCount" &&
                value >= 1 &&
                value <= 20
            ) {
                patch.adultCount =
                    Math.trunc(
                        value,
                    );
            } else if (
                field ===
                    "childCount" &&
                value >= 0 &&
                value <= 20
            ) {
                patch.childCount =
                    Math.trunc(
                        value,
                    );
            } else if (
                field ===
                    "roomCount" &&
                value >= 1 &&
                value <= 10
            ) {
                patch.roomCount =
                    Math.trunc(
                        value,
                    );
            } else if (
                field ===
                    "budget" &&
                value > 0 &&
                value <=
                    1_000_000_000
            ) {
                patch.budget =
                    Math.trunc(
                        value,
                    );
            } else if (
                field ===
                    "lodgingBudgetPerNight" &&
                value > 0 &&
                value <=
                    100_000_000
            ) {
                patch.lodgingBudgetPerNight =
                    Math.trunc(
                        value,
                    );
            }
        }
    }

    /**
     * childAges là number[] nên không nằm trong
     * numeric fields ở trên.
     */
    if (
        Array.isArray(
            rawPatch.childAges,
        )
    ) {
        const childAges =
            sanitizeChildAges(
                rawPatch.childAges,
            );

        if (
            childAges.length >
            0
        ) {
            patch.childAges =
                childAges;
        }
    }

    if (
        rawPatch.lodgingPreference ===
            "any" ||
        rawPatch.lodgingPreference ===
            "hotel" ||
        rawPatch.lodgingPreference ===
            "homestay"
    ) {
        patch.lodgingPreference =
            rawPatch.lodgingPreference;
    }

    if (
        Array.isArray(
            rawPatch.lodgingRequirements,
        )
    ) {
        const requirementMap =
            new Map<
                string,
                string
            >();

        for (
            const value of
            rawPatch.lodgingRequirements
        ) {
            if (
                typeof value !==
                "string"
            ) {
                continue;
            }

            const canonical =
                canonicalizeLodgingRequirement(
                    value,
                );

            if (!canonical) {
                continue;
            }

            requirementMap.set(
                normalizeText(
                    canonical,
                ),
                canonical,
            );

            if (
                requirementMap.size >=
                12
            ) {
                break;
            }
        }

        if (
            requirementMap.size >
            0
        ) {
            patch.lodgingRequirements =
                Array.from(
                    requirementMap.values(),
                );
        }
    }

    if (
        rawPatch.pace ===
            "relaxed" ||
        rawPatch.pace ===
            "balanced" ||
        rawPatch.pace ===
            "packed"
    ) {
        patch.pace =
            rawPatch.pace;
    }

    if (
        Array.isArray(
            rawPatch.interests,
        )
    ) {
        const values =
            rawPatch.interests
                .filter(
                    (
                        value,
                    ): value is string =>
                        typeof value ===
                        "string",
                )
                .map(
                    (value) =>
                        value
                            .trim()
                            .slice(
                                0,
                                100,
                            ),
                )
                .filter(
                    Boolean,
                )
                .slice(
                    0,
                    20,
                );

        if (
            values.length >
            0
        ) {
            patch.interests =
                values;
        }
    }

    const intent =
        source.intent ===
            "planning" ||
        source.intent ===
            "modify_plan" ||
        source.intent ===
            "lodging" ||
        source.intent ===
            "weather" ||
        source.intent ===
            "general" ||
        source.intent ===
            "out_of_scope" ||
        source.intent ===
            "unsupported_destination"
            ? source.intent
            : undefined;

    const scope =
        source.scope ===
            "travel" ||
        source.scope ===
            "unsupported_destination" ||
        source.scope ===
            "off_topic"
            ? source.scope
            : undefined;

    const removeRequirementMap =
        new Map<
            string,
            string
        >();

    if (
        Array.isArray(
            source.removeLodgingRequirements,
        )
    ) {
        for (
            const value of
            source.removeLodgingRequirements
        ) {
            if (
                typeof value !==
                "string"
            ) {
                continue;
            }

            const canonical =
                canonicalizeLodgingRequirement(
                    value,
                );

            if (!canonical) {
                continue;
            }

            removeRequirementMap.set(
                normalizeText(
                    canonical,
                ),
                canonical,
            );

            if (
                removeRequirementMap.size >=
                12
            ) {
                break;
            }
        }
    }

    return {
        patch,
        intent,
        scope,
        requestedLocationName,
        removeLodgingRequirements:
            Array.from(
                removeRequirementMap.values(),
            ),
    };
}

/* -------------------------------------------------------------------------- */
/* Gemini NLU                                                                 */
/* -------------------------------------------------------------------------- */

async function extractWithAi(
    input: AiTravelChatRequest,
): Promise<AiExtraction> {
    const today =
        getVietnamToday();

    const allowedLocations =
        input.locations
            .map(
                (location) =>
                    `- ${location.name}`,
            )
            .join(
                "\n",
            );

    const history =
        (
            input.history ??
            []
        )
            .slice(
                -8,
            )
            .map(
                (item) =>
                    `${item.role}: ${item.content}`,
            )
            .join(
                "\n",
            );

    const prompt = `
Bạn là NLU router cho SmartTrip AI, một trợ lý CHỈ chuyên hỗ trợ lập kế hoạch du lịch trong phạm vi dữ liệu của SmartTrip.

Hôm nay tại Việt Nam: ${today}.

CÁC ĐIỂM ĐẾN SMARTTRIP ĐANG HỖ TRỢ:
${allowedLocations}

STATE HIỆN TẠI:
${JSON.stringify(input.state)}

HỘI THOẠI GẦN ĐÂY:
${history || "(không có)"}

TIN NHẮN MỚI:
${input.message}

Trả JSON duy nhất theo cấu trúc:
{
  "scope": "travel | unsupported_destination | off_topic",
  "intent": "planning | modify_plan | lodging | weather | general | out_of_scope | unsupported_destination",
  "requestedLocationName": "địa điểm user thực sự nhắc tới, kể cả ngoài danh sách; bỏ field nếu không có",
  "patch": {
    "locationName": "CHỈ tên đúng trong danh sách được hỗ trợ hoặc bỏ field",
    "startDate": "YYYY-MM-DD hoặc bỏ field",
    "dayCount": 1-7,
    "adultCount": 1-20,
    "childCount": 0-20,
    "childAges": [tuổi của từng trẻ mà user NÓI RÕ TRONG TIN NHẮN MỚI, mỗi tuổi 0-17],
    "roomCount": 1-10,
    "budget": "số VNĐ nguyên cho toàn chuyến",
    "lodgingBudgetPerNight": "số VNĐ nguyên nếu user nói rõ ngân sách phòng mỗi đêm",
    "lodgingPreference": "any | hotel | homestay",
    "lodgingRequirements": [
      "các yêu cầu riêng cho hotel/homestay, tối đa 12 mục"
    ],
    "pace": "relaxed | balanced | packed",
    "interests": [
      "các sở thích du lịch ngắn gọn bằng tiếng Việt"
    ]
  },
  "removeLodgingRequirements": [
    "các yêu cầu lưu trú user nói rõ muốn bỏ"
  ]
}

PHÂN LOẠI SCOPE:
1. scope="travel":
   - Lên kế hoạch chuyến đi.
   - Sửa lịch trình.
   - Điểm tham quan.
   - Ăn uống trong chuyến đi.
   - Hotel/homestay/chỗ ở.
   - Ngân sách du lịch.
   - Thời tiết liên quan chuyến đi.
   - Di chuyển/nhịp độ/sở thích du lịch.
   - Các yêu cầu cá nhân có ảnh hưởng trực tiếp tới lịch trình.
   Ví dụ: "Tôi mệt nên ngày 2 đi nhẹ thôi" vẫn là travel.

2. scope="unsupported_destination":
   - User muốn đi, tìm hotel, xem thời tiết hoặc lập lịch cho một địa điểm/quốc gia KHÔNG nằm trong danh sách hỗ trợ.
   - Ví dụ nếu "Trung Quốc", "Tokyo", "Bangkok" không có trong danh sách thì phải dùng scope này.
   - requestedLocationName phải giữ đúng nơi user nhắc tới.
   - TUYỆT ĐỐI không ánh xạ địa điểm ngoài phạm vi sang một location khác trong danh sách.

3. scope="off_topic":
   - Tin nhắn không liên quan đến việc lên kế hoạch du lịch.
   - Ví dụ: "tôi buồn ngủ", "giải bài toán này", "viết code cho tôi", "kể chuyện cười".
   - Nếu chỉ nói "tôi buồn ngủ" mà không gắn với lịch trình thì off_topic.
   - Nếu nói "tôi buồn ngủ nên buổi chiều cho tôi nghỉ" thì travel.

QUY TẮC EXTRACT CHUNG:
- Chỉ đưa field vào patch khi user nói rõ hoặc có thể suy ra chắc chắn.
- "2 người" mặc định là 2 người lớn nếu user không nói trẻ em.
- Nếu user nói tổng số người và thành phần gia đình thì phải tách adultCount/childCount đúng.
- Ví dụ "3 người, tôi đi với vợ và con" => adultCount=2, childCount=1.
- Ví dụ "tôi đi với chồng và 2 con" => adultCount=2, childCount=2.
- childAges là tuổi trẻ em user nói RÕ TRONG TIN NHẮN MỚI.
- Không copy lại childAges cũ từ STATE vào patch nếu tin nhắn mới không nhắc tuổi.
- Nếu STATE đang có childCount > 0 và user chỉ trả lời "5 tuổi" thì patch.childAges=[5].
- Nếu user nói "hai bé 5 và 8 tuổi" hoặc "2 bé 5 và 8 tuổi" thì childCount=2 và childAges=[5,8].
- Nếu user đang trả lời câu hỏi tuổi trẻ trong luồng tìm hotel thì intent vẫn phải là "lodging".
- "3 triệu" = 3000000 VNĐ.
- Nếu user nói "hotel dưới 1 triệu/đêm" thì lodgingBudgetPerNight=1000000, không ghi đè budget toàn chuyến.
- Nếu user nói rõ homestay/hotel thì ghi lodgingPreference tương ứng.
- Có thể suy ra ngày tuyệt đối từ "mai", "thứ Sáu tuần sau" dựa trên ngày hôm nay.
- locationName trong patch CHỈ được là một location có trong danh sách hỗ trợ.
- Nếu user muốn thay/sửa lịch đã có thì intent=modify_plan.
- Nếu user hỏi homestay/hotel/chỗ ở hoặc bổ sung tiêu chí cho chỗ ở thì intent=lodging.
- Nếu user hỏi mưa/nắng/dự báo cho chuyến đi thì intent=weather.
- Nếu scope=off_topic thì intent=out_of_scope.
- Nếu scope=unsupported_destination thì intent=unsupported_destination.

QUY TẮC RIÊNG CHO LƯU TRÚ:
- lodgingRequirements CHỈ chứa yêu cầu dành cho hotel/homestay/chỗ ở.
- Không đưa các lodgingRequirements vào interests.
- Không tự tạo requirement mà user không đề cập.

Ví dụ:
"homestay gần biển, yên tĩnh, view đẹp"
→ lodgingPreference="homestay"
→ lodgingRequirements=[
  "Gần biển",
  "Yên tĩnh",
  "View đẹp"
]
→ intent="lodging"

"hotel có hồ bơi và chỗ đậu xe"
→ lodgingPreference="hotel"
→ lodgingRequirements=[
  "Có hồ bơi",
  "Có chỗ đậu xe"
]
→ intent="lodging"

"ưu tiên gần trung tâm, có ăn sáng"
trong ngữ cảnh đang tìm chỗ ở
→ lodgingRequirements=[
  "Gần trung tâm",
  "Có ăn sáng"
]
→ intent="lodging"

Nếu STATE hiện tại đã có lodging context thì câu nối tiếp:
"thêm yêu cầu yên tĩnh và có hồ bơi"
→ lodgingRequirements=[
  "Yên tĩnh",
  "Có hồ bơi"
]
→ intent="lodging"

Nếu user nói:
"không cần gần biển nữa"
→ KHÔNG thêm "Gần biển" vào patch.lodgingRequirements
→ removeLodgingRequirements=[
  "Gần biển"
]
→ intent="lodging"

Nếu user nói:
"bỏ hồ bơi và parking"
→ removeLodgingRequirements=[
  "Có hồ bơi",
  "Có chỗ đậu xe"
]
→ intent="lodging"

- removeLodgingRequirements chỉ chứa các tiêu chí user muốn bỏ, không chứa tiêu chí mới.
- Không trả text ngoài JSON.
`.trim();

    try {
        const raw =
            await generateGeminiLooseJson(
                {
                    prompt,
                },
            );

        return sanitizeAiPatch(
            raw,
            input,
        );
    } catch (
        error
    ) {
        console.warn(
            "[AI TRAVEL CHAT] Gemini extractor lỗi, dùng deterministic fallback.",
            error,
        );

        return {};
    }
}

/* -------------------------------------------------------------------------- */
/* Intent fallback                                                            */
/* -------------------------------------------------------------------------- */

function detectIntentFallback(
    message: string,
    hasGeneratedPlan: boolean,
): TravelChatIntent {
    const normalized =
        normalizeText(
            message,
        );

    if (
        /\b(hotel|khach san|homestay|nha nghi|cho o|luu tru|phong|ho boi|be boi|bai dau xe|cho dau xe|parking|an sang|breakfast|ban cong|balcony|gan bien|sat bien|yen tinh|view dep|gan trung tam|thu cung|pet friendly)\b/.test(
            normalized,
        )
    ) {
        return "lodging";
    }

    if (
        /\b(thoi tiet|mua|nang|bao|du bao|nhiet do)\b/.test(
            normalized,
        )
    ) {
        return "weather";
    }

    if (
        hasGeneratedPlan &&
        /\b(doi|thay|sua|bo|them|chinh|ngay 1|ngay 2|ngay 3|lich trinh)\b/.test(
            normalized,
        )
    ) {
        return "modify_plan";
    }

    return "planning";
}


function isExplicitGenerateRequest(
    message: string,
) {
    const normalized =
        normalizeText(
            message,
        );

    return /^(?:hay\s+)?(?:len|lap|tao|lam)\s+(?:lich|lich trinh|plan|hanh trinh)(?:\s+(?:cho toi|cho minh))?$/.test(
        normalized,
    );
}

/**
 * Chỉ bypass Gemini khi câu user đủ đơn giản để deterministic parser
 * hiểu chắc chắn.
 *
 * Nguyên tắc bảo thủ:
 * - Nếu message có location được support => deterministic có thể xử lý.
 * - Nếu location đã có trong state => cho phép một số câu trả lời ngắn
 *   như "3 ngày", "2 người", "5 triệu", "mai", "thư thả", "Biển".
 * - Lodging / weather / remove requirement / đổi destination vẫn đi Gemini.
 * - Destination ngoài phạm vi vẫn đi Gemini để trả unsupported_destination.
 */
function canUseDeterministicOnly(
    input: AiTravelChatRequest,
    patch: StatePatch,
) {
    const normalized =
        normalizeText(
            input.message,
        );

    if (!normalized) {
        return false;
    }

    const requiresSemanticAi =
        /\b(hotel|khach san|homestay|nha nghi|cho o|luu tru|phong|ho boi|be boi|bai dau xe|cho dau xe|parking|an sang|breakfast|ban cong|balcony|gan bien|sat bien|yen tinh|view dep|gan trung tam|thu cung|pet friendly|thoi tiet|du bao|nhiet do|mua|bao|khong can|bo|xoa|doi sang|chuyen sang|sua|thay)\b/.test(
            normalized,
        );

    if (requiresSemanticAi) {
        return false;
    }

    /**
     * Nếu parser nhận ra một location được support ngay trong message
     * thì không cần Gemini xác nhận lại.
     */
    if (patch.locationId) {
        return true;
    }

    /**
     * Khi chưa có destination và parser cũng không nhận ra destination,
     * không bypass Gemini.
     *
     * Điều này giữ đúng case:
     * "Quảng Ngãi 3 ngày"
     * -> Gemini nhận biết unsupported_destination.
     */
    if (!input.state.locationId) {
        return false;
    }

    if (
        isExplicitGenerateRequest(
            input.message,
        )
    ) {
        return true;
    }

    const simplePatterns = [
        /^(?:toi|minh)?\s*(?:di\s*)?\d{1,2}\s*ngay$/,
        /^\d{1,2}\s*(?:nguoi|nguoi lon|tre em|tre|be|con)$/,
        /^(?:toi|minh)\s+di\s+voi\s+(?:vo|chong|con)(?:\s+va\s+(?:vo|chong|con))*$/,
        /^(?:con|be|tre|tre em)?\s*\d{1,2}\s*tuoi$/,
        /^(?:ngan sach|budget)?\s*(?:khoang|tam|duoi|toi da)?\s*\d+(?:[.,]\d+)?\s*(?:trieu|tr|nghin|ngan|k)(?:\s*(?:vnd|dong))?$/,
        /^(?:ngay\s*)?\d{1,2}[/-]\d{1,2}(?:[/-]\d{4})?$/,
        /^(?:hom nay|ngay mai|mai)$/,
        /^(?:thu tha|nghi duong|cham rai|nhe nhang|di nhieu|kham pha nhieu|lich day|that nhieu diem|can bang|vua phai)$/,
    ];

    if (
        simplePatterns.some(
            (pattern) =>
                pattern.test(
                    normalized,
                ),
        )
    ) {
        return true;
    }

    /**
     * Quick reply sở thích thường chỉ là:
     * "Biển", "Ẩm thực", "Thiên nhiên"...
     * hoặc "thích biển".
     */
    const interestOnly =
        INTEREST_RULES.some(
            (rule) =>
                rule.keywords.some(
                    (keyword) => {
                        const normalizedKeyword =
                            normalizeText(
                                keyword,
                            );

                        return (
                            normalized ===
                                normalizedKeyword ||
                            normalized ===
                                `thich ${normalizedKeyword}` ||
                            normalized ===
                                `toi thich ${normalizedKeyword}` ||
                            normalized ===
                                `minh thich ${normalizedKeyword}`
                        );
                    },
                ),
        );

    return interestOnly;
}

function buildDeterministicAiExtraction(
    input: AiTravelChatRequest,
): AiExtraction {
    const fallbackIntent =
        detectIntentFallback(
            input.message,
            input.hasGeneratedPlan ??
                false,
        );

    /**
     * Nếu plan đã tồn tại, một thay đổi deterministic đơn giản
     * như "3 ngày", "5 triệu", "Biển" nên được hiểu là modify_plan
     * để UI có thể đề nghị dựng lại plan.
     */
    const intent =
        input.hasGeneratedPlan &&
        fallbackIntent ===
            "planning" &&
        !isExplicitGenerateRequest(
            input.message,
        )
            ? "modify_plan"
            : fallbackIntent;

    return {
        patch: {},
        scope:
            "travel",
        intent,
    };
}

/* -------------------------------------------------------------------------- */
/* State                                                                      */
/* -------------------------------------------------------------------------- */

function mergeState(
    input: AiTravelChatRequest,
    aiPatch: StatePatch,
    deterministicPatch: StatePatch,
    removeLodgingRequirements:
        string[] = [],
): PlannerConversationStateInput {
    const effectiveAiPatch:
        StatePatch =
        {
            ...aiPatch,
        };

    /**
     * Nếu deterministic parser xác định đây là
     * ngân sách lưu trú theo đêm thì không cho Gemini
     * đồng thời ghi đè budget toàn chuyến.
     */
    if (
        deterministicPatch.lodgingBudgetPerNight &&
        deterministicPatch.budget ===
            undefined
    ) {
        delete effectiveAiPatch.budget;
    }

    const combinedInterests =
        new Set([
            ...(input.state
                .interests ??
                []),

            ...(effectiveAiPatch.interests ??
                []),

            ...(deterministicPatch.interests ??
                []),
        ]);

    /*
     * Merge lodging requirements từ:
     * 1. state hiện tại
     * 2. Gemini extraction
     * 3. deterministic extraction
     *
     * Sau đó loại các requirement user yêu cầu bỏ.
     */
    const lodgingRequirementMap =
        new Map<
            string,
            string
        >();

    const requirementSources =
        [
            ...(input.state
                .lodgingRequirements ??
                []),

            ...(effectiveAiPatch
                .lodgingRequirements ??
                []),

            ...(deterministicPatch
                .lodgingRequirements ??
                []),
        ];

    for (
        const requirement of
        requirementSources
    ) {
        const canonical =
            canonicalizeLodgingRequirement(
                requirement,
            );

        if (!canonical) {
            continue;
        }

        lodgingRequirementMap.set(
            normalizeText(
                canonical,
            ),
            canonical,
        );
    }

    for (
        const requirement of
        removeLodgingRequirements
    ) {
        const canonical =
            canonicalizeLodgingRequirement(
                requirement,
            );

        const target =
            normalizeText(
                canonical ||
                    requirement,
            );

        if (!target) {
            continue;
        }

        for (
            const key of
            Array.from(
                lodgingRequirementMap.keys(),
            )
        ) {
            if (
                key ===
                    target ||
                key.includes(
                    target,
                ) ||
                target.includes(
                    key,
                )
            ) {
                lodgingRequirementMap.delete(
                    key,
                );
            }
        }
    }

    /**
     * Số trẻ:
     * deterministic có độ tin cậy cao hơn khi
     * message chứa số lượng rõ ràng.
     */
    const childCount =
        deterministicPatch.childCount ??
        effectiveAiPatch.childCount ??
        input.state
            .childCount ??
        0;

    /**
     * Tuổi trẻ trong tin nhắn hiện tại:
     * deterministic ưu tiên hơn Gemini.
     *
     * Gemini chỉ bổ trợ các cách diễn đạt tự nhiên
     * mà regex chưa bắt được.
     */
    const deterministicChildAges =
        deterministicPatch
            .childAges ??
        [];

    const aiChildAges =
        effectiveAiPatch
            .childAges ??
        [];

    const incomingChildAges =
        deterministicChildAges.length >
        0
            ? deterministicChildAges
            : aiChildAges;

    const childAges =
        mergeChildAges(
            input.state
                .childAges ??
                [],
            incomingChildAges,
            childCount,
        );

    const next:
        PlannerConversationStateInput =
        {
            ...input.state,
            ...effectiveAiPatch,
            ...deterministicPatch,

            /**
             * Khai báo explicit để tránh một patch AI
             * không chắc chắn vô tình ghi đè kết quả
             * deterministic đã parse được.
             */
            adultCount:
                deterministicPatch.adultCount ??
                effectiveAiPatch.adultCount ??
                input.state
                    .adultCount,

            childCount,

            childAges,

            roomCount:
                deterministicPatch.roomCount ??
                effectiveAiPatch.roomCount ??
                input.state
                    .roomCount ??
                1,

            lodgingPreference:
                deterministicPatch.lodgingPreference ??
                effectiveAiPatch.lodgingPreference ??
                input.state
                    .lodgingPreference ??
                "any",

            lodgingRequirements:
                Array.from(
                    lodgingRequirementMap.values(),
                ).slice(
                    0,
                    12,
                ),

            pace:
                deterministicPatch.pace ??
                effectiveAiPatch.pace ??
                input.state
                    .pace ??
                "balanced",

            interests:
                Array.from(
                    combinedInterests,
                ),
        };

    /**
     * Không còn trẻ em thì phải xóa tuổi cũ.
     */
    if (
        next.childCount ===
        0
    ) {
        next.childAges =
            [];
    }

    /**
     * Không cho số tuổi lưu trong state nhiều hơn
     * số trẻ hiện tại.
     */
    if (
        next.childAges.length >
        next.childCount
    ) {
        next.childAges =
            next.childAges.slice(
                0,
                next.childCount,
            );
    }

    const noteParts =
        [
            input.state.note?.trim(),
            input.message.trim(),
        ].filter(
            Boolean,
        ) as string[];

    next.note =
        noteParts
            .join(
                " | ",
            )
            .slice(
                -4000,
            );

    return next;
}

function isReady(
    state: PlannerConversationStateInput,
) {
    return Boolean(
        state.locationId &&
            state.startDate &&
            state.dayCount &&
            state.adultCount,
    );
}

/* -------------------------------------------------------------------------- */
/* Reply builders                                                             */
/* -------------------------------------------------------------------------- */

function makeMissingReply(
    state: PlannerConversationStateInput,
): {
    reply: string;
    quickReplies: TravelQuickReply[];
} {
    if (
        !state.locationId
    ) {
        return {
            reply:
                "Bạn muốn đi đâu? Cứ nói tên thành phố/khu vực và kiểu trải nghiệm bạn thích nhé.",

            quickReplies:
                [],
        };
    }

    if (
        !state.adultCount
    ) {
        return {
            reply:
                `${state.locationName ?? "Điểm đến này"} ổn đó 👍 Bạn đi bao nhiêu người? Nếu có trẻ em thì nói luôn để mình sắp lịch nhẹ hơn.`,

            quickReplies: [
                {
                    label:
                        "1 người",
                    value:
                        "Tôi đi 1 người",
                    action:
                        "send",
                },
                {
                    label:
                        "2 người",
                    value:
                        "Tôi đi 2 người",
                    action:
                        "send",
                },
                {
                    label:
                        "4 người",
                    value:
                        "Tôi đi 4 người",
                    action:
                        "send",
                },
            ],
        };
    }

    if (
        !state.dayCount &&
        !state.startDate
    ) {
        return {
            reply:
                "Bạn dự định đi mấy ngày và khởi hành khi nào? Ví dụ: “3 ngày, thứ Sáu tuần sau”.",

            quickReplies: [
                {
                    label:
                        "2 ngày",
                    value:
                        "Tôi đi 2 ngày",
                    action:
                        "send",
                },
                {
                    label:
                        "3 ngày",
                    value:
                        "Tôi đi 3 ngày",
                    action:
                        "send",
                },
                {
                    label:
                        "4 ngày",
                    value:
                        "Tôi đi 4 ngày",
                    action:
                        "send",
                },
            ],
        };
    }

    if (
        !state.dayCount
    ) {
        return {
            reply:
                "Bạn muốn chuyến đi kéo dài mấy ngày?",

            quickReplies: [
                {
                    label:
                        "2 ngày",
                    value:
                        "2 ngày",
                    action:
                        "send",
                },
                {
                    label:
                        "3 ngày",
                    value:
                        "3 ngày",
                    action:
                        "send",
                },
                {
                    label:
                        "4 ngày",
                    value:
                        "4 ngày",
                    action:
                        "send",
                },
            ],
        };
    }

    return {
        reply:
            "Bạn dự định khởi hành ngày nào? Bạn có thể nói “20/08/2026”, “ngày mai” hoặc “thứ Sáu tuần sau”.",

        quickReplies:
            [],
    };
}

function formatBudget(
    budget?: number,
) {
    if (!budget) {
        return "chưa giới hạn ngân sách";
    }

    return new Intl.NumberFormat(
        "vi-VN",
        {
            style:
                "currency",
            currency:
                "VND",
            maximumFractionDigits:
                0,
        },
    ).format(
        budget,
    );
}

function buildReadyReply(
    state: PlannerConversationStateInput,
) {
    const travelers =
        (
            state.adultCount ??
            0
        ) +
        (
            state.childCount ??
            0
        );

    return `Mình đã đủ thông tin rồi ✨ Mình sẽ lên lịch ${state.dayCount} ngày tại ${state.locationName}, khởi hành ${state.startDate}, cho ${travelers} người, ${formatBudget(state.budget)}. Mình đang ưu tiên ${state.interests?.length ? state.interests.join(", ") : "trải nghiệm địa phương và lịch trình cân bằng"}.`;
}

function formatLodgingRequirements(
    state:
        PlannerConversationStateInput,
) {
    const requirements =
        state.lodgingRequirements ??
        [];

    if (
        requirements.length ===
        0
    ) {
        return "";
    }

    return requirements.join(
        ", ",
    );
}

function buildIntentResponse(
    intent: TravelChatIntent,
    state: PlannerConversationStateInput,
    hasGeneratedPlan: boolean,
): {
    action: TravelChatAction;
    reply?: string;
    quickReplies?: TravelQuickReply[];
} | null {
    if (
        intent ===
        "lodging"
    ) {
        if (
            !state.locationId
        ) {
            return {
                action:
                    "none",

                reply:
                    "Được. Bạn muốn tìm hotel/homestay ở đâu?",
            };
        }

        if (
            !state.startDate ||
            !state.dayCount ||
            !state.adultCount
        ) {
            const requirementLabel =
                formatLodgingRequirements(
                    state,
                );

            return {
                action:
                    "none",

                reply:
                    `Mình đã ghi nhận yêu cầu chỗ ở${
                        requirementLabel
                            ? `: ${requirementLabel}`
                            : ""
                    }. Để tìm giá phòng thật, mình cần ngày đi, số ngày và số người trước.`,
            };
        }

        const childCount =
            state.childCount ??
            0;

        const childAges =
            state.childAges ??
            [];

        /**
         * LiteAPI cần tuổi từng trẻ để tính đúng rate.
         * Chỉ cho phép lodging_search khi đã đủ tuổi.
         */
        if (
            childCount >
            childAges.length
        ) {
            const missingCount =
                childCount -
                childAges.length;

            if (
                childAges.length ===
                0
            ) {
                return {
                    action:
                        "none",

                    reply:
                        childCount ===
                        1
                            ? "Mình đã biết chuyến đi có 1 trẻ em. Bé bao nhiêu tuổi để mình lấy đúng giá phòng?"
                            : `Mình đã biết có ${childCount} trẻ em. Bạn cho mình tuổi của từng bé để mình lấy đúng giá phòng nhé, ví dụ: “5 và 8 tuổi”.`,
                };
            }

            const knownAges =
                childAges
                    .map(
                        (age) =>
                            `${age} tuổi`,
                    )
                    .join(
                        ", ",
                    );

            return {
                action:
                    "none",

                reply:
                    missingCount ===
                    1
                        ? `Mình đã ghi nhận ${knownAges}. Còn 1 bé nữa bao nhiêu tuổi?`
                        : `Mình đã ghi nhận ${knownAges}. Bạn cho mình tuổi của ${missingCount} bé còn lại nhé.`,
            };
        }

        const requirementLabel =
            formatLodgingRequirements(
                state,
            );

        const travelerText =
            childCount >
            0
                ? `${state.adultCount} người lớn + ${childCount} trẻ em (${childAges
                      .map(
                          (age) =>
                              `${age} tuổi`,
                      )
                      .join(", ")})`
                : `${state.adultCount} người lớn`;

        const roomText =
            `${state.roomCount ?? 1} phòng`;

        return {
            action:
                "lodging_search",

            reply:
                state.lodgingBudgetPerNight
                    ? `Mình đang tìm chỗ ở tại ${state.locationName} cho ${travelerText}, ${roomText}, với mức khoảng tối đa ${formatBudget(
                          state.lodgingBudgetPerNight,
                      )}/đêm${
                          requirementLabel
                              ? `, ưu tiên: ${requirementLabel}`
                              : ""
                      }.`
                    : `Mình đang tìm các chỗ ở có giá thật tại ${state.locationName} cho ${travelerText}, ${roomText}${
                          requirementLabel
                              ? `, ưu tiên: ${requirementLabel}`
                              : ""
                      }. Nếu muốn giới hạn giá, bạn có thể nói “hotel dưới 1 triệu/đêm”.`,
        };
    }

    if (
        intent ===
        "weather"
    ) {
        if (
            !state.locationId ||
            !state.startDate
        ) {
            return {
                action:
                    "none",

                reply:
                    "Được. Bạn cho mình điểm đến và ngày khởi hành để mình kiểm tra dự báo đúng thời điểm nhé.",
            };
        }

        return {
            action:
                "weather_check",

            reply:
                "Mình đang đối chiếu dự báo theo ngày đi. Nếu đã có lịch trình, mình sẽ cảnh báo riêng các hoạt động ngoài trời có nguy cơ mưa/gió/nắng nóng.",
        };
    }

    if (
        intent ===
            "modify_plan" &&
        hasGeneratedPlan
    ) {
        return {
            action:
                "offer_regenerate",

            reply:
                "Mình đã cập nhật yêu cầu mới. Bạn muốn mình dựng lại lịch trình theo thay đổi này ngay không?",

            quickReplies: [
                {
                    label:
                        "✨ Cập nhật lịch trình",

                    value:
                        "",

                    action:
                        "generate",
                },
            ],
        };
    }

    return null;
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

export async function handleAiTravelChatService(
    input: AiTravelChatRequest,
): Promise<TravelChatServerResponse> {
    /**
     * FAST GUARD:
     * Không cần gọi Gemini cho câu casual chắc chắn ngoài chủ đề.
     */
    if (
        isClearlyOffTopicCasual(
            input.message,
        )
    ) {
        console.info(
            "[AI TRAVEL CHAT SCOPE]",
            {
                scope:
                    "off_topic",

                mode:
                    "deterministic",

                message:
                    input.message.slice(
                        0,
                        120,
                    ),
            },
        );

        return createOffTopicResponse(
            input,
        );
    }

    const wasReady =
        isReady(
            input.state,
        );

    const deterministicPatch =
        parseDeterministicPatch(
            input.message,
            input,
        );

    const deterministicOnly =
        canUseDeterministicOnly(
            input,
            deterministicPatch,
        );

    const ai =
        deterministicOnly
            ? buildDeterministicAiExtraction(
                  input,
              )
            : await extractWithAi(
                  input,
              );

    if (deterministicOnly) {
        console.info(
            "[AI TRAVEL CHAT FAST PATH]",
            {
                mode:
                    "deterministic",

                patchKeys:
                    Object.keys(
                        deterministicPatch,
                    ),

                intent:
                    ai.intent,

                message:
                    input.message.slice(
                        0,
                        120,
                    ),
            },
        );
    }

    /**
     * Nếu user đang trả lời tuổi trẻ trong flow tìm lodging
     * (ví dụ chỉ nói "5 tuổi"), phải giữ ngữ cảnh lodging
     * ngay cả khi Gemini phân loại câu ngắn này thành general
     * hoặc off_topic.
     */
    const hasChildAgeUpdate =
        (
            deterministicPatch
                .childAges
                ?.length ??
            0
        ) > 0 ||
        (
            ai.patch
                ?.childAges
                ?.length ??
            0
        ) > 0;

    const isLodgingChildAgeContinuation =
        hasChildAgeUpdate &&
        hasRecentLodgingContext(
            input,
        );

    /**
     * Nếu user nhắc destination cụ thể:
     * kiểm tra lại bằng code, không chỉ tin Gemini.
     */
    const requestedSupportedLocation =
        ai.requestedLocationName
            ? findSupportedLocation(
                  ai.requestedLocationName,
                  input,
              )
            : null;

    const hasSupportedLocationInMessage =
        Boolean(
            deterministicPatch.locationId ||
                requestedSupportedLocation,
        );

    if (
        ai.scope ===
            "unsupported_destination" ||
        ai.intent ===
            "unsupported_destination" ||
        (
            ai.requestedLocationName &&
            !requestedSupportedLocation &&
            !hasSupportedLocationInMessage
        )
    ) {
        console.info(
            "[AI TRAVEL CHAT SCOPE]",
            {
                scope:
                    "unsupported_destination",

                requestedLocationName:
                    ai.requestedLocationName,
            },
        );

        return createUnsupportedDestinationResponse(
            input,
            ai.requestedLocationName,
        );
    }

    if (
        (
            ai.scope ===
                "off_topic" ||
            ai.intent ===
                "out_of_scope"
        ) &&
        !isLodgingChildAgeContinuation
    ) {
        console.info(
            "[AI TRAVEL CHAT SCOPE]",
            {
                scope:
                    "off_topic",

                mode:
                    "gemini",
            },
        );

        return createOffTopicResponse(
            input,
        );
    }

    const state =
        mergeState(
            input,
            ai.patch ?? {},
            deterministicPatch,
            ai.removeLodgingRequirements ??
                [],
        );

    /**
     * Hai intent ngoài phạm vi đã được return ở các guard phía trên:
     * - out_of_scope
     * - unsupported_destination
     *
     * Vì vậy ở đây nếu Gemini không trả intent thì mới dùng fallback.
     */
    let intent:
        TravelChatIntent =
        ai.intent ??
        detectIntentFallback(
            input.message,
            input.hasGeneratedPlan ??
                false,
        );

    /**
     * Nếu user đang trả lời tuổi trẻ trong flow lodging,
     * luôn tiếp tục lodging thay vì quay về planning/general.
     */
    if (
        isLodgingChildAgeContinuation
    ) {
        intent =
            "lodging";
    }

    const readyToGenerate =
        isReady(
            state,
        );

    const intentResponse =
        buildIntentResponse(
            intent,
            state,
            input.hasGeneratedPlan ??
                false,
        );

    if (
        intentResponse
    ) {
        return {
            state,
            reply:
                intentResponse.reply ??
                "Mình đã ghi nhận.",
            intent,
            action:
                intentResponse.action,
            readyToGenerate,
            quickReplies:
                intentResponse.quickReplies ??
                [],
        };
    }

    if (
        !readyToGenerate
    ) {
        const missing =
            makeMissingReply(
                state,
            );

        return {
            state,
            reply:
                missing.reply,
            intent,
            action:
                "none",
            readyToGenerate:
                false,
            quickReplies:
                missing.quickReplies,
        };
    }

    const userExplicitlyAskedToGenerate =
        /\b(len lich|lap lich|tao lich|tao plan|len plan|lam plan|tao hanh trinh|lap hanh trinh)\b/.test(
            normalizeText(
                input.message,
            ),
        );

    const shouldGenerate =
        (
            !wasReady &&
            readyToGenerate
        ) ||
        userExplicitlyAskedToGenerate;

    return {
        state,

        reply:
            shouldGenerate
                ? buildReadyReply(
                      state,
                  )
                : "Mình đã cập nhật thông tin chuyến đi. Khi bạn muốn, mình có thể dựng lại lịch trình theo các yêu cầu mới.",

        intent,

        action:
            shouldGenerate
                ? "generate"
                : "none",

        readyToGenerate:
            true,

        quickReplies:
            shouldGenerate
                ? []
                : [
                      {
                          label:
                              "Lên lịch trình",
                          value:
                              "",
                          action:
                              "generate",
                      },
                  ],
    };
}