import "server-only";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/src/db";
import { locations } from "@/src/db/schema/locations";
import { restaurants } from "@/src/db/schema/restaurants";
import { generateGeminiLooseJson } from "@/src/lib/ai/gemini";
import { findCuisinesByRestaurantIds } from "@/src/repositories/restaurant.repository";
import type { AiFoodContextRequest } from "@/src/schemas/ai-food-context.schema";

const aiAnswerSchema = z.object({
    answer: z.string().trim().min(1).max(1200),
    quickReplies: z
        .array(
            z.object({
                label: z.string().trim().min(1).max(80),
                question: z.string().trim().min(1).max(220),
            }),
        )
        .max(4)
        .optional(),
});

type RestaurantContext = {
    id: string;
    name: string;
    description: string | null;
    address: string;
    latitude: number;
    longitude: number;
    priceMin: number | null;
    priceMax: number | null;
    rating: number | null;
    reviewCount: number;
    tags: string[];
    isOpenLate: boolean;
    isFamilyFriendly: boolean;
    source: "demo" | "manual" | "google_places";
    googleMapsUrl: string | null;
    locationName: string;
    cuisines: Array<{
        id: string;
        name: string;
        nameEn: string | null;
        slug: string;
        avgPrice: number | null;
        isSignature: boolean;
    }>;
};

function formatMoney(value: number | null) {
    if (value === null) {
        return "chưa rõ";
    }

    return `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
}

async function loadRestaurantContext(
    restaurantId: string,
): Promise<RestaurantContext | null> {
    const [row] = await db
        .select({
            id: restaurants.id,
            name: restaurants.name,
            description: restaurants.description,
            address: restaurants.address,
            latitude: restaurants.latitude,
            longitude: restaurants.longitude,
            priceMin: restaurants.priceMin,
            priceMax: restaurants.priceMax,
            rating: restaurants.rating,
            reviewCount: restaurants.reviewCount,
            tags: restaurants.tags,
            isOpenLate: restaurants.isOpenLate,
            isFamilyFriendly: restaurants.isFamilyFriendly,
            source: restaurants.source,
            googleMapsUrl: restaurants.googleMapsUrl,
            locationName: locations.name,
        })
        .from(restaurants)
        .innerJoin(
            locations,
            eq(restaurants.locationId, locations.id),
        )
        .where(
            and(
                eq(restaurants.id, restaurantId),
                eq(restaurants.isActive, true),
            ),
        )
        .limit(1);

    if (!row) {
        return null;
    }

    const cuisineMap = await findCuisinesByRestaurantIds([
        restaurantId,
    ]);

    return {
        ...row,
        cuisines: cuisineMap.get(restaurantId) ?? [],
    };
}

function buildPlannerPrompt(context: RestaurantContext) {
    const cuisines = context.cuisines
        .map((item) => item.name)
        .filter(Boolean)
        .join(", ");

    return [
        `Mình muốn đưa một bữa ăn tại ${context.name} vào lịch trình SmartTrip.`,
        `Địa điểm: ${context.address}, ${context.locationName}.`,
        cuisines
            ? `Món/ẩm thực liên quan: ${cuisines}.`
            : null,
        context.priceMin !== null || context.priceMax !== null
            ? `Khoảng chi tiêu tham khảo: ${formatMoney(context.priceMin)} - ${formatMoney(context.priceMax)} mỗi người.`
            : null,
        "Hãy sắp bữa ăn này vào ngày và khung giờ hợp lý trong chuyến đi. Nếu chưa đủ điểm đến, ngày đi, số ngày hoặc số người thì hãy hỏi mình trước khi tạo lịch trình.",
    ]
        .filter(Boolean)
        .join(" ");
}

function fallbackAnswer(
    context: RestaurantContext,
    question: string,
) {
    const normalized = question
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .toLowerCase();

    if (
        /tre|be|con|gia dinh/.test(normalized)
    ) {
        return context.isFamilyFriendly
            ? "Theo dữ liệu SmartTrip, quán này được đánh dấu phù hợp gia đình. Tuy nhiên dữ liệu hiện tại chưa có chi tiết từng nguyên liệu hay khẩu phần cho trẻ em, nên bạn vẫn nên hỏi quán về độ cay, dị ứng và khẩu phần khi gọi món."
            : "Dữ liệu SmartTrip chưa đánh dấu quán này là lựa chọn ưu tiên cho gia đình. Nếu đi cùng trẻ nhỏ, mình khuyên kiểm tra trước độ cay, không gian ngồi và khẩu phần tại quán.";
    }

    if (/cay|vi nhe|it cay/.test(normalized)) {
        if (context.tags.includes("mild")) {
            return "Dữ liệu SmartTrip có tín hiệu 'mild', nên quán này thiên về lựa chọn vị nhẹ/ít cay. Dù vậy SmartTrip chưa có dữ liệu thành phần chi tiết cho từng món, nên mức cay thực tế vẫn nên xác nhận khi gọi món.";
        }

        if (context.tags.includes("spicy")) {
            return "Dữ liệu SmartTrip có gắn tín hiệu món cay cho quán này. Nếu bạn ăn cay ít, nên yêu cầu giảm cay khi gọi món.";
        }

        return "SmartTrip chưa có dữ liệu đủ chi tiết để khẳng định mức cay của từng món tại quán này. Mình có thể dựa vào các món liên quan để gợi ý, nhưng nên xác nhận trực tiếp với quán khi gọi món.";
    }

    if (/gia|ngan sach|bao nhieu|chi phi/.test(normalized)) {
        return `Khoảng chi tiêu tham khảo trong dữ liệu SmartTrip là ${formatMoney(
            context.priceMin,
        )} - ${formatMoney(
            context.priceMax,
        )} mỗi người. Đây là dữ liệu ${
            context.source === "demo"
                ? "demo"
                : "tham khảo"
        }, không phải giá realtime.`;
    }

    if (/dem|khuya|muon|toi/.test(normalized)) {
        return context.isOpenLate
            ? "Quán này đang được SmartTrip đánh dấu là có phục vụ tối muộn, nên phù hợp hơn cho lịch ăn đêm. Giờ mở cửa cụ thể vẫn nên được xác nhận trước khi đi."
            : "SmartTrip chưa đánh dấu quán này là điểm ăn đêm. Nếu bạn muốn đi muộn, mình có thể ưu tiên tìm những quán có cờ phục vụ tối muộn trong Food Discovery.";
    }

    const cuisines = context.cuisines
        .map((item) => item.name)
        .join(", ");

    return `${context.name} là một lựa chọn trong dữ liệu SmartTrip tại ${context.locationName}. ${
        cuisines
            ? `Các món/ẩm thực liên quan gồm ${cuisines}. `
            : ""
    }Khoảng giá tham khảo ${formatMoney(
        context.priceMin,
    )} - ${formatMoney(context.priceMax)} mỗi người. Bạn có thể hỏi mình cụ thể về trẻ nhỏ, độ cay, ngân sách hoặc thời điểm nên ghé.`;
}

function defaultQuickReplies(context: RestaurantContext) {
    return [
        {
            label: "Trẻ nhỏ có phù hợp?",
            question:
                "Quán này có phù hợp nếu tôi đi cùng trẻ 5 tuổi không?",
        },
        {
            label: "Món nào nên thử?",
            question:
                "Ở quán này nên ưu tiên thử món nào và vì sao?",
        },
        {
            label: "Ăn tối muộn được không?",
            question:
                "Quán này có phù hợp để ăn tối muộn không?",
        },
        ...(context.priceMin !== null ||
        context.priceMax !== null
            ? [
                  {
                      label: "Ngân sách bao nhiêu?",
                      question:
                          "Khoảng ngân sách hợp lý cho một người ở quán này là bao nhiêu?",
                  },
              ]
            : []),
    ].slice(0, 4);
}

export async function askFoodContextAiService(
    input: AiFoodContextRequest,
) {
    const context = await loadRestaurantContext(
        input.entityId,
    );

    if (!context) {
        throw new Error(
            "Không tìm thấy quán ăn trong dữ liệu SmartTrip.",
        );
    }

    const history = input.history
        .slice(-6)
        .map(
            (item) =>
                `${item.role === "user" ? "USER" : "ASSISTANT"}: ${item.content}`,
        )
        .join("\n");

    const sourceNotice =
        context.source === "demo"
            ? "Đây là dữ liệu DEMO. Không được nói như thể giá, rating, giờ mở cửa là realtime hoặc đã được xác minh ngoài đời."
            : "Chỉ sử dụng dữ liệu context bên dưới; không tự bịa field còn thiếu.";

    const prompt = `
Bạn là SmartTrip AI Food Concierge. Trả lời bằng tiếng Việt, ngắn gọn, hữu ích và không bịa dữ liệu.

NGUYÊN TẮC BẮT BUỘC:
- Chỉ dựa trên RESTAURANT CONTEXT và CUISINES bên dưới.
- Nếu context không đủ để khẳng định (thành phần, dị ứng, độ cay chính xác, giờ realtime...) phải nói rõ là chưa đủ dữ liệu.
- Không khẳng định an toàn thực phẩm/y tế.
- ${sourceNotice}
- Không tự tạo tên quán, giá, rating hay món không có trong context.

RESTAURANT CONTEXT:
name=${context.name}
location=${context.locationName}
address=${context.address}
priceMin=${context.priceMin ?? "unknown"}
priceMax=${context.priceMax ?? "unknown"}
rating=${context.rating ?? "unknown"}
reviewCount=${context.reviewCount}
isFamilyFriendly=${context.isFamilyFriendly}
isOpenLate=${context.isOpenLate}
tags=${context.tags.join(",") || "none"}
description=${context.description ?? "none"}
source=${context.source}

CUISINES:
${context.cuisines
    .map(
        (item) =>
            `- ${item.name} | avgPrice=${item.avgPrice ?? "unknown"} | signature=${item.isSignature}`,
    )
    .join("\n") || "none"}

LỊCH SỬ HỘI THOẠI GẦN ĐÂY:
${history || "none"}

CÂU HỎI MỚI:
${input.question}

OUTPUT JSON DUY NHẤT:
{
  "answer": "câu trả lời tiếng Việt",
  "quickReplies": [
    {"label":"nhãn ngắn","question":"câu hỏi tiếp theo"}
  ]
}
`.trim();

    let generatedBy: "gemini" | "fallback" =
        "fallback";
    let answer = fallbackAnswer(
        context,
        input.question,
    );
    let quickReplies = defaultQuickReplies(context);

    try {
        const raw = await generateGeminiLooseJson({
            prompt,
        });

        const parsed = aiAnswerSchema.safeParse(raw);

        if (parsed.success) {
            generatedBy = "gemini";
            answer = parsed.data.answer;
            quickReplies =
                parsed.data.quickReplies?.length
                    ? parsed.data.quickReplies
                    : quickReplies;
        }
    } catch (error) {
        console.warn(
            "[AI FOOD CONTEXT] Gemini unavailable, using fallback",
            error,
        );
    }

    console.info("[AI FOOD CONTEXT] result", {
        restaurantId: context.id,
        restaurantName: context.name,
        generatedBy,
        source: context.source,
    });

    return {
        entity: {
            type: "restaurant" as const,
            id: context.id,
            name: context.name,
            address: context.address,
            locationName: context.locationName,
            source: context.source,
            priceMin: context.priceMin,
            priceMax: context.priceMax,
            rating: context.rating,
            isFamilyFriendly:
                context.isFamilyFriendly,
            isOpenLate: context.isOpenLate,
            cuisines: context.cuisines.map(
                (item) => ({
                    id: item.id,
                    name: item.name,
                    slug: item.slug,
                    isSignature:
                        item.isSignature,
                }),
            ),
        },
        answer,
        quickReplies,
        plannerPrompt: buildPlannerPrompt(context),
        generatedBy,
        disclaimer:
            context.source === "demo"
                ? "Dữ liệu quán hiện là dữ liệu demo phục vụ trình diễn, không phải dữ liệu realtime."
                : "Thông tin quán là dữ liệu tham khảo; giá và tình trạng có thể thay đổi.",
    };
}