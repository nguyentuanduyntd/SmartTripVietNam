import {
    DEFAULT_LOCALE,
    isAppLocale,
    type AppLocale,
} from "@/src/i18n/config";

export type LocalizedTextValue =
    | string
    | null
    | undefined;

type LocalizedTextInput = {
    vi: LocalizedTextValue;
    en: LocalizedTextValue;
};

type LocalizedTextOptions = {
    /**
     * Giá trị cuối cùng nếu cả VI và EN đều rỗng.
     */
    fallback?: string;

    /**
     * Mặc định true:
     * loại bỏ khoảng trắng thừa trước khi kiểm tra fallback.
     */
    trim?: boolean;
};

function normalizeText(
    value: LocalizedTextValue,
    trim: boolean,
): string | null {
    if (
        typeof value !== "string"
    ) {
        return null;
    }

    const normalized =
        trim
            ? value.trim()
            : value;

    return normalized.length > 0
        ? normalized
        : null;
}

/**
 * Chọn text theo locale hiện tại.
 *
 * Quy tắc:
 *
 * locale = vi
 *   → ưu tiên VI
 *   → nếu VI thiếu thì fallback EN
 *
 * locale = en
 *   → ưu tiên EN
 *   → nếu EN thiếu thì fallback VI
 *
 * Nếu locale không hợp lệ:
 *   → dùng DEFAULT_LOCALE.
 */
export function localizedText(
    locale: string | null | undefined,
    input: LocalizedTextInput,
    options: LocalizedTextOptions = {},
): string {
    const {
        fallback = "",
        trim = true,
    } = options;

    const resolvedLocale:
        AppLocale =
        isAppLocale(locale)
            ? locale
            : DEFAULT_LOCALE;

    const vi =
        normalizeText(
            input.vi,
            trim,
        );

    const en =
        normalizeText(
            input.en,
            trim,
        );

    if (
        resolvedLocale === "en"
    ) {
        return (
            en ??
            vi ??
            fallback
        );
    }

    return (
        vi ??
        en ??
        fallback
    );
}

/**
 * Phiên bản trả null khi cả hai ngôn ngữ đều thiếu.
 *
 * Hữu ích với các field optional như:
 * description, address, note...
 */
export function localizedNullableText(
    locale: string | null | undefined,
    input: LocalizedTextInput,
    options: Omit<
        LocalizedTextOptions,
        "fallback"
    > = {},
): string | null {
    const value =
        localizedText(
            locale,
            input,
            {
                ...options,
                fallback: "",
            },
        );

    return value.length > 0
        ? value
        : null;
}

/**
 * Helper cho trường hợp đã biết locale chắc chắn là AppLocale.
 *
 * Dùng ở server code đã lấy locale từ next-intl.
 */
export function localizedTextForLocale(
    locale: AppLocale,
    vi: LocalizedTextValue,
    en: LocalizedTextValue,
    fallback = "",
): string {
    return localizedText(
        locale,
        {
            vi,
            en,
        },
        {
            fallback,
        },
    );
}