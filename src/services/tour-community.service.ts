import "server-only";

import { findTourById } from "@/src/repositories/tour.repository";

import {
    createTourComment,
    createTourLike,
    deleteTourLike,
    findTourCommentById,
    findTourCommunity,
    softDeleteTourComment,
    updateTourComment,
} from "@/src/repositories/tour-community.repository";

export class TourCommunityServiceError extends Error {
    constructor(
        message: string,
        public readonly status:
            | 400
            | 403
            | 404,
    ) {
        super(message);

        this.name =
            "TourCommunityServiceError";
    }
}

function badRequest(message: string): never {
    throw new TourCommunityServiceError(
        message,
        400,
    );
}

function forbidden(message: string): never {
    throw new TourCommunityServiceError(
        message,
        403,
    );
}

function notFound(message: string): never {
    throw new TourCommunityServiceError(
        message,
        404,
    );
}

/**
 * Chỉ cho phép tương tác cộng đồng
 * với tour đã public.
 */
async function ensurePublishedTour(
    tourId: string,
) {
    const tour =
        await findTourById(tourId);

    if (
        !tour ||
        tour.status !== "published"
    ) {
        notFound(
            "Không tìm thấy tour",
        );
    }

    return tour;
}

/* -------------------------------------------------------------------------- */
/* Community                                                                  */
/* -------------------------------------------------------------------------- */

export async function getTourCommunityService(
    tourId: string,
    currentUserId: string | null,
) {
    await ensurePublishedTour(tourId);

    const community =
        await findTourCommunity(
            tourId,
            currentUserId,
        );

    return {
        ...community,
        currentUserId,
    };
}

/* -------------------------------------------------------------------------- */
/* Like                                                                       */
/* -------------------------------------------------------------------------- */

export async function setTourLikeService(
    tourId: string,
    userId: string,
    liked: boolean,
) {
    await ensurePublishedTour(tourId);

    if (liked) {
        await createTourLike(
            tourId,
            userId,
        );
    } else {
        await deleteTourLike(
            tourId,
            userId,
        );
    }

    return {
        tourId,
        liked,
    };
}

/* -------------------------------------------------------------------------- */
/* Comments                                                                   */
/* -------------------------------------------------------------------------- */

export async function createTourCommentService(
    tourId: string,
    userId: string,
    content: string,
) {
    await ensurePublishedTour(tourId);

    const normalizedContent =
        content.trim();

    if (!normalizedContent) {
        badRequest(
            "Vui lòng nhập nội dung nhận xét",
        );
    }

    const comment =
        await createTourComment(
            tourId,
            userId,
            normalizedContent,
        );

    if (!comment) {
        throw new Error(
            "Không thể tạo nhận xét",
        );
    }

    return comment;
}

async function requireOwnedComment(
    commentId: string,
    userId: string,
) {
    const comment =
        await findTourCommentById(
            commentId,
        );

    if (
        !comment ||
        comment.deletedAt
    ) {
        notFound(
            "Không tìm thấy nhận xét",
        );
    }

    if (comment.userId !== userId) {
        forbidden(
            "Bạn không có quyền chỉnh sửa nhận xét này",
        );
    }

    return comment;
}

export async function updateTourCommentService(
    commentId: string,
    userId: string,
    content: string,
) {
    const comment =
        await requireOwnedComment(
            commentId,
            userId,
        );

    await ensurePublishedTour(
        comment.tourId,
    );

    const normalizedContent =
        content.trim();

    if (!normalizedContent) {
        badRequest(
            "Vui lòng nhập nội dung nhận xét",
        );
    }

    const updated =
        await updateTourComment(
            commentId,
            normalizedContent,
        );

    if (!updated) {
        notFound(
            "Không tìm thấy nhận xét",
        );
    }

    return updated;
}

export async function deleteTourCommentService(
    commentId: string,
    userId: string,
) {
    const comment =
        await requireOwnedComment(
            commentId,
            userId,
        );

    await ensurePublishedTour(
        comment.tourId,
    );

    const deleted =
        await softDeleteTourComment(
            commentId,
        );

    if (!deleted) {
        notFound(
            "Không tìm thấy nhận xét",
        );
    }

    return deleted;
}