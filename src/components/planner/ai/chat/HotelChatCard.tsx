"use client";

import { useState } from "react";

import {
    BedDouble,
    Building2,
    CalendarDays,
    CheckCircle2,
    ExternalLink,
    MapPin,
    ShieldCheck,
    Sparkles,
    WalletCards,
} from "lucide-react";

import type {
    HotelSearchItem,
    HotelSearchResult,
} from "@/src/components/planner/ai/chat/ai-travel-chat.types";

function formatMoney(
    value?: number,
    currency = "VND",
) {
    if (!value) {
        return "Chưa có giá";
    }

    return new Intl.NumberFormat(
        "vi-VN",
        {
            style:
                "currency",
            currency,

            maximumFractionDigits:
                0,
        },
    ).format(
        value,
    );
}

function formatRating(
    rating?: number,
) {
    if (
        rating ===
            undefined ||
        !Number.isFinite(
            rating,
        )
    ) {
        return null;
    }

    const value =
        rating.toFixed(
            rating % 1 ===
                0
                ? 0
                : 1,
        );
    return rating >
        5
        ? `${value}/10`
        : `${value}★`;
}

function buildGoogleMapsUrl(
    hotel: HotelSearchItem,
    locationName: string,
) {
    const query =
        hotel.address?.trim()
            ? `${hotel.name}, ${hotel.address}`
            : typeof hotel.latitude === "number" &&
                Number.isFinite(
                    hotel.latitude,
                ) &&
                typeof hotel.longitude === "number" &&
                Number.isFinite(
                    hotel.longitude,
                )
              ? `${hotel.name}, ${hotel.latitude},${hotel.longitude}`
              : `${hotel.name}, ${locationName}`;

    const params =
        new URLSearchParams({
            api: "1",
            query,
        });

    return `https://www.google.com/maps/search/?${params.toString()}`;
}

function getOverBudgetAmount(
    hotel: HotelSearchItem,
    maxPricePerNight?: number,
) {
    if (
        !maxPricePerNight ||
        hotel.currency !== "VND" ||
        hotel.pricePerNight ===
            undefined
    ) {
        return null;
    }

    const difference =
        hotel.pricePerNight -
        maxPricePerNight;

    return difference > 0
        ? difference
        : null;
}
export function HotelChatCard({
    result,
}: {
    result:
        HotelSearchResult;
}) {
    const [
        showNearBudget,
        setShowNearBudget,
    ] = useState(
        false,
    );

    const nearBudgetItems =
        result.nearBudgetItems ??
        [];

    const isBudgetEmpty =
        result.items.length ===
        0;

    const displayedItems =
        isBudgetEmpty &&
        showNearBudget
            ? nearBudgetItems
            : result.items;

    return (
        <div className="w-full overflow-hidden rounded-[26px] border border-[#dfd6c9] bg-white shadow-[0_16px_44px_rgba(23,58,59,0.08)]">
            <div className="border-b border-[#ebe2d6] bg-[#f8f3ea] px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#d85b48]">
                                Giá
                                phòng
                                trực
                                tiếp
                            </p>
                            {result.sandbox ? (
                                <span className="rounded-full bg-[#fff1cd] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#94711d]">
                                    Sandbox
                                </span>
                            ) : null}
                        </div>
                        <h3 className="mt-1 font-display text-xl font-semibold text-[#173a3b]">
                            Chỗ
                            ở
                            tại{" "}
                            {
                                result.locationName
                            }
                        </h3>
                    </div>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-[#34706b]">
                        <Building2
                            size={
                                18
                            }
                        />
                    </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-[#667672]">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5">
                        <CalendarDays
                            size={
                                13
                            }
                        />
                        {
                            result.checkInDate
                        }{" "}
                        →{" "}
                        {
                            result.checkOutDate
                        }
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5">
                        <BedDouble
                            size={
                                13
                            }
                        />

                        {
                            result.nights
                        }{" "}
                        đêm
                    </span>
                    {result.maxPricePerNight ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5">
                            <WalletCards
                                size={
                                    13
                                }
                            />
                            ≤{" "}
                            {formatMoney(
                                result.maxPricePerNight,
                            )}
                            /đêm
                        </span>
                    ) : null}
                </div>

                {result.aiRecommendation ? (
                    <div className="mt-3 flex items-start gap-2 rounded-2xl border border-[#d8e7df] bg-white/80 px-3.5 py-3 text-xs leading-5 text-[#536a64]">
                        <Sparkles
                            size={14}
                            className="mt-0.5 shrink-0 text-[#d85b48]"
                        />
                        <div>
                            <span className="font-extrabold text-[#173a3b]">
                                {result.aiRecommendation.generatedBy === "gemini"
                                    ? "AI gợi ý: "
                                    : "SmartTrip gợi ý: "}
                            </span>
                            {result.aiRecommendation.summary}
                        </div>
                    </div>
                ) : null}
            </div>
            <div className="space-y-3 p-4 sm:p-5">
                {isBudgetEmpty ? (
                    <div className="rounded-2xl border border-[#eadfce] bg-[#fffaf3] px-4 py-4">
                        <p className="font-extrabold text-[#173a3b]">
                            Chưa có chỗ ở phù hợp ngân sách
                        </p>

                        <p className="mt-2 text-sm leading-6 text-[#687873]">
                            {result.message ??
                                "LiteAPI chưa trả về khách sạn phù hợp với bộ lọc hiện tại."}
                        </p>

                        {nearBudgetItems.length >
                        0 ? (
                            <button
                                type="button"
                                onClick={() =>
                                    setShowNearBudget(
                                        (
                                            current,
                                        ) =>
                                            !current,
                                    )
                                }
                                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#cbdad3] bg-white px-3.5 py-2 text-xs font-extrabold text-[#34706b] transition hover:border-[#aac3b8] hover:bg-[#f3f8f6]"
                            >
                                <WalletCards
                                    size={
                                        14
                                    }
                                />
                                {showNearBudget
                                    ? "Ẩn lựa chọn gần ngân sách"
                                    : `Xem ${nearBudgetItems.length} lựa chọn gần ngân sách`}
                            </button>
                        ) : null}
                    </div>
                ) : null}

                {isBudgetEmpty &&
                showNearBudget ? (
                    <div className="flex items-center justify-between gap-3 px-1 pt-1">
                        <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#75817e]">
                            Giá gần ngân sách nhất
                        </p>

                        <span className="text-[11px] font-semibold text-[#9a6d5d]">
                            Các giá dưới đây vượt mức bạn đặt
                        </span>
                    </div>
                ) : null}

                {displayedItems.map(
                    (
                        hotel,
                    ) => {
                        const rating =
                            formatRating(
                                hotel.rating,
                            );

                        const googleMapsUrl =
                            hotel.googleMapsUrl ??
                            buildGoogleMapsUrl(
                                hotel,
                                result.locationName,
                            );

                        const overBudgetAmount =
                            getOverBudgetAmount(
                                hotel,
                                result.maxPricePerNight,
                            );

                        return (
                            <article
                                key={`${hotel.hotelId}-${hotel.offerId ?? "offer"}`}
                                className={`overflow-hidden rounded-2xl border bg-white ${
                                    hotel.aiRecommended
                                        ? "border-[#cfded7] ring-1 ring-[#e5eee9]"
                                        : "border-[#e8e0d5]"
                                }`}
                            >
                                <div className="flex flex-col sm:flex-row">
                                    {hotel.imageUrl ? (
                                        <div className="h-40 w-full shrink-0 overflow-hidden bg-[#edf1ef] sm:h-auto sm:w-40">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={
                                                    hotel.imageUrl
                                                }
                                                alt={
                                                    hotel.name
                                                }
                                                className="h-full w-full object-cover"
                                                loading="lazy"
                                            />
                                        </div>
                                    ) : null}
                                    <div className="min-w-0 flex-1 p-4">
                                        {isBudgetEmpty &&
                                        showNearBudget ? (
                                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                                <span className="inline-flex items-center gap-1 rounded-full bg-[#fff3e9] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#9a654f]">
                                                    Gần ngân sách
                                                </span>

                                                {overBudgetAmount ? (
                                                    <span className="rounded-full bg-[#f8eee8] px-2.5 py-1 text-[10px] font-bold text-[#9a654f]">
                                                        Vượt{" "}
                                                        {formatMoney(
                                                            overBudgetAmount,
                                                            "VND",
                                                        )}
                                                        /đêm
                                                    </span>
                                                ) : null}
                                            </div>
                                        ) : null}

                                        {hotel.aiRecommended ? (
                                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                                <span className="inline-flex items-center gap-1 rounded-full bg-[#edf6f3] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#34706b]">
                                                    <Sparkles size={11} />
                                                    {result.aiRecommendation?.generatedBy === "gemini"
                                                        ? "AI đề xuất"
                                                        : "SmartTrip đề xuất"} #{hotel.recommendationRank ?? 1}
                                                </span>
                                                {hotel.aiTags?.map((tag) => (
                                                    <span
                                                        key={tag}
                                                        className="rounded-full bg-[#fff3e9] px-2.5 py-1 text-[10px] font-bold text-[#9a654f]"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : null}

                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <p className="font-extrabold text-[#173a3b]">
                                                    {
                                                        hotel.name
                                                    }
                                                </p>
                                                <p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-[#75817e]">
                                                    <MapPin
                                                        size={
                                                            12
                                                        }
                                                        className="mt-1 shrink-0"
                                                    />
                                                    <span>
                                                        {hotel.address ??
                                                            result.locationName}
                                                        {rating
                                                            ? ` · ${rating}`
                                                            : ""}
                                                    </span>
                                                </p>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className="font-extrabold text-[#d85b48]">
                                                    {formatMoney(
                                                        hotel.pricePerNight,
                                                        hotel.currency,
                                                    )}
                                                </p>
                                                <p className="mt-0.5 text-[11px] font-semibold text-[#87908e]">
                                                    /
                                                    đêm
                                                </p>
                                            </div>
                                        </div>

                                        {hotel.aiReason ? (
                                            <div className="mt-3 rounded-xl bg-[#f6faf8] px-3 py-2.5 text-xs leading-5 text-[#55716a]">
                                                <span className="font-extrabold text-[#34706b]">
                                                    Vì sao phù hợp: {" "}
                                                </span>
                                                {hotel.aiReason}
                                            </div>
                                        ) : null}

                                        {hotel.roomDescription ? (
                                            <p className="mt-3 line-clamp-2 text-xs leading-5 text-[#6f7d79]">
                                                {
                                                    hotel.roomDescription
                                                }
                                            </p>
                                        ) : null}
                                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold">
                                            {hotel.boardName ? (
                                                <span className="rounded-full bg-[#edf6f3] px-2.5 py-1 text-[#46736d]">
                                                    {
                                                        hotel.boardName
                                                    }
                                                </span>
                                            ) : null}
                                            {hotel.refundable ===
                                            true ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-[#edf7ee] px-2.5 py-1 text-[#4d7653]">
                                                    <ShieldCheck
                                                        size={
                                                            11
                                                        }
                                                    />
                                                    Có
                                                    hoàn
                                                    hủy
                                                </span>
                                            ) : null}
                                            {hotel.refundable ===
                                            false ? (
                                                <span className="rounded-full bg-[#f6eee9] px-2.5 py-1 text-[#8a6658]">
                                                    Không
                                                    hoàn
                                                    hủy
                                                </span>
                                            ) : null}
                                            {hotel.taxesIncluded ===
                                            true ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-[#eef3f7] px-2.5 py-1 text-[#596e7c]">
                                                    <CheckCircle2
                                                        size={
                                                            11
                                                        }
                                                    />
                                                    Thuế/phí
                                                    đã
                                                    gồm
                                                </span>
                                            ) : null}
                                            {hotel.totalPrice ? (
                                                <span className="rounded-full bg-[#f5efe6] px-2.5 py-1 text-[#6f766f]">
                                                    Tổng{" "}
                                                    {formatMoney(
                                                        hotel.totalPrice,
                                                        hotel.currency,
                                                    )}
                                                </span>
                                            ) : null}
                                        </div>

                                        {googleMapsUrl ? (
                                            <div className="mt-4">
                                                <a
                                                    href={googleMapsUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 rounded-xl border border-[#d9e5df] bg-[#f4f9f7] px-3.5 py-2 text-xs font-extrabold text-[#34706b] transition hover:border-[#bcd1c7] hover:bg-[#eaf4f0]"
                                                    aria-label={`Mở ${hotel.name} trên Google Maps`}
                                                >
                                                    <MapPin size={14} />
                                                    Mở Google Maps
                                                    <ExternalLink size={12} />
                                                </a>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </article>
                        );
                    },
                )}
            </div>
            <div className="border-t border-[#ebe2d7] bg-[#fcf8f1] px-5 py-3 text-[11px] leading-5 text-[#7a8581]">
                Nguồn: {" "}
                {
                    result.sourceLabel
                }
                . Giá và tình trạng
                phòng có thể thay
                đổi theo thời điểm
                tìm kiếm. SmartTrip
                chỉ hiển thị giá
                provider trả về;
                AI chỉ xếp hạng và
                giải thích lựa chọn,
                không tự bịa giá
                phòng.
            </div>
        </div>
    );
}