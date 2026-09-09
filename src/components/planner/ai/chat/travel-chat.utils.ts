import type { AiPlannerRequest, LocationOption } from "@/src/components/planner/ai/ai-planner.types";

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
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createInitialConversationState(): PlannerConversationState {
  return {
    currentStep: "collect_experience",
    childCount: 0,
    childAges: [],
    roomCount: 1,
    lodgingPreference: "any",
    lodgingRequirements: [],
    pace: "balanced",
    interests: [],
    activitiesPerDay: undefined,
    selectedDestinations: [],
    rejectedDestinationIds: [],
    suggestedDestinations: [],
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
        "Xin chào 👋 Mình là SmartTrip AI. Hãy chia sẻ sở thích du lịch hoặc nơi bạn muốn đến (ví dụ: “tôi muốn đi biển”, “khám phá ẩm thực”, “văn hóa lịch sử”...), mình sẽ gợi ý địa điểm tuyệt vời nhất cho bạn.",
      quickReplies: [
        {
          label: "🏖️ Tôi muốn đi biển",
          value: "Tôi muốn đi biển",
          action: "send",
        },
        {
          label: "🍜 Thích ẩm thực đặc sản",
          value: "Tôi thích trải nghiệm ẩm thực đặc sản",
          action: "send",
        },
        {
          label: "🏛️ Văn hóa & lịch sử",
          value: "Tôi thích văn hóa và lịch sử",
          action: "send",
        },
      ],
    },
  ];
}

export function isConversationReady(state: PlannerConversationState) {
  return Boolean(state.locationId && state.startDate && state.dayCount && state.adultCount);
}

export function buildPlannerRequestFromConversation(state: PlannerConversationState): AiPlannerRequest | null {
  if (!isConversationReady(state)) {
    return null;
  }

  const interests = [...state.interests];
  if (state.contextTheme && !interests.some((i) => i.toLowerCase().includes(state.contextTheme!.toLowerCase()))) {
    interests.unshift(state.contextTheme);
  }

  const noteParts: string[] = [];
  if (state.contextTheme) {
    noteParts.push(`Chủ đề chuyến đi: ${state.contextTheme}`);
  }
  if (state.selectedDestinations && state.selectedDestinations.length > 0) {
    const names = state.selectedDestinations.map((d) => d.destinationName);
    noteParts.push(`Điểm đến ưu tiên/bắt buộc: ${names.join(", ")}`);
  }
  if (state.preferredTimeSlot) {
    noteParts.push(`Khung giờ hoạt động trong ngày: ${state.preferredTimeSlot}`);
  }
  if (state.note?.trim()) {
    noteParts.push(state.note.trim());
  }

  const combinedNote = noteParts.join(". ").slice(0, 1000);

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
    interests: interests.length > 0 ? interests.slice(0, 10) : ["Trải nghiệm địa phương"],
    ...(combinedNote
      ? {
          note: combinedNote,
        }
      : {}),
    selectedDestinations: state.selectedDestinations,
    activitiesPerDay: state.activitiesPerDay ?? 3,
  };
}

export function findLocationLabel(state: PlannerConversationState, locations: LocationOption[]) {
  if (state.locationName) {
    return state.locationName;
  }

  return locations.find((location) => location.id === state.locationId)?.name ?? null;
}

export function formatCurrency(value?: number) {
  if (!value) {
    return null;
  }

  return formatOptionalVnd(value);
}

export async function readPlannerApiResponse<T>(response: Response): Promise<PlannerApiPayload<T>> {
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
