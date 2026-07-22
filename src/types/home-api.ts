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

export interface HomeApiData {
    locations: LocationApiItem[];
    destinations: DestinationApiItem[];
    cuisines: CuisineApiItem[];
}

export interface ApiSuccessResponse<T> {
    success: true;
    data: T;
    message?: string;
}

export interface ApiErrorResponse {
    success: false;
    message: string;
    errors?: Record<string, string[]>;
}