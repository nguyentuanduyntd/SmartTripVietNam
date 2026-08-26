import "server-only";

import {
    deleteStoryPermanently,
    listStoriesForAdmin,
} from "@/src/repositories/admin-story.repository";
import type {
    AdminStoryListQuery,
    DeleteAdminStoryInput,
} from "@/src/schemas/admin-story.schema";
import { deleteImage } from "@/src/services/image.service";

export class AdminStoryError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly code: string,
    ) {
        super(message);
        this.name = "AdminStoryError";
    }
}

export async function getStoriesForAdmin(
    input: AdminStoryListQuery,
) {
    return listStoriesForAdmin(input);
}

export async function removeStoryAsAdmin(
    adminId: string,
    storyId: string,
    input: DeleteAdminStoryInput,
) {
    const deleted = await deleteStoryPermanently(
        storyId,
        adminId,
        input.reason,
    );

    if (!deleted) {
        throw new AdminStoryError(
            "Không tìm thấy story hoặc story đã bị xóa",
            404,
            "STORY_NOT_FOUND",
        );
    }

    const cleanupResults = await Promise.allSettled(
        deleted.imagePublicIds.map((publicId) => deleteImage(publicId)),
    );

    const failedImageCount = cleanupResults.filter(
        (result) => result.status === "rejected",
    ).length;

    if (failedImageCount > 0) {
        console.error(
            `[ADMIN STORY DELETE] Đã xóa story ${storyId} nhưng không dọn được ${failedImageCount} ảnh Cloudinary`,
        );
    }

    return {
        id: deleted.id,
        title: deleted.title,
        notifiedUserId: deleted.authorId,
        failedImageCount,
    };
}