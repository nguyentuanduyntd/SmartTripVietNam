export type HotelProviderId =
    | "liteapi"
    | "amadeus";

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
    childAges: number[];
    roomCount: number;

    maxPricePerNight?: number;
    preference: LodgingPreference;

    /**
     * Các yêu cầu tự nhiên như:
     * - Gần biển
     * - Yên tĩnh
     * - Có hồ bơi
     *
     * Provider có thể chưa filter trực tiếp tất cả requirement;
     * AI recommendation dùng chúng để xếp hạng các kết quả LiteAPI.
     */
    requirements?: string[];
};

export type HotelSearchItem = {
    provider: HotelProviderId;

    hotelId: string;
    name: string;

    address?: string;
    cityCode?: string;
    imageUrl?: string;

    latitude?: number;
    longitude?: number;

    rating?: number;

    available: boolean;

    offerId?: string;

    checkInDate: string;
    checkOutDate: string;

    roomDescription?: string;
    bedType?: string;
    boardName?: string;

    currency?: string;

    totalPrice?: number;
    pricePerNight?: number;

    refundable?: boolean | null;
    taxesIncluded?: boolean | null;
};

export type HotelSearchResult = {
    configured: boolean;

    provider: HotelProviderId;

    sourceLabel: string;

    sandbox?: boolean;

    locationName: string;

    checkInDate: string;
    checkOutDate: string;

    nights: number;

    maxPricePerNight?: number;

    items: HotelSearchItem[];

    /**
     * Các lựa chọn có giá gần nhất nhưng cao hơn ngân sách người dùng.
     *
     * Chỉ dùng làm fallback UI khi `items` rỗng vì budget filter.
     * Không được coi là kết quả thỏa điều kiện ngân sách.
     */
    nearBudgetItems?: HotelSearchItem[];

    message?: string;
};

export interface HotelProvider {
    readonly id: HotelProviderId;

    isConfigured(): boolean;

    search(
        input: HotelSearchInput,
    ): Promise<HotelSearchResult>;
}