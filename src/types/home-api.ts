export interface LocationApiItem {
    id: string;
    name: string;
    nameEn: string | null;
    slug: string;
    description: string | null;
    descriptionEn: string | null;
    createdAt: string;
    updatedAt: string;  
}

export interface DestinationCategoryApiItem {
    id: string;
    name: string;
    nameEn: string | null;
    slug: string;
    icon: string | null;
}

export interface DestinationApiItem {
    id: string;
    locationId: string;
    name: string;
    nameEn: string | null;
    slug: string;
    address: string | null;
    description: string | null;
    descriptionEn: string | null;
    history: string | null;
    historyEn: string | null;
    latitude: number | null;
    longitude: number | null;
    coverImageUrl: string | null;
    coverImagePublicId: string | null;
    categories: DestinationCategoryApiItem[];
    createdAt: string;
    updatedAt: string;
}

export interface CuisineDestinationApiItem {
    id: string;
    name: string;
    slug: string;
}

export interface CuisineApiItem {
    id: string;
    name: string;
    nameEn: string | null;
    slug: string;
    description: string | null;
    descriptionEn: string | null;
    avgPrice: number | null;
    coverImageUrl: string | null;
    coverImagePublicId: string | null;
    destinations: CuisineDestinationApiItem[];
    createdAt: string;
    updatedAt: string;
}

export type TourStatus = "draft" | "published" | "hidden";

export interface TourStartLocationApiItem {
    id: string;
    name: string;
    nameEn: string | null;
    slug: string;
}

export interface TourApiItem {
    id: string;
    name: string;
    nameEn: string | null;
    slug: string;
    description: string | null;
    descriptionEn: string | null;
    coverImageUrl: string | null;
    coverImagePublicId: string | null;
    durationDays: number;
    durationNights: number;
    estimatedPrice: string | null;
    startLocationId: string;
    meetingPoint: string | null;
    status: TourStatus;
    publishedAt: string | null;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    startLocation: TourStartLocationApiItem;
}


export interface HomeApiData {
    locations: LocationApiItem[];
    destinations: DestinationApiItem[];
    cuisines: CuisineApiItem[];
    tours: TourApiItem[];
}

export interface ApiSuccessResponse<T> {
    success: true;
    data: T;
    message?: string;
    meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
    success: false;
    message: string;
    errors?: Record<string, string[]>;
}