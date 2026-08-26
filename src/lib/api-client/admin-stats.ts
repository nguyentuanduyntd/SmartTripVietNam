import { apiFetch } from "@/src/lib/api-client/http";

export type MonthlyComparison = {
    current: number;
    previous: number;
    changePercent: number;
};

export type AdminStatsData = {
    month: string;
    previousMonth: string;
    totals: {
        destinations: number;
        cuisines: number;
        stories: number;
        users: number;
    };
    monthly: {
        destinations: MonthlyComparison;
        cuisines: MonthlyComparison;
        stories: MonthlyComparison;
        users: MonthlyComparison;
        activeAuthors: MonthlyComparison;
    };
    timelines: {
        users: Array<{ date: string; day: number; value: number }>;
        stories: Array<{ date: string; day: number; value: number }>;
    };
    topDestinations: Array<{
        id: string;
        name: string;
        mentions: number;
    }>;
    mostReportedStories: Array<{
        id: string;
        title: string | null;
        authorName: string | null;
        reports: number;
    }>;
    statusDistribution: Array<{
        status: "pending" | "approved" | "hidden";
        value: number;
    }>;
};

export const adminStatsApi = {
    get(month: string) {
        const search = new URLSearchParams({ month });
        return apiFetch<AdminStatsData>(`/api/admin/stats?${search}`, {
            cache: "no-store",
        });
    },
};
