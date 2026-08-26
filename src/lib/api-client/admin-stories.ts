import { apiFetch } from "@/src/lib/api-client/http";

export type AdminStoryStatus = "pending" | "approved" | "hidden";
export type AdminStoryListStatus = AdminStoryStatus | "all";

export type AdminStoryRow = {
    id: string;
    title: string | null;
    content: string;
    rating: number | null;
    status: AdminStoryStatus;
    locationId: string | null;
    locationName: string | null;
    createdAt: string;
    updatedAt: string;
    author: {
        id: string;
        fullName: string | null;
        avatarUrl: string | null;
    };
    coverImageUrl: string | null;
    likeCount: number;
    commentCount: number;
    saveCount: number;
    reportCount: number;
};

export type AdminStoryListData = {
    rows: AdminStoryRow[];
    locations: Array<{ id: string; name: string }>;
    counts: Record<AdminStoryListStatus, number>;
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
};

export const adminStoriesApi = {
    list(params: {
        query?: string;
        status?: AdminStoryListStatus;
        locationId?: string;
        page?: number;
        pageSize?: number;
    }) {
        const search = new URLSearchParams();

        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== "") {
                search.set(key, String(value));
            }
        }

        return apiFetch<AdminStoryListData>(
            `/api/admin/stories?${search.toString()}`,
            { cache: "no-store" },
        );
    },

    delete(storyId: string, reason: string) {
        return apiFetch<{
            id: string;
            title: string | null;
            notifiedUserId: string;
            failedImageCount: number;
        }>(`/api/admin/stories/${storyId}`, {
            method: "DELETE",
            body: JSON.stringify({ reason }),
        });
    },
};