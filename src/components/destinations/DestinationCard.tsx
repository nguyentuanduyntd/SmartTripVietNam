"use client";

import Link from "next/link";

import {
    ArrowRight,
    MapPin,
} from "lucide-react";

import {
    useLocale,
} from "next-intl";

import {
    localizedNullableText,
    localizedText,
} from "@/src/i18n/localized-text";

import type {
    Destination,
} from "@/src/lib/api-client/destinations";

import type {
    Location,
} from "@/src/lib/api-client/locations";

import {
    CloudinaryVisual,
} from "../home/CloudinaryVisual";

const FALLBACK_IMAGE =
    "smart-trip-vietnam/home/hero/hue";

interface DestinationCardProps {
    destination:
        Destination;

    locationName?: string;
}

export function DestinationCard({
    destination,
    locationName,
}: DestinationCardProps) {
    const locale =
        useLocale();

    const name =
        localizedText(
            locale,
            {
                vi:
                    destination.name,

                en:
                    destination.nameEn,
            },
        );

    const description =
        localizedNullableText(
            locale,
            {
                vi:
                    destination.description,

                en:
                    destination.descriptionEn,
            },
        );

    const categories =
        destination.categories.map(
            (
                category,
            ) => ({
                ...category,

                localizedName:
                    localizedText(
                        locale,
                        {
                            vi:
                                category.name,

                            en:
                                category.nameEn,
                        },
                    ),
            }),
        );

    return (
        <Link
            href={`/destinations/${destination.id}`}
            className="group overflow-hidden rounded-[30px] border border-[#ded3c3] bg-[#fffaf1] shadow-[0_16px_55px_rgba(35,55,50,0.06)] transition-all hover:-translate-y-2 hover:shadow-[0_24px_65px_rgba(35,55,50,0.13)]"
        >
            <div className="relative h-64 overflow-hidden">
                <CloudinaryVisual
                    source={
                        destination.coverImageUrl ??
                        FALLBACK_IMAGE
                    }
                    alt={
                        name
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

                {categories[0] ? (
                    <div className="absolute left-5 top-5 rounded-full bg-[#fffaf0]/90 px-3 py-1.5 text-xs font-extrabold text-[#315f5f] backdrop-blur">
                        {
                            categories[0]
                                .localizedName
                        }
                    </div>
                ) : null}
            </div>

            <div className="p-6 sm:p-7">
                {locationName ? (
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#d55b48]">
                        <MapPin
                            size={
                                16
                            }
                        />

                        {
                            locationName
                        }
                    </div>
                ) : null}

                <div className="mt-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h3 className="truncate font-display text-2xl font-semibold text-[#173a3b]">
                            {
                                name
                            }
                        </h3>

                        {description ? (
                            <p className="mt-3 line-clamp-2 leading-7 text-[#667370]">
                                {
                                    description
                                }
                            </p>
                        ) : null}

                        {categories.length >
                        1 ? (
                            <div className="mt-4 flex flex-wrap gap-1.5">
                                {categories
                                    .slice(
                                        1,
                                    )
                                    .map(
                                        (
                                            category,
                                        ) => (
                                            <span
                                                key={
                                                    category.id
                                                }
                                                className="rounded-full border border-[#d7cbbb] px-2.5 py-1 text-[11px] font-semibold text-[#50605e]"
                                            >
                                                {
                                                    category.localizedName
                                                }
                                            </span>
                                        ),
                                    )}
                            </div>
                        ) : null}
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
    );
}

export function locationNameFor(
    destination:
        Destination,

    locations:
        Location[],

    locale:
        | string
        | null
        | undefined,
): string | undefined {
    const location =
        locations.find(
            (
                item,
            ) =>
                item.id ===
                destination.locationId,
        );

    if (!location) {
        return undefined;
    }

    return localizedText(
        locale,
        {
            vi:
                location.name,

            en:
                location.nameEn,
        },
    );
}