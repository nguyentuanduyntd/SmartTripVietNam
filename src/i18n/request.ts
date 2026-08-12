import {
    cookies,
    headers,
} from "next/headers";
import {
    getRequestConfig,
} from "next-intl/server";

import {
    DEFAULT_LOCALE,
    LOCALE_COOKIE_NAME,
    isAppLocale,
    type AppLocale,
} from "@/src/i18n/config";

async function detectLocale(): Promise<AppLocale> {
    const cookieStore =
        await cookies();

    const cookieLocale =
        cookieStore.get(
            LOCALE_COOKIE_NAME,
        )?.value;

    if (
        isAppLocale(
            cookieLocale,
        )
    ) {
        return cookieLocale;
    }

    const requestHeaders =
        await headers();

    const acceptLanguage =
        requestHeaders
            .get(
                "accept-language",
            )
            ?.toLowerCase() ??
        "";

    const preferredLanguage =
        acceptLanguage
            .split(",")[0]
            ?.trim();

    if (
        preferredLanguage?.startsWith(
            "vi",
        )
    ) {
        return "vi";
    }

    if (
        preferredLanguage
    ) {
        return "en";
    }

    return DEFAULT_LOCALE;
}

export default getRequestConfig(
    async () => {
        const locale =
            await detectLocale();

        const messages = (
            await import(
                `../../messages/${locale}.json`
            )
        ).default;

        return {
            locale,
            messages,
            timeZone:
                "Asia/Ho_Chi_Minh",
        };
    },
);