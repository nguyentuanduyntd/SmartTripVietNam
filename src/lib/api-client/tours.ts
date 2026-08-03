import { apiFetch, apiFetchPaginated } from "./http";

export type TourStatus = "draft" | "published" | "hidden";

export type TourStartLocation = {
    id: string;
    name: string;
    nameEn: string | null;
    slug: string;
};

export type Tour = {
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
    startLocation: TourStartLocation;
};

export type TourListParams = {
    page?: number;
    limit?: number;
    search?: string;
    startLocationId?: string;
    status?: TourStatus;
    minPrice?: number;
    maxPrice?: number;
    durationDays?: number;
    sortBy?:| "name"| "estimatedPrice"| "durationDays"| "createdAt"| "updatedAt"| "publishedAt";
    sortOrder?: "asc" | "desc";
};

export type TourInput = {
    name: string;
    nameEn?: string | null;
    slug?: string;
    description?: string | null;
    descriptionEn?: string | null;
    coverImageUrl?: string | null;
    coverImagePublicId?: string | null;
    durationDays: number;
    durationNights: number;
    estimatedPrice?: string | number | null;
    startLocationId: string;
    meetingPoint?: string | null;
    status?: TourStatus;
};

function toQueryString(params: TourListParams) {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.search) query.set("search", params.search);
    if (params.startLocationId) query.set("startLocationId", params.startLocationId);
    if (params.status) query.set("status", params.status);
    if (params.minPrice !== undefined) query.set("minPrice", String(params.minPrice));
    if (params.maxPrice !== undefined) query.set("maxPrice", String(params.maxPrice));
    if (params.durationDays !== undefined) query.set("durationDays", String(params.durationDays));
    if (params.sortBy) query.set("sortBy", params.sortBy);
    if (params.sortOrder) query.set("sortOrder", params.sortOrder);
    return query.toString();
}

export const toursApi = {
    list(params: TourListParams = {}) {
        const qs = toQueryString(params);
        return apiFetchPaginated<Tour[]>(`/api/tours${qs ? `?${qs}` : ""}`);
    },
    
    get(id: string) {
        return apiFetch<Tour>(`/api/tours/${id}`);
    },
    
    create(input: TourInput) {
        return apiFetch<Tour>("/api/tours", {
        method: "POST",
        body: JSON.stringify(input),
        });
    },
    
    update(id: string, input: Partial<TourInput>) {
        return apiFetch<Tour>(`/api/tours/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
        });
    },
    
    remove(id: string) {
        return apiFetch<{ id: string }>(`/api/tours/${id}`, {
        method: "DELETE",
        });
    },
};