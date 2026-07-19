import { apiFetch } from "@/src/lib/api-client/http";

export type Location = {
  id: string;
  name: string;
  slug: string;
};

export const locationsApi = {
  list() {
    return apiFetch<Location[]>("/api/locations");
  },
};