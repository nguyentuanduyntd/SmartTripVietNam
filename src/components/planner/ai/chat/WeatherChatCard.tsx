"use client";

import {
    AlertTriangle,
    CloudRain,
    SunMedium,
    ThermometerSun,
    Wind,
} from "lucide-react";

import type {
    TravelWeatherResult,
} from "@/src/components/planner/ai/chat/ai-travel-chat.types";

function formatDate(
    value: string,
) {
    return new Intl.DateTimeFormat(
        "vi-VN",
        {
            day:
                "2-digit",

            month:
                "2-digit",
        },
    ).format(
        new Date(
            `${value}T00:00:00`,
        ),
    );
}

function getWeatherLabel(
    code?: number,
) {
    if (
        code ===
        undefined
    ) {
        return "Dự báo";
    }

    if (
        code === 0
    ) {
        return "Trời quang";
    }

    if (
        [
            1,
            2,
            3,
        ].includes(
            code,
        )
    ) {
        return "Có mây";
    }

    if (
        [
            45,
            48,
        ].includes(
            code,
        )
    ) {
        return "Sương mù";
    }

    if (
        code >= 51 &&
        code <= 67
    ) {
        return "Có mưa";
    }

    if (
        code >= 80 &&
        code <= 82
    ) {
        return "Mưa rào";
    }

    if (
        code >= 95
    ) {
        return "Dông";
    }

    return "Thời tiết biến động";
}

export function WeatherChatCard({
    result,
}: {
    result: TravelWeatherResult;
}) {
    return (
        <div className="w-full overflow-hidden rounded-[26px] border border-[#cfe0dc] bg-white shadow-[0_16px_44px_rgba(23,58,59,0.08)]">
            <div className="border-b border-[#dbe9e5] bg-[#edf7f4] px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#3d766e]">
                            Weather
                            check
                        </p>

                        <h3 className="mt-1 font-display text-xl font-semibold text-[#173a3b]">
                            {result.resolvedLocationName ??
                                result.locationName}
                        </h3>
                    </div>

                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-[#3f7971]">
                        <SunMedium
                            size={
                                19
                            }
                        />
                    </span>
                </div>
            </div>

            <div className="grid gap-2 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
                {result.days.map(
                    (
                        day,
                    ) => (
                        <div
                            key={
                                day.date
                            }
                            className="rounded-2xl border border-[#e1e8e5] bg-[#fbfdfc] p-3.5"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-extrabold text-[#173a3b]">
                                    {formatDate(
                                        day.date,
                                    )}
                                </p>

                                <span className="text-[11px] font-bold text-[#658079]">
                                    {getWeatherLabel(
                                        day.weatherCode,
                                    )}
                                </span>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-[#6c7b77]">
                                <span className="inline-flex items-center gap-1">
                                    <ThermometerSun
                                        size={
                                            12
                                        }
                                    />

                                    {day.minTemperature !==
                                        undefined &&
                                    day.maxTemperature !==
                                        undefined
                                        ? `${Math.round(day.minTemperature)}–${Math.round(day.maxTemperature)}°C`
                                        : "--"}
                                </span>

                                <span className="inline-flex items-center gap-1">
                                    <CloudRain
                                        size={
                                            12
                                        }
                                    />

                                    {day.precipitationProbabilityMax !==
                                    undefined
                                        ? `${Math.round(day.precipitationProbabilityMax)}% mưa`
                                        : "--"}
                                </span>
                            </div>
                        </div>
                    ),
                )}
            </div>

            {result.activityWarnings
                .length >
            0 ? (
                <div className="border-t border-[#dce8e5] px-4 py-4 sm:px-5">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-[#ad594b]">
                        <AlertTriangle
                            size={
                                16
                            }
                        />

                        Cảnh báo cho
                        hoạt động ngoài
                        trời
                    </div>

                    <div className="mt-3 space-y-2.5">
                        {result.activityWarnings.map(
                            (
                                warning,
                                index,
                            ) => (
                                <div
                                    key={`${warning.dayNumber}-${warning.destinationName}-${warning.startTime}-${index}`}
                                    className="rounded-2xl border border-[#f0d4cd] bg-[#fff5f1] p-3.5"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-sm font-extrabold text-[#8f493e]">
                                            Ngày{" "}
                                            {
                                                warning.dayNumber
                                            }{" "}
                                            ·{" "}
                                            {
                                                warning.startTime
                                            }{" "}
                                            ·{" "}
                                            {
                                                warning.destinationName
                                            }
                                        </p>

                                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-[#b45445]">
                                            {
                                                warning.label
                                            }
                                        </span>
                                    </div>

                                    <p className="mt-1.5 text-xs leading-5 text-[#806862]">
                                        {
                                            warning.detail
                                        }
                                    </p>

                                    <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-bold text-[#807570]">
                                        {warning.temperature !==
                                        undefined ? (
                                            <span className="inline-flex items-center gap-1">
                                                <ThermometerSun
                                                    size={
                                                        11
                                                    }
                                                />

                                                {Math.round(
                                                    warning.temperature,
                                                )}
                                                °C
                                            </span>
                                        ) : null}

                                        {warning.windSpeed !==
                                        undefined ? (
                                            <span className="inline-flex items-center gap-1">
                                                <Wind
                                                    size={
                                                        11
                                                    }
                                                />

                                                {Math.round(
                                                    warning.windSpeed,
                                                )}{" "}
                                                km/h
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                            ),
                        )}
                    </div>
                </div>
            ) : (
                <div className="border-t border-[#dce8e5] px-5 py-3 text-xs font-semibold text-[#58756e]">
                    Chưa thấy cảnh
                    báo mưa/gió/nắng
                    nóng đáng kể cho
                    các hoạt động
                    ngoài trời đã
                    nhận diện.
                </div>
            )}

            <div className="border-t border-[#dce8e5] bg-[#f7fbfa] px-5 py-3 text-[11px] leading-5 text-[#74847f]">
                Dữ liệu:{" "}
                {
                    result.sourceLabel
                }
                . Dự báo chỉ dùng khi
                chuyến đi nằm trong
                cửa sổ dự báo ngắn
                hạn; không dùng AI để
                tự đoán thời tiết.
            </div>
        </div>
    );
}