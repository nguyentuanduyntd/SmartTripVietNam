import {
    describe,
    expect,
    it,
} from "vitest";

import {
    AVATAR_ALLOWED_TYPES,
    AVATAR_MAX_SIZE,
    avatarDataSchema,
    avatarFileSchema,
    avatarSuccessResponseSchema,
    updateAvatarRequestSchema,
} from "@/src/schemas/profile_avatar.schema";

function createFile(
    size: number,
    type: string,
    name = "avatar.png",
) {
    return new File([new Uint8Array(size)], name, {
        type,
    });
}

describe("avatarFileSchema", () => {
    it.each(AVATAR_ALLOWED_TYPES)(
        "chấp nhận MIME type %s",
        (type) => {
            expect(
                avatarFileSchema.safeParse(
                    createFile(100, type),
                ).success,
            ).toBe(true);
        },
    );

    it("chấp nhận file đúng bằng giới hạn 5MB", () => {
        expect(
            avatarFileSchema.safeParse(
                createFile(AVATAR_MAX_SIZE, "image/webp"),
            ).success,
        ).toBe(true);
    });

    it("từ chối giá trị không phải File", () => {
        expect(
            avatarFileSchema.safeParse({
                name: "avatar.png",
            }).success,
        ).toBe(false);
    });

    it("từ chối file rỗng", () => {
        expect(
            avatarFileSchema.safeParse(
                createFile(0, "image/png"),
            ).success,
        ).toBe(false);
    });

    it("từ chối file vượt quá 5MB", () => {
        expect(
            avatarFileSchema.safeParse(
                createFile(
                    AVATAR_MAX_SIZE + 1,
                    "image/png",
                ),
            ).success,
        ).toBe(false);
    });

    it.each([
        "image/gif",
        "image/svg+xml",
        "application/pdf",
        "text/plain",
    ])("từ chối MIME type %s", (type) => {
        expect(
            avatarFileSchema.safeParse(
                createFile(100, type),
            ).success,
        ).toBe(false);
    });
});

describe("updateAvatarRequestSchema", () => {
    it("chấp nhận request chứa avatar hợp lệ", () => {
        const avatar = createFile(100, "image/png");

        expect(
            updateAvatarRequestSchema.parse({ avatar }),
        ).toEqual({ avatar });
    });

    it("từ chối thiếu avatar và trường dư", () => {
        expect(
            updateAvatarRequestSchema.safeParse({}).success,
        ).toBe(false);
        expect(
            updateAvatarRequestSchema.safeParse({
                avatar: createFile(100, "image/png"),
                unknown: true,
            }).success,
        ).toBe(false);
    });
});

describe("avatar response schemas", () => {
    it("xác thực avatar data có URL", () => {
        expect(
            avatarDataSchema.parse({
                avatarUrl: "https://example.com/avatar.webp",
                avatarPublicId: "profiles/user-1",
            }),
        ).toEqual({
            avatarUrl: "https://example.com/avatar.webp",
            avatarPublicId: "profiles/user-1",
        });
    });

    it("chấp nhận dữ liệu avatar null sau khi xóa", () => {
        expect(
            avatarDataSchema.safeParse({
                avatarUrl: null,
                avatarPublicId: null,
            }).success,
        ).toBe(true);
    });

    it("từ chối avatar URL sai định dạng", () => {
        expect(
            avatarDataSchema.safeParse({
                avatarUrl: "not-a-url",
                avatarPublicId: "profiles/user-1",
            }).success,
        ).toBe(false);
    });

    it("xác thực success response", () => {
        expect(
            avatarSuccessResponseSchema.safeParse({
                success: true,
                message: "Cập nhật avatar thành công",
                data: {
                    avatarUrl:
                        "https://example.com/avatar.webp",
                    avatarPublicId: "profiles/user-1",
                },
            }).success,
        ).toBe(true);
        expect(
            avatarSuccessResponseSchema.safeParse({
                success: false,
                message: "Lỗi",
                data: {
                    avatarUrl: null,
                    avatarPublicId: null,
                },
            }).success,
        ).toBe(false);
    });
});
