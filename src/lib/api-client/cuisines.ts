import { apiFetch, apiFetchPaginated } from "./http";

export type CuisineDestination = {
    id: string;
    name: string;
    slug: string;
};

export type Cuisine = {
    id: string;
    name: string;
    nameEn: string | null;
    slug: string;
    description: string | null;
    descriptionEn: string | null;
    avgPrice: number | null;
    coverImageUrl: string | null;
    coverImagePublicId: string | null;
    updatedAt: string;
    destinations: CuisineDestination[];
};

export type CuisineListParams = {
    page?: number;
    limit?: number;
    search?: string;
    destinationId?: string;
};

export type CuisineInput = {
    name: string;
    nameEn?: string | null;
    slug?: string;
    description?: string | null;
    descriptionEn?: string | null;
    avgPrice?: number | null;
    destinationIds?: string[];
    coverImageUrl?: string | null;
    coverImagePublicId?: string | null;
};

function toQueryString(params: CuisineListParams) {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.search) query.set("search", params.search);
    if (params.destinationId) query.set("destinationId", params.destinationId);
    return query.toString();
}

export const cuisinesApi = {
    list(params: CuisineListParams = {}) {
        const qs = toQueryString(params);
        return apiFetchPaginated<Cuisine[]>(`/api/cuisines${qs ? `?${qs}` : ""}`);
    },

    get(id: string) {
        return apiFetch<Cuisine>(`/api/cuisines/${id}`);
    },

    create(input: CuisineInput) {
        return apiFetch<Cuisine>("/api/cuisines", {
        method: "POST",
        body: JSON.stringify(input),
        });
    },

    update(id: string, input: Partial<CuisineInput>) {
        return apiFetch<Cuisine>(`/api/cuisines/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
        });
    },

    remove(id: string) {
        return apiFetch<{ id: string }>(`/api/cuisines/${id}`, {
        method: "DELETE",
        });
    },
};