import "server-only";

import {
    cloneCommunitySnapshotToItinerary,
    findCommunityPostSnapshotForClone,
} from "@/src/repositories/community-clone.repository";

import type {
    CloneCommunityItineraryInput,
} from "@/src/schemas/community-clone.schema";

export class CommunityCloneServiceError extends Error {
    constructor(
        message: string,
        public readonly status:
            | 400
            | 404
            | 422,
    ) {
        super(message);

        this.name =
            "CommunityCloneServiceError";
    }
}

function notFound(
    message: string,
): never {
    throw new CommunityCloneServiceError(
        message,
        404,
    );
}

function unprocessable(
    message: string,
): never {
    throw new CommunityCloneServiceError(
        message,
        422,
    );
}

export async function cloneCommunityPostToItineraryService(
    postId: string,
    userId: string,
    request: CloneCommunityItineraryInput,
) {
    const post =
        await findCommunityPostSnapshotForClone(
            postId,
        );

    if (!post) {
        notFound(
            "Không tìm thấy bài chia sẻ",
        );
    }

    if (
        !post.itinerarySnapshot
    ) {
        unprocessable(
            "Bài chia sẻ này không có lịch trình để sử dụng",
        );
    }

    if (
        post.itinerarySnapshot
            .days.length ===
        0
    ) {
        unprocessable(
            "Lịch trình được chia sẻ chưa có dữ liệu ngày",
        );
    }

    return cloneCommunitySnapshotToItinerary(
        {
            postId:
                post.id,

            userId,

            request,

            snapshot:
                post.itinerarySnapshot,

            postTitle:
                post.title,
        },
    );
}