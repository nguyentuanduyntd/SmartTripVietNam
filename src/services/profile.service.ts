import "server-only";

import {
    clearProfileAvatar,
    findProfileById,
    saveProfileBasics,
    updateProfileAvatar,
} from "@/src/repositories/profile.repository";
import type { UpdateProfileInput } from "@/src/schemas/profile.schema";
import {
    CLOUDINARY_FOLDERS,
    deleteImage,
    uploadImage,
} from "@/src/services/image.service";

export class ProfileNotFoundError extends Error {
    constructor() {
        super("Không tìm thấy hồ sơ người dùng");
        this.name = "ProfileNotFoundError";
    }
}

export async function updateProfileBasics(
    userId: string,
    input: UpdateProfileInput,
) {
    const profile =
        await saveProfileBasics(
            userId,
            input,
        );

    if (!profile) {
        throw new ProfileNotFoundError();
    }

    return profile;
}

export async function replaceProfileAvatar(
    userId: string,
    file: File,
) {
    const profile = await findProfileById(userId);

    const uploadedImage = await uploadImage(file, {
        folder: CLOUDINARY_FOLDERS.profiles,
        publicId: `user-${userId}-${Date.now()}`,
        transformation: [{
            width: 400,
            height: 400,
            crop: "fill",
            gravity: "auto",
        },{
            quality: "auto",
            fetch_format: "auto",
            },
        ],
    });
    try {
        const updatedProfile = await updateProfileAvatar(userId, {
            url: uploadedImage.url,
            publicId: uploadedImage.publicId,
        });

        if (!updatedProfile) {
            throw new ProfileNotFoundError();
        }

    } catch (error) {
        // Database lỗi thì xóa ảnh vừa upload để tránh ảnh rác.
        await deleteImage(
            uploadedImage.publicId,
        ).catch((deleteError) => {
            console.error(
                "Không thể rollback ảnh Cloudinary:",
                deleteError,
            );
        });
        throw error;
    }

    if (
        profile?.avatarPublicId &&
        profile.avatarPublicId !==
            uploadedImage.publicId
    ) {
        await deleteImage(
            profile.avatarPublicId,
        ).catch((error) => {
            console.error(
                "Không thể xóa avatar cũ trên Cloudinary: ",
                error,
            );
        });
    }

    return {
        avatarUrl: uploadedImage.url,
        avatarPublicId: uploadedImage.publicId,
    };
}

export async function removeProfileAvatar(
    userId: string,
) {
    const profile = await findProfileById(userId);

    if (!profile?.avatarPublicId) {
        return {
            avatarUrl: null,
            avatarPublicId: null,
        };
    }

    await deleteImage(profile.avatarPublicId);
    const updatedProfile = await clearProfileAvatar(userId);

    if (!updatedProfile) {
        throw new ProfileNotFoundError();
    }

    return {
        avatarUrl: null,
        avatarPublicId: null,
    };
}
