import {
    NextResponse,
} from "next/server";

import {
    LOCALE_COOKIE_MAX_AGE,
    LOCALE_COOKIE_NAME,
    isAppLocale,
} from "@/src/i18n/config";

export async function POST(
    request: Request,
) {
    const body =
        await request
            .json()
            .catch(
                () => null,
            );

    const locale =
        body &&
        typeof body ===
            "object" &&
        "locale" in body
            ? body.locale
            : null;

    if (
        !isAppLocale(
            locale,
        )
    ) {
        return NextResponse.json(
            {
                success:
                    false,
                message:
                    "Unsupported locale",
            },
            {
                status: 400,
            },
        );
    }

    const response =
        NextResponse.json(
            {
                success: true,
                data: {
                    locale,
                },
            },
        );

    response.cookies.set({
        name:
            LOCALE_COOKIE_NAME,
        value: locale,
        path: "/",
        maxAge:
            LOCALE_COOKIE_MAX_AGE,
        sameSite: "lax",
        secure:
            process.env
                .NODE_ENV ===
            "production",
    });

    return response;
}