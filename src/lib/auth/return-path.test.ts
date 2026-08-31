import {
    describe,
    expect,
    it,
} from "vitest";

import {
    normalizeReturnPath,
} from "@/src/lib/auth/return-path";

describe("normalizeReturnPath", () => {
    it.each([
        [null, "/"],
        [undefined, "/"],
        ["", "/"],
        ["   ", "/"],
    ])("dùng fallback cho giá trị không hợp lệ: %s", (value, expected) => {
        expect(normalizeReturnPath(value)).toBe(expected);
    });

    it("hỗ trợ fallback tùy chỉnh", () => {
        expect(normalizeReturnPath(null, "/home")).toBe("/home");
    });

    it.each([
        ["/", "/"],
        ["/admin/stats", "/admin/stats"],
        ["  /planner/ai  ", "/planner/ai"],
        ["/destinations?page=2", "/destinations?page=2"],
        ["/community#comments", "/community#comments"],
        [
            "/tours?search=Da%20Nang#results",
            "/tours?search=Da%20Nang#results",
        ],
    ])("giữ đường dẫn nội bộ hợp lệ: %s", (value, expected) => {
        expect(normalizeReturnPath(value)).toBe(expected);
    });

    it("chuẩn hóa các đoạn chấm trong đường dẫn", () => {
        expect(normalizeReturnPath("/admin/../profile")).toBe("/profile");
    });

    it.each([
        "admin/stats",
        "https://evil.example",
        "http://evil.example",
        "//evil.example/path",
        "///evil.example/path",
        "/\\evil.example/path",
        "/admin\n/stats",
        "/admin\t/stats",
    ])("từ chối đường dẫn có nguy cơ open redirect: %s", (value) => {
        expect(normalizeReturnPath(value)).toBe("/");
    });
});