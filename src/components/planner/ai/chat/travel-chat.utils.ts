import type {
    AiPlannerRequest,
    LocationOption,
} from "@/src/components/planner/ai/ai-planner.types";

import type {
    PlannerConversationState,
    TravelChatMessage,
} from "@/src/components/planner/ai/chat/ai-travel-chat.types";
import { formatOptionalVnd } from "@/src/lib/formatters";

export type PlannerApiPayload<T> = {
    success: boolean;
    message?: string;
    data?: T;
    errors?: Record<string, string[]>;
};

export function createChatId(prefix = "msg") {
    if (
        typeof crypto !== "undefined" &&
        "randomUUID" in crypto
    ) {
        return `${prefix}-${crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;
}

export function createInitialConversationState(): PlannerConversationState {
    return {
        childCount: 0,
        childAges: [],
        roomCount: 1,
        lodgingPreference: "any",
        lodgingRequirements: [],
        pace: "balanced",
        interests: [],
    };
}

export function createWelcomeMessages(): TravelChatMessage[] {
    return [
        {
            id: "assistant-welcome",
            role: "assistant",
            type: "text",
            createdAt: Date.now(),
            content:
                "Xin chào 👋 Mình là SmartTrip AI. Bạn cứ nói chuyến đi theo cách tự nhiên nhất — muốn đi đâu, mấy người, thích gì hoặc ngân sách khoảng bao nhiêu. Mình sẽ hỏi thêm khi cần rồi lên lịch trình cho bạn.",
            quickReplies: [
                {
                    label: "Đà Nẵng 3 ngày cho 2 người",
                    value: "Tôi muốn đi Đà Nẵng 3 ngày cho 2 người",
                    action: "send",
                },
                {
                    label: "Chuyến đi khoảng 3 triệu",
                    value: "Tôi có ngân sách khoảng 3 triệu",
                    action: "send",
                },
                {
                    label: "Thích chỗ mát về đêm",
                    value: "Tôi thích chỗ mát mẻ và đi chơi về đêm",
                    action: "send",
                },
            ],
        },
    ];
}

export function isConversationReady(
    state: PlannerConversationState,
) {
    return Boolean(
        state.locationId &&
            state.startDate &&
            state.dayCount &&
            state.adultCount,
    );
}

export function buildPlannerRequestFromConversation(
    state: PlannerConversationState,
): AiPlannerRequest | null {
    if (!isConversationReady(state)) {
        return null;
    }

    return {
        locationId: state.locationId!,
        startDate: state.startDate!,
        dayCount: state.dayCount!,
        adultCount: state.adultCount!,
        childCount: state.childCount,
        roomCount: state.roomCount,
        ...(state.budget
            ? {
                  budget: state.budget,
              }
            : {}),
        pace: state.pace,
        interests:
            state.interests.length > 0
                ? state.interests
                : ["Trải nghiệm địa phương"],
        ...(state.note?.trim()
            ? {
                  note: state.note.trim(),
              }
            : {}),
    };
}

export function findLocationLabel(
    state: PlannerConversationState,
    locations: LocationOption[],
) {
    if (state.locationName) {
        return state.locationName;
    }

    return (
        locations.find(
            (location) => location.id === state.locationId,
        )?.name ?? null
    );
}

export function formatCurrency(value?: number) {
    if (!value) {
        return null;
    }

    return formatOptionalVnd(value);
}

export async function readPlannerApiResponse<T>(
    response: Response,
): Promise<PlannerApiPayload<T>> {
    const contentType = response.headers.get("content-type");

    if (!contentType?.includes("application/json")) {
        const text = await response.text();

        console.error("[TRAVEL CHAT NON JSON RESPONSE]", {
            status: response.status,
            url: response.url,
            body: text.slice(0, 500),
        });

        return {
            success: false,
            message: `Server trả về dữ liệu không hợp lệ (${response.status}).`,
        };
    }

    return (await response.json()) as PlannerApiPayload<T>;
}