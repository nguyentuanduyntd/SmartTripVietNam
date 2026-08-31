import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

vi.mock("server-only", () => ({}));

import {
    generateOtp,
    hashOtp,
    verifyOtpHash,
} from "@/src/lib/otp";

const originalOtpHashSecret = process.env.OTP_HASH_SECRET;

describe("OTP utilities", () => {
    beforeEach(() => {
        process.env.OTP_HASH_SECRET = "unit-test-secret";
    });

    afterEach(() => {
        if (originalOtpHashSecret === undefined) {
            delete process.env.OTP_HASH_SECRET;
            return;
        }

        process.env.OTP_HASH_SECRET = originalOtpHashSecret;
    });

    describe("generateOtp", () => {
        it("luôn sinh chuỗi gồm đúng 6 chữ số", () => {
            for (let index = 0; index < 100; index += 1) {
                expect(generateOtp()).toMatch(/^\d{6}$/);
            }
        });
    });

    describe("hashOtp", () => {
        it("tạo SHA-256 hash dạng hexadecimal", () => {
            expect(hashOtp("123456")).toMatch(/^[a-f0-9]{64}$/);
        });

        it("trả về cùng hash khi OTP và secret không đổi", () => {
            expect(hashOtp("123456")).toBe(hashOtp("123456"));
        });

        it("tạo hash khác nhau cho OTP khác nhau", () => {
            expect(hashOtp("123456")).not.toBe(hashOtp("654321"));
        });

        it("tạo hash khác nhau khi secret thay đổi", () => {
            const firstHash = hashOtp("123456");

            process.env.OTP_HASH_SECRET =
                "another-unit-test-secret";

            expect(hashOtp("123456")).not.toBe(firstHash);
        });

        it("báo lỗi khi chưa cấu hình OTP_HASH_SECRET", () => {
            delete process.env.OTP_HASH_SECRET;

            expect(() => hashOtp("123456")).toThrow(
                "OTP_HASH_SECRET is not defined",
            );
        });
    });

    describe("verifyOtpHash", () => {
        it("chấp nhận đúng OTP", () => {
            const expectedHash = hashOtp("123456");

            expect(
                verifyOtpHash("123456", expectedHash),
            ).toBe(true);
        });

        it("từ chối OTP không đúng", () => {
            const expectedHash = hashOtp("123456");

            expect(
                verifyOtpHash("654321", expectedHash),
            ).toBe(false);
        });

        it("từ chối expected hash sai độ dài", () => {
            expect(
                verifyOtpHash("123456", "invalid-hash"),
            ).toBe(false);
        });
    });
});