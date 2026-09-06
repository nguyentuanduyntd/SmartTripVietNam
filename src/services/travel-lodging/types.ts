export type HotelProviderId = "liteapi" | "amadeus";

export type LodgingPreference = "any" | "hotel" | "homestay";

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
  nearBudgetItems?: HotelSearchItem[];
  message?: string;
};

export interface HotelProvider {
  readonly id: HotelProviderId;
  isConfigured(): boolean;
  search(input: HotelSearchInput): Promise<HotelSearchResult>;
}
