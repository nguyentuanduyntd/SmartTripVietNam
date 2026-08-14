import type { LucideIcon } from "lucide-react";

import {
    CITY_EDITORIAL,
    CUISINES,
    FEATURED_DESTINATIONS,
    HOME_CITIES,
    JOURNEYS,
    type CuisineCardData,
    type DestinationCardData,
    type HomeCity,
    type JourneyCardData,
} from "@/src/constants/home-data";
import {
    DEFAULT_LOCALE,
    isAppLocale,
    type AppLocale,
} from "@/src/i18n/config";

export interface HomeStaticCityEditorialItem {
    city: string;
    kicker: string;
    title: string;
    image: string;
    imageAlt: string;
    icon: LucideIcon;
    stat: string;
}

export interface LocalizedHomeStaticData {
    cities: HomeCity[];
    cityEditorial: HomeStaticCityEditorialItem[];
    featuredDestinations: DestinationCardData[];
    cuisines: CuisineCardData[];
    journeys: JourneyCardData[];
}

function resolveLocale(
    locale: string | null | undefined,
): AppLocale {
    return isAppLocale(locale) ? locale : DEFAULT_LOCALE;
}

const EN_CITY_COPY: Record<
    HomeCity["id"],
    Pick<
        HomeCity,
        | "name"
        | "eyebrow"
        | "headline"
        | "description"
        | "imageAlt"
    >
> = {
    hue: {
        name: "Hue",
        eyebrow: "The quiet imperial capital",
        headline: "Slow down beside the Perfume River",
        description:
            "Walk beneath moss-covered roofs, explore ancient royal tombs, and discover a refined cuisine preserved for generations.",
        imageAlt: "Hue beside the Perfume River at sunrise",
    },

    "da-nang": {
        name: "Da Nang",
        eyebrow: "A radiant coastal city",
        headline:
            "Welcome a new day between blue sea and modern city life",
        description:
            "A youthful stop with long beaches, iconic bridges, and nature unfolding right beside the city.",
        imageAlt:
            "Da Nang viewed from the Han River at sunrise",
    },

    "hoi-an": {
        name: "Hoi An",
        eyebrow: "A gentle heritage town",
        headline:
            "Wander through lantern streets and stories from the past",
        description:
            "Golden houses, narrow alleys, and boats drifting along the Hoai River create a Hoi An that feels familiar and unforgettable.",
        imageAlt:
            "Hoi An Ancient Town glowing beside the Hoai River",
    },
};

const EN_CITY_EDITORIAL_COPY = [
    {
        city: "Hue",
        kicker: "Heritage & depth",
        title:
            "A landscape of memory told through architecture, music, and bold flavors.",
        imageAlt: "Hue imperial architecture",
        stat: "07 heritage sites",
    },

    {
        city: "Da Nang",
        kicker: "Coast & energy",
        title:
            "From sunrise at My Khe Beach to city lights along the Han River.",
        imageAlt: "Da Nang coastline and city",
        stat: "06 featured experiences",
    },

    {
        city: "Hoi An",
        kicker: "Ancient town & crafts",
        title:
            "Slow down among golden houses and the hands of local artisans.",
        imageAlt:
            "Hoi An Ancient Town with lanterns",
        stat: "06 cultural highlights",
    },
] as const;

const EN_DESTINATION_COPY: Array<
    Pick<
        DestinationCardData,
        | "name"
        | "cityLabel"
        | "category"
        | "description"
        | "imageAlt"
    >
> = [
    {
        name: "Imperial City of Hue",
        cityLabel: "Hue",
        category: "Historic site",
        description:
            "The Nguyen Dynasty's former imperial complex in the heart of Hue.",
        imageAlt:
            "Ngo Mon Gate at the Imperial City of Hue",
    },

    {
        name: "Thien Mu Pagoda",
        cityLabel: "Hue",
        category: "Spiritual site",
        description:
            "An iconic pagoda beside the Perfume River, crowned by the seven-storey Phuoc Duyen Tower.",
        imageAlt:
            "Phuoc Duyen Tower at Thien Mu Pagoda",
    },

    {
        name: "My Khe Beach",
        cityLabel: "Da Nang",
        category: "Beach",
        description:
            "A long stretch of white sand, calm water, and clear coastal sunrises.",
        imageAlt: "My Khe Beach in Da Nang",
    },

    {
        name: "Dragon Bridge",
        cityLabel: "Da Nang",
        category: "City landmark",
        description:
            "A striking bridge over the Han River, famous for its weekend fire show.",
        imageAlt:
            "Dragon Bridge in Da Nang at night",
    },

    {
        name: "Hoi An Ancient Town",
        cityLabel: "Hoi An",
        category: "Cultural heritage",
        description:
            "Golden houses and lantern-lit streets along the Hoai River.",
        imageAlt:
            "Hoi An Ancient Town under lantern light",
    },

    {
        name: "Cham Islands",
        cityLabel: "Hoi An",
        category: "Nature",
        description:
            "A green island cluster with beaches and a diverse coral ecosystem.",
        imageAlt: "Blue sea at the Cham Islands",
    },
];

const EN_CUISINE_COPY: Array<
    Pick<
        CuisineCardData,
        | "name"
        | "city"
        | "price"
        | "description"
        | "imageAlt"
    >
> = [
    {
        name: "Bun bo Hue",
        city: "Hue",
        price: "From ₫35,000",
        description:
            "A fragrant lemongrass broth with fermented shrimp paste and Hue's signature touch of heat.",
        imageAlt: "A bowl of bun bo Hue",
    },

    {
        name: "Mi Quang",
        city: "Da Nang · Quang Nam",
        price: "From ₫30,000",
        description:
            "Golden noodles, rich broth, fresh herbs, and crisp grilled rice crackers.",
        imageAlt: "A bowl of Mi Quang",
    },

    {
        name: "Cao lau",
        city: "Hoi An",
        price: "From ₫35,000",
        description:
            "Chewy noodles, char siu pork, and Tra Que herbs in a flavor unique to Hoi An.",
        imageAlt: "A bowl of Hoi An cao lau",
    },

    {
        name: "Hoi An chicken rice",
        city: "Hoi An",
        price: "From ₫35,000",
        description:
            "Fragrant golden rice with shredded chicken, Vietnamese coriander, and a savory sauce.",
        imageAlt:
            "A plate of Hoi An chicken rice",
    },
];

const EN_JOURNEY_COPY: Array<
    Pick<
        JourneyCardData,
        | "duration"
        | "title"
        | "description"
        | "startLocation"
        | "price"
        | "imageAlt"
    >
> = [
    {
        duration: "1 day",
        title: "A day in Hue",
        description:
            "Move through imperial heritage, enjoy tea by the river, and finish with a dinner full of Hue flavors.",
        startLocation: "Hue",
        price: "Contact us",
        imageAlt:
            "A journey through Hue's heritage",
    },

    {
        duration: "2 days",
        title: "Blue sea and city rhythm",
        description:
            "Combine My Khe Beach, Son Tra Peninsula, and an evening watching the Han River light up.",
        startLocation: "Da Nang",
        price: "Contact us",
        imageAlt:
            "A coastal journey through Da Nang",
    },

    {
        duration: "5 days",
        title:
            "Three cities, one unforgettable region",
        description:
            "A complete journey connecting Hue, Da Nang, and Hoi An at an unhurried pace.",
        startLocation: "Hue",
        price: "Contact us",
        imageAlt:
            "A journey across Hue, Da Nang, and Hoi An",
    },
];

export function getLocalizedHomeStaticData(
    locale: string | null | undefined,
): LocalizedHomeStaticData {
    const resolvedLocale = resolveLocale(locale);

    if (resolvedLocale === "vi") {
        return {
            cities: HOME_CITIES.map((item) => ({
                ...item,
            })),

            cityEditorial: CITY_EDITORIAL.map(
                (item) => ({
                    ...item,
                }),
            ),

            featuredDestinations:
                FEATURED_DESTINATIONS.map((item) => ({
                    ...item,
                })),

            cuisines: CUISINES.map((item) => ({
                ...item,
            })),

            journeys: JOURNEYS.map((item) => ({
                ...item,
            })),
        };
    }

    return {
        cities: HOME_CITIES.map((item) => ({
            ...item,
            ...EN_CITY_COPY[item.id],
        })),

        cityEditorial: CITY_EDITORIAL.map(
            (item, index) => ({
                ...item,
                ...(EN_CITY_EDITORIAL_COPY[index] ?? {}),
            }),
        ),

        featuredDestinations:
            FEATURED_DESTINATIONS.map(
                (item, index) => ({
                    ...item,
                    ...(EN_DESTINATION_COPY[index] ?? {}),
                }),
            ),

        cuisines: CUISINES.map((item, index) => ({
            ...item,
            ...(EN_CUISINE_COPY[index] ?? {}),
        })),

        journeys: JOURNEYS.map((item, index) => ({
            ...item,
            ...(EN_JOURNEY_COPY[index] ?? {}),
        })),
    };
}