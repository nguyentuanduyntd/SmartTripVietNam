"use client";

import { useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import type { GeneratedItinerary, LocationOption, SavedItinerary } from "@/src/components/planner/ai/ai-planner.types";

import type {
  DestinationCardItem,
  HotelSearchResult,
  PlannerConversationState,
  TravelChatActionPayload,
  TravelChatHistoryItem,
  TravelChatMessage,
  TravelChatServerResponse,
  TravelQuickReply,
  TravelWeatherResult,
  TripSummaryInfo,
} from "@/src/components/planner/ai/chat/ai-travel-chat.types";

import {
  buildPlannerRequestFromConversation,
  createChatId,
  createInitialConversationState,
  createWelcomeMessages,
  readPlannerApiResponse,
} from "@/src/components/planner/ai/chat/travel-chat.utils";

const GENERATION_TIMEOUT_MS = 90_000;

// ─── Session Storage persistence ─────────────────────────────────────────────
// Giữ lại đoạn chat khi user navigate away. Tự clear khi đóng tab/browser.
// Tách biệt theo userId để tránh trường hợp tài khoản B đăng nhập vào thấy chat của tài khoản A.

const CHAT_SESSION_KEY_PREFIX = "smarttrip:ai-planner-chat";

function getChatSessionKey(userId?: string): string | null {
  return userId ? `${CHAT_SESSION_KEY_PREFIX}:${userId}` : null;
}

type ChatSessionData = {
  userId: string;
  messages: TravelChatMessage[];
  state: PlannerConversationState;
  latestGenerated: GeneratedItinerary | null;
  savedAt: number;
};

function saveChatSession(data: ChatSessionData, userId?: string) {
  if (typeof window === "undefined" || !userId) {
    return;
  }

  try {
    const key = getChatSessionKey(userId);
    if (!key) return;

    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {
    // sessionStorage đầy hoặc bị block → bỏ qua
  }
}

function loadChatSession(userId?: string): ChatSessionData | null {
  if (typeof window === "undefined" || !userId) {
    return null;
  }

  try {
    // Luôn dọn dẹp key cũ không có scope userId (nếu còn sót lại từ version trước)
    sessionStorage.removeItem(CHAT_SESSION_KEY_PREFIX);

    const key = getChatSessionKey(userId);
    if (!key) {
      return null;
    }

    const raw = sessionStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const data = JSON.parse(raw) as ChatSessionData;

    // Validate cấu trúc cơ bản và đảm bảo đúng user sở hữu đoạn chat
    if (
      !Array.isArray(data.messages) ||
      !data.state ||
      typeof data.savedAt !== "number" ||
      data.userId !== userId
    ) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function clearChatSession(userId?: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.removeItem(CHAT_SESSION_KEY_PREFIX);
    if (userId) {
      const key = getChatSessionKey(userId);
      if (key) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // Bỏ qua
  }
}

function toHistory(messages: TravelChatMessage[]): TravelChatHistoryItem[] {
  return messages
    .filter((message) => message.type === "text")
    .slice(-10)
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

function addDaysToIso(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00Z`);

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function getHotelNightCount(state: PlannerConversationState) {
  return Math.max((state.dayCount ?? 1) - 1, 1);
}

function buildWeatherActivities(generated: GeneratedItinerary | null) {
  if (!generated?.plan?.days) {
    return [];
  }

  return generated.plan.days
    .flatMap((day) =>
      (day.activities ?? []).map((activity) => ({
        dayNumber: day.dayNumber,
        destinationName: (activity.destinationName || "").trim().slice(0, 250),
        title: (activity.title || "").trim().slice(0, 250),
        description: (activity.description || "").trim().slice(0, 1000),
        startTime: activity.startTime || "08:00",
      })),
    )
    .slice(0, 80);
}

export function useTravelPlannerChat(locations: LocationOption[], userId?: string) {
  const router = useRouter();

  // Khôi phục session trước đó (nếu có) của riêng user này khi mount
  const restoredRef = useRef<ChatSessionData | null | undefined>(undefined);

  if (restoredRef.current === undefined && typeof window !== "undefined") {
    restoredRef.current = loadChatSession(userId);
  }

  const restored = restoredRef.current;

  const [messages, setMessages] = useState<TravelChatMessage[]>(
    () => restored?.messages ?? createWelcomeMessages(),
  );

  const [state, setState] = useState<PlannerConversationState>(
    () => restored?.state ?? createInitialConversationState(),
  );

  const [draft, setDraft] = useState("");

  const [isChatting, setIsChatting] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const [isSearchingLodging, setIsSearchingLodging] = useState(false);

  const [isCheckingWeather, setIsCheckingWeather] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [latestGenerated, setLatestGenerated] = useState<GeneratedItinerary | null>(
    () => restored?.latestGenerated ?? null,
  );

  const generationControllerRef = useRef<AbortController | null>(null);

  const foodHandoffConsumedRef = useRef(false);

  // Theo dõi userId: nếu đổi tài khoản (hoặc chuyển user), nạp lại dữ liệu tương ứng của user đó
  const currentUserIdRef = useRef<string | undefined>(userId);

  useEffect(() => {
    if (currentUserIdRef.current !== userId) {
      currentUserIdRef.current = userId;
      generationControllerRef.current?.abort();
      generationControllerRef.current = null;

      const session = loadChatSession(userId);
      if (session) {
        setMessages(session.messages);
        setState(session.state);
        setLatestGenerated(session.latestGenerated);
      } else {
        setMessages(createWelcomeMessages());
        setState(createInitialConversationState());
        setLatestGenerated(null);
      }
      setDraft("");
      setError(null);
      setIsChatting(false);
      setIsGenerating(false);
      setIsSaving(false);
      setIsSearchingLodging(false);
      setIsCheckingWeather(false);
    }
  }, [userId]);

  useEffect(() => {
    return () => {
      generationControllerRef.current?.abort();
    };
  }, []);

  // Persist chat session vào sessionStorage của riêng user này mỗi khi messages/state thay đổi
  useEffect(() => {
    if (!userId) {
      return;
    }

    // Không persist nếu chỉ có welcome message (trạng thái mặc định)
    if (messages.length <= 1 && messages[0]?.id === "assistant-welcome") {
      return;
    }

    saveChatSession(
      {
        userId,
        messages,
        state,
        latestGenerated,
        savedAt: Date.now(),
      },
      userId,
    );
  }, [userId, messages, state, latestGenerated]);

  useEffect(() => {
    if (foodHandoffConsumedRef.current || typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    const foodPrompt = url.searchParams.get("foodPrompt")?.trim();

    if (!foodPrompt) {
      return;
    }

    foodHandoffConsumedRef.current = true;

    url.searchParams.delete("foodPrompt");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);

    setDraft(foodPrompt);

    const timer = window.setTimeout(() => {
      void sendMessage(foodPrompt);
    }, 450);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  function appendMessage(message: TravelChatMessage) {
    setMessages((current) => [...current, message]);
  }

  function appendAssistantText(
    content: string,
    quickReplies?: TravelQuickReply[],
    destinations?: DestinationCardItem[],
    followUpQuestion?: string,
    tripSummary?: TripSummaryInfo,
  ) {
    appendMessage({
      id: createChatId("assistant"),
      role: "assistant",
      type: "text",
      createdAt: Date.now(),
      content,
      quickReplies,
      destinations,
      followUpQuestion,
      tripSummary,
    });
  }

  async function searchLodging(nextState: PlannerConversationState) {
    if (isSearchingLodging) {
      return;
    }

    if (!nextState.locationName || !nextState.startDate || !nextState.dayCount || !nextState.adultCount) {
      appendAssistantText("Mình chưa đủ điểm đến, ngày đi, số ngày hoặc số người để lấy giá phòng thật.");

      return;
    }

    const childCount = nextState.childCount ?? 0;

    const childAges = nextState.childAges ?? [];

    if (childAges.length !== childCount) {
      appendAssistantText(
        childCount > 0
          ? `Mình cần đủ tuổi của ${childCount} trẻ em trước khi gửi truy vấn giá phòng.`
          : "Thông tin tuổi trẻ em chưa đồng bộ, bạn thử gửi lại giúp mình nhé.",
      );

      return;
    }

    const nights = getHotelNightCount(nextState);

    const checkOutDate = addDaysToIso(nextState.startDate, nights);

    setIsSearchingLodging(true);

    setError(null);

    try {
      const response = await fetch("/api/ai/travel/hotels", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          locationName: nextState.locationName,

          checkInDate: nextState.startDate,

          checkOutDate,

          adultCount: nextState.adultCount,

          childCount,

          childAges,

          roomCount: nextState.roomCount,

          maxPricePerNight: nextState.lodgingBudgetPerNight,

          preference: nextState.lodgingPreference,

          requirements: nextState.lodgingRequirements,
        }),
      });

      const payload = await readPlannerApiResponse<HotelSearchResult>(response);

      if (response.status === 401) {
        window.location.href = "/auth/login?next=%2Fplanner%2Fai";

        return;
      }

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message ?? "Chưa thể tìm chỗ ở lúc này.");
      }

      appendMessage({
        id: createChatId("hotels"),
        role: "assistant",
        type: "hotels",
        createdAt: Date.now(),
        content:
          payload.data.message ??
          (payload.data.items.length > 0
            ? `Mình đã tìm được ${payload.data.items.length} lựa chọn từ LiteAPI.`
            : "LiteAPI chưa trả về lựa chọn phù hợp."),
        result: payload.data,
      });
    } catch (lodgingError) {
      console.error("[TRAVEL CHAT LODGING ERROR]", lodgingError);

      const message = lodgingError instanceof Error ? lodgingError.message : "Chưa thể tìm chỗ ở lúc này.";

      setError(message);

      appendAssistantText(`${message} Bạn có thể thử đổi ngày hoặc nới ngân sách.`);
    } finally {
      setIsSearchingLodging(false);
    }
  }

  async function checkWeather(
    nextState: PlannerConversationState,
    generated: GeneratedItinerary | null = latestGenerated,
  ) {
    if (isCheckingWeather) {
      return;
    }

    const resolvedLocationName =
      generated?.location?.name ??
      nextState.locationName ??
      locations.find((l) => l.id === nextState.locationId)?.name;

    const resolvedStartDate = generated?.request?.startDate ?? nextState.startDate;
    const resolvedDayCount = generated?.request?.dayCount ?? nextState.dayCount;

    if (!resolvedLocationName || !resolvedStartDate || !resolvedDayCount) {
      appendAssistantText("Mình cần điểm đến, ngày khởi hành và số ngày trước khi kiểm tra thời tiết.");

      return;
    }

    // Keep conversation state in sync with resolved details
    if (resolvedLocationName && !nextState.locationName) {
      setState((curr) => ({
        ...curr,
        locationName: resolvedLocationName,
        startDate: curr.startDate ?? resolvedStartDate,
        dayCount: curr.dayCount ?? resolvedDayCount,
      }));
    }

    setIsCheckingWeather(true);

    setError(null);

    try {
      const response = await fetch("/api/ai/travel/weather", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          locationName: resolvedLocationName,

          startDate: resolvedStartDate,

          dayCount: resolvedDayCount,

          activities: buildWeatherActivities(generated),
        }),
      });

      const payload = await readPlannerApiResponse<TravelWeatherResult>(response);

      if (response.status === 401) {
        window.location.href = "/auth/login?next=%2Fplanner%2Fai";

        return;
      }

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message ?? "Chưa thể kiểm tra thời tiết.");
      }

      if (!payload.data.available) {
        appendAssistantText(
          payload.data.message ??
            "Chưa có thông tin dự báo thời tiết cho khoảng thời gian này.",
        );

        return;
      }

      appendMessage({
        id: createChatId("weather"),
        role: "assistant",
        type: "weather",
        createdAt: Date.now(),
        content: payload.data.message ?? "Mình đã đối chiếu dự báo theo thời gian chuyến đi.",
        result: payload.data,
      });

      // Tự động kiểm tra nếu có hoạt động đi biển / ngoài trời và dự báo mưa lớn -> Gửi tin nhắn gợi ý đổi hoạt động
      const weatherData = payload.data;
      const rainyDays = (weatherData.days ?? []).filter(
        (day) => (day.precipitationProbabilityMax ?? 0) >= 50 || (day.precipitationSum ?? 0) >= 3,
      );
      const dangerWarnings = (weatherData.activityWarnings ?? []).filter(
        (w) => w.severity === "danger" || /mưa/i.test(w.label),
      );

      const hasBeachOrOutdoorContext =
        Boolean(nextState.contextTheme && /biển|bien|núi|nui|thiên nhiên|thien nhien/i.test(nextState.contextTheme)) ||
        (nextState.interests ?? []).some((i) => /biển|bien|núi|nui|thiên nhiên|thien nhien|ngoài trời|ngoai troi/i.test(i)) ||
        (generated?.plan?.days ?? []).some((d) =>
          (d.activities ?? []).some((act) =>
            /biển|bãi|tắm|lặn|cano|đảo|núi|rừng|công viên|sơn trà|mỹ khê/i.test(act.destinationName + " " + act.title),
          ),
        );

      const alreadyAdaptedForRain = Boolean(
        nextState.contextTheme && /trong nha|tranh mua/i.test(nextState.contextTheme),
      );

      if (!alreadyAdaptedForRain && (rainyDays.length > 0 || dangerWarnings.length > 0) && hasBeachOrOutdoorContext) {
        const rainyDates = rainyDays.map((d) => {
          const parts = d.date.split("-");
          const formatted = parts.length === 3 ? `${parts[2]}/${parts[1]}` : d.date;
          return `${formatted} (khả năng mưa ${d.precipitationProbabilityMax ?? 60}%)`;
        });

        const rainDescription = rainyDates.length > 0 ? rainyDates.join(", ") : "trong chuyến đi";

        window.setTimeout(() => {
          appendMessage({
            id: createChatId("assistant"),
            role: "assistant",
            type: "text",
            createdAt: Date.now(),
            content: `⚠️ Dự báo thời tiết cho thấy vào ${rainDescription} có khả năng mưa lớn, có thể ảnh hưởng đến các hoạt động tắm biển và vui chơi ngoài trời.\n\nBạn có muốn mình điều chỉnh các hoạt động ngày mưa sang trải nghiệm trong nhà (như bảo tàng, cafe ngắm mưa, thưởng thức ẩm thực đặc sản, mua sắm...) hoặc sắp xếp lại thứ tự các ngày không?`,
            quickReplies: [
              {
                label: "🏛️ Đổi sang hoạt động trong nhà",
                value: "Đổi các hoạt động ngày có mưa sang trải nghiệm trong nhà giúp mình",
                action: "send",
              },
              {
                label: "🔄 Đổi thứ tự các ngày",
                value: "Sắp xếp lại thứ tự các ngày, ngày nắng đi biển, ngày mưa đi trong nhà",
                action: "send",
              },
              {
                label: "👌 Giữ nguyên lịch trình",
                value: "Tôi vẫn muốn giữ nguyên lịch trình hiện tại",
                action: "send",
              },
            ],
          });
        }, 600);
      }
    } catch (weatherError) {
      console.error("[TRAVEL CHAT WEATHER ERROR]", weatherError);

      const message = weatherError instanceof Error ? weatherError.message : "Chưa thể kiểm tra thời tiết.";

      setError(message);

      appendAssistantText(message);
    } finally {
      setIsCheckingWeather(false);
    }
  }

  async function generatePlan(nextState: PlannerConversationState = state) {
    if (isGenerating) {
      return;
    }

    const request = buildPlannerRequestFromConversation(nextState);

    if (!request) {
      appendAssistantText(
        "Mình vẫn còn thiếu một vài thông tin trước khi lên lịch trình. Bạn cho mình biết điểm đến, số người, số ngày và ngày khởi hành nhé.",
      );

      return;
    }

    generationControllerRef.current?.abort();

    const controller = new AbortController();

    generationControllerRef.current = controller;

    const timeout = window.setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);

    setIsGenerating(true);

    setError(null);

    appendAssistantText("Mình đang ghép các điểm phù hợp từ dữ liệu SmartTrip và sắp lịch theo yêu cầu của bạn…");

    try {
      const response = await fetch("/api/ai/itinerary/generate", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(request),

        signal: controller.signal,
      });

      const payload = await readPlannerApiResponse<GeneratedItinerary>(response);

      if (response.status === 401) {
        window.location.href = "/auth/login?next=%2Fplanner%2Fai";

        return;
      }

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message ?? "AI không thể tạo hành trình.");
      }

      if (!payload.data.generationProof) {
        throw new Error("Server không trả generation proof cho lịch trình AI.");
      }

      setLatestGenerated(payload.data);

      appendMessage({
        id: createChatId("itinerary"),
        role: "assistant",
        type: "itinerary",
        createdAt: Date.now(),
        content: "Mình đã lên xong một lịch trình để bạn xem.",
        generated: payload.data,
      });

      appendAssistantText(
        "Bạn có thể chọn lịch trình này, hoặc cứ nhắn tiếp kiểu “ngày 2 nhẹ hơn”, “bỏ Bà Nà”, “ưu tiên chỗ mát về tối”… Mình sẽ cập nhật yêu cầu cho lần lên plan tiếp theo.",
      );

      void checkWeather(nextState, payload.data);
    } catch (generateError) {
      const aborted = controller.signal.aborted;

      if (aborted) {
        appendAssistantText("Lần tạo lịch này mất quá lâu nên mình đã dừng chờ. Bạn có thể thử lại ngay.", [
          {
            label: "Thử tạo lại",
            value: "",
            action: "generate",
          },
        ]);

        return;
      }

      console.error("[TRAVEL CHAT GENERATE ERROR]", generateError);

      const message = generateError instanceof Error ? generateError.message : "Không thể tạo hành trình bằng AI.";

      setError(message);

      appendAssistantText(`${message} Bạn có thể thử lại mà không cần nhập lại thông tin.`, [
        {
          label: "Thử tạo lại",
          value: "",
          action: "generate",
        },
      ]);
    } finally {
      window.clearTimeout(timeout);

      if (generationControllerRef.current === controller) {
        generationControllerRef.current = null;
      }

      setIsGenerating(false);
    }
  }

  async function sendMessage(rawMessage?: string) {
    const content = (rawMessage ?? draft).trim();

    if (!content || isChatting || isGenerating) {
      return;
    }

    const userMessage: TravelChatMessage = {
      id: createChatId("user"),
      role: "user",
      type: "text",
      createdAt: Date.now(),
      content,
    };

    const history = toHistory([...messages, userMessage]);

    setMessages((current) => [...current, userMessage]);

    setDraft("");

    setIsChatting(true);

    setError(null);

    try {
      const response = await fetch("/api/ai/travel/chat", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          message: content,

          state,

          locations,

          history,

          hasGeneratedPlan: Boolean(latestGenerated),
        }),
      });

      const payload = await readPlannerApiResponse<TravelChatServerResponse>(response);

      if (response.status === 401) {
        window.location.href = "/auth/login?next=%2Fplanner%2Fai";

        return;
      }

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message ?? "SmartTrip AI chưa thể xử lý tin nhắn.");
      }

      const result = payload.data;

      setState(result.state);

      appendAssistantText(
        result.reply,
        result.quickReplies,
        result.destinations,
        result.followUpQuestion,
        result.tripSummary,
      );

      if (result.action === "generate" && result.readyToGenerate) {
        window.setTimeout(() => void generatePlan(result.state), 150);

        return;
      }

      if (result.action === "lodging_search") {
        window.setTimeout(() => void searchLodging(result.state), 50);

        return;
      }

      if (result.action === "weather_check") {
        window.setTimeout(() => void checkWeather(result.state, latestGenerated), 50);
      }
    } catch (chatError) {
      console.error("[TRAVEL CHAT ERROR]", chatError);

      const message = chatError instanceof Error ? chatError.message : "SmartTrip AI chưa thể xử lý tin nhắn.";

      setError(message);

      appendAssistantText(`${message} Bạn thử gửi lại giúp mình nhé.`);
    } finally {
      setIsChatting(false);
    }
  }

  async function sendAction(actionPayload: TravelChatActionPayload, userDisplayText?: string) {
    if (isChatting || isGenerating) {
      return;
    }

    if (userDisplayText) {
      const userMessage: TravelChatMessage = {
        id: createChatId("user"),
        role: "user",
        type: "text",
        createdAt: Date.now(),
        content: userDisplayText,
      };
      setMessages((current) => [...current, userMessage]);
    }

    setIsChatting(true);
    setError(null);

    const history = toHistory(messages);

    try {
      const response = await fetch("/api/ai/travel/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userDisplayText || "",
          state,
          locations,
          history,
          hasGeneratedPlan: Boolean(latestGenerated),
          actionPayload,
        }),
      });

      const payload = await readPlannerApiResponse<TravelChatServerResponse>(response);

      if (response.status === 401) {
        window.location.href = "/auth/login?next=%2Fplanner%2Fai";
        return;
      }

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message ?? "SmartTrip AI chưa thể xử lý yêu cầu.");
      }

      const result = payload.data;
      setState(result.state);

      appendAssistantText(
        result.reply,
        result.quickReplies,
        result.destinations,
        result.followUpQuestion,
        result.tripSummary,
      );

      if (result.action === "generate" && result.readyToGenerate) {
        window.setTimeout(() => void generatePlan(result.state), 150);
        return;
      }

      if (result.action === "lodging_search") {
        window.setTimeout(() => void searchLodging(result.state), 50);
        return;
      }

      if (result.action === "weather_check") {
        window.setTimeout(() => void checkWeather(result.state, latestGenerated), 50);
      }
    } catch (chatError) {
      console.error("[TRAVEL CHAT ACTION ERROR]", chatError);
      const message = chatError instanceof Error ? chatError.message : "SmartTrip AI chưa thể xử lý yêu cầu.";
      setError(message);
      appendAssistantText(`${message} Bạn thử lại giúp mình nhé.`);
    } finally {
      setIsChatting(false);
    }
  }

  async function handleQuickReply(quickReply: TravelQuickReply) {
    if (quickReply.action === "generate") {
      await generatePlan(state);
      return;
    }

    if (quickReply.value === "Có, thêm địa điểm khác") {
      await sendAction({ actionType: "confirm_add_more" }, quickReply.value);
      return;
    }

    if (quickReply.value === "Không, tiếp tục lên lịch") {
      await sendAction({ actionType: "decline_add_more" }, quickReply.value);
      return;
    }

    if (quickReply.value === "Tạo lịch trình ngay") {
      await sendAction({ actionType: "confirm_summary" }, quickReply.value);
      return;
    }

    if (quickReply.value === "Đổi các hoạt động ngày có mưa sang trải nghiệm trong nhà giúp mình") {
      await sendAction({ actionType: "adapt_weather_rain" }, quickReply.value);
      return;
    }

    if (quickReply.value === "Sắp xếp lại thứ tự các ngày, ngày nắng đi biển, ngày mưa đi trong nhà") {
      await sendAction({ actionType: "reorder_weather_days" }, quickReply.value);
      return;
    }

    if (quickReply.value === "Tôi vẫn muốn giữ nguyên lịch trình hiện tại") {
      await sendAction({ actionType: "keep_weather_plan" }, quickReply.value);
      return;
    }

    await sendMessage(quickReply.value);
  }

  async function saveGenerated(generated: GeneratedItinerary) {
    if (isSaving) {
      return;
    }

    setIsSaving(true);

    setError(null);

    try {
      const response = await fetch("/api/ai/itinerary/save", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          request: generated.request,

          plan: generated.plan,

          generationProof: generated.generationProof,
        }),
      });

      const payload = await readPlannerApiResponse<SavedItinerary>(response);

      if (response.status === 401) {
        window.location.href = "/auth/login?next=%2Fplanner%2Fai";

        return;
      }

      if (!response.ok || !payload.success || !payload.data?.id) {
        throw new Error(payload.message ?? "Không thể lưu hành trình.");
      }

      router.push(`/planner/${payload.data.id}`);
    } catch (saveError) {
      console.error("[TRAVEL CHAT SAVE ERROR]", saveError);

      const message = saveError instanceof Error ? saveError.message : "Không thể lưu hành trình.";

      setError(message);

      appendAssistantText(message);
    } finally {
      setIsSaving(false);
    }
  }

  function resetConversation() {
    generationControllerRef.current?.abort();

    generationControllerRef.current = null;

    // Xóa session storage của riêng user này trước khi reset state
    clearChatSession(userId);

    setState(createInitialConversationState());

    setMessages(createWelcomeMessages());

    setDraft("");

    setLatestGenerated(null);

    setError(null);

    setIsChatting(false);

    setIsGenerating(false);

    setIsSaving(false);

    setIsSearchingLodging(false);

    setIsCheckingWeather(false);
  }

  function selectDestination(destination: DestinationCardItem) {
    void sendAction(
      {
        actionType: "select_destination",
        destinationId: destination.id,
        destinationName: destination.name,
        locationName: destination.locationName,
      },
      `Tôi chọn: ${destination.name}`,
    );
  }

  function rejectDestination(destination: DestinationCardItem) {
    void sendAction({
      actionType: "reject_destination",
      destinationId: destination.id,
    });
  }

  return {
    messages,
    state,
    draft,

    isChatting,
    isGenerating,
    isSaving,
    isSearchingLodging,
    isCheckingWeather,

    error,
    latestGenerated,

    setDraft,

    sendMessage,
    sendAction,
    selectDestination,
    rejectDestination,
    handleQuickReply,
    generatePlan,
    saveGenerated,
    resetConversation,
  };
}
