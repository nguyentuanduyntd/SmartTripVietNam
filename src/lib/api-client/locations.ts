import { apiFetch } from "@/src/lib/api-client/http";

export type Location = {
    id: string;

    name: string;
    nameEn: string | null;

    slug: string;

    description: string | null;
    descriptionEn: string | null;

    createdAt: string;
    updatedAt: string;
};

export const locationsApi = {
    list() {
        return apiFetch<Location[]>(
            "/api/locations",
        );
    },
};