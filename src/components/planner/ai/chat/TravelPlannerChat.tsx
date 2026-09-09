"use client";
import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
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
import Link from "next/link";
import type { LocationOption } from "@/src/components/planner/ai/ai-planner.types";
import { ItineraryChatCard } from "@/src/components/planner/ai/chat/ItineraryChatCard";
import { HotelChatCard } from "@/src/components/planner/ai/chat/HotelChatCard";
import { WeatherChatCard } from "@/src/components/planner/ai/chat/WeatherChatCard";
import { useTravelPlannerChat } from "@/src/components/planner/ai/chat/useTravelPlannerChat";
import { findLocationLabel, formatCurrency } from "@/src/components/planner/ai/chat/travel-chat.utils";
import type { AssistantChatMessage, HotelChatMessage } from "@/src/components/planner/ai/chat/ai-travel-chat.types";
import { AddHotelToItineraryDialog } from "@/src/components/planner/ai/chat/AddHotelToItineraryDialog";
import { DestinationChatCards } from "@/src/components/planner/ai/chat/DestinationChatCards";

function renderCleanText(text: string) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-[#173a3b]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

type TravelPlannerChatProps = {
  locations: LocationOption[];
  userId?: string;
};

export function TravelPlannerChat({ locations, userId }: TravelPlannerChatProps) {
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
    selectDestination,
    rejectDestination,
    handleQuickReply,
    generatePlan,
    saveGenerated,
    resetConversation,
  } = useTravelPlannerChat(locations, userId);

  const [selectedHotelMsg, setSelectedHotelMsg] = useState<{
    hotel: import("@/src/components/planner/ai/chat/ai-travel-chat.types").HotelSearchItem;
    checkInDate: string;
    checkOutDate: string;
  } | null>(null);

  const locationLabel = findLocationLabel(state, locations);
  const budgetLabel = formatCurrency(state.budget);

  const conversationScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = conversationScrollRef.current;

    if (!container) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [messages, isChatting, isGenerating, isSearchingLodging, isCheckingWeather]);

  const travelers = state.adultCount ? state.adultCount + state.childCount : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  return (
    <>
      <section className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[28px] border border-white/80 bg-[#fffaf1] shadow-[0_26px_80px_rgba(23,58,59,0.10)] sm:rounded-[32px]">
        {/* Compact header: giảm chiều cao để tăng vùng chat */}
        <div className="shrink-0 border-b border-[#e7ded1] bg-white/95 px-4 py-2.5 backdrop-blur sm:px-5 sm:py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Link
                href="/"
                aria-label="Quay lại trang chủ"
                title="Quay lại trang chủ"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#ddd3c6] bg-white text-[#173a3b] transition hover:border-[#9db5af] hover:bg-[#edf7f4]"
              >
                <ArrowLeft size={18} />
              </Link>

              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[13px] bg-[#173a3b] text-white shadow-[0_8px_18px_rgba(23,58,59,0.16)]">
                <Sparkles size={18} />
              </span>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-semibold text-[#173a3b] sm:text-xl">
                    SmartTrip AI
                  </h2>
                  <span className="h-2 w-2 rounded-full bg-[#58a482]" />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={resetConversation}
              disabled={isGenerating || isSaving}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[#ddd3c6] bg-white px-3 text-[11px] font-extrabold text-[#64736f] transition hover:border-[#9db5af] hover:text-[#173a3b] disabled:cursor-not-allowed disabled:opacity-50"
              title="Bắt đầu cuộc trò chuyện mới"
            >
              <RotateCcw size={14} />
              <span className="hidden sm:inline">Chat mới</span>
            </button>
          </div>

          <div className="mt-2 flex gap-1.5 overflow-x-auto sm:flex-wrap sm:overflow-visible">
            <ContextChip
              icon={<MapPin size={13} />}
              active={Boolean(locationLabel)}
              text={locationLabel ?? "Chưa chọn nơi đến"}
            />
            <ContextChip
              icon={<CalendarDays size={13} />}
              active={Boolean(state.dayCount || state.startDate)}
              text={
                [state.dayCount ? `${state.dayCount} ngày` : null, state.startDate ?? null]
                  .filter(Boolean)
                  .join(" · ") || "Chưa chốt thời gian"
              }
            />
            <ContextChip
              icon={<UsersRound size={13} />}
              active={Boolean(travelers)}
              text={travelers ? `${travelers} người` : "Chưa rõ số người"}
            />
            <ContextChip
              icon={<WalletCards size={13} />}
              active={Boolean(budgetLabel)}
              text={budgetLabel ?? "Ngân sách linh hoạt"}
            />
          </div>
        </div>

        {/* Conversation giữ flex-1 để nhận toàn bộ chiều cao được giải phóng */}
        <div
          ref={conversationScrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#f7f2ea] px-4 py-4 [scrollbar-gutter:stable] sm:px-7 sm:py-5"
        >
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
            {messages.map((message) => {
              if (message.type === "itinerary") {
                return (
                  <div key={message.id} className="flex items-start gap-3">
                    <AssistantAvatar />
                    <div className="min-w-0 flex-1">
                      <p className="mb-2 text-xs font-bold text-[#667873]">SmartTrip AI</p>
                      <ItineraryChatCard
                        generated={message.generated}
                        isSaving={isSaving}
                        isGenerating={isGenerating}
                        onSelect={() => saveGenerated(message.generated)}
                        onRegenerate={() => generatePlan(state)}
                      />
                    </div>
                  </div>
                );
              }

              if (message.type === "hotels") {
                const hotelMsg = message as HotelChatMessage;

                return (
                  <div key={message.id} className="flex items-start gap-3">
                    <AssistantAvatar />
                    <div className="min-w-0 flex-1">
                      <p className="mb-2 text-xs font-bold text-[#667873]">SmartTrip AI · Lưu trú</p>
                      <HotelChatCard
                        result={hotelMsg.result}
                        onAddToItinerary={(hotel) =>
                          setSelectedHotelMsg({
                            hotel,
                            checkInDate: hotelMsg.result.checkInDate,
                            checkOutDate: hotelMsg.result.checkOutDate,
                          })
                        }
                      />
                    </div>
                  </div>
                );
              }

              if (message.type === "weather") {
                return (
                  <div key={message.id} className="flex items-start gap-3">
                    <AssistantAvatar />
                    <div className="min-w-0 flex-1">
                      <p className="mb-2 text-xs font-bold text-[#667873]">SmartTrip AI · Thời tiết</p>
                      <WeatherChatCard result={message.result} />
                    </div>
                  </div>
                );
              }

              if (message.role === "user") {
                return (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[88%] rounded-[24px] rounded-br-[8px] bg-[#173a3b] px-4 py-3 text-sm leading-6 text-white shadow-[0_8px_24px_rgba(23,58,59,0.12)] sm:max-w-[72%] sm:px-5">
                      {message.content}
                    </div>
                  </div>
                );
              }

              const assistantMessage = message as AssistantChatMessage;
              const hasDestinations = Boolean(
                assistantMessage.destinations && assistantMessage.destinations.length > 0,
              );

              // Lọc gợi ý nhanh để đảm bảo tối đa 3 nút và không trùng tên địa điểm trong card
              const destNames = (assistantMessage.destinations ?? []).map((d) => d.name.toLowerCase());
              const displayQuickReplies = (assistantMessage.quickReplies ?? [])
                .filter(
                  (qr) =>
                    !destNames.some(
                      (dn) => qr.label.toLowerCase().includes(dn) || qr.value.toLowerCase().includes(dn),
                    ),
                )
                .slice(0, 3);

              return (
                <div key={message.id} className="flex items-start gap-3">
                  <AssistantAvatar />
                  <div
                    className={`min-w-0 ${
                      hasDestinations ? "w-full max-w-[96%] sm:max-w-[88%]" : "max-w-[92%] sm:max-w-[78%]"
                    }`}
                  >
                    <p className="mb-1.5 text-xs font-bold text-[#667873]">SmartTrip AI</p>

                    {/* Đoạn trả lời tự nhiên ngắn gọn */}
                    <div className="rounded-[24px] rounded-tl-[8px] border border-[#e3dacd] bg-white px-4 py-3 text-sm leading-6 text-[#405652] shadow-[0_8px_26px_rgba(23,58,59,0.06)] sm:px-5">
                      {renderCleanText(assistantMessage.content)}
                    </div>

                    {/* Danh sách thẻ địa điểm riêng biệt */}
                    {hasDestinations && (
                      <DestinationChatCards
                        destinations={assistantMessage.destinations!}
                        selectedDestinations={state.selectedDestinations}
                        onSelectDestination={selectDestination}
                        onRejectDestination={rejectDestination}
                      />
                    )}

                    {/* Tóm tắt kế hoạch chuyến đi */}
                    {assistantMessage.tripSummary && (
                      <div className="mt-3 rounded-[20px] border border-[#d8e6e1] bg-[#f7faf8] p-4 text-xs sm:text-sm shadow-sm">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#e1ece8]">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#173a3b] text-white">
                            <Sparkles size={13} />
                          </span>
                          <span className="font-bold text-[#173a3b] text-sm">Tóm tắt kế hoạch chuyến đi</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#405652]">
                          <div className="flex items-start gap-1.5">
                            <MapPin size={14} className="text-[#356b63] shrink-0 mt-0.5" />
                            <span>
                              <strong>Điểm đến:</strong>{" "}
                              {assistantMessage.tripSummary.destinations.length > 0
                                ? assistantMessage.tripSummary.destinations.map((d) => d.destinationName).join(", ")
                                : state.locationName ?? "Đã chọn"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CalendarDays size={14} className="text-[#356b63] shrink-0" />
                            <span>
                              <strong>Thời gian:</strong> {assistantMessage.tripSummary.dayCount} ngày (khởi hành{" "}
                              {assistantMessage.tripSummary.startDate})
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <UsersRound size={14} className="text-[#356b63] shrink-0" />
                            <span>
                              <strong>Thành viên:</strong> {assistantMessage.tripSummary.adultCount} người lớn
                              {state.childCount > 0 ? `, ${state.childCount} trẻ em` : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <WalletCards size={14} className="text-[#356b63] shrink-0" />
                            <span>
                              <strong>Ngân sách:</strong>{" "}
                              {formatCurrency(assistantMessage.tripSummary.budget) || "Linh hoạt"}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 pt-2.5 border-t border-[#e1ece8] flex items-center justify-between">
                          <span className="text-xs text-[#607570]">
                            Nhịp độ: <strong>{assistantMessage.tripSummary.activitiesPerDay} hoạt động/ngày</strong>{" "}
                            ({assistantMessage.tripSummary.freeSlots > 0
                              ? `${assistantMessage.tripSummary.freeSlots} slot tự do`
                              : "kín lịch"})
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Câu hỏi tiếp theo sau danh sách thẻ */}
                    {assistantMessage.followUpQuestion && (
                      <div className="mt-3 rounded-[16px] bg-[#fffaf1] border border-[#e8dfd3] px-4 py-2.5 text-xs sm:text-sm text-[#35524c] font-medium leading-relaxed shadow-sm">
                        {renderCleanText(assistantMessage.followUpQuestion)}
                      </div>
                    )}

                    {/* Nút gợi ý nhanh */}
                    {displayQuickReplies.length ? (
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {displayQuickReplies.map((quickReply, index) => (
                          <button
                            key={`${message.id}-${quickReply.label}-${index}`}
                            type="button"
                            disabled={isChatting || isGenerating}
                            onClick={() => void handleQuickReply(quickReply)}
                            className="rounded-full border border-[#bfd1cb] bg-[#f0f7f4] px-3.5 py-2 text-xs font-extrabold text-[#356b63] transition hover:border-[#6f9e94] hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {quickReply.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {isChatting ? <LoadingBubble>Đang hiểu yêu cầu của bạn…</LoadingBubble> : null}
            {isSearchingLodging ? <LoadingBubble>Đang lấy giá phòng từ provider…</LoadingBubble> : null}
            {isCheckingWeather ? <LoadingBubble>Đang đối chiếu dự báo Open-Meteo…</LoadingBubble> : null}
          </div>
        </div>

        {/* Compact composer */}
        <div className="shrink-0 border-t border-[#e5dccf] bg-white/95 px-4 py-2 backdrop-blur sm:px-5 sm:py-2.5">
          <form onSubmit={handleSubmit} className="mx-auto max-w-6xl">
            <div className="flex items-end gap-2 rounded-[22px] border border-[#d9d0c4] bg-white p-1.5 pl-3 shadow-[0_8px_24px_rgba(23,58,59,0.06)] transition focus-within:border-[#7aa39a] focus-within:ring-4 focus-within:ring-[#4d8a84]/10">
              <textarea
                value={draft}
                rows={1}
                maxLength={1500}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                disabled={isChatting || isGenerating}
                placeholder={isGenerating ? "AI đang lên lịch trình…" : "Nhắn cho SmartTrip AI…"}
                className="max-h-24 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-sm leading-6 text-[#173a3b] outline-none placeholder:text-[#96a09d] disabled:cursor-not-allowed"
              />

              <button
                type="submit"
                disabled={!draft.trim() || isChatting || isGenerating}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#d85b48] text-white shadow-[0_6px_16px_rgba(216,91,72,0.20)] transition hover:bg-[#c94f40] disabled:cursor-not-allowed disabled:bg-[#d8c7c1] disabled:shadow-none"
                aria-label="Gửi tin nhắn"
              >
                {isChatting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>

            <div className="mt-1 flex items-center justify-between gap-3 px-2 text-[10px] text-[#87928f]">
              <span className="hidden sm:inline">Enter để gửi · Shift + Enter để xuống dòng</span>
              {error ? (
                <span className="ml-auto max-w-[70%] truncate font-bold text-[#c45143]">{error}</span>
              ) : (
                <span className="ml-auto hidden sm:inline">AI có thể hỏi thêm trước khi tạo plan</span>
              )}
            </div>
          </form>
        </div>
      </section>

      {/* Dialog thêm khách sạn vào lịch trình */}
      <AddHotelToItineraryDialog
        hotel={selectedHotelMsg?.hotel ?? null}
        checkInDate={selectedHotelMsg?.checkInDate ?? ""}
        checkOutDate={selectedHotelMsg?.checkOutDate ?? ""}
        onClose={() => setSelectedHotelMsg(null)}
      />
    </>
  );
}

function AssistantAvatar() {
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[14px] bg-[#173a3b] text-white shadow-sm">
      <Bot size={17} />
    </span>
  );
}

function LoadingBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <AssistantAvatar />
      <div className="rounded-[22px] rounded-tl-[8px] border border-[#d7e3df] bg-[#f8fcfa] px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-[#5f7771]">
          <Loader2 size={15} className="animate-spin" />
          {children}
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
  icon: ReactNode;
  text: string;
  active: boolean;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${active
        ? "border-[#bdd4cd] bg-[#edf7f4] text-[#3c7169]"
        : "border-[#e4dcd0] bg-[#faf7f1] text-[#8a9491]"
        }`}
    >
      {icon}
      {text}
    </span>
  );
}
