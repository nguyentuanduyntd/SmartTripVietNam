import { NextResponse } from "next/server";

import { normalizeReturnPath } from "@/src/lib/auth/return-path";
import { createClient } from "@/src/lib/supabase/server";

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code =
        requestUrl.searchParams.get("code");

    const nextPath = normalizeReturnPath(
        requestUrl.searchParams.get("next"),
    );

    if (code) {
        const supabase = await createClient();

        const { error } =
            await supabase.auth.exchangeCodeForSession(
                code,
            );

        if (error) {
            const loginUrl = new URL(
                "/auth/login",
                requestUrl.origin,
            );

            loginUrl.searchParams.set(
                "error",
                "oauth_callback_failed",
            );

            loginUrl.searchParams.set(
                "next",
                nextPath,
            );

            return NextResponse.redirect(loginUrl);
        }
    }

    return NextResponse.redirect(
        new URL(nextPath, requestUrl.origin),
    );
}