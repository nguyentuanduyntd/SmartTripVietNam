import { apiFetch, apiFetchPaginated } from "./http";

export type DestinationCategory = {
    id: string;
    name: string;
};

export type Destination = {
    id: string;
    locationId: string;
    name: string;
    nameEn: string | null;
    slug: string;
    address: string | null;
    description: string | null;
    latitude: number | null;
    longitude: number | null;
    coverImageUrl: string | null;
    updatedAt: string;
    categories: DestinationCategory[];
};

export type DestinationListParams = {
  page?: number;
  limit?: number;
  search?: string;
  locationId?: string;
  categoryId?: string;
};

export type DestinationInput = {
  locationId: string;
  name: string;
  nameEn?: string | null;
  slug?: string;
  address?: string | null;
  description?: string | null;
  categoryIds?: string[];
};

function toQueryString(params: DestinationListParams) {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  if (params.locationId) query.set("locationId", params.locationId);
  if (params.categoryId) query.set("categoryId", params.categoryId);
  return query.toString();
}

export const destinationsApi = {
  list(params: DestinationListParams = {}) {
    const qs = toQueryString(params);
    return apiFetchPaginated<Destination[]>(`/api/destinations${qs ? `?${qs}` : ""}`);
  },

  get(id: string) {
    return apiFetch<Destination>(`/api/destinations/${id}`);
  },

  create(input: DestinationInput) {
    return apiFetch<Destination>("/api/destinations", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  update(id: string, input: Partial<DestinationInput>) {
    return apiFetch<Destination>(`/api/destinations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  remove(id: string) {
    return apiFetch<{ id: string }>(`/api/destinations/${id}`, {
      method: "DELETE",
    });
  },
};