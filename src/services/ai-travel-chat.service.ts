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

    /**
     * Điểm đến user thực sự nhắc tới.
     *
     * Khác với patch.locationName:
     * - requestedLocationName có thể nằm ngoài phạm vi SmartTrip.
     * - patch.locationName chỉ được phép là location có trong danh sách RAG.
     */
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

    const childMatch =
        normalized.match(
            /\b(\d{1,2})\s*(?:tre em|tre|be)\b/,
        );

    if (
        childMatch
    ) {
        patch.childCount =
            Math.min(
                Number(
                    childMatch[1],
                ),
                20,
            );
    }

    const peopleMatch =
        normalized.match(
            /\b(\d{1,2})\s*(?:nguoi|ng lon|nguoi lon)\b/,
        );

    if (
        peopleMatch
    ) {
        const total =
            Math.min(
                Number(
                    peopleMatch[1],
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

    const millionMatch =
        normalized.match(
            /(\d+(?:[.,]\d+)?)\s*(?:trieu|tr)\b/,
        );

    const thousandMatch =
        normalized.match(
            /(\d+(?:[.,]\d+)?)\s*(?:nghin|ngan|k)\b/,
        );

    const lodgingContext =
        /\b(hotel|khach san|homestay|phong|cho o|luu tru)\b/.test(
            normalized,
        );

    const perNightContext =
        /\b(dem|moi dem|mot dem|night|per night)\b/.test(
            normalized,
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
            lodgingContext &&
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

    const dateMatch =
        normalized.match(
            /\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?\b/,
        );

    if (
        dateMatch
    ) {
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

    if (
        locationName
    ) {
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
                        value.trim(),
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

    return {
        patch,
        intent,
        scope,
        requestedLocationName,
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
    "roomCount": 1-10,
    "budget": số VNĐ nguyên cho toàn chuyến,
    "lodgingBudgetPerNight": số VNĐ nguyên nếu user nói rõ ngân sách phòng mỗi đêm,
    "lodgingPreference": "any | hotel | homestay",
    "pace": "relaxed | balanced | packed",
    "interests": ["các sở thích ngắn gọn bằng tiếng Việt"]
  }
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

QUY TẮC EXTRACT:
- Chỉ đưa field vào patch khi user nói rõ hoặc có thể suy ra chắc chắn.
- "2 người" mặc định là 2 người lớn nếu user không nói trẻ em.
- "3 triệu" = 3000000 VNĐ.
- Nếu user nói "hotel dưới 1 triệu/đêm" thì lodgingBudgetPerNight=1000000, không ghi đè budget toàn chuyến.
- Nếu user nói rõ homestay/hotel thì ghi lodgingPreference tương ứng.
- Có thể suy ra ngày tuyệt đối từ "mai", "thứ Sáu tuần sau" dựa trên ngày hôm nay.
- locationName trong patch CHỈ được là một location có trong danh sách hỗ trợ.
- Nếu user muốn thay/sửa lịch đã có thì intent=modify_plan.
- Nếu user hỏi homestay/hotel/chỗ ở thì intent=lodging.
- Nếu user hỏi mưa/nắng/dự báo cho chuyến đi thì intent=weather.
- Nếu scope=off_topic thì intent=out_of_scope.
- Nếu scope=unsupported_destination thì intent=unsupported_destination.
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
        /\b(hotel|khach san|homestay|nha nghi|cho o|luu tru)\b/.test(
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

/* -------------------------------------------------------------------------- */
/* State                                                                      */
/* -------------------------------------------------------------------------- */

function mergeState(
    input: AiTravelChatRequest,
    aiPatch: StatePatch,
    deterministicPatch: StatePatch,
): PlannerConversationStateInput {
    const effectiveAiPatch:
        StatePatch =
        {
            ...aiPatch,
        };

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

    const next:
        PlannerConversationStateInput =
        {
            ...input.state,
            ...effectiveAiPatch,
            ...deterministicPatch,

            childCount:
                deterministicPatch.childCount ??
                effectiveAiPatch.childCount ??
                input.state
                    .childCount ??
                0,

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
            return {
                action:
                    "none",
                reply:
                    "Mình tìm giá phòng thật được, nhưng cần ngày đi, số ngày và số người trước. Bạn gửi các thông tin đó giúp mình nhé.",
            };
        }

        return {
            action:
                "lodging_search",
            reply:
                state.lodgingBudgetPerNight
                    ? `Mình đang tìm chỗ ở tại ${state.locationName} với mức khoảng ${formatBudget(state.lodgingBudgetPerNight)}/đêm.`
                    : `Mình đang tìm các chỗ ở có giá thật tại ${state.locationName}. Nếu muốn lọc chặt hơn, bạn có thể nói “hotel dưới 1 triệu/đêm”.`,
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

    const ai =
        await extractWithAi(
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
        ai.scope ===
            "off_topic" ||
        ai.intent ===
            "out_of_scope"
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
        );

    /**
     * Hai intent ngoài phạm vi đã được return ở các guard phía trên:
     * - out_of_scope
     * - unsupported_destination
     *
     * Vì vậy ở đây nếu Gemini không trả intent thì mới dùng fallback.
     */
    const intent:
        TravelChatIntent =
        ai.intent ??
        detectIntentFallback(
            input.message,
            input.hasGeneratedPlan ??
                false,
        );

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
                              "✨ Lên lịch trình",
                          value:
                              "",
                          action:
                              "generate",
                      },
                  ],
    };
}