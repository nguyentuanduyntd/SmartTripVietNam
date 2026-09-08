"use client";

import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  Loader2,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import type { HotelSearchItem } from "@/src/components/planner/ai/chat/ai-travel-chat.types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StayTargetItinerary = {
  id: string;
  title: string;
  startDate: string | null;
  status: "draft" | "planned";
  roomCount: number;
  adultCount: number;
  childCount: number;
};

type StayTargetsResult = {
  items: StayTargetItinerary[];
};

type AddStayResult = {
  itinerary: { id: string; title: string };
  stay: { id: string; name: string; checkInDate: string; checkOutDate: string; roomCount: number };
  redirectTo: string;
};

type ApiPayload<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(value: string | null) {
  if (!value) return "Chưa có ngày";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Props = {
  hotel: HotelSearchItem | null;
  checkInDate: string;
  checkOutDate: string;
  onClose: () => void;
};

type DialogStep = "select" | "success";

export function AddHotelToItineraryDialog({ hotel, checkInDate, checkOutDate, onClose }: Props) {
  const isOpen = hotel !== null;

  const [step, setStep] = useState<DialogStep>("select");
  const [itineraries, setItineraries] = useState<StayTargetItinerary[]>([]);
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<AddStayResult | null>(null);

  // Reset on open/close
  useEffect(() => {
    if (isOpen) {
      setStep("select");
      setSelectedId(null);
      setError(null);
      setSuccessResult(null);
      loadTargets();
    }
  }, [isOpen]);

  // Trap scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  async function loadTargets() {
    setIsLoadingTargets(true);
    setError(null);

    try {
      const response = await fetch("/api/itineraries/stays-targets");
      const payload = (await response.json()) as ApiPayload<StayTargetsResult>;

      if (!response.ok || !payload.success || !payload.data) {
        if (response.status === 401) {
          window.location.href = "/auth/login?next=%2Fplanner%2Fai";
          return;
        }
        throw new Error(payload.message ?? "Chưa thể tải danh sách lịch trình.");
      }

      setItineraries(payload.data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chưa thể tải danh sách lịch trình.");
    } finally {
      setIsLoadingTargets(false);
    }
  }

  async function handleAdd() {
    if (!hotel || !selectedId || isAdding) return;

    setIsAdding(true);
    setError(null);

    // Convert pricePerNight to VND if currency is USD or other
    // We keep as-is if already VND, otherwise pass 0 (provider price not always in VND)
    const pricePerRoomNight =
      hotel.currency === "VND" ? (hotel.pricePerNight ?? 0) : 0;

    try {
      const response = await fetch(`/api/itineraries/${selectedId}/stays`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: hotel.name,
          address: hotel.address ?? null,
          checkInDate,
          checkOutDate,
          roomCount: 1,
          pricePerRoomNight,
          note: hotel.boardName ?? null,
        }),
      });

      const payload = (await response.json()) as ApiPayload<AddStayResult>;

      if (!response.ok || !payload.success || !payload.data) {
        if (response.status === 401) {
          window.location.href = "/auth/login?next=%2Fplanner%2Fai";
          return;
        }
        throw new Error(payload.message ?? "Chưa thể thêm lưu trú vào lịch trình.");
      }

      setSuccessResult(payload.data);
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chưa thể thêm lưu trú vào lịch trình.");
    } finally {
      setIsAdding(false);
    }
  }

  if (!isOpen) return null;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-[700] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Thêm khách sạn vào lịch trình"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Panel */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-t-[32px] bg-[#fffaf1] shadow-[0_32px_100px_rgba(23,58,59,0.22)] sm:rounded-[32px]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#e8ddd1] px-6 py-5">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#d85b48]">
              Nơi lưu trú
            </p>
            <h2 className="mt-0.5 font-display text-xl font-semibold text-[#173a3b]">
              {step === "success" ? "Đã thêm vào lịch trình!" : "Chọn lịch trình để thêm"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#ddd3c8] bg-white text-[#6f7d79] transition hover:border-[#aaa098] hover:text-[#173a3b]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Hotel summary */}
        <div className="border-b border-[#ede4d9] bg-[#f3ece0] px-6 py-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#173a3b] text-[#f3bd59]">
              <BedDouble size={18} />
            </span>
            <div className="min-w-0">
              <p className="truncate font-extrabold text-[#173a3b]">{hotel?.name}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#697672]">
                <CalendarDays size={12} />
                {formatDate(checkInDate)} → {formatDate(checkOutDate)}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[55vh] overflow-y-auto px-6 py-5">
          {step === "select" ? (
            <>
              {/* Error */}
              {error ? (
                <div className="mb-4 rounded-2xl border border-[#edc8be] bg-[#fff4ef] px-4 py-3 text-sm text-[#9a4c3d]">
                  {error}
                </div>
              ) : null}

              {/* Loading */}
              {isLoadingTargets ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={24} className="animate-spin text-[#34706b]" />
                </div>
              ) : itineraries.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="font-bold text-[#173a3b]">Chưa có lịch trình nào</p>
                  <p className="mt-2 text-sm leading-6 text-[#6e7b78]">
                    Tạo một hành trình trước để có thể thêm nơi lưu trú vào đây.
                  </p>
                  <Link
                    href="/#hanh-trinh"
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#173a3b] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#20494a]"
                    onClick={onClose}
                  >
                    Khám phá tour mẫu
                    <ArrowRight size={15} />
                  </Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <p className="mb-3 text-xs font-semibold text-[#7a8784]">
                    Chọn lịch trình bạn muốn thêm nơi lưu trú này:
                  </p>
                  {itineraries.map((itinerary) => {
                    const isSelected = selectedId === itinerary.id;
                    const travelerCount = itinerary.adultCount + itinerary.childCount;

                    return (
                      <button
                        key={itinerary.id}
                        type="button"
                        onClick={() => setSelectedId(itinerary.id)}
                        className={`w-full rounded-2xl border px-4 py-3.5 text-left transition ${
                          isSelected
                            ? "border-[#5aab9e] bg-[#edf7f4] ring-2 ring-[#5aab9e]/30"
                            : "border-[#e0d7c9] bg-white hover:border-[#bdd0ca] hover:bg-[#f7fcfa]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-bold text-[#173a3b]">{itinerary.title}</p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[#667672]">
                              <span className="flex items-center gap-1">
                                <CalendarDays size={12} />
                                {formatDate(itinerary.startDate)}
                              </span>
                              <span className="flex items-center gap-1">
                                <UsersRound size={12} />
                                {travelerCount} người
                              </span>
                              <span className="flex items-center gap-1">
                                <BedDouble size={12} />
                                {itinerary.roomCount} phòng
                              </span>
                            </div>
                          </div>
                          <span
                            className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 transition ${
                              isSelected
                                ? "border-[#34706b] bg-[#34706b]"
                                : "border-[#ccc5bb] bg-white"
                            }`}
                          >
                            {isSelected ? (
                              <CheckCircle2 size={16} className="text-white" />
                            ) : null}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            // Success state
            <div className="py-4 text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-[#edf7f4] text-[#34706b]">
                <CheckCircle2 size={32} />
              </span>
              <p className="mt-4 font-display text-xl font-semibold text-[#173a3b]">
                Đã thêm vào &ldquo;{successResult?.itinerary.title}&rdquo;
              </p>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[#6e7b78]">
                <strong>{hotel?.name}</strong> đã được lưu vào mục lưu trú của lịch trình.
              </p>

              {successResult?.redirectTo ? (
                <Link
                  href={successResult.redirectTo}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#173a3b] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_28px_rgba(23,58,59,0.18)] transition hover:-translate-y-0.5 hover:bg-[#20494a]"
                >
                  Xem lịch trình
                  <ArrowRight size={16} />
                </Link>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer CTA (select step only) */}
        {step === "select" && itineraries.length > 0 ? (
          <div className="border-t border-[#e8ddd1] bg-white/80 px-6 py-4">
            <button
              type="button"
              disabled={!selectedId || isAdding}
              onClick={() => void handleAdd()}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#173a3b] text-sm font-extrabold text-white shadow-[0_10px_28px_rgba(23,58,59,0.18)] transition hover:-translate-y-0.5 hover:bg-[#214c4b] disabled:cursor-not-allowed disabled:bg-[#9db5b0] disabled:shadow-none disabled:hover:translate-y-0"
            >
              {isAdding ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Đang thêm...
                </>
              ) : (
                <>
                  <BedDouble size={16} />
                  Thêm vào lịch trình
                </>
              )}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
