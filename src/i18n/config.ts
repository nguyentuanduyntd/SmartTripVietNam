export const APP_LOCALES = [
    "vi",
    "en",
] as const;

export type AppLocale =
    (typeof APP_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale =
    "vi";

export const LOCALE_COOKIE_NAME =
    "smarttrip_locale";

export const LOCALE_COOKIE_MAX_AGE =
    60 * 60 * 24 * 365;

export function isAppLocale(
    value: unknown,
): value is AppLocale {
    return (
        typeof value === "string" &&
        APP_LOCALES.includes(
            value as AppLocale,
        )
    );
}