import type { LucideIcon } from "lucide-react";

import {
    HOME_CITIES,
    HOME_MEDIA,
    type CityId,
    type CuisineCardData,
    type DestinationCardData,
    type HomeCity,
    type JourneyCardData,
} from "../constants/home-data";

import type { AppLocale } from "../i18n/config";

import { getLocalizedHomeStaticData } from "../i18n/home-static-data";

import { localizedText } from "../i18n/localized-text";

import type {
    CuisineApiItem,
    DestinationApiItem,
    HomeApiData,
    LocationApiItem,
    TourApiItem,
} from "../types/home-api";

export interface CityEditorialCardData {
    city: string;
    kicker: string;
    title: string;
    image: string;
    imageAlt: string;
    icon: LucideIcon;
    stat: string;
}

export interface HomeViewData {
    cities: HomeCity[];
    cityEditorial: CityEditorialCardData[];
    featuredDestinations: DestinationCardData[];
    cuisines: CuisineCardData[];
    journeys: JourneyCardData[];
}

const JOURNEY_TONES = [
    "coral",
    "teal",
    "gold",
] as const;

function getCityIdFromLocationSlug(
    slug: string,
): CityId | null {
    const normalizedSlug = slug
        .trim()
        .toLowerCase();

    const cityMap: Record<string, CityId> = {
        hue: "hue",
        "thua-thien-hue": "hue",
        "da-nang": "da-nang",
        "hoi-an": "hoi-an",
    };

    return cityMap[normalizedSlug] ?? null;
}

function getLocationByCityId(
    locations: LocationApiItem[],
    cityId: CityId,
): LocationApiItem | undefined {
    return locations.find(
        (location) =>
            getCityIdFromLocationSlug(location.slug) ===
            cityId,
    );
}

function getCityFallbackImage(
    cityId: CityId,
): string {
    return (
        HOME_CITIES.find(
            (city) => city.id === cityId,
        )?.image ?? HOME_MEDIA.heroHue
    );
}

function formatCuisinePrice(
    price: number | null,
    locale: AppLocale,
): string {
    if (price === null) {
        return locale === "en"
            ? "Reference price"
            : "Giá tham khảo";
    }

    if (locale === "en") {
        return `Around ₫${new Intl.NumberFormat(
            "en-US",
        ).format(price)}`;
    }

    return `Khoảng ${new Intl.NumberFormat(
        "vi-VN",
    ).format(price)}đ`;
}

function formatTourPrice(
    price: string | null,
    locale: AppLocale,
): string {
    if (!price) {
        return locale === "en"
            ? "Contact us"
            : "Liên hệ";
    }

    const numericPrice = Number(price);

    if (
        !Number.isFinite(numericPrice) ||
        numericPrice < 0
    ) {
        return locale === "en"
            ? "Contact us"
            : "Liên hệ";
    }

    return new Intl.NumberFormat(
        locale === "en" ? "en-US" : "vi-VN",
        {
            style: "currency",
            currency: "VND",
            maximumFractionDigits: 0,
        },
    ).format(numericPrice);
}

function formatTourDuration(
    durationDays: number,
    durationNights: number,
    locale: AppLocale,
): string {
    if (locale === "en") {
        const dayLabel =
            durationDays === 1 ? "day" : "days";

        const nightLabel =
            durationNights === 1
                ? "night"
                : "nights";

        if (durationNights > 0) {
            return `${durationDays} ${dayLabel} ${durationNights} ${nightLabel}`;
        }

        return `${durationDays} ${dayLabel}`;
    }

    if (durationNights > 0) {
        return `${durationDays} ngày ${durationNights} đêm`;
    }

    return `${durationDays} ngày`;
}

function createDynamicCities(
    locations: LocationApiItem[],
    locale: AppLocale,
): HomeCity[] {
    const staticData =
        getLocalizedHomeStaticData(locale);

    return staticData.cities.map(
        (staticCity) => {
            const location =
                getLocationByCityId(
                    locations,
                    staticCity.id,
                );

            if (!location) {
                return staticCity;
            }

            return {
                ...staticCity,

                name: localizedText(
                    locale,
                    {
                        vi: location.name,
                        en: location.nameEn,
                    },
                    {
                        fallback: staticCity.name,
                    },
                ),

                description: localizedText(
                    locale,
                    {
                        vi: location.description,
                        en: location.descriptionEn,
                    },
                    {
                        fallback:
                            staticCity.description,
                    },
                ),

                href: `/destinations?location=${location.id}`,
            };
        },
    );
}

function createCityEditorial(
    locations: LocationApiItem[],
    destinations: DestinationApiItem[],
    locale: AppLocale,
): CityEditorialCardData[] {
    const staticData =
        getLocalizedHomeStaticData(locale);

    return staticData.cityEditorial.map(
        (staticItem, index) => {
            const staticCity =
                staticData.cities[index];

            if (!staticCity) {
                return {
                    ...staticItem,
                };
            }

            const location =
                getLocationByCityId(
                    locations,
                    staticCity.id,
                );

            const destinationCount = location
                ? destinations.filter(
                      (destination) =>
                          destination.locationId ===
                          location.id,
                  ).length
                : 0;

            return {
                ...staticItem,

                city: location
                    ? localizedText(
                          locale,
                          {
                              vi: location.name,
                              en: location.nameEn,
                          },
                          {
                              fallback:
                                  staticItem.city,
                          },
                      )
                    : staticItem.city,

                title: location
                    ? localizedText(
                          locale,
                          {
                              vi: location.description,
                              en: location.descriptionEn,
                          },
                          {
                              fallback:
                                  staticItem.title,
                          },
                      )
                    : staticItem.title,

                stat:
                    locale === "en"
                        ? `${String(
                              destinationCount,
                          ).padStart(
                              2,
                              "0",
                          )} destinations`
                        : `${String(
                              destinationCount,
                          ).padStart(
                              2,
                              "0",
                          )} điểm đến`,
            };
        },
    );
}

function createDestinationCards(
    locations: LocationApiItem[],
    destinations: DestinationApiItem[],
    locale: AppLocale,
): DestinationCardData[] {
    const staticData =
        getLocalizedHomeStaticData(locale);

    const locationById = new Map(
        locations.map((location) => [
            location.id,
            location,
        ]),
    );

    const mappedItems = destinations
        .map((destination) => {
            const location =
                locationById.get(
                    destination.locationId,
                );

            if (!location) {
                return null;
            }

            const cityId =
                getCityIdFromLocationSlug(
                    location.slug,
                );

            if (!cityId) {
                return null;
            }

            const destinationName =
                localizedText(locale, {
                    vi: destination.name,
                    en: destination.nameEn,
                });

            const locationName =
                localizedText(locale, {
                    vi: location.name,
                    en: location.nameEn,
                });

            const firstCategory =
                destination.categories[0];

            const category = firstCategory
                ? localizedText(
                      locale,
                      {
                          vi: firstCategory.name,
                          en: firstCategory.nameEn,
                      },
                      {
                          fallback:
                              locale === "en"
                                  ? "Destination"
                                  : "Điểm đến",
                      },
                  )
                : locale === "en"
                  ? "Destination"
                  : "Điểm đến";

            const generatedDescription =
                locale === "en"
                    ? `Discover ${destinationName} in ${locationName}.`
                    : `Khám phá ${destinationName} tại ${locationName}.`;

            return {
                name: destinationName,

                city: cityId,

                cityLabel: locationName,

                category,

                description: localizedText(
                    locale,
                    {
                        vi: destination.description,
                        en: destination.descriptionEn,
                    },
                    {
                        fallback:
                            destination.address ??
                            generatedDescription,
                    },
                ),

                image:
                    destination.coverImageUrl ??
                    getCityFallbackImage(
                        cityId,
                    ),

                imageAlt: destinationName,

                href: `/destinations/${destination.id}`,
            } satisfies DestinationCardData;
        })
        .filter(
            (
                item,
            ): item is DestinationCardData =>
                item !== null,
        );

    if (mappedItems.length === 0) {
        return staticData.featuredDestinations;
    }

    /*
     * Lấy tối đa 2 destination cho mỗi thành phố
     * để giao diện Home cân đối.
     */
    const balancedItems =
        staticData.cities.flatMap((city) =>
            mappedItems
                .filter(
                    (item) =>
                        item.city === city.id,
                )
                .slice(0, 2),
        );

    const selectedItems = [
        ...balancedItems,
    ];

    const selectedHrefs = new Set(
        selectedItems.map(
            (item) => item.href,
        ),
    );

    for (const item of mappedItems) {
        if (selectedItems.length >= 6) {
            break;
        }

        if (
            !selectedHrefs.has(item.href)
        ) {
            selectedItems.push(item);

            selectedHrefs.add(
                item.href,
            );
        }
    }

    return selectedItems.slice(0, 6);
}

function createCuisineCards(
    locations: LocationApiItem[],
    destinations: DestinationApiItem[],
    cuisines: CuisineApiItem[],
    locale: AppLocale,
): CuisineCardData[] {
    const staticData =
        getLocalizedHomeStaticData(locale);

    const locationById = new Map(
        locations.map((location) => [
            location.id,
            location,
        ]),
    );

    const destinationById = new Map(
        destinations.map(
            (destination) => [
                destination.id,
                destination,
            ],
        ),
    );

    const mappedItems = cuisines.map(
        (cuisine) => {
            const relatedLocations =
                cuisine.destinations
                    .map((summary) =>
                        destinationById.get(
                            summary.id,
                        ),
                    )
                    .filter(
                        (
                            destination,
                        ): destination is DestinationApiItem =>
                            Boolean(
                                destination,
                            ),
                    )
                    .map(
                        (destination) =>
                            locationById.get(
                                destination.locationId,
                            ),
                    )
                    .filter(
                        (
                            location,
                        ): location is LocationApiItem =>
                            Boolean(
                                location,
                            ),
                    );

            const uniqueLocationNames = [
                ...new Set(
                    relatedLocations.map(
                        (location) =>
                            localizedText(
                                locale,
                                {
                                    vi: location.name,
                                    en: location.nameEn,
                                },
                            ),
                    ),
                ),
            ];

            const firstLocation =
                relatedLocations[0];

            const firstCityId =
                firstLocation
                    ? getCityIdFromLocationSlug(
                          firstLocation.slug,
                      )
                    : null;

            const cuisineName =
                localizedText(locale, {
                    vi: cuisine.name,
                    en: cuisine.nameEn,
                });

            return {
                name: cuisineName,

                city:
                    uniqueLocationNames.length >
                    0
                        ? uniqueLocationNames.join(
                              ", ",
                          )
                        : locale === "en"
                          ? "Central Vietnam"
                          : "Miền Trung",

                price: formatCuisinePrice(
                    cuisine.avgPrice,
                    locale,
                ),

                description:
                    localizedText(
                        locale,
                        {
                            vi: cuisine.description,
                            en: cuisine.descriptionEn,
                        },
                        {
                            fallback:
                                locale ===
                                "en"
                                    ? `Discover the flavors of ${cuisineName}.`
                                    : `Khám phá hương vị ${cuisineName}.`,
                        },
                    ),

                image:
                    cuisine.coverImageUrl ??
                    getCityFallbackImage(
                        firstCityId ??
                            "hue",
                    ),

                imageAlt: cuisineName,

                href: `/cuisines/${cuisine.slug}`,
            } satisfies CuisineCardData;
        },
    );

    return mappedItems.length > 0
        ? mappedItems.slice(0, 4)
        : staticData.cuisines;
}

function createJourneyCards(
    tours: TourApiItem[],
    locale: AppLocale,
): JourneyCardData[] {
    const staticData =
        getLocalizedHomeStaticData(locale);

    if (tours.length === 0) {
        return staticData.journeys;
    }

    return tours
        .slice(0, 3)
        .map((tour, index) => {
            const cityId =
                getCityIdFromLocationSlug(
                    tour.startLocation.slug,
                );

            const tone =
                JOURNEY_TONES[
                    index %
                        JOURNEY_TONES.length
                ] ?? "coral";

            const tourName =
                localizedText(locale, {
                    vi: tour.name,
                    en: tour.nameEn,
                });

            const startLocationName =
                localizedText(locale, {
                    vi: tour.startLocation
                        .name,
                    en: tour.startLocation
                        .nameEn,
                });

            return {
                id: tour.id,

                duration:
                    formatTourDuration(
                        tour.durationDays,
                        tour.durationNights,
                        locale,
                    ),

                title: tourName,

                description:
                    localizedText(
                        locale,
                        {
                            vi: tour.description,
                            en: tour.descriptionEn,
                        },
                        {
                            fallback:
                                locale ===
                                "en"
                                    ? `Discover ${tourName}, starting from ${startLocationName}.`
                                    : `Khám phá hành trình ${tourName} khởi hành từ ${startLocationName}.`,
                        },
                    ),

                startLocation:
                    startLocationName,

                price:
                    formatTourPrice(
                        tour.estimatedPrice,
                        locale,
                    ),

                image:
                    tour.coverImageUrl ??
                    getCityFallbackImage(
                        cityId ??
                            "hue",
                    ),

                imageAlt: tourName,

                tone,

                href: `/tours/${tour.slug}`,
            };
        });
}

export function createHomeViewData(
    apiData: HomeApiData,
    locale: AppLocale,
): HomeViewData {
    return {
        cities: createDynamicCities(
            apiData.locations,
            locale,
        ),

        cityEditorial:
            createCityEditorial(
                apiData.locations,
                apiData.destinations,
                locale,
            ),

        featuredDestinations:
            createDestinationCards(
                apiData.locations,
                apiData.destinations,
                locale,
            ),

        cuisines: createCuisineCards(
            apiData.locations,
            apiData.destinations,
            apiData.cuisines,
            locale,
        ),

        journeys: createJourneyCards(
            apiData.tours,
            locale,
        ),
    };
}

export function getFallbackHomeViewData(
    locale: AppLocale,
): HomeViewData {
    const staticData =
        getLocalizedHomeStaticData(locale);

    return {
        cities: staticData.cities,

        cityEditorial:
            staticData.cityEditorial.map(
                (item) => ({
                    ...item,
                }),
            ),

        featuredDestinations:
            staticData.featuredDestinations,

        cuisines: staticData.cuisines,

        journeys: staticData.journeys,
    };
}