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
    HotelSearchResult,
    PlannerConversationState,
    TravelChatHistoryItem,
    TravelChatMessage,
    TravelChatServerResponse,
    TravelQuickReply,
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

function addDaysToIso(
    iso: string,
    days: number,
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

function getHotelNightCount(
    state:
        PlannerConversationState,
) {
    /**
     * Giữ cùng convention với itinerary:
     *
     * 3 ngày -> 2 đêm
     * 2 ngày -> 1 đêm
     * 1 ngày -> vẫn tìm tối thiểu 1 đêm
     *
     * Vì hotel availability bắt buộc check-out > check-in.
     */
    return Math.max(
        (
            state.dayCount ??
            1
        ) - 1,
        1,
    );
}

function buildWeatherActivities(
    generated:
        GeneratedItinerary | null,
) {
    if (!generated) {
        return [];
    }

    return generated.plan.days.flatMap(
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
                        activity.description,
                    startTime:
                        activity.startTime,
                }),
            ),
    );
}

export function useTravelPlannerChat(
    locations:
        LocationOption[],
) {
    const router =
        useRouter();

    const [
        messages,
        setMessages,
    ] =
        useState<
            TravelChatMessage[]
        >(
            () =>
                createWelcomeMessages(),
        );

    const [
        state,
        setState,
    ] =
        useState<
            PlannerConversationState
        >(
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

    /* ---------------------------------------------------------------------- */
    /* Hotel search                                                           */
    /* ---------------------------------------------------------------------- */

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
            appendAssistantText(
                "Mình chưa đủ điểm đến, ngày đi, số ngày hoặc số người để lấy giá phòng thật.",
            );

            return;
        }

        const childCount =
            nextState.childCount ??
            0;

        const childAges =
            nextState.childAges ??
            [];

        /**
         * Đây là guard phía client.
         * Server schema và LiteAPI provider vẫn kiểm tra lại.
         */
        if (
            childAges.length !==
            childCount
        ) {
            appendAssistantText(
                childCount >
                0
                    ? `Mình cần đủ tuổi của ${childCount} trẻ em trước khi gửi truy vấn giá phòng.`
                    : "Thông tin tuổi trẻ em chưa đồng bộ, bạn thử gửi lại giúp mình nhé.",
            );

            return;
        }

        const nights =
            getHotelNightCount(
                nextState,
            );

        const checkOutDate =
            addDaysToIso(
                nextState.startDate,
                nights,
            );

        setIsSearchingLodging(
            true,
        );

        setError(
            null,
        );

        try {
            const response =
                await fetch(
                    "/api/ai/travel/hotels",
                    {
                        method:
                            "POST",

                        headers: {
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

                                    checkOutDate,

                                    adultCount:
                                        nextState.adultCount,

                                    childCount,

                                    /**
                                     * Quan trọng:
                                     * truyền tuổi trẻ em xuyên xuống LiteAPI.
                                     */
                                    childAges,

                                    roomCount:
                                        nextState.roomCount,

                                    maxPricePerNight:
                                        nextState.lodgingBudgetPerNight,

                                    preference:
                                        nextState.lodgingPreference,

                                    requirements:
                                        nextState.lodgingRequirements,
                                },
                            ),
                    },
                );

            const payload =
                await readPlannerApiResponse<
                    HotelSearchResult
                >(
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
                        "Chưa thể tìm chỗ ở lúc này.",
                );
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
                    payload.data.message ??
                    (
                        payload.data.items
                            .length >
                        0
                            ? `Mình đã tìm được ${payload.data.items.length} lựa chọn từ LiteAPI.`
                            : "LiteAPI chưa trả về lựa chọn phù hợp."
                    ),
                result:
                    payload.data,
            });
        } catch (
            lodgingError
        ) {
            console.error(
                "[TRAVEL CHAT LODGING ERROR]",
                lodgingError,
            );

            const message =
                lodgingError instanceof
                Error
                    ? lodgingError.message
                    : "Chưa thể tìm chỗ ở lúc này.";

            setError(
                message,
            );

            appendAssistantText(
                `${message} Bạn có thể thử đổi ngày hoặc nới ngân sách.`,
            );
        } finally {
            setIsSearchingLodging(
                false,
            );
        }
    }

    /* ---------------------------------------------------------------------- */
    /* Weather                                                                */
    /* ---------------------------------------------------------------------- */

    async function checkWeather(
        nextState:
            PlannerConversationState,
        generated:
            GeneratedItinerary | null =
                latestGenerated,
    ) {
        if (
            isCheckingWeather
        ) {
            return;
        }

        if (
            !nextState.locationName ||
            !nextState.startDate ||
            !nextState.dayCount
        ) {
            appendAssistantText(
                "Mình cần điểm đến, ngày khởi hành và số ngày trước khi kiểm tra thời tiết.",
            );

            return;
        }

        setIsCheckingWeather(
            true,
        );

        setError(
            null,
        );

        try {
            const response =
                await fetch(
                    "/api/ai/travel/weather",
                    {
                        method:
                            "POST",

                        headers: {
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
                                        nextState.dayCount,

                                    activities:
                                        buildWeatherActivities(
                                            generated,
                                        ),
                                },
                            ),
                    },
                );

            const payload =
                await readPlannerApiResponse<
                    TravelWeatherResult
                >(
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
                    payload.data.message ??
                    "Mình đã đối chiếu dự báo theo thời gian chuyến đi.",
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

            const message =
                weatherError instanceof
                Error
                    ? weatherError.message
                    : "Chưa thể kiểm tra thời tiết.";

            setError(
                message,
            );

            appendAssistantText(
                message,
            );
        } finally {
            setIsCheckingWeather(
                false,
            );
        }
    }

    /* ---------------------------------------------------------------------- */
    /* Generate itinerary                                                     */
    /* ---------------------------------------------------------------------- */

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

                        headers: {
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
                await readPlannerApiResponse<
                    GeneratedItinerary
                >(
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

            /**
             * Weather là enrichment:
             * itinerary đã thành công thì không để weather
             * làm hỏng kết quả chính.
             */
            void checkWeather(
                nextState,
                payload.data,
            );
        } catch (
            generateError
        ) {
            const aborted =
                controller.signal
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

    /* ---------------------------------------------------------------------- */
    /* Chat                                                                   */
    /* ---------------------------------------------------------------------- */

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

                        headers: {
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
                await readPlannerApiResponse<
                    TravelChatServerResponse
                >(
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

                return;
            }

            if (
                result.action ===
                "lodging_search"
            ) {
                /**
                 * Không dùng `state` cũ.
                 * Phải dùng `result.state` vì childAges có thể
                 * vừa được cập nhật từ chính tin nhắn này.
                 *
                 * Ví dụ user chỉ nhắn: "5 tuổi".
                 */
                window.setTimeout(
                    () =>
                        void searchLodging(
                            result.state,
                        ),
                    50,
                );

                return;
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
                    50,
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

    /* ---------------------------------------------------------------------- */
    /* Save                                                                   */
    /* ---------------------------------------------------------------------- */

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

                        headers: {
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
                await readPlannerApiResponse<
                    SavedItinerary
                >(
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

        setIsSaving(
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
        saveGenerated,
        resetConversation,
    };
}