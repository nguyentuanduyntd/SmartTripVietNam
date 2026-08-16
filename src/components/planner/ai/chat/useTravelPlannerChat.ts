"use client";

import {
    useEffect,
    useRef,
    useState,
} from "react";

import {
    useRouter,
} from "next/navigation";

import type {
    GeneratedItinerary,
    LocationOption,
    SavedItinerary,
} from "@/src/components/planner/ai/ai-planner.types";

import type {
    PlannerConversationState,
    TravelChatHistoryItem,
    TravelChatMessage,
    TravelChatServerResponse,
    TravelQuickReply,
    HotelSearchResult,
    TravelWeatherResult,
} from "@/src/components/planner/ai/chat/ai-travel-chat.types";

import {
    buildPlannerRequestFromConversation,
    createChatId,
    createInitialConversationState,
    createWelcomeMessages,
    readPlannerApiResponse,
} from "@/src/components/planner/ai/chat/travel-chat.utils";

const GENERATION_TIMEOUT_MS =
    90_000;

function toHistory(
    messages: TravelChatMessage[],
): TravelChatHistoryItem[] {
    return messages
        .filter(
            (
                message,
            ) =>
                message.type ===
                "text",
        )
        .slice(
            -10,
        )
        .map(
            (
                message,
            ) => ({
                role:
                    message.role,

                content:
                    message.content,
            }),
        );
}

export function useTravelPlannerChat(
    locations: LocationOption[],
) {
    const router =
        useRouter();

    const [
        messages,
        setMessages,
    ] =
        useState<TravelChatMessage[]>(
            () =>
                createWelcomeMessages(),
        );

    const [
        state,
        setState,
    ] =
        useState<PlannerConversationState>(
            () =>
                createInitialConversationState(),
        );

    const [
        draft,
        setDraft,
    ] =
        useState(
            "",
        );

    const [
        isChatting,
        setIsChatting,
    ] =
        useState(
            false,
        );

    const [
        isGenerating,
        setIsGenerating,
    ] =
        useState(
            false,
        );

    const [
        isSaving,
        setIsSaving,
    ] =
        useState(
            false,
        );

    const [
        isSearchingLodging,
        setIsSearchingLodging,
    ] =
        useState(
            false,
        );

    const [
        isCheckingWeather,
        setIsCheckingWeather,
    ] =
        useState(
            false,
        );

    const [
        error,
        setError,
    ] =
        useState<
            string | null
        >(
            null,
        );

    const [
        latestGenerated,
        setLatestGenerated,
    ] =
        useState<
            GeneratedItinerary | null
        >(
            null,
        );

    const generationControllerRef =
        useRef<
            AbortController | null
        >(
            null,
        );

    useEffect(
        () => {
            return () => {
                generationControllerRef.current
                    ?.abort();
            };
        },
        [],
    );

    function appendMessage(
        message:
            TravelChatMessage,
    ) {
        setMessages(
            (
                current,
            ) => [
                ...current,
                message,
            ],
        );
    }

    function appendAssistantText(
        content:
            string,

        quickReplies?:
            TravelQuickReply[],
    ) {
        appendMessage({
            id:
                createChatId(
                    "assistant",
                ),

            role:
                "assistant",

            type:
                "text",

            createdAt:
                Date.now(),

            content,

            quickReplies,
        });
    }

    function addDays(
        iso:
            string,

        days:
            number,
    ) {
        const date =
            new Date(
                `${iso}T00:00:00Z`,
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

    async function searchLodging(
        nextState:
            PlannerConversationState,
    ) {
        if (
            isSearchingLodging
        ) {
            return;
        }

        if (
            !nextState.locationName ||
            !nextState.startDate ||
            !nextState.dayCount ||
            !nextState.adultCount
        ) {
            return;
        }

        setIsSearchingLodging(
            true,
        );

        try {
            const nights =
                Math.max(
                    nextState.dayCount -
                        1,
                    1,
                );

            const response =
                await fetch(
                    "/api/ai/travel/hotels",
                    {
                        method:
                            "POST",

                        headers:
                        {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify(
                                {
                                    locationName:
                                        nextState.locationName,

                                    checkInDate:
                                        nextState.startDate,

                                    checkOutDate:
                                        addDays(
                                            nextState.startDate,
                                            nights,
                                        ),

                                    adultCount:
                                        nextState.adultCount,

                                    childCount:
                                        nextState.childCount,

                                    roomCount:
                                        nextState.roomCount,

                                    maxPricePerNight:
                                        nextState.lodgingBudgetPerNight,

                                    preference:
                                        nextState.lodgingPreference,
                                },
                            ),
                    },
                );

            const payload =
                await readPlannerApiResponse<HotelSearchResult>(
                    response,
                );

            if (
                response.status ===
                401
            ) {
                window.location.href =
                    "/auth/login?next=%2Fplanner%2Fai";

                return;
            }

            if (
                !response.ok ||
                !payload.success ||
                !payload.data
            ) {
                throw new Error(
                    payload.message ??
                        "Chưa thể tìm giá phòng.",
                );
            }

            if (
                !payload.data
                    .configured ||
                payload.data
                    .items
                    .length ===
                    0
            ) {
                appendAssistantText(
                    payload.data
                        .message ??
                        "Chưa có phòng phù hợp từ nguồn giá hiện tại.",
                );

                return;
            }

            appendMessage({
                id:
                    createChatId(
                        "hotels",
                    ),

                role:
                    "assistant",

                type:
                    "hotels",

                createdAt:
                    Date.now(),

                content:
                    "Mình tìm được một số lựa chọn lưu trú có giá từ provider.",

                result:
                    payload.data,
            });
        } catch (
            hotelError
        ) {
            console.error(
                "[TRAVEL CHAT HOTEL ERROR]",
                hotelError,
            );

            appendAssistantText(
                hotelError instanceof
                    Error
                    ? hotelError.message
                    : "Chưa thể tìm giá phòng lúc này.",
            );
        } finally {
            setIsSearchingLodging(
                false,
            );
        }
    }

    async function checkWeather(
        nextState:
            PlannerConversationState,

        generated?:
            GeneratedItinerary | null,
    ) {
        if (
            isCheckingWeather
        ) {
            return;
        }

        if (
            !nextState.locationName ||
            !nextState.startDate
        ) {
            return;
        }

        setIsCheckingWeather(
            true,
        );

        try {
            const activities =
                generated
                    ? generated.plan.days.flatMap(
                          (
                              day,
                          ) =>
                              day.activities.map(
                                  (
                                      activity,
                                  ) => ({
                                      dayNumber:
                                          day.dayNumber,

                                      destinationName:
                                          activity.destinationName,

                                      title:
                                          activity.title,

                                      description:
                                          activity.description ??
                                          "",

                                      startTime:
                                          activity.startTime,
                                  }),
                              ),
                      )
                    : [];

            const response =
                await fetch(
                    "/api/ai/travel/weather",
                    {
                        method:
                            "POST",

                        headers:
                        {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify(
                                {
                                    locationName:
                                        nextState.locationName,

                                    startDate:
                                        nextState.startDate,

                                    dayCount:
                                        generated
                                            ?.request
                                            .dayCount ??
                                        nextState.dayCount ??
                                        1,

                                    activities,
                                },
                            ),
                    },
                );

            const payload =
                await readPlannerApiResponse<TravelWeatherResult>(
                    response,
                );

            if (
                response.status ===
                401
            ) {
                window.location.href =
                    "/auth/login?next=%2Fplanner%2Fai";

                return;
            }

            if (
                !response.ok ||
                !payload.success ||
                !payload.data
            ) {
                throw new Error(
                    payload.message ??
                        "Chưa thể kiểm tra thời tiết.",
                );
            }

            if (
                !payload.data
                    .available
            ) {
                appendAssistantText(
                    payload.data
                        .message ??
                        "Chưa có dự báo phù hợp cho thời điểm này.",
                );

                return;
            }

            appendMessage({
                id:
                    createChatId(
                        "weather",
                    ),

                role:
                    "assistant",

                type:
                    "weather",

                createdAt:
                    Date.now(),

                content:
                    "Mình đã đối chiếu thời tiết với lịch trình.",

                result:
                    payload.data,
            });
        } catch (
            weatherError
        ) {
            console.error(
                "[TRAVEL CHAT WEATHER ERROR]",
                weatherError,
            );

            appendAssistantText(
                weatherError instanceof
                    Error
                    ? weatherError.message
                    : "Chưa thể kiểm tra thời tiết lúc này.",
            );
        } finally {
            setIsCheckingWeather(
                false,
            );
        }
    }

    async function generatePlan(
        nextState:
            PlannerConversationState =
            state,
    ) {
        if (
            isGenerating
        ) {
            return;
        }

        const request =
            buildPlannerRequestFromConversation(
                nextState,
            );

        if (!request) {
            appendAssistantText(
                "Mình vẫn còn thiếu một vài thông tin trước khi lên lịch trình. Bạn cho mình biết điểm đến, số người, số ngày và ngày khởi hành nhé.",
            );

            return;
        }

        generationControllerRef.current
            ?.abort();

        const controller =
            new AbortController();

        generationControllerRef.current =
            controller;

        const timeout =
            window.setTimeout(
                () =>
                    controller.abort(),

                GENERATION_TIMEOUT_MS,
            );

        setIsGenerating(
            true,
        );

        setError(
            null,
        );

        appendAssistantText(
            "Mình đang ghép các điểm phù hợp từ dữ liệu SmartTrip và sắp lịch theo yêu cầu của bạn…",
        );

        try {
            const response =
                await fetch(
                    "/api/ai/itinerary/generate",
                    {
                        method:
                            "POST",

                        headers:
                        {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify(
                                request,
                            ),

                        signal:
                            controller.signal,
                    },
                );

            const payload =
                await readPlannerApiResponse<GeneratedItinerary>(
                    response,
                );

            if (
                response.status ===
                401
            ) {
                window.location.href =
                    "/auth/login?next=%2Fplanner%2Fai";

                return;
            }

            if (
                !response.ok ||
                !payload.success ||
                !payload.data
            ) {
                throw new Error(
                    payload.message ??
                        "AI không thể tạo hành trình.",
                );
            }

            if (
                !payload.data
                    .generationProof
            ) {
                throw new Error(
                    "Server không trả generation proof cho lịch trình AI.",
                );
            }

            setLatestGenerated(
                payload.data,
            );

            appendMessage({
                id:
                    createChatId(
                        "itinerary",
                    ),

                role:
                    "assistant",

                type:
                    "itinerary",

                createdAt:
                    Date.now(),

                content:
                    "Mình đã lên xong một lịch trình để bạn xem.",

                generated:
                    payload.data,
            });

            appendAssistantText(
                "Bạn có thể chọn lịch trình này, hoặc cứ nhắn tiếp kiểu “ngày 2 nhẹ hơn”, “bỏ Bà Nà”, “ưu tiên chỗ mát về tối”… Mình sẽ cập nhật yêu cầu cho lần lên plan tiếp theo.",
            );

            window.setTimeout(
                () =>
                    void checkWeather(
                        nextState,
                        payload.data,
                    ),

                200,
            );
        } catch (
            generateError
        ) {
            const aborted =
                controller
                    .signal
                    .aborted;

            if (aborted) {
                appendAssistantText(
                    "Lần tạo lịch này mất quá lâu nên mình đã dừng chờ. Bạn có thể thử lại ngay.",
                    [
                        {
                            label:
                                "Thử tạo lại",

                            value:
                                "",

                            action:
                                "generate",
                        },
                    ],
                );

                return;
            }

            console.error(
                "[TRAVEL CHAT GENERATE ERROR]",
                generateError,
            );

            const message =
                generateError instanceof
                    Error
                    ? generateError.message
                    : "Không thể tạo hành trình bằng AI.";

            setError(
                message,
            );

            appendAssistantText(
                `${message} Bạn có thể thử lại mà không cần nhập lại thông tin.`,
                [
                    {
                        label:
                            "Thử tạo lại",

                        value:
                            "",

                        action:
                            "generate",
                    },
                ],
            );
        } finally {
            window.clearTimeout(
                timeout,
            );

            if (
                generationControllerRef.current ===
                controller
            ) {
                generationControllerRef.current =
                    null;
            }

            setIsGenerating(
                false,
            );
        }
    }

    async function sendMessage(
        rawMessage?:
            string,
    ) {
        const content =
            (
                rawMessage ??
                draft
            ).trim();

        if (
            !content ||
            isChatting ||
            isGenerating
        ) {
            return;
        }

        const userMessage:
            TravelChatMessage =
        {
            id:
                createChatId(
                    "user",
                ),

            role:
                "user",

            type:
                "text",

            createdAt:
                Date.now(),

            content,
        };

        const history =
            toHistory([
                ...messages,
                userMessage,
            ]);

        setMessages(
            (
                current,
            ) => [
                ...current,
                userMessage,
            ],
        );

        setDraft(
            "",
        );

        setIsChatting(
            true,
        );

        setError(
            null,
        );

        try {
            const response =
                await fetch(
                    "/api/ai/travel/chat",
                    {
                        method:
                            "POST",

                        headers:
                        {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify(
                                {
                                    message:
                                        content,

                                    state,

                                    locations,

                                    history,

                                    hasGeneratedPlan:
                                        Boolean(
                                            latestGenerated,
                                        ),
                                },
                            ),
                    },
                );

            const payload =
                await readPlannerApiResponse<TravelChatServerResponse>(
                    response,
                );

            if (
                response.status ===
                401
            ) {
                window.location.href =
                    "/auth/login?next=%2Fplanner%2Fai";

                return;
            }

            if (
                !response.ok ||
                !payload.success ||
                !payload.data
            ) {
                throw new Error(
                    payload.message ??
                        "SmartTrip AI chưa thể xử lý tin nhắn.",
                );
            }

            const result =
                payload.data;

            setState(
                result.state,
            );

            appendAssistantText(
                result.reply,
                result.quickReplies,
            );

            if (
                result.action ===
                "lodging_search"
            ) {
                window.setTimeout(
                    () =>
                        void searchLodging(
                            result.state,
                        ),

                    120,
                );
            }

            if (
                result.action ===
                "weather_check"
            ) {
                window.setTimeout(
                    () =>
                        void checkWeather(
                            result.state,
                            latestGenerated,
                        ),

                    120,
                );
            }

            if (
                result.action ===
                    "generate" &&
                result.readyToGenerate
            ) {
                window.setTimeout(
                    () =>
                        void generatePlan(
                            result.state,
                        ),

                    150,
                );
            }
        } catch (
            chatError
        ) {
            console.error(
                "[TRAVEL CHAT ERROR]",
                chatError,
            );

            const message =
                chatError instanceof
                    Error
                    ? chatError.message
                    : "SmartTrip AI chưa thể xử lý tin nhắn.";

            setError(
                message,
            );

            appendAssistantText(
                `${message} Bạn thử gửi lại giúp mình nhé.`,
            );
        } finally {
            setIsChatting(
                false,
            );
        }
    }

    async function handleQuickReply(
        quickReply:
            TravelQuickReply,
    ) {
        if (
            quickReply.action ===
            "generate"
        ) {
            await generatePlan(
                state,
            );

            return;
        }

        await sendMessage(
            quickReply.value,
        );
    }

    async function saveGenerated(
        generated:
            GeneratedItinerary,
    ) {
        if (
            isSaving
        ) {
            return;
        }

        setIsSaving(
            true,
        );

        setError(
            null,
        );

        try {
            const response =
                await fetch(
                    "/api/ai/itinerary/save",
                    {
                        method:
                            "POST",

                        headers:
                        {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify(
                                {
                                    request:
                                        generated.request,

                                    plan:
                                        generated.plan,

                                    generationProof:
                                        generated.generationProof,
                                },
                            ),
                    },
                );

            const payload =
                await readPlannerApiResponse<SavedItinerary>(
                    response,
                );

            if (
                response.status ===
                401
            ) {
                window.location.href =
                    "/auth/login?next=%2Fplanner%2Fai";

                return;
            }

            if (
                !response.ok ||
                !payload.success ||
                !payload.data
                    ?.id
            ) {
                throw new Error(
                    payload.message ??
                        "Không thể lưu hành trình.",
                );
            }

            router.push(
                `/planner/${payload.data.id}`,
            );
        } catch (
            saveError
        ) {
            console.error(
                "[TRAVEL CHAT SAVE ERROR]",
                saveError,
            );

            const message =
                saveError instanceof
                    Error
                    ? saveError.message
                    : "Không thể lưu hành trình.";

            setError(
                message,
            );

            appendAssistantText(
                message,
            );
        } finally {
            setIsSaving(
                false,
            );
        }
    }

    function resetConversation() {
        generationControllerRef.current
            ?.abort();

        generationControllerRef.current =
            null;

        setState(
            createInitialConversationState(),
        );

        setMessages(
            createWelcomeMessages(),
        );

        setDraft(
            "",
        );

        setLatestGenerated(
            null,
        );

        setError(
            null,
        );

        setIsChatting(
            false,
        );

        setIsGenerating(
            false,
        );

        setIsSearchingLodging(
            false,
        );

        setIsCheckingWeather(
            false,
        );
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
        handleQuickReply,
        generatePlan,
        searchLodging,
        checkWeather,
        saveGenerated,
        resetConversation,
    };
}