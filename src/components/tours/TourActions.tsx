"use client";

import { useState, useSyncExternalStore } from "react";
import {
    Bookmark,
    BookmarkCheck,
    Share2,
    Sparkles,
} from "lucide-react";

import { UseTourDialog } from "./UseTourDialog";

type TourActionsProps = {
    tourId: string;
    name: string;
};

const SAVED_TOURS_KEY = "smarttrip:saved-tours";
const SAVED_TOURS_EVENT =
    "smarttrip:saved-tours-change";

function readSavedTourIds(): string[] {
    if (typeof window === "undefined") {
        return [];
    }

    try {
        const rawValue = window.localStorage.getItem(
            SAVED_TOURS_KEY,
        );

        const parsedValue: unknown = rawValue
            ? JSON.parse(rawValue)
            : [];

        if (!Array.isArray(parsedValue)) {
            return [];
        }

        return parsedValue.filter(
            (value): value is string =>
                typeof value === "string",
        );
    } catch {
        return [];
    }
}

function subscribeSavedTours(
    callback: () => void,
) {
    const handleChange = () => {
        callback();
    };

    window.addEventListener(
        "storage",
        handleChange,
    );

    window.addEventListener(
        SAVED_TOURS_EVENT,
        handleChange,
    );

    return () => {
        window.removeEventListener(
            "storage",
            handleChange,
        );

        window.removeEventListener(
            SAVED_TOURS_EVENT,
            handleChange,
        );
    };
}

function notifySavedToursChanged() {
    window.dispatchEvent(
        new Event(SAVED_TOURS_EVENT),
    );
}

export function TourActions({
    tourId,
    name,
}: TourActionsProps) {
    const [shareLabel, setShareLabel] =
        useState("Chia sẻ");

    const isSaved = useSyncExternalStore(
        subscribeSavedTours,
        () =>
            readSavedTourIds().includes(tourId),
        () => false,
    );

    function toggleSaved() {
        const currentIds = readSavedTourIds();
        const nextIsSaved =
            !currentIds.includes(tourId);

        const nextIds = nextIsSaved
            ? [...currentIds, tourId]
            : currentIds.filter(
                  (id) => id !== tourId,
              );

        try {
            window.localStorage.setItem(
                SAVED_TOURS_KEY,
                JSON.stringify(nextIds),
            );

            notifySavedToursChanged();
        } catch (error) {
            console.error(
                "Không thể lưu hành trình:",
                error,
            );
        }
    }

    async function shareTour() {
        const url = window.location.href;

        try {
            if (navigator.share) {
                await navigator.share({
                    title: name,
                    url,
                });

                return;
            }

            if (!navigator.clipboard) {
                throw new Error(
                    "Trình duyệt không hỗ trợ sao chép liên kết.",
                );
            }

            await navigator.clipboard.writeText(url);

            setShareLabel("Đã sao chép");

            window.setTimeout(() => {
                setShareLabel("Chia sẻ");
            }, 1800);
        } catch (error) {
            if (
                error instanceof DOMException &&
                error.name === "AbortError"
            ) {
                return;
            }

            console.error(
                "Không thể chia sẻ hành trình:",
                error,
            );

            setShareLabel("Không thể chia sẻ");

            window.setTimeout(() => {
                setShareLabel("Chia sẻ");
            }, 1800);
        }
    }

    return (
        <div className="grid gap-3">
            <UseTourDialog
                sourceTourId={tourId}
                tourName={name}
            />

            <button
                type="button"
                disabled
                aria-disabled="true"
                title="Tính năng tùy chỉnh bằng AI sẽ được phát triển sau"
                className="inline-flex min-h-[52px] cursor-not-allowed items-center justify-center gap-2 rounded-full bg-[#f25f4b]/65 px-5 py-3.5 text-sm font-bold text-white"
            >
                <Sparkles size={18} />
                Tùy chỉnh bằng AI

                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.08em]">
                    Sắp ra mắt
                </span>
            </button>

            <div className="grid grid-cols-2 gap-3">
                <button
                    type="button"
                    onClick={toggleSaved}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#d8cdbc] bg-white/70 px-4 text-sm font-semibold text-[#294748] transition hover:bg-white"
                    aria-pressed={isSaved}
                >
                    {isSaved ? (
                        <BookmarkCheck size={17} />
                    ) : (
                        <Bookmark size={17} />
                    )}

                    {isSaved ? "Đã lưu" : "Lưu"}
                </button>

                <button
                    type="button"
                    onClick={() => void shareTour()}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#d8cdbc] bg-white/70 px-4 text-sm font-semibold text-[#294748] transition hover:bg-white"
                >
                    <Share2 size={17} />
                    {shareLabel}
                </button>
            </div>

            <p className="px-2 text-center text-[11px] leading-5 text-[#8a8575]">
                Bản lưu nhanh được giữ trên thiết bị.
                Hành trình tạo từ tour sẽ được lưu trong
                tài khoản.
            </p>
        </div>
    );
}