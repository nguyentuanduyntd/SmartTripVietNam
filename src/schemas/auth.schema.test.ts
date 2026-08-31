import {
    describe,
    expect,
    it,
} from "vitest";

import {
    forgotPasswordRequestSchema,
    resetPasswordWithOtpRequestSchema,
    verifyPasswordResetOtpRequestSchema,
} from "@/src/schemas/auth.schema";

describe("forgotPasswordRequestSchema", () => {
    it("chuẩn hóa email trước khi trả dữ liệu", () => {
        const result = forgotPasswordRequestSchema.parse({
            email: "  User@Example.COM  ",
        });

        expect(result).toEqual({
            email: "user@example.com",
        });
    });

    it.each([
        "",
        "user",
        "user@",
        "@example.com",
    ])("từ chối email không hợp lệ: %s", (email) => {
        expect(
            forgotPasswordRequestSchema.safeParse({
                email,
            }).success,
        ).toBe(false);
    });

    it("từ chối trường không thuộc request", () => {
        expect(
            forgotPasswordRequestSchema.safeParse({
                email: "user@example.com",
                role: "admin",
            }).success,
        ).toBe(false);
    });
});

describe("verifyPasswordResetOtpRequestSchema", () => {
    it("chấp nhận và trim OTP gồm đúng 6 chữ số", () => {
        const result = verifyPasswordResetOtpRequestSchema.parse({
            email: "USER@example.com",
            otp: " 012345 ",
        });

        expect(result).toEqual({
            email: "user@example.com",
            otp: "012345",
        });
    });

    it.each([
        "12345",
        "1234567",
        "12a456",
        "12 456",
    ])("từ chối OTP không hợp lệ: %s", (otp) => {
        expect(
            verifyPasswordResetOtpRequestSchema.safeParse({
                email: "user@example.com",
                otp,
            }).success,
        ).toBe(false);
    });
});

describe("resetPasswordWithOtpRequestSchema", () => {
    const validRequest = {
        email: "user@example.com",
        otp: "123456",
        newPassword: "SmartTrip123",
        confirmPassword: "SmartTrip123",
    };

    it("chấp nhận request đặt lại mật khẩu hợp lệ", () => {
        expect(
            resetPasswordWithOtpRequestSchema.parse(
                validRequest,
            ),
        ).toEqual(validRequest);
    });

    it("chấp nhận chữ cái tiếng Việt trong mật khẩu", () => {
        expect(
            resetPasswordWithOtpRequestSchema.safeParse({
                ...validRequest,
                newPassword: "Mậtkhẩu123",
                confirmPassword: "Mậtkhẩu123",
            }).success,
        ).toBe(true);
    });

    it.each([
        "Pass1",
        "PasswordOnly",
        "12345678",
        `${"A".repeat(72)}1`,
    ])("từ chối mật khẩu không đạt yêu cầu", (password) => {
        expect(
            resetPasswordWithOtpRequestSchema.safeParse({
                ...validRequest,
                newPassword: password,
                confirmPassword: password,
            }).success,
        ).toBe(false);
    });

    it("gắn lỗi mật khẩu không khớp vào confirmPassword", () => {
        const result =
            resetPasswordWithOtpRequestSchema.safeParse({
                ...validRequest,
                confirmPassword: "Another123",
            });

        expect(result.success).toBe(false);

        if (!result.success) {
            expect(result.error.issues).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        path: ["confirmPassword"],
                        message:
                            "Mật khẩu xác nhận không khớp",
                    }),
                ]),
            );
        }
    });

    it("từ chối trường dư trong request", () => {
        expect(
            resetPasswordWithOtpRequestSchema.safeParse({
                ...validRequest,
                userId: "550e8400-e29b-41d4-a716-446655440000",
            }).success,
        ).toBe(false);
    });
});