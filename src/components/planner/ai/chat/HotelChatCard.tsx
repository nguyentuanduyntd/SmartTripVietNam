"use client";

import {
    BedDouble,
    Building2,
    CalendarDays,
    CheckCircle2,
    MapPin,
    ShieldCheck,
    WalletCards,
} from "lucide-react";

import type {
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

export function HotelChatCard({
    result,
}: {
    result:
        HotelSearchResult;
}) {
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
            </div>

            <div className="space-y-3 p-4 sm:p-5">
                {result.items.map(
                    (
                        hotel,
                    ) => {
                        const rating =
                            formatRating(
                                hotel.rating,
                            );

                        return (
                            <article
                                key={`${hotel.hotelId}-${hotel.offerId ?? "offer"}`}
                                className="overflow-hidden rounded-2xl border border-[#e8e0d5] bg-white"
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
                                    </div>
                                </div>
                            </article>
                        );
                    },
                )}
            </div>

            <div className="border-t border-[#ebe2d7] bg-[#fcf8f1] px-5 py-3 text-[11px] leading-5 text-[#7a8581]">
                Nguồn:{" "}
                {
                    result.sourceLabel
                }
                . Giá và tình trạng
                phòng có thể thay
                đổi theo thời điểm
                tìm kiếm. SmartTrip
                chỉ hiển thị giá
                provider trả về và
                không tự bịa giá
                phòng.
            </div>
        </div>
    );
}