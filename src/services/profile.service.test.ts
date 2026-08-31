import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/src/repositories/profile.repository", () => ({
    clearProfileAvatar: vi.fn(),
    findProfileById: vi.fn(),
    updateProfileAvatar: vi.fn(),
}));
vi.mock("@/src/services/image.service", () => ({
    CLOUDINARY_FOLDERS: {
        profiles: "smart-trip-vietnam/profiles",
    },
    deleteImage: vi.fn(),
    uploadImage: vi.fn(),
}));

import {
    clearProfileAvatar,
    findProfileById,
    updateProfileAvatar,
} from "@/src/repositories/profile.repository";
import {
    deleteImage,
    uploadImage,
} from "@/src/services/image.service";
import {
    ProfileNotFoundError,
    removeProfileAvatar,
    replaceProfileAvatar,
} from "@/src/services/profile.service";

const mockedFindProfile = vi.mocked(findProfileById);
const mockedUpdateAvatar = vi.mocked(updateProfileAvatar);
const mockedClearAvatar = vi.mocked(clearProfileAvatar);
const mockedUploadImage = vi.mocked(uploadImage);
const mockedDeleteImage = vi.mocked(deleteImage);

const USER_ID =
    "550e8400-e29b-41d4-a716-446655440220";
const OLD_PUBLIC_ID = "profiles/old-avatar";
const NEW_PUBLIC_ID = "profiles/new-avatar";
const NEW_URL = "https://example.com/new-avatar.webp";

const file = new File(
    [new Uint8Array([1, 2, 3])],
    "avatar.png",
    {
        type: "image/png",
    },
);

function createProfile(avatarPublicId: string | null = null) {
    return {
        id: USER_ID,
        fullName: "Nguyễn Văn A",
        avatarUrl:
            avatarPublicId === null
                ? null
                : "https://example.com/old-avatar.webp",
        avatarPublicId,
    };
}

describe("ProfileNotFoundError", () => {
    it("có đúng loại và thông báo lỗi", () => {
        const error = new ProfileNotFoundError();

        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe("ProfileNotFoundError");
        expect(error.message).toBe(
            "Không tìm thấy hồ sơ người dùng",
        );
    });
});

describe("replaceProfileAvatar", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(Date, "now").mockReturnValue(1_787_961_600_000);

        mockedFindProfile.mockResolvedValue(createProfile());
        mockedUploadImage.mockResolvedValue({
            url: NEW_URL,
            publicId: NEW_PUBLIC_ID,
            width: 400,
            height: 400,
            format: "webp",
            bytes: 1234,
        });
        mockedUpdateAvatar.mockResolvedValue({
            id: USER_ID,
            avatarUrl: NEW_URL,
            avatarPublicId: NEW_PUBLIC_ID,
        });
        mockedDeleteImage.mockResolvedValue();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("từ chối khi profile không tồn tại", async () => {
        mockedFindProfile.mockResolvedValueOnce(null as never);

        await expect(
            replaceProfileAvatar(USER_ID, file),
        ).rejects.toBeInstanceOf(ProfileNotFoundError);
        expect(mockedUploadImage).not.toHaveBeenCalled();
    });

    it("upload, cập nhật DB và trả avatar mới", async () => {
        await expect(
            replaceProfileAvatar(USER_ID, file),
        ).resolves.toEqual({
            avatarUrl: NEW_URL,
            avatarPublicId: NEW_PUBLIC_ID,
        });

        expect(mockedUploadImage).toHaveBeenCalledWith(file, {
            folder: "smart-trip-vietnam/profiles",
            publicId: `user-${USER_ID}-1787961600000`,
            transformation: [
                {
                    width: 400,
                    height: 400,
                    crop: "fill",
                    gravity: "auto",
                },
                {
                    quality: "auto",
                    fetch_format: "auto",
                },
            ],
        });
        expect(mockedUpdateAvatar).toHaveBeenCalledWith(USER_ID, {
            url: NEW_URL,
            publicId: NEW_PUBLIC_ID,
        });
        expect(mockedDeleteImage).not.toHaveBeenCalled();
    });

    it("xóa avatar cũ sau khi cập nhật thành công", async () => {
        mockedFindProfile.mockResolvedValueOnce(
            createProfile(OLD_PUBLIC_ID),
        );

        await replaceProfileAvatar(USER_ID, file);

        expect(mockedDeleteImage).toHaveBeenCalledWith(
            OLD_PUBLIC_ID,
        );
    });

    it("không xóa nếu publicId cũ trùng ảnh mới", async () => {
        mockedFindProfile.mockResolvedValueOnce(
            createProfile(NEW_PUBLIC_ID),
        );

        await replaceProfileAvatar(USER_ID, file);

        expect(mockedDeleteImage).not.toHaveBeenCalled();
    });

    it("rollback ảnh mới khi DB không còn profile", async () => {
        mockedUpdateAvatar.mockResolvedValueOnce(null as never);

        await expect(
            replaceProfileAvatar(USER_ID, file),
        ).rejects.toBeInstanceOf(ProfileNotFoundError);
        expect(mockedDeleteImage).toHaveBeenCalledWith(
            NEW_PUBLIC_ID,
        );
    });

    it("rollback ảnh mới và truyền lỗi cập nhật DB", async () => {
        const error = new Error("Database unavailable");
        mockedUpdateAvatar.mockRejectedValueOnce(error);

        await expect(
            replaceProfileAvatar(USER_ID, file),
        ).rejects.toBe(error);
        expect(mockedDeleteImage).toHaveBeenCalledWith(
            NEW_PUBLIC_ID,
        );
    });

    it("giữ lỗi DB gốc khi rollback Cloudinary cũng lỗi", async () => {
        const databaseError = new Error("Database unavailable");
        const rollbackError = new Error("Cloudinary unavailable");
        const consoleError = vi
            .spyOn(console, "error")
            .mockImplementation(() => undefined);

        mockedUpdateAvatar.mockRejectedValueOnce(databaseError);
        mockedDeleteImage.mockRejectedValueOnce(rollbackError);

        await expect(
            replaceProfileAvatar(USER_ID, file),
        ).rejects.toBe(databaseError);
        expect(consoleError).toHaveBeenCalledWith(
            "Không thể rollback ảnh Cloudinary:",
            rollbackError,
        );
    });

    it("không làm hỏng response nếu xóa avatar cũ thất bại", async () => {
        const deleteError = new Error("Cloudinary unavailable");
        const consoleError = vi
            .spyOn(console, "error")
            .mockImplementation(() => undefined);

        mockedFindProfile.mockResolvedValueOnce(
            createProfile(OLD_PUBLIC_ID),
        );
        mockedDeleteImage.mockRejectedValueOnce(deleteError);

        await expect(
            replaceProfileAvatar(USER_ID, file),
        ).resolves.toEqual({
            avatarUrl: NEW_URL,
            avatarPublicId: NEW_PUBLIC_ID,
        });
        expect(consoleError).toHaveBeenCalledWith(
            "Không thể xóa avatar cũ trên Cloudinary: ",
            deleteError,
        );
    });
});

describe("removeProfileAvatar", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedFindProfile.mockResolvedValue(
            createProfile(OLD_PUBLIC_ID),
        );
        mockedDeleteImage.mockResolvedValue();
        mockedClearAvatar.mockResolvedValue({
            id: USER_ID,
            avatarUrl: null,
            avatarPublicId: null,
        });
    });

    it("từ chối khi profile không tồn tại", async () => {
        mockedFindProfile.mockResolvedValueOnce(null as never);

        await expect(
            removeProfileAvatar(USER_ID),
        ).rejects.toBeInstanceOf(ProfileNotFoundError);
        expect(mockedDeleteImage).not.toHaveBeenCalled();
        expect(mockedClearAvatar).not.toHaveBeenCalled();
    });

    it("trả null ngay khi profile chưa có avatar", async () => {
        mockedFindProfile.mockResolvedValueOnce(createProfile());

        await expect(
            removeProfileAvatar(USER_ID),
        ).resolves.toEqual({
            avatarUrl: null,
            avatarPublicId: null,
        });
        expect(mockedDeleteImage).not.toHaveBeenCalled();
        expect(mockedClearAvatar).not.toHaveBeenCalled();
    });

    it("xóa ảnh Cloudinary rồi xóa dữ liệu avatar trong DB", async () => {
        await expect(
            removeProfileAvatar(USER_ID),
        ).resolves.toEqual({
            avatarUrl: null,
            avatarPublicId: null,
        });

        expect(mockedDeleteImage).toHaveBeenCalledWith(
            OLD_PUBLIC_ID,
        );
        expect(mockedClearAvatar).toHaveBeenCalledWith(USER_ID);
        expect(
            mockedDeleteImage.mock.invocationCallOrder[0],
        ).toBeLessThan(
            mockedClearAvatar.mock.invocationCallOrder[0] ?? 0,
        );
    });

    it("báo lỗi khi profile biến mất lúc cập nhật DB", async () => {
        mockedClearAvatar.mockResolvedValueOnce(null as never);

        await expect(
            removeProfileAvatar(USER_ID),
        ).rejects.toBeInstanceOf(ProfileNotFoundError);
    });

    it("không xóa DB nếu xóa Cloudinary thất bại", async () => {
        const error = new Error("Cloudinary unavailable");
        mockedDeleteImage.mockRejectedValueOnce(error);

        await expect(
            removeProfileAvatar(USER_ID),
        ).rejects.toBe(error);
        expect(mockedClearAvatar).not.toHaveBeenCalled();
    });
});
