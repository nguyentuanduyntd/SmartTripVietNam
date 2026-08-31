"use client";

import Link from "next/link";

import {
    useLocale,
    useTranslations,
} from "next-intl";

import {
    ArrowRight,
    Bot,
    ChevronRight,
    Clock3,
    Heart,
    MapPin,
    MessageCircle,
    Route,
    Sparkles,
    Star,
    WalletCards,
} from "lucide-react";

import {
    useMemo,
    useState,
} from "react";

import {
    BRAND_FEATURES,
    STORIES,
    type CityId,
    type DestinationCardData,
    type JourneyCardData,
} from "@/src/constants/home-data";

import {
    DEFAULT_LOCALE,
    isAppLocale,
    type AppLocale,
} from "@/src/i18n/config";

import {
    getLocalizedHomeStaticData,
} from "@/src/i18n/home-static-data";

import type {
    CityEditorialCardData,
} from "@/src/lib/home-data-mapper";

import {
    CloudinaryVisual,
} from "./CloudinaryVisual";

/* =========================================================
 * HELPERS
 * ======================================================= */

function useResolvedLocale(): AppLocale {
    const locale =
        useLocale();

    return isAppLocale(locale)
        ? locale
        : DEFAULT_LOCALE;
}

function SectionHeading({
    eyebrow,
    title,
    description,
    align = "left",
}: {
    eyebrow: string;
    title: string;
    description?: string;
    align?: "left" | "center";
}) {
    return (
        <div
            className={
                align === "center"
                    ? "mx-auto max-w-3xl text-center"
                    : "max-w-3xl"
            }
        >
            <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.22em] text-[#e55c49]">
                {eyebrow}
            </p>

            <h2 className="font-display text-4xl font-semibold leading-[1.03] tracking-[-0.035em] text-[#173a3b] sm:text-5xl lg:text-6xl">
                {title}
            </h2>

            {description ? (
                <p className="mt-5 text-base leading-8 text-[#60706d] sm:text-lg">
                    {description}
                </p>
            ) : null}
        </div>
    );
}

/* =========================================================
 * CITY EDITORIAL
 * ======================================================= */

interface CityEditorialSectionProps {
    items?: readonly CityEditorialCardData[];
}

export function CityEditorialSection({
    items,
}: CityEditorialSectionProps) {
    const t =
        useTranslations(
            "Home.sections.editorial",
        );

    const locale =
        useResolvedLocale();

    const fallbackData =
        useMemo(
            () =>
                getLocalizedHomeStaticData(
                    locale,
                ),
            [locale],
        );

    const sectionItems =
        items ??
        fallbackData.cityEditorial;

    return (
        <section
            id="kham-pha"
            className="relative overflow-hidden bg-[#173a3b] px-5 py-24 text-white sm:px-8 lg:px-12 lg:py-32"
        >
            <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.45)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.45)_1px,transparent_1px)] [background-size:48px_48px]" />

            <div className="relative mx-auto max-w-[1440px]">
                <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
                    <div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#f5ba54]">
                            {t(
                                "eyebrow",
                            )}
                        </p>

                        <h2 className="mt-4 font-display text-5xl font-semibold leading-[0.98] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
                            {t(
                                "titleLine1",
                            )}

                            <span className="block italic text-[#f7dca5]">
                                {t(
                                    "titleLine2",
                                )}
                            </span>
                        </h2>
                    </div>

                    <p className="max-w-2xl text-lg leading-8 text-white/68 lg:justify-self-end">
                        {t(
                            "description",
                        )}
                    </p>
                </div>

                <div className="mt-14 grid gap-5 lg:grid-cols-3">
                    {sectionItems.map(
                        (
                            item,
                            index,
                        ) => {
                            const Icon =
                                item.icon;

                            return (
                                <article
                                    key={`${item.city}-${index}`}
                                    className={`group relative min-h-[480px] overflow-hidden rounded-[34px] border border-white/15 ${
                                        index ===
                                        1
                                            ? "lg:translate-y-10"
                                            : ""
                                    }`}
                                >
                                    <CloudinaryVisual
                                        source={
                                            item.image
                                        }
                                        alt={
                                            item.imageAlt
                                        }
                                        imageOptions={{
                                            width:
                                                900,
                                            height:
                                                1100,
                                        }}
                                        className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
                                    />

                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0e2f30] via-[#123d3c]/28 to-transparent" />

                                    <div className="absolute inset-x-0 bottom-0 p-7 sm:p-8">
                                        <div className="mb-5 flex items-center justify-between">
                                            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/25 bg-white/12 backdrop-blur">
                                                <Icon
                                                    size={
                                                        23
                                                    }
                                                    strokeWidth={
                                                        1.7
                                                    }
                                                />
                                            </span>

                                            <span className="rounded-full border border-white/20 bg-[#0e2f30]/45 px-3 py-1.5 text-xs font-bold text-white/76 backdrop-blur">
                                                {
                                                    item.stat
                                                }
                                            </span>
                                        </div>

                                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f4c56e]">
                                            {
                                                item.kicker
                                            }
                                        </p>

                                        <h3 className="mt-2 font-display text-4xl font-semibold">
                                            {
                                                item.city
                                            }
                                        </h3>

                                        <p className="mt-3 leading-7 text-white/72">
                                            {
                                                item.title
                                            }
                                        </p>
                                    </div>
                                </article>
                            );
                        },
                    )}
                </div>
            </div>
        </section>
    );
}

/* =========================================================
 * DESTINATIONS
 * ======================================================= */

interface FeaturedDestinationsSectionProps {
    items?: readonly DestinationCardData[];
}

export function FeaturedDestinationsSection({
    items,
}: FeaturedDestinationsSectionProps) {
    const t =
        useTranslations(
            "Home.sections.destinations",
        );

    const locale =
        useResolvedLocale();

    const fallbackData =
        useMemo(
            () =>
                getLocalizedHomeStaticData(
                    locale,
                ),
            [locale],
        );

    const sectionItems =
        items ??
        fallbackData.featuredDestinations;

    const [
        filter,
        setFilter,
    ] = useState<
        "all" | CityId
    >("all");

    const filters: Array<{
        id: "all" | CityId;
        label: string;
    }> = [
        {
            id: "all",
            label: t(
                "filters.all",
            ),
        },
        {
            id: "hue",
            label: t(
                "filters.hue",
            ),
        },
        {
            id: "da-nang",
            label: t(
                "filters.daNang",
            ),
        },
        {
            id: "hoi-an",
            label: t(
                "filters.hoiAn",
            ),
        },
    ];

    const visibleItems =
        useMemo(
            () =>
                filter === "all"
                    ? sectionItems
                    : sectionItems.filter(
                          (
                              item,
                          ) =>
                              item.city ===
                              filter,
                      ),
            [
                filter,
                sectionItems,
            ],
        );

    return (
        <section
            id="diem-den"
            className="bg-[#f7f0e4] px-5 py-24 sm:px-8 lg:px-12 lg:py-32"
        >
            <div className="mx-auto max-w-[1440px]">
                <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                    <SectionHeading
                        eyebrow={t(
                            "eyebrow",
                        )}
                        title={t(
                            "title",
                        )}
                        description={t(
                            "description",
                        )}
                    />

                    <div className="flex flex-wrap gap-2">
                        {filters.map(
                            (
                                item,
                            ) => (
                                <button
                                    key={
                                        item.id
                                    }
                                    type="button"
                                    onClick={() =>
                                        setFilter(
                                            item.id,
                                        )
                                    }
                                    className={`rounded-full px-4 py-2.5 text-sm font-bold transition-all ${
                                        filter ===
                                        item.id
                                            ? "bg-[#173a3b] text-white shadow-lg"
                                            : "border border-[#d3c8b7] bg-white/55 text-[#50605e] hover:bg-white"
                                    }`}
                                >
                                    {
                                        item.label
                                    }
                                </button>
                            ),
                        )}
                    </div>
                </div>

                <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {visibleItems.map(
                        (
                            item,
                            index,
                        ) => (
                            <Link
                                key={`${item.href}-${item.name}`}
                                href={
                                    item.href
                                }
                                className={`group overflow-hidden rounded-[30px] border border-[#ded3c3] bg-[#fffaf1] shadow-[0_16px_55px_rgba(35,55,50,0.06)] transition-all hover:-translate-y-2 hover:shadow-[0_24px_65px_rgba(35,55,50,0.13)] ${
                                    index ===
                                        0 &&
                                    filter ===
                                        "all"
                                        ? "md:col-span-2 xl:col-span-1"
                                        : ""
                                }`}
                            >
                                <div className="relative h-72 overflow-hidden">
                                    <CloudinaryVisual
                                        source={
                                            item.image
                                        }
                                        alt={
                                            item.imageAlt
                                        }
                                        imageOptions={{
                                            width:
                                                900,
                                            height:
                                                650,
                                        }}
                                        className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
                                    />

                                    <div className="absolute inset-0 bg-gradient-to-t from-black/38 via-transparent to-transparent" />

                                    <div className="absolute left-5 top-5 rounded-full bg-[#fffaf0]/90 px-3 py-1.5 text-xs font-extrabold text-[#315f5f] backdrop-blur">
                                        {
                                            item.category
                                        }
                                    </div>
                                </div>

                                <div className="p-6 sm:p-7">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-[#d55b48]">
                                        <MapPin
                                            size={
                                                16
                                            }
                                        />

                                        {
                                            item.cityLabel
                                        }
                                    </div>

                                    <div className="mt-3 flex items-start justify-between gap-4">
                                        <div>
                                            <h3 className="font-display text-3xl font-semibold text-[#173a3b]">
                                                {
                                                    item.name
                                                }
                                            </h3>

                                            <p className="mt-3 leading-7 text-[#667370]">
                                                {
                                                    item.description
                                                }
                                            </p>
                                        </div>

                                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#d7cbbb] text-[#173a3b] transition-colors group-hover:border-[#f25f4b] group-hover:bg-[#f25f4b] group-hover:text-white">
                                            <ArrowRight
                                                size={
                                                    18
                                                }
                                            />
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ),
                    )}
                </div>

                <div className="mt-10 flex justify-center">
                    <Link
                        href="/destinations"
                        className="inline-flex items-center gap-2 rounded-full border border-[#bfb2a1] px-6 py-3 font-bold text-[#315f5f] transition-colors hover:bg-[#173a3b] hover:text-white"
                    >
                        {t(
                            "viewAll",
                        )}

                        <ChevronRight
                            size={
                                18
                            }
                        />
                    </Link>
                </div>
            </div>
        </section>
    );
}

/* =========================================================
 * JOURNEYS
 * ======================================================= */

interface JourneySectionProps {
    items?: readonly JourneyCardData[];
}

export function JourneySection({
    items,
}: JourneySectionProps) {
    const t =
        useTranslations(
            "Home.sections.journey",
        );

    const locale =
        useResolvedLocale();

    const fallbackData =
        useMemo(
            () =>
                getLocalizedHomeStaticData(
                    locale,
                ),
            [locale],
        );

    const sectionItems =
        items ??
        fallbackData.journeys;

    const toneClasses = {
        coral:
            "bg-[#f25f4b] text-white",

        teal:
            "bg-[#2f8f8b] text-white",

        gold:
            "bg-[#e2aa3b] text-[#173a3b]",
    } as const;

    return (
        <section
            id="hanh-trinh"
            className="bg-[#efe6d7] px-5 py-24 sm:px-8 lg:px-12 lg:py-32"
        >
            <div className="mx-auto max-w-[1440px]">
                <SectionHeading
                    eyebrow={t(
                        "eyebrow",
                    )}
                    title={t(
                        "title",
                    )}
                    description={t(
                        "description",
                    )}
                    align="center"
                />

                <div className="mt-14 grid gap-6 lg:grid-cols-3">
                    {sectionItems.map(
                        (
                            item,
                            index,
                        ) => (
                            <article
                                key={
                                    item.id
                                }
                                className={`flex h-full flex-col overflow-hidden rounded-[32px] bg-[#fffaf1] shadow-[0_18px_65px_rgba(32,54,51,0.08)] ${
                                    index ===
                                    1
                                        ? "lg:-translate-y-5"
                                        : ""
                                }`}
                            >
                                <div className="relative h-64 overflow-hidden">
                                    <CloudinaryVisual
                                        source={
                                            item.image
                                        }
                                        alt={
                                            item.imageAlt
                                        }
                                        imageOptions={{
                                            width:
                                                900,
                                            height:
                                                650,
                                        }}
                                        className="absolute inset-0 transition-transform duration-700 hover:scale-105"
                                    />

                                    <div className="absolute inset-0 bg-gradient-to-t from-black/34 to-transparent" />

                                    <span
                                        className={`absolute left-5 top-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-extrabold ${
                                            toneClasses[
                                                item
                                                    .tone
                                            ]
                                        }`}
                                    >
                                        <Clock3
                                            size={
                                                15
                                            }
                                        />

                                        {
                                            item.duration
                                        }
                                    </span>
                                </div>

                                <div className="flex flex-1 flex-col p-7">
                                    <h3 className="font-display text-3xl font-semibold text-[#173a3b]">
                                        {
                                            item.title
                                        }
                                    </h3>

                                    <p className="mt-3 line-clamp-3 leading-7 text-[#687572]">
                                        {
                                            item.description
                                        }
                                    </p>

                                    <div className="mt-6 space-y-3">
                                        <div className="flex items-center gap-3 rounded-2xl bg-[#f3ece1] px-4 py-3">
                                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fffaf1] text-[#e25d49]">
                                                <MapPin
                                                    size={
                                                        18
                                                    }
                                                />
                                            </span>

                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-[#78837f]">
                                                    {t(
                                                        "departure",
                                                    )}
                                                </p>

                                                <p className="truncate text-sm font-bold text-[#315f5f]">
                                                    {
                                                        item.startLocation
                                                    }
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 rounded-2xl bg-[#f3ece1] px-4 py-3">
                                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fffaf1] text-[#2f8f8b]">
                                                <Clock3
                                                    size={
                                                        18
                                                    }
                                                />
                                            </span>

                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-[#78837f]">
                                                    {t(
                                                        "duration",
                                                    )}
                                                </p>

                                                <p className="truncate text-sm font-bold text-[#315f5f]">
                                                    {
                                                        item.duration
                                                    }
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 rounded-2xl bg-[#f3ece1] px-4 py-3">
                                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fffaf1] text-[#d79d2d]">
                                                <WalletCards
                                                    size={
                                                        18
                                                    }
                                                />
                                            </span>

                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-[#78837f]">
                                                    {t(
                                                        "estimatedPrice",
                                                    )}
                                                </p>

                                                <p className="truncate text-sm font-bold text-[#315f5f]">
                                                    {
                                                        item.price
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <Link
                                        href={
                                            item.href
                                        }
                                        className="mt-auto inline-flex items-center gap-2 pt-7 font-bold text-[#e25d49]"
                                    >
                                        {t(
                                            "viewJourney",
                                        )}

                                        <ArrowRight
                                            size={
                                                18
                                            }
                                        />
                                    </Link>
                                </div>
                            </article>
                        ),
                    )}
                </div>
            </div>
        </section>
    );
}

/* =========================================================
 * EXPERIENCES / COMMUNITY
 * ======================================================= */

export function ExperienceSection() {
    const t =
        useTranslations(
            "Home.sections.experience",
        );

    /*
     * BRAND_FEATURES cũng được khai báo "as const".
     * Widen label thành string để next-intl có thể gán
     * chuỗi dịch vào mà không lỗi TypeScript.
     */
    const localizedFeatures =
        BRAND_FEATURES.map(
            (
                feature,
                index,
            ) => {
                let label: string =
                    feature.label;

                switch (index) {
                    case 0:
                        label = t(
                            "features.personalized",
                        );
                        break;

                    case 1:
                        label = t(
                            "features.visual",
                        );
                        break;

                    case 2:
                        label = t(
                            "features.localData",
                        );
                        break;

                    case 3:
                        label = t(
                            "features.ai",
                        );
                        break;

                    default:
                        break;
                }

                return {
                    ...feature,
                    label,
                };
            },
        );

    /*
     * Đây là block bị mất trong file hiện tại của bạn.
     *
     * JSX bên dưới gọi localizedStories.map(...),
     * nên bắt buộc phải khai báo localizedStories ở đây.
     */
    const localizedStories =
        STORIES.map(
            (
                story,
                index,
            ) => {
                switch (index) {
                    case 0:
                        return {
                            ...story,

                            title: t(
                                "stories.lantern.title",
                            ),

                            location: t(
                                "stories.lantern.location",
                            ),

                            imageAlt: t(
                                "stories.lantern.imageAlt",
                            ),
                        };

                    case 1:
                        return {
                            ...story,

                            title: t(
                                "stories.hueMorning.title",
                            ),

                            location: t(
                                "stories.hueMorning.location",
                            ),

                            imageAlt: t(
                                "stories.hueMorning.imageAlt",
                            ),
                        };

                    case 2:
                        return {
                            ...story,

                            title: t(
                                "stories.beach.title",
                            ),

                            location: t(
                                "stories.beach.location",
                            ),

                            imageAlt: t(
                                "stories.beach.imageAlt",
                            ),
                        };

                    default:
                        return story;
                }
            },
        );

    return (
        <section
            id="trai-nghiem"
            className="bg-[#fffaf1] px-5 py-24 sm:px-8 lg:px-12 lg:py-32"
        >
            <div className="mx-auto max-w-[1440px]">
                <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
                    <SectionHeading
                        eyebrow={t(
                            "eyebrow",
                        )}
                        title={t(
                            "title",
                        )}
                        description={t(
                            "description",
                        )}
                    />

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:justify-self-end">
                        {localizedFeatures.map(
                            (
                                feature,
                            ) => {
                                const Icon =
                                    feature.icon;

                                return (
                                    <div
                                        key={
                                            feature.label
                                        }
                                        className="rounded-2xl bg-[#f2eadc] p-4 text-center text-[#315f5f]"
                                    >
                                        <Icon
                                            className="mx-auto"
                                            size={
                                                20
                                            }
                                        />

                                        <p className="mt-2 text-xs font-bold leading-5">
                                            {
                                                feature.label
                                            }
                                        </p>
                                    </div>
                                );
                            },
                        )}
                    </div>
                </div>

                <div className="mt-12 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                    {localizedStories.map(
                        (
                            story,
                            index,
                        ) => (
                            <article
                                key={`${story.title}-${index}`}
                                className={`group relative overflow-hidden rounded-[34px] ${
                                    index ===
                                    0
                                        ? "min-h-[610px] lg:row-span-2"
                                        : "min-h-[292px]"
                                }`}
                            >
                                <CloudinaryVisual
                                    source={
                                        story.image
                                    }
                                    alt={
                                        story.imageAlt
                                    }
                                    imageOptions={{
                                        width:
                                            index ===
                                            0
                                                ? 1100
                                                : 850,

                                        height:
                                            index ===
                                            0
                                                ? 1200
                                                : 600,
                                    }}
                                    className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
                                />

                                <div className="absolute inset-0 bg-gradient-to-t from-[#0d3030]/86 via-[#0d3030]/10 to-transparent" />

                                <div className="absolute inset-x-0 bottom-0 p-7 text-white sm:p-9">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-[#f5cf84]">
                                        <MapPin
                                            size={
                                                16
                                            }
                                        />

                                        {
                                            story.location
                                        }
                                    </div>

                                    <h3
                                        className={`mt-3 font-display font-semibold ${
                                            index ===
                                            0
                                                ? "text-4xl sm:text-5xl"
                                                : "text-3xl"
                                        }`}
                                    >
                                        {
                                            story.title
                                        }
                                    </h3>

                                    <div className="mt-5 flex items-center justify-between gap-4 text-sm text-white/72">
                                        <span>
                                            {t(
                                                "sharedBy",
                                                {
                                                    author:
                                                        story.author,
                                                },
                                            )}
                                        </span>

                                        <div className="flex items-center gap-4">
                                            <span className="inline-flex items-center gap-1.5">
                                                <Heart
                                                    size={
                                                        16
                                                    }
                                                />

                                                128
                                            </span>

                                            <span className="inline-flex items-center gap-1.5">
                                                <MessageCircle
                                                    size={
                                                        16
                                                    }
                                                />

                                                24
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        ),
                    )}
                </div>

                <div className="mt-10 flex justify-center">
                    <Link
                        href="/community"
                        className="inline-flex items-center gap-2 rounded-full border border-[#bfb2a1] px-6 py-3 font-bold text-[#315f5f] transition-colors hover:bg-[#173a3b] hover:text-white"
                    >
                        {t(
                            "viewCommunity",
                        )}

                        <ChevronRight
                            size={
                                18
                            }
                        />
                    </Link>
                </div>
            </div>
        </section>
    );
}

/* =========================================================
 * AI PLANNER
 * ======================================================= */

export function PlannerSection() {
    const t =
        useTranslations(
            "Home.sections.planner",
        );

    const locale =
        useResolvedLocale();

    const localizedCities =
        useMemo(
            () =>
                getLocalizedHomeStaticData(
                    locale,
                ).cities,
            [locale],
        );

    return (
        <section className="bg-[#fffaf1] px-5 pb-24 sm:px-8 lg:px-12 lg:pb-32">
            <div className="relative mx-auto max-w-[1440px] overflow-hidden rounded-[42px] bg-[#173a3b] px-6 py-16 text-white sm:px-10 lg:px-16 lg:py-20">
                <div className="absolute -right-20 -top-24 h-96 w-96 rounded-full bg-[#f3bd59]/24 blur-3xl" />

                <div className="absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-[#49a39e]/25 blur-3xl" />

                <div className="relative grid gap-10 lg:grid-cols-[1fr_0.8fr] lg:items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/8 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.2em] text-[#f5cb79]">
                            <Sparkles
                                size={
                                    16
                                }
                            />

                            {t(
                                "badge",
                            )}
                        </div>

                        <h2 className="mt-6 max-w-3xl font-display text-5xl font-semibold leading-[0.98] tracking-[-0.04em] sm:text-6xl">
                            {t(
                                "title",
                            )}
                        </h2>

                        <p className="mt-5 max-w-2xl text-lg leading-8 text-white/68">
                            {t(
                                "description",
                            )}
                        </p>

                        <Link
                            href="/planner"
                            className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-[#f25f4b] px-7 py-4 font-bold text-white shadow-[0_18px_45px_rgba(242,95,75,0.24)]"
                        >
                            <Route
                                size={
                                    20
                                }
                            />

                            {t(
                                "createJourney",
                            )}

                            <ArrowRight
                                size={
                                    19
                                }
                            />
                        </Link>
                    </div>

                    <div className="rounded-[30px] border border-white/14 bg-white/8 p-4 backdrop-blur sm:p-5">
                        <div className="rounded-[24px] bg-[#fffaf1] p-5 text-[#173a3b] sm:p-6">
                            <div className="flex items-center gap-3 border-b border-[#ddd1bf] pb-4">
                                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#dff0ec] text-[#2f8f8b]">
                                    <Bot
                                        size={
                                            23
                                        }
                                    />
                                </span>

                                <div>
                                    <p className="font-bold">
                                        {t(
                                            "assistantName",
                                        )}
                                    </p>

                                    <p className="text-xs text-[#74807d]">
                                        {t(
                                            "assistantStatus",
                                        )}
                                    </p>
                                </div>

                                <span className="ml-auto h-2.5 w-2.5 rounded-full bg-[#43a26f] ring-4 ring-[#43a26f]/15" />
                            </div>

                            <div className="mt-5 rounded-2xl bg-[#f1eadf] p-4 text-sm leading-7 text-[#52615e]">
                                “
                                {t(
                                    "examplePrompt",
                                )}
                                ”
                            </div>

                            <div className="mt-4 rounded-2xl border border-[#dcd1c0] p-4">
                                <div className="flex items-center justify-between text-sm font-bold">
                                    <span>
                                        {t(
                                            "suggestion",
                                        )}
                                    </span>

                                    <span className="inline-flex items-center gap-1 text-[#e3a83b]">
                                        <Star
                                            size={
                                                15
                                            }
                                            fill="currentColor"
                                        />

                                        4.9
                                    </span>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[#315f5f]">
                                    {localizedCities.map(
                                        (
                                            city,
                                        ) => (
                                            <span
                                                key={
                                                    city.id
                                                }
                                                className="rounded-full bg-[#e5efeb] px-3 py-1.5"
                                            >
                                                {
                                                    city.name
                                                }
                                            </span>
                                        ),
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
