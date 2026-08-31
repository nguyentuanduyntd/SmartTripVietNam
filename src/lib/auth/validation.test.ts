import {
    describe,
    expect,
    it,
} from "vitest";

import {
    getPasswordChecks,
    isValidEmail,
    isValidPassword,
} from "@/src/lib/auth/validation";

describe("isValidEmail", () => {
    it.each([
        "user@example.com",
        "travel.user+test@example.com",
        "duy.nguyen@smarttrip.vn",
    ])("chấp nhận email hợp lệ: %s", (email) => {
        expect(isValidEmail(email)).toBe(true);
    });

    it.each([
        "",
        "user",
        "user@",
        "@example.com",
        "user@example",
        "user @example.com",
        "user@example .com",
    ])("từ chối email không hợp lệ: %s", (email) => {
        expect(isValidEmail(email)).toBe(false);
    });
});

describe("getPasswordChecks", () => {
    it("đánh dấu đầy đủ điều kiện của mật khẩu hợp lệ", () => {
        expect(
            getPasswordChecks("SmartTrip123"),
        ).toEqual({
            length: true,
            letter: true,
            number: true,
        });
    });

    it("hỗ trợ chữ cái tiếng Việt", () => {
        expect(
            getPasswordChecks("Mậtkhẩu123"),
        ).toEqual({
            length: true,
            letter: true,
            number: true,
        });
    });

    it("xác định riêng từng điều kiện chưa đạt", () => {
        expect(
            getPasswordChecks("12345678"),
        ).toEqual({
            length: true,
            letter: false,
            number: true,
        });

        expect(
            getPasswordChecks("Password"),
        ).toEqual({
            length: true,
            letter: true,
            number: false,
        });

        expect(
            getPasswordChecks("Pass1"),
        ).toEqual({
            length: false,
            letter: true,
            number: true,
        });
    });
});

describe("isValidPassword", () => {
    it.each([
        "SmartTrip123",
        "Mậtkhẩu123",
        "Abcdefg1",
    ])("chấp nhận mật khẩu hợp lệ: %s", (password) => {
        expect(isValidPassword(password)).toBe(true);
    });

    it.each([
        "",
        "Pass1",
        "Password",
        "12345678",
    ])("từ chối mật khẩu thiếu điều kiện: %s", (password) => {
        expect(isValidPassword(password)).toBe(false);
    });
});