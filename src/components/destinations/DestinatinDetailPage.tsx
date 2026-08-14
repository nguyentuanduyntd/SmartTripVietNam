"use client";

import Link from "next/link";

import {
    useEffect,
    useState,
} from "react";

import {
    ArrowLeft,
    MapPin,
    ScrollText,
} from "lucide-react";

import {
    useLocale,
    useTranslations,
} from "next-intl";

import {
    CloudinaryVisual,
} from "@/src/components/home/CloudinaryVisual";

import {
    HomeFooter,
} from "@/src/components/home/HomeFooter";

import {
    HomeHeader,
} from "@/src/components/home/HomeHeader";

import {
    localizedNullableText,
    localizedText,
} from "@/src/i18n/localized-text";

import {
    destinationsApi,
    type Destination,
} from "@/src/lib/api-client/destinations";

import {
    ApiRequestError,
} from "@/src/lib/api-client/http";

import {
    locationsApi,
    type Location,
} from "@/src/lib/api-client/locations";

const FALLBACK_IMAGE =
    "smart-trip-vietnam/home/hero/hue";

interface DestinationDetailPageProps {
    id: string;
}

export function DestinationDetailPage({
    id,
}: DestinationDetailPageProps) {
    const locale =
        useLocale();

    const t =
        useTranslations(
            "Destinations.detail",
        );

    const [
        destination,
        setDestination,
    ] =
        useState<
            Destination | null
        >(null);

    const [
        location,
        setLocation,
    ] =
        useState<
            Location | null
        >(null);

    const [
        loading,
        setLoading,
    ] =
        useState(
            true,
        );

    const [
        notFound,
        setNotFound,
    ] =
        useState(
            false,
        );

    const [
        loadError,
        setLoadError,
    ] =
        useState(
            false,
        );

    useEffect(() => {
        let active =
            true;

        async function load() {
            setLoading(
                true,
            );

            setNotFound(
                false,
            );

            setLoadError(
                false,
            );

            try {
                const data =
                    await destinationsApi.get(
                        id,
                    );

                if (
                    !active
                ) {
                    return;
                }

                setDestination(
                    data,
                );

                locationsApi
                    .list()
                    .then(
                        (
                            locations,
                        ) => {
                            if (
                                !active
                            ) {
                                return;
                            }

                            setLocation(
                                locations.find(
                                    (
                                        item,
                                    ) =>
                                        item.id ===
                                        data.locationId,
                                ) ??
                                    null,
                            );
                        },
                    )
                    .catch(
                        (
                            error,
                        ) => {
                            console.error(
                                "Failed to load destination location:",
                                error,
                            );
                        },
                    );
            } catch (
                error
            ) {
                if (
                    !active
                ) {
                    return;
                }

                if (
                    error instanceof
                        ApiRequestError &&
                    error.status ===
                        404
                ) {
                    setNotFound(
                        true,
                    );
                } else {
                    console.error(
                        "Failed to load destination:",
                        error,
                    );

                    setLoadError(
                        true,
                    );
                }
            } finally {
                if (
                    active
                ) {
                    setLoading(
                        false,
                    );
                }
            }
        }

        void load();

        return () => {
            active =
                false;
        };
    }, [id]);

    if (loading) {
        return (
            <main className="min-h-screen bg-[#fffaf1] text-[#173a3b]">
                <HomeHeader />

                <div className="mx-auto max-w-[1440px] px-5 pt-32 sm:px-8 lg:px-12">
                    <div className="h-[420px] animate-pulse rounded-[34px] bg-[#ede6d7]" />

                    <div className="mt-8 h-10 w-2/3 animate-pulse rounded-full bg-[#ede6d7]" />

                    <div className="mt-4 h-6 w-1/3 animate-pulse rounded-full bg-[#ede6d7]" />
                </div>
            </main>
        );
    }

    if (notFound) {
        return (
            <main className="min-h-screen bg-[#fffaf1] text-[#173a3b]">
                <HomeHeader />

                <div className="mx-auto max-w-2xl px-5 pb-32 pt-40 text-center sm:px-8">
                    <p className="font-display text-3xl font-semibold">
                        {t(
                            "notFoundTitle",
                        )}
                    </p>

                    <p className="mt-4 text-[#60706d]">
                        {t(
                            "notFoundDescription",
                        )}
                    </p>

                    <Link
                        href="/destinations"
                        className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#173a3b] px-6 py-3 font-bold text-white transition-colors hover:bg-[#20494a]"
                    >
                        <ArrowLeft
                            size={
                                18
                            }
                        />

                        {t(
                            "backToList",
                        )}
                    </Link>
                </div>

                <HomeFooter />
            </main>
        );
    }

    if (
        loadError ||
        !destination
    ) {
        return (
            <main className="min-h-screen bg-[#fffaf1] text-[#173a3b]">
                <HomeHeader />

                <div className="mx-auto max-w-2xl px-5 pb-32 pt-40 text-center sm:px-8">
                    <p className="font-display text-3xl font-semibold">
                        {t(
                            "errorTitle",
                        )}
                    </p>

                    <p className="mt-4 text-[#60706d]">
                        {t(
                            "loadError",
                        )}
                    </p>

                    <Link
                        href="/destinations"
                        className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#173a3b] px-6 py-3 font-bold text-white transition-colors hover:bg-[#20494a]"
                    >
                        <ArrowLeft
                            size={
                                18
                            }
                        />

                        {t(
                            "backToList",
                        )}
                    </Link>
                </div>

                <HomeFooter />
            </main>
        );
    }

    const destinationName =
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

    const history =
        localizedNullableText(
            locale,
            {
                vi:
                    destination.history,

                en:
                    destination.historyEn,
            },
        );

    const locationName =
        location
            ? localizedText(
                  locale,
                  {
                      vi:
                          location.name,

                      en:
                          location.nameEn,
                  },
              )
            : null;

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

    /*
     * VI:
     * tên chính tiếng Việt,
     * English name nằm dưới.
     *
     * EN:
     * tên chính English,
     * tên Việt nằm dưới.
     */
    const alternateNameRaw =
        locale === "en"
            ? destination.name
            : destination.nameEn;

    const alternateName =
        typeof alternateNameRaw ===
            "string" &&
        alternateNameRaw.trim().length >
            0 &&
        alternateNameRaw.trim() !==
            destinationName
            ? alternateNameRaw.trim()
            : null;

    const mapHref =
        destination.latitude !=
            null &&
        destination.longitude !=
            null
            ? `https://www.google.com/maps/search/?api=1&query=${destination.latitude},${destination.longitude}`
            : null;

    return (
        <main className="overflow-x-hidden bg-[#fffaf1] text-[#173a3b]">
            <HomeHeader />

            <section className="relative h-[62vh] min-h-[420px] w-full overflow-hidden">
                <CloudinaryVisual
                    source={
                        destination.coverImageUrl ??
                        FALLBACK_IMAGE
                    }
                    alt={
                        destinationName
                    }
                    priority
                    imageOptions={{
                        width:
                            1800,

                        height:
                            1200,
                    }}
                    className="absolute inset-0"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#0e2f30] via-[#123d3c]/25 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 px-5 pb-10 sm:px-8 lg:px-12 lg:pb-14">
                    <div className="mx-auto max-w-[1440px]">
                        <Link
                            href="/destinations"
                            className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-black/35"
                        >
                            <ArrowLeft
                                size={
                                    16
                                }
                            />

                            {t(
                                "allDestinations",
                            )}
                        </Link>

                        <div className="mt-6 flex flex-wrap items-center gap-2">
                            {categories.map(
                                (
                                    category,
                                ) => (
                                    <span
                                        key={
                                            category.id
                                        }
                                        className="rounded-full border border-white/25 bg-white/12 px-3 py-1.5 text-xs font-bold text-white backdrop-blur"
                                    >
                                        {
                                            category.localizedName
                                        }
                                    </span>
                                ),
                            )}
                        </div>

                        <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.02] text-white sm:text-5xl lg:text-6xl">
                            {
                                destinationName
                            }
                        </h1>

                        {alternateName ? (
                            <p className="mt-2 text-lg italic text-white/70">
                                {
                                    alternateName
                                }
                            </p>
                        ) : null}

                        <div className="mt-5 flex flex-wrap items-center gap-4 text-white/85">
                            {locationName ? (
                                <span className="inline-flex items-center gap-2 text-sm font-semibold">
                                    <MapPin
                                        size={
                                            16
                                        }
                                    />

                                    {
                                        locationName
                                    }
                                </span>
                            ) : null}

                            {destination.address ? (
                                <span className="text-sm text-white/70">
                                    {
                                        destination.address
                                    }
                                </span>
                            ) : null}
                        </div>
                    </div>
                </div>
            </section>

            <section className="px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
                <div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-[1.6fr_1fr]">
                    <div>
                        {description ? (
                            <div>
                                <h2 className="font-display text-2xl font-semibold text-[#173a3b] sm:text-3xl">
                                    {t(
                                        "introduction",
                                    )}
                                </h2>

                                <p className="mt-4 whitespace-pre-line leading-8 text-[#4a5654]">
                                    {
                                        description
                                    }
                                </p>
                            </div>
                        ) : null}

                        {history ? (
                            <div className="mt-12">
                                <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-[#173a3b] sm:text-3xl">
                                    <ScrollText
                                        size={
                                            22
                                        }
                                        className="text-[#e55c49]"
                                    />

                                    {t(
                                        "history",
                                    )}
                                </h2>

                                <p className="mt-4 whitespace-pre-line leading-8 text-[#4a5654]">
                                    {
                                        history
                                    }
                                </p>
                            </div>
                        ) : null}

                        {!description &&
                        !history ? (
                            <p className="text-[#60706d]">
                                {t(
                                    "noDetails",
                                )}
                            </p>
                        ) : null}
                    </div>

                    <aside className="h-max rounded-[28px] border border-[#ded3c3] bg-[#f7f0e4] p-7">
                        <h3 className="font-display text-xl font-semibold text-[#173a3b]">
                            {t(
                                "quickInfo",
                            )}
                        </h3>

                        <dl className="mt-5 grid gap-4 text-sm">
                            {locationName ? (
                                <div>
                                    <dt className="font-semibold text-[#8a8575]">
                                        {t(
                                            "region",
                                        )}
                                    </dt>

                                    <dd className="mt-1 text-[#173a3b]">
                                        {
                                            locationName
                                        }
                                    </dd>
                                </div>
                            ) : null}

                            {destination.address ? (
                                <div>
                                    <dt className="font-semibold text-[#8a8575]">
                                        {t(
                                            "address",
                                        )}
                                    </dt>

                                    <dd className="mt-1 text-[#173a3b]">
                                        {
                                            destination.address
                                        }
                                    </dd>
                                </div>
                            ) : null}

                            {categories.length >
                            0 ? (
                                <div>
                                    <dt className="font-semibold text-[#8a8575]">
                                        {t(
                                            "categories",
                                        )}
                                    </dt>

                                    <dd className="mt-2 flex flex-wrap gap-1.5">
                                        {categories.map(
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
                                    </dd>
                                </div>
                            ) : null}
                        </dl>

                        {mapHref ? (
                            <a
                                href={
                                    mapHref
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#173a3b] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#20494a]"
                            >
                                <MapPin
                                    size={
                                        16
                                    }
                                />

                                {t(
                                    "viewGoogleMaps",
                                )}
                            </a>
                        ) : null}
                    </aside>
                </div>
            </section>

            <HomeFooter />
        </main>
    );
}