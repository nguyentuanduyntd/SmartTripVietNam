"use client";

import {
    CalendarDays,
    Check,
    ChevronDown,
    Clock3,
    Loader2,
    MapPin,
    RefreshCw,
    Route,
    UsersRound,
    WalletCards,
} from "lucide-react";

import type {
    GeneratedItinerary,
} from "@/src/components/planner/ai/ai-planner.types";

import {
    formatCurrency,
} from "@/src/components/planner/ai/chat/travel-chat.utils";
import { calculateCostsTotal } from "@/src/lib/costs/cost-calculator";

type ItineraryChatCardProps = {
    generated: GeneratedItinerary;
    isSaving: boolean;
    isGenerating: boolean;
    onSelect: () => void | Promise<void>;
    onRegenerate: () => void | Promise<void>;
};

const TRANSPORT_LABELS: Record<string, string> = {
    walking: "Đi bộ",
    bicycle: "Xe đạp",
    motobike: "Xe máy",
    motorcycle: "Xe máy",
    car: "Ô tô",
    bus: "Xe buýt",
    train: "Tàu",
    airplane: "Máy bay",
    boat: "Thuyền",
    other: "Khác",
};

function calculateTotal(
    generated: GeneratedItinerary,
) {
    return calculateCostsTotal(
        generated.plan.estimatedCosts,
        {
            adultCount:
                generated.request.adultCount,
            childCount:
                generated.request.childCount,
            roomCount:
                generated.request.roomCount,
            defaultNightCount:
                Math.max(
                    generated.request.dayCount - 1,
                    1,
                ),
        },
    );
}

export function ItineraryChatCard({
    generated,
    isSaving,
    isGenerating,
    onSelect,
    onRegenerate,
}: ItineraryChatCardProps) {
    const total = calculateTotal(
        generated,
    );

    const travelerCount =
        generated.request.adultCount +
        generated.request.childCount;

    return (
        <div className="w-full overflow-hidden rounded-[28px] border border-[#d9e4df] bg-white shadow-[0_18px_55px_rgba(23,58,59,0.10)]">
            <div className="bg-[#173a3b] px-5 py-5 text-white sm:px-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#f4a292]">
                            Lịch trình SmartTrip AI
                        </p>

                        <h3 className="mt-2 font-display text-2xl font-semibold leading-tight">
                            {generated.plan.title}
                        </h3>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                            {generated.plan.description}
                        </p>
                    </div>

                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10">
                        <Route size={20} />
                    </span>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2">
                        <MapPin size={14} />
                        {generated.location.name}
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2">
                        <CalendarDays size={14} />
                        {generated.request.dayCount} ngày
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2">
                        <UsersRound size={14} />
                        {travelerCount} người
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2">
                        <WalletCards size={14} />
                        ~{formatCurrency(total) ?? "Chưa có dự toán"}
                    </span>
                </div>
            </div>

            <div className="space-y-3 p-4 sm:p-5">
                {generated.plan.days.map(
                    (day) => (
                        <details
                            key={day.dayNumber}
                            className="group rounded-[22px] border border-[#e6ded2] bg-[#fffaf1]"
                            open={day.dayNumber === 1}
                        >
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 sm:px-5">
                                <div>
                                    <p className="text-[11px] font-extrabold uppercase tracking-[0.13em] text-[#d85b48]">
                                        Ngày {day.dayNumber}
                                    </p>
                                    <p className="mt-1 font-bold text-[#173a3b]">
                                        {day.title}
                                    </p>
                                </div>

                                <ChevronDown
                                    size={18}
                                    className="shrink-0 text-[#61736f] transition group-open:rotate-180"
                                />
                            </summary>

                            <div className="border-t border-[#eadfd1] px-4 py-4 sm:px-5">
                                {day.description ? (
                                    <p className="mb-4 text-sm leading-6 text-[#6e7b78]">
                                        {day.description}
                                    </p>
                                ) : null}

                                <div className="space-y-3">
                                    {day.activities.map(
                                        (
                                            activity,
                                            activityIndex,
                                        ) => (
                                            <div
                                                key={`${day.dayNumber}-${activity.destinationId}-${activityIndex}`}
                                                className="rounded-2xl border border-[#e5ddd2] bg-white p-4"
                                            >
                                                <div className="flex gap-3">
                                                    <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#edf6f3] text-[#34706b]">
                                                        <Clock3 size={16} />
                                                    </span>

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <p className="font-extrabold text-[#173a3b]">
                                                                {activity.startTime} · {activity.destinationName}
                                                            </p>
                                                            <span className="rounded-full bg-[#f3eee6] px-2.5 py-1 text-[11px] font-bold text-[#697773]">
                                                                {TRANSPORT_LABELS[
                                                                    activity.transportMethod
                                                                ] ?? activity.transportMethod}
                                                            </span>
                                                        </div>

                                                        <p className="mt-1 text-sm font-semibold text-[#4d625e]">
                                                            {activity.title}
                                                        </p>

                                                        {activity.description ? (
                                                            <p className="mt-1.5 text-xs leading-5 text-[#77837f]">
                                                                {activity.description}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                        ),
                                    )}
                                </div>
                            </div>
                        </details>
                    ),
                )}
            </div>

            <div className="flex flex-col gap-2 border-t border-[#e7dfd4] bg-[#fbf7ef] p-4 sm:flex-row sm:items-center sm:justify-end sm:px-5">
                <button
                    type="button"
                    onClick={onRegenerate}
                    disabled={isGenerating || isSaving}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#d6ccc0] bg-white px-4 text-sm font-extrabold text-[#546b67] transition hover:border-[#9bb4ae] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isGenerating ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <RefreshCw size={16} />
                    )}
                    Lên lại
                </button>

                <button
                    type="button"
                    onClick={onSelect}
                    disabled={isSaving || isGenerating}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#d85b48] px-5 text-sm font-extrabold text-white shadow-[0_10px_26px_rgba(216,91,72,0.24)] transition hover:bg-[#c94f40] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isSaving ? (
                        <Loader2 size={17} className="animate-spin" />
                    ) : (
                        <Check size={17} />
                    )}
                    {isSaving
                        ? "Đang lưu..."
                        : "Chọn lịch trình này"}
                </button>
            </div>
        </div>
    );
}