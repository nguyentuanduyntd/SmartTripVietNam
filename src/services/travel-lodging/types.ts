export type LodgingPreference =
    | "any"
    | "hotel"
    | "homestay";

export type HotelSearchInput = {
    locationName: string;

    checkInDate: string;

    checkOutDate: string;

    adultCount: number;

    childCount: number;

    roomCount: number;

    maxPricePerNight?: number;

    preference?:
        LodgingPreference;
};

export type HotelSearchItem = {
    provider:
        "liteapi";

    hotelId:
        string;

    name:
        string;

    address?:
        string;

    imageUrl?:
        string;

    latitude?:
        number;

    longitude?:
        number;

    rating?:
        number;

    available:
        boolean;

    offerId?:
        string;

    checkInDate:
        string;

    checkOutDate:
        string;

    roomDescription?:
        string;

    boardName?:
        string;

    currency?:
        string;

    totalPrice?:
        number;

    pricePerNight?:
        number;

    refundable?:
        boolean | null;

    taxesIncluded?:
        boolean | null;
};

export type HotelSearchResult = {
    configured:
        boolean;

    provider:
        "liteapi";

    sourceLabel:
        string;

    sandbox?:
        boolean;

    locationName:
        string;

    checkInDate:
        string;

    checkOutDate:
        string;

    nights:
        number;

    maxPricePerNight?:
        number;

    items:
        HotelSearchItem[];

    message?:
        string;
};

export interface HotelProvider {
    readonly id:
        "liteapi";

    isConfigured():
        boolean;

    search(
        input:
            HotelSearchInput,
    ): Promise<HotelSearchResult>;
}