import {
    describe,
    expect,
    it,
} from "vitest";

import {
    isAppLocale,
} from "@/src/i18n/config";
import {
    localizedNullableText,
    localizedText,
    localizedTextForLocale,
} from "@/src/i18n/localized-text";

describe("i18n localized text", () => {
    describe("isAppLocale", () => {
        it.each([
            "vi",
            "en",
        ])("chấp nhận locale hợp lệ: %s", (locale) => {
            expect(isAppLocale(locale)).toBe(true);
        });

        it.each([
            "VI",
            "fr",
            "",
            null,
            undefined,
            1,
        ])("từ chối locale không hợp lệ: %s", (locale) => {
            expect(isAppLocale(locale)).toBe(false);
        });
    });

    describe("localizedText", () => {
        it("ưu tiên tiếng Việt khi locale=vi", () => {
            expect(
                localizedText("vi", {
                    vi: "Đà Nẵng",
                    en: "Da Nang",
                }),
            ).toBe("Đà Nẵng");
        });

        it("ưu tiên tiếng Anh khi locale=en", () => {
            expect(
                localizedText("en", {
                    vi: "Đà Nẵng",
                    en: "Da Nang",
                }),
            ).toBe("Da Nang");
        });

        it("fallback sang ngôn ngữ còn lại khi bản dịch ưu tiên bị thiếu", () => {
            expect(
                localizedText("vi", {
                    vi: null,
                    en: "Da Nang",
                }),
            ).toBe("Da Nang");

            expect(
                localizedText("en", {
                    vi: "Đà Nẵng",
                    en: undefined,
                }),
            ).toBe("Đà Nẵng");
        });

        it("dùng tiếng Việt mặc định khi locale không hợp lệ", () => {
            expect(
                localizedText("fr", {
                    vi: "Việt Nam",
                    en: "Vietnam",
                }),
            ).toBe("Việt Nam");

            expect(
                localizedText(null, {
                    vi: "Việt Nam",
                    en: "Vietnam",
                }),
            ).toBe("Việt Nam");
        });

        it("trim khoảng trắng theo mặc định", () => {
            expect(
                localizedText("vi", {
                    vi: "  Hội An  ",
                    en: "Hoi An",
                }),
            ).toBe("Hội An");

            expect(
                localizedText("vi", {
                    vi: "   ",
                    en: "Hoi An",
                }),
            ).toBe("Hoi An");
        });

        it("giữ khoảng trắng khi trim=false", () => {
            expect(
                localizedText(
                    "vi",
                    {
                        vi: "  Hội An  ",
                        en: "Hoi An",
                    },
                    {
                        trim: false,
                    },
                ),
            ).toBe("  Hội An  ");

            expect(
                localizedText(
                    "vi",
                    {
                        vi: "   ",
                        en: "Hoi An",
                    },
                    {
                        trim: false,
                    },
                ),
            ).toBe("   ");
        });

        it("dùng fallback khi cả hai ngôn ngữ đều rỗng", () => {
            expect(
                localizedText(
                    "vi",
                    {
                        vi: null,
                        en: "   ",
                    },
                    {
                        fallback: "Chưa cập nhật",
                    },
                ),
            ).toBe("Chưa cập nhật");

            expect(
                localizedText(
                    "en",
                    {
                        vi: null,
                        en: null,
                    },
                    {
                        fallback: "Not available",
                    },
                ),
            ).toBe("Not available");
        });
    });

    describe("localizedNullableText", () => {
        it("trả null khi cả hai ngôn ngữ đều thiếu", () => {
            expect(
                localizedNullableText("vi", {
                    vi: null,
                    en: "   ",
                }),
            ).toBeNull();
        });

        it("trả nội dung nếu có ít nhất một ngôn ngữ", () => {
            expect(
                localizedNullableText("en", {
                    vi: "Mô tả",
                    en: null,
                }),
            ).toBe("Mô tả");
        });
    });

    describe("localizedTextForLocale", () => {
        it("chọn nội dung bằng AppLocale đã xác định", () => {
            expect(
                localizedTextForLocale(
                    "en",
                    "Ẩm thực",
                    "Cuisine",
                ),
            ).toBe("Cuisine");
        });

        it("hỗ trợ fallback tùy chỉnh", () => {
            expect(
                localizedTextForLocale(
                    "vi",
                    null,
                    null,
                    "Chưa cập nhật",
                ),
            ).toBe("Chưa cập nhật");
        });
    });
});
