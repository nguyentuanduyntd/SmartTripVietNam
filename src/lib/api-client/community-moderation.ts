import {
    apiFetch,
} from "@/src/lib/api-client/http";

export type CommunityModerationStatus =
    | "pending"
    | "resolved"
    | "dismissed";

export type CommunityModerationListStatus =
    | CommunityModerationStatus
    | "all";

export type CommunityModerationAction =
    | "resolve"
    | "dismiss";

export type CommunityModerationProfile = {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
};

export type CommunityModerationTarget = {
    type: "post" | "comment";
    id: string;
    postId: string;
    title: string | null;
    content: string;
    status: "pending" | "approved" | "hidden";
    deletedAt: string | null;
    author: CommunityModerationProfile | null;
};

export type CommunityModerationReport = {
    id: string;
    reason:
        | "spam"
        | "harassment"
        | "hate_speech"
        | "inappropriate_content"
        | "misinformation"
        | "other";
    details: string | null;
    status: CommunityModerationStatus;
    reviewNote: string | null;
    createdAt: string;
    updatedAt: string;
    reviewedAt: string | null;
    reporter: CommunityModerationProfile;
    reviewer: CommunityModerationProfile | null;
    target: CommunityModerationTarget | null;
};

export type CommunityModerationListData = {
    rows: CommunityModerationReport[];
    total: number;
    counts: {
        pending: number;
        resolved: number;
        dismissed: number;
    };
    page: number;
    pageSize: number;
    pageCount: number;
};

export type ModerateCommunityReportResult =
    | {
          action: "dismiss";
          id: string;
          status: "dismissed";
          reviewedAt: string | null;
      }
    | {
          action: "resolve";
          id: string;
          status: "resolved";
          targetType: "post" | "comment";
          targetId: string;
          resolvedReportCount: number;
          reviewedAt: string;
      };

function buildQuery(
    params: {
        status?: CommunityModerationListStatus;
        page?: number;
        pageSize?: number;
    },
) {
    const search =
        new URLSearchParams();

    if (params.status) {
        search.set(
            "status",
            params.status,
        );
    }

    if (params.page) {
        search.set(
            "page",
            String(params.page),
        );
    }

    if (params.pageSize) {
        search.set(
            "pageSize",
            String(params.pageSize),
        );
    }

    return search.toString();
}

export const communityModerationApi = {
    list(
        params: {
            status?: CommunityModerationListStatus;
            page?: number;
            pageSize?: number;
        } = {},
    ) {
        const query =
            buildQuery(params);

        return apiFetch<CommunityModerationListData>(
            `/api/admin/community/reports${
                query ? `?${query}` : ""
            }`,
            {
                cache: "no-store",
            },
        );
    },

    moderate(
        reportId: string,
        input: {
            action: CommunityModerationAction;
            reviewNote?: string;
        },
    ) {
        return apiFetch<ModerateCommunityReportResult>(
            `/api/admin/community/reports/${reportId}`,
            {
                method: "PATCH",
                body: JSON.stringify(input),
            },
        );
    },
};