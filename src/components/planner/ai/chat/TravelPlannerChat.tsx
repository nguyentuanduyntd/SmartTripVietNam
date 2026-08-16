"use client";

import type {
    FormEvent,
    KeyboardEvent,
    ReactNode,
} from "react";

import {
    useEffect,
    useRef,
} from "react";

import {
    Bot,
    CalendarDays,
    Loader2,
    MapPin,
    RotateCcw,
    Send,
    Sparkles,
    UsersRound,
    WalletCards,
} from "lucide-react";

import type {
    LocationOption,
} from "@/src/components/planner/ai/ai-planner.types";

import {
    ItineraryChatCard,
} from "@/src/components/planner/ai/chat/ItineraryChatCard";

import {
    HotelChatCard,
} from "@/src/components/planner/ai/chat/HotelChatCard";

import {
    WeatherChatCard,
} from "@/src/components/planner/ai/chat/WeatherChatCard";

import {
    useTravelPlannerChat,
} from "@/src/components/planner/ai/chat/useTravelPlannerChat";

import {
    findLocationLabel,
    formatCurrency,
} from "@/src/components/planner/ai/chat/travel-chat.utils";

import type {
    AssistantChatMessage,
} from "@/src/components/planner/ai/chat/ai-travel-chat.types";

type TravelPlannerChatProps = {
    locations: LocationOption[];
};

export function TravelPlannerChat({
    locations,
}: TravelPlannerChatProps) {
    const {
        messages,
        state,
        draft,
        isChatting,
        isGenerating,
        isSaving,
        isSearchingLodging,
        isCheckingWeather,
        error,
        setDraft,
        sendMessage,
        handleQuickReply,
        generatePlan,
        saveGenerated,
        resetConversation,
    } =
        useTravelPlannerChat(
            locations,
        );

    const locationLabel =
        findLocationLabel(
            state,
            locations,
        );

    const budgetLabel =
        formatCurrency(
            state.budget,
        );

    /**
     * Scroll riêng phần conversation.
     *
     * KHÔNG dùng scrollIntoView() vì nó có thể kéo cả page.
     */
    const conversationScrollRef =
        useRef<HTMLDivElement | null>(
            null,
        );

    useEffect(
        () => {
            const container =
                conversationScrollRef.current;

            if (!container) {
                return;
            }

            const frame =
                window.requestAnimationFrame(
                    () => {
                        container.scrollTo({
                            top:
                                container.scrollHeight,

                            behavior:
                                "smooth",
                        });
                    },
                );

            return () => {
                window.cancelAnimationFrame(
                    frame,
                );
            };
        },
        [
            messages,
            isChatting,
            isGenerating,
            isSearchingLodging,
            isCheckingWeather,
        ],
    );

    const travelers =
        state.adultCount
            ? state.adultCount +
              state.childCount
            : null;

    function handleSubmit(
        event:
            FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        void sendMessage();
    }

    function handleComposerKeyDown(
        event:
            KeyboardEvent<HTMLTextAreaElement>,
    ) {
        if (
            event.key ===
                "Enter" &&
            !event.shiftKey
        ) {
            event.preventDefault();

            void sendMessage();
        }
    }

    return (
        <section
            className="
                flex
                h-[calc(100dvh-8.5rem)]
                min-h-[580px]
                w-full
                flex-col
                overflow-hidden
                rounded-[32px]
                border
                border-white/80
                bg-[#fffaf1]
                shadow-[0_26px_80px_rgba(23,58,59,0.10)]
                sm:min-h-[620px]
            "
        >
            {/* ============================================================= */}
            {/* FIXED CHAT HEADER                                             */}
            {/* ============================================================= */}

            <div className="shrink-0 border-b border-[#e7ded1] bg-white/95 px-5 py-4 backdrop-blur sm:px-7 sm:py-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3.5">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[16px] bg-[#173a3b] text-white shadow-[0_10px_24px_rgba(23,58,59,0.18)] sm:h-12 sm:w-12 sm:rounded-[18px]">
                            <Sparkles
                                size={
                                    21
                                }
                            />
                        </span>

                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h2 className="font-display text-xl font-semibold text-[#173a3b] sm:text-2xl">
                                    SmartTrip AI
                                </h2>

                                <span className="h-2.5 w-2.5 rounded-full bg-[#58a482]" />
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={
                            resetConversation
                        }
                        disabled={
                            isGenerating ||
                            isSaving
                        }
                        className="
                            inline-flex
                            h-10
                            shrink-0
                            items-center
                            gap-2
                            rounded-full
                            border
                            border-[#ddd3c6]
                            bg-white
                            px-3.5
                            text-xs
                            font-extrabold
                            text-[#64736f]
                            transition
                            hover:border-[#9db5af]
                            hover:text-[#173a3b]
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                        "
                        title="Bắt đầu cuộc trò chuyện mới"
                    >
                        <RotateCcw
                            size={
                                15
                            }
                        />

                        <span className="hidden sm:inline">
                            Chat mới
                        </span>
                    </button>
                </div>

                {/* Context chips */}

                <div className="mt-3 flex gap-2 overflow-x-auto pb-1 sm:mt-4 sm:flex-wrap sm:overflow-visible sm:pb-0">
                    <ContextChip
                        icon={
                            <MapPin
                                size={
                                    14
                                }
                            />
                        }
                        active={Boolean(
                            locationLabel,
                        )}
                        text={
                            locationLabel ??
                            "Chưa chọn nơi đến"
                        }
                    />

                    <ContextChip
                        icon={
                            <CalendarDays
                                size={
                                    14
                                }
                            />
                        }
                        active={Boolean(
                            state.dayCount ||
                                state.startDate,
                        )}
                        text={
                            [
                                state.dayCount
                                    ? `${state.dayCount} ngày`
                                    : null,

                                state.startDate ??
                                    null,
                            ]
                                .filter(
                                    Boolean,
                                )
                                .join(
                                    " · ",
                                ) ||
                            "Chưa chốt thời gian"
                        }
                    />

                    <ContextChip
                        icon={
                            <UsersRound
                                size={
                                    14
                                }
                            />
                        }
                        active={Boolean(
                            travelers,
                        )}
                        text={
                            travelers
                                ? `${travelers} người`
                                : "Chưa rõ số người"
                        }
                    />

                    <ContextChip
                        icon={
                            <WalletCards
                                size={
                                    14
                                }
                            />
                        }
                        active={Boolean(
                            budgetLabel,
                        )}
                        text={
                            budgetLabel ??
                            "Ngân sách linh hoạt"
                        }
                    />
                </div>
            </div>

            {/* ============================================================= */}
            {/* ONLY THIS AREA SCROLLS                                        */}
            {/* ============================================================= */}

            <div
                ref={
                    conversationScrollRef
                }
                className="
                    min-h-0
                    flex-1
                    overflow-y-auto
                    overscroll-contain
                    bg-[#f7f2ea]
                    px-4
                    py-5
                    [scrollbar-gutter:stable]
                    sm:px-7
                    sm:py-7
                "
            >
                <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
                    {messages.map(
                        (
                            message,
                        ) => {
                            if (
                                message.type ===
                                "itinerary"
                            ) {
                                return (
                                    <div
                                        key={
                                            message.id
                                        }
                                        className="flex items-start gap-3"
                                    >
                                        <AssistantAvatar />

                                        <div className="min-w-0 flex-1">
                                            <p className="mb-2 text-xs font-bold text-[#667873]">
                                                SmartTrip
                                                AI
                                            </p>

                                            <ItineraryChatCard
                                                generated={
                                                    message.generated
                                                }
                                                isSaving={
                                                    isSaving
                                                }
                                                isGenerating={
                                                    isGenerating
                                                }
                                                onSelect={() =>
                                                    saveGenerated(
                                                        message.generated,
                                                    )
                                                }
                                                onRegenerate={() =>
                                                    generatePlan(
                                                        state,
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>
                                );
                            }

                            if (
                                message.type ===
                                "hotels"
                            ) {
                                return (
                                    <div
                                        key={
                                            message.id
                                        }
                                        className="flex items-start gap-3"
                                    >
                                        <AssistantAvatar />

                                        <div className="min-w-0 flex-1">
                                            <p className="mb-2 text-xs font-bold text-[#667873]">
                                                SmartTrip
                                                AI ·
                                                Lưu trú
                                            </p>

                                            <HotelChatCard
                                                result={
                                                    message.result
                                                }
                                            />
                                        </div>
                                    </div>
                                );
                            }

                            if (
                                message.type ===
                                "weather"
                            ) {
                                return (
                                    <div
                                        key={
                                            message.id
                                        }
                                        className="flex items-start gap-3"
                                    >
                                        <AssistantAvatar />

                                        <div className="min-w-0 flex-1">
                                            <p className="mb-2 text-xs font-bold text-[#667873]">
                                                SmartTrip
                                                AI ·
                                                Thời
                                                tiết
                                            </p>

                                            <WeatherChatCard
                                                result={
                                                    message.result
                                                }
                                            />
                                        </div>
                                    </div>
                                );
                            }

                            if (
                                message.role ===
                                "user"
                            ) {
                                return (
                                    <div
                                        key={
                                            message.id
                                        }
                                        className="flex justify-end"
                                    >
                                        <div className="max-w-[88%] rounded-[24px] rounded-br-[8px] bg-[#173a3b] px-4 py-3 text-sm leading-6 text-white shadow-[0_8px_24px_rgba(23,58,59,0.12)] sm:max-w-[72%] sm:px-5">
                                            {
                                                message.content
                                            }
                                        </div>
                                    </div>
                                );
                            }

                            const assistantMessage =
                                message as AssistantChatMessage;

                            return (
                                <div
                                    key={
                                        message.id
                                    }
                                    className="flex items-start gap-3"
                                >
                                    <AssistantAvatar />

                                    <div className="min-w-0 max-w-[92%] sm:max-w-[78%]">
                                        <p className="mb-1.5 text-xs font-bold text-[#667873]">
                                            SmartTrip
                                            AI
                                        </p>

                                        <div className="rounded-[24px] rounded-tl-[8px] border border-[#e3dacd] bg-white px-4 py-3 text-sm leading-6 text-[#405652] shadow-[0_8px_26px_rgba(23,58,59,0.06)] sm:px-5">
                                            {
                                                assistantMessage.content
                                            }
                                        </div>

                                        {assistantMessage.quickReplies
                                            ?.length ? (
                                            <div className="mt-2.5 flex flex-wrap gap-2">
                                                {assistantMessage.quickReplies.map(
                                                    (
                                                        quickReply,
                                                        index,
                                                    ) => (
                                                        <button
                                                            key={`${message.id}-${quickReply.label}-${index}`}
                                                            type="button"
                                                            disabled={
                                                                isChatting ||
                                                                isGenerating
                                                            }
                                                            onClick={() =>
                                                                void handleQuickReply(
                                                                    quickReply,
                                                                )
                                                            }
                                                            className="
                                                                rounded-full
                                                                border
                                                                border-[#bfd1cb]
                                                                bg-[#f0f7f4]
                                                                px-3.5
                                                                py-2
                                                                text-xs
                                                                font-extrabold
                                                                text-[#356b63]
                                                                transition
                                                                hover:border-[#6f9e94]
                                                                hover:bg-white
                                                                disabled:cursor-not-allowed
                                                                disabled:opacity-50
                                                            "
                                                        >
                                                            {
                                                                quickReply.label
                                                            }
                                                        </button>
                                                    ),
                                                )}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            );
                        },
                    )}

                    {isChatting ? (
                        <LoadingBubble>
                            Đang hiểu yêu
                            cầu của bạn…
                        </LoadingBubble>
                    ) : null}

                    {isSearchingLodging ? (
                        <LoadingBubble>
                            Đang lấy giá
                            phòng từ
                            provider…
                        </LoadingBubble>
                    ) : null}

                    {isCheckingWeather ? (
                        <LoadingBubble>
                            Đang đối
                            chiếu dự báo
                            Open-Meteo…
                        </LoadingBubble>
                    ) : null}
                </div>
            </div>

            {/* ============================================================= */}
            {/* FIXED COMPOSER                                                 */}
            {/* ============================================================= */}

            <div className="shrink-0 border-t border-[#e5dccf] bg-white/95 px-4 py-3 backdrop-blur sm:px-7 sm:py-4">
                <form
                    onSubmit={
                        handleSubmit
                    }
                    className="mx-auto max-w-4xl"
                >
                    <div className="flex items-end gap-2 rounded-[26px] border border-[#d9d0c4] bg-white p-2 pl-4 shadow-[0_10px_32px_rgba(23,58,59,0.06)] transition focus-within:border-[#7aa39a] focus-within:ring-4 focus-within:ring-[#4d8a84]/10">
                        <textarea
                            value={
                                draft
                            }
                            rows={
                                1
                            }
                            maxLength={
                                1500
                            }
                            onChange={(
                                event,
                            ) =>
                                setDraft(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            onKeyDown={
                                handleComposerKeyDown
                            }
                            disabled={
                                isChatting ||
                                isGenerating
                            }
                            placeholder={
                                isGenerating
                                    ? "AI đang lên lịch trình…"
                                    : "Nhắn cho SmartTrip AI…"
                            }
                            className="
                                max-h-28
                                min-h-11
                                flex-1
                                resize-none
                                bg-transparent
                                py-2.5
                                text-sm
                                leading-6
                                text-[#173a3b]
                                outline-none
                                placeholder:text-[#96a09d]
                                disabled:cursor-not-allowed
                            "
                        />

                        <button
                            type="submit"
                            disabled={
                                !draft.trim() ||
                                isChatting ||
                                isGenerating
                            }
                            className="
                                grid
                                h-11
                                w-11
                                shrink-0
                                place-items-center
                                rounded-full
                                bg-[#d85b48]
                                text-white
                                shadow-[0_8px_20px_rgba(216,91,72,0.22)]
                                transition
                                hover:bg-[#c94f40]
                                disabled:cursor-not-allowed
                                disabled:bg-[#d8c7c1]
                                disabled:shadow-none
                            "
                            aria-label="Gửi tin nhắn"
                        >
                            {isChatting ? (
                                <Loader2
                                    size={
                                        18
                                    }
                                    className="animate-spin"
                                />
                            ) : (
                                <Send
                                    size={
                                        18
                                    }
                                />
                            )}
                        </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-3 px-2 text-[11px] text-[#87928f]">
                        <span className="hidden sm:inline">
                            Enter để gửi ·
                            Shift + Enter
                            để xuống dòng
                        </span>

                        {error ? (
                            <span className="ml-auto max-w-[70%] truncate font-bold text-[#c45143]">
                                {
                                    error
                                }
                            </span>
                        ) : (
                            <span className="ml-auto hidden sm:inline">
                                AI có thể hỏi
                                thêm trước khi
                                tạo plan
                            </span>
                        )}
                    </div>
                </form>
            </div>
        </section>
    );
}

function AssistantAvatar() {
    return (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[14px] bg-[#173a3b] text-white shadow-sm">
            <Bot
                size={
                    17
                }
            />
        </span>
    );
}

function LoadingBubble({
    children,
}: {
    children:
        ReactNode;
}) {
    return (
        <div className="flex items-start gap-3">
            <AssistantAvatar />

            <div className="rounded-[22px] rounded-tl-[8px] border border-[#d7e3df] bg-[#f8fcfa] px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-[#5f7771]">
                    <Loader2
                        size={
                            15
                        }
                        className="animate-spin"
                    />

                    {
                        children
                    }
                </div>
            </div>
        </div>
    );
}

function ContextChip({
    icon,
    text,
    active,
}: {
    icon:
        ReactNode;

    text:
        string;

    active:
        boolean;
}) {
    return (
        <span
            className={`
                inline-flex
                shrink-0
                items-center
                gap-1.5
                rounded-full
                border
                px-3
                py-1.5
                text-xs
                font-bold
                ${
                    active
                        ? "border-[#bdd4cd] bg-[#edf7f4] text-[#3c7169]"
                        : "border-[#e4dcd0] bg-[#faf7f1] text-[#8a9491]"
                }
            `}
        >
            {
                icon
            }

            {
                text
            }
        </span>
    );
}