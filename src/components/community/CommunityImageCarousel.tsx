"use client";

import {
    ChevronLeft,
    ChevronRight,
    Images,
} from "lucide-react";

import {
    useEffect,
    useState,
} from "react";

import type {
    CommunityImage,
} from "@/src/components/community/community-types";

type CommunityImageCarouselProps = {
    images: CommunityImage[];
    title: string;
    variant?: "card" | "detail";
};

export function CommunityImageCarousel({
    images,
    title,
    variant = "card",
}: CommunityImageCarouselProps) {
    const [currentIndex, setCurrentIndex] =
        useState(0);

    useEffect(() => {
        setCurrentIndex(0);
    }, [images]);

    if (images.length === 0) {
        return (
            <div
                className={`grid place-items-center bg-[radial-gradient(circle_at_top_right,#f6d8cf,transparent_42%),linear-gradient(135deg,#dcebe7,#f8f0e4)] ${
                    variant === "detail"
                        ? "min-h-[320px] sm:min-h-[480px]"
                        : "h-64 sm:h-72"
                }`}
            >
                <div className="text-center text-[#557b76]">
                    <Images
                        size={38}
                        className="mx-auto"
                    />

                    <p className="mt-3 text-sm font-bold">
                        Chưa có ảnh trải nghiệm
                    </p>
                </div>
            </div>
        );
    }

    const safeIndex =
        Math.min(
            currentIndex,
            images.length - 1,
        );

    const currentImage =
        images[safeIndex];

    if (!currentImage) {
        return null;
    }

    function previous() {
        setCurrentIndex(
            (current) =>
                current <= 0
                    ? images.length - 1
                    : current - 1,
        );
    }

    function next() {
        setCurrentIndex(
            (current) =>
                current >= images.length - 1
                    ? 0
                    : current + 1,
        );
    }

    return (
        <div
            className={`group/carousel relative overflow-hidden bg-[#dcebe7] ${
                variant === "detail"
                    ? "min-h-[320px] sm:min-h-[480px]"
                    : "h-64 sm:h-72"
            }`}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={currentImage.url}
                alt={
                    currentImage.altText ??
                    title
                }
                className="absolute inset-0 h-full w-full object-cover"
            />

            <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 to-transparent"
                aria-hidden="true"
            />

            {images.length > 1 ? (
                <>
                    <button
                        type="button"
                        onClick={previous}
                        aria-label="Ảnh trước"
                        className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/55"
                    >
                        <ChevronLeft
                            size={21}
                        />
                    </button>

                    <button
                        type="button"
                        onClick={next}
                        aria-label="Ảnh tiếp theo"
                        className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/55"
                    >
                        <ChevronRight
                            size={21}
                        />
                    </button>

                    <span className="absolute bottom-3 right-3 rounded-full bg-black/45 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
                        {safeIndex + 1}/{images.length}
                    </span>

                    <div className="absolute bottom-4 left-1/2 flex max-w-[60%] -translate-x-1/2 gap-1.5">
                        {images.map(
                            (
                                image,
                                index,
                            ) => (
                                <button
                                    key={image.id}
                                    type="button"
                                    aria-label={`Xem ảnh ${index + 1}`}
                                    onClick={() =>
                                        setCurrentIndex(
                                            index,
                                        )
                                    }
                                    className={`h-1.5 rounded-full transition-all ${
                                        index ===
                                        safeIndex
                                            ? "w-5 bg-white"
                                            : "w-1.5 bg-white/60"
                                    }`}
                                />
                            ),
                        )}
                    </div>
                </>
            ) : null}
        </div>
    );
}