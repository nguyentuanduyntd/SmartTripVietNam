import {
    describe,
    expect,
    it,
} from "vitest";

import {
    formatDuration,
    formatOptionalVnd,
    formatQuantity,
    formatRelativeTime,
    formatTime,
    formatVietnameseDate,
    formatVietnameseDateTime,
    formatVnd,
    toFiniteNumber,
} from "@/src/lib/formatters";

const vndFormatter = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
});

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
});

describe("formatters", () => {
    describe("toFiniteNumber", () => {
        it.each([
            [0, 0],
            [-10, -10],
            ["123.5", 123.5],
            [" 42 ", 42],
        ])("chuyển %s thành số hữu hạn", (value, expected) => {
            expect(toFiniteNumber(value)).toBe(expected);
        });

        it.each([
            null,
            undefined,
            "",
            "   ",
            "không phải số",
            Number.NaN,
            Number.POSITIVE_INFINITY,
        ])("trả null cho giá trị không hợp lệ: %s", (value) => {
            expect(toFiniteNumber(value)).toBeNull();
        });
    });

    describe("định dạng tiền và số lượng", () => {
        it("định dạng VND", () => {
            expect(formatVnd(1234567)).toBe(
                vndFormatter.format(1234567),
            );
            expect(formatVnd("500000")).toBe(
                vndFormatter.format(500000),
            );
        });

        it("dùng fallback khi giá tiền không hợp lệ", () => {
            expect(formatVnd(null)).toBe("—");
            expect(
                formatVnd("không hợp lệ", "Chưa có giá"),
            ).toBe("Chưa có giá");
        });

        it("formatOptionalVnd trả null thay vì fallback", () => {
            expect(formatOptionalVnd(undefined)).toBeNull();
            expect(formatOptionalVnd(100000)).toBe(
                vndFormatter.format(100000),
            );
        });

        it("định dạng quantity với số chữ số thập phân tùy chỉnh", () => {
            expect(formatQuantity(1234.567)).toBe(
                new Intl.NumberFormat("vi-VN", {
                    maximumFractionDigits: 2,
                }).format(1234.567),
            );
            expect(formatQuantity(1234.567, "0", 1)).toBe(
                new Intl.NumberFormat("vi-VN", {
                    maximumFractionDigits: 1,
                }).format(1234.567),
            );
            expect(
                formatQuantity("không hợp lệ", "N/A"),
            ).toBe("N/A");
        });
    });

    describe("định dạng ngày giờ", () => {
        it("giữ đúng ngày với chuỗi YYYY-MM-DD", () => {
            expect(formatVietnameseDate("2026-08-29")).toBe(
                "29/08/2026",
            );
        });

        it("chuyển timestamp sang múi giờ Việt Nam", () => {
            const value = "2026-08-28T18:30:00.000Z";

            expect(formatVietnameseDate(value)).toBe(
                dateFormatter.format(new Date(value)),
            );
            expect(formatVietnameseDate(value)).toBe(
                "29/08/2026",
            );
        });

        it("hỗ trợ Date object và fallback cho ngày lỗi", () => {
            const value = new Date("2026-08-29T01:00:00.000Z");

            expect(formatVietnameseDate(value)).toBe(
                dateFormatter.format(value),
            );
            expect(formatVietnameseDate(null)).toBe("—");
            expect(
                formatVietnameseDate("invalid-date", "N/A"),
            ).toBe("N/A");
        });

        it("định dạng ngày và giờ theo múi giờ Việt Nam", () => {
            const value = "2026-08-29T01:30:00.000Z";
            const dateValue = new Date(value);

            expect(formatVietnameseDateTime(value)).toBe(
                dateTimeFormatter.format(dateValue),
            );
            expect(formatVietnameseDateTime(dateValue)).toBe(
                dateTimeFormatter.format(dateValue),
            );
            expect(formatVietnameseDateTime(null)).toBe("—");
            expect(
                formatVietnameseDateTime("invalid-date", "N/A"),
            ).toBe("N/A");
        });
    });

    describe("formatRelativeTime", () => {
        const now = Date.parse("2026-08-29T12:00:00.000Z");

        it.each([
            ["2026-08-29T11:59:30.000Z", "Vừa xong"],
            ["2026-08-29T12:05:00.000Z", "Vừa xong"],
            ["2026-08-29T11:55:00.000Z", "5 phút trước"],
            ["2026-08-29T10:00:00.000Z", "2 giờ trước"],
            ["2026-08-26T12:00:00.000Z", "3 ngày trước"],
        ])("định dạng %s thành %s", (value, expected) => {
            expect(formatRelativeTime(value, now)).toBe(expected);
        });

        it("hiển thị ngày đầy đủ khi đã qua ít nhất 7 ngày", () => {
            const value = new Date("2026-08-20T12:00:00.000Z");

            expect(formatRelativeTime(value, now)).toBe(
                formatVietnameseDate(value),
            );
        });

        it("trả fallback cho giá trị rỗng hoặc ngày lỗi", () => {
            expect(formatRelativeTime(null, now)).toBe("—");
            expect(formatRelativeTime("invalid-date", now)).toBe("—");
        });
    });

    it("định dạng số ngày và đêm", () => {
        expect(formatDuration(3, 2)).toBe("3 ngày 2 đêm");
        expect(formatDuration(1, 0)).toBe("1 ngày");
    });

    it("rút gọn thời gian về HH:mm", () => {
        expect(formatTime("08:30:00")).toBe("08:30");
        expect(formatTime("19:45")).toBe("19:45");
        expect(formatTime(null)).toBeNull();
        expect(formatTime(undefined)).toBeNull();
    });
});
