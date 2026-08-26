import {
    NextResponse,
} from "next/server";

import {
    createClient,
} from "@/src/lib/supabase/server";
import { normalizeReturnPath } from "@/src/lib/auth/return-path";

export async function GET(
    request: Request,
) {
    const {
        searchParams,
        origin,
    } = new URL(
        request.url,
    );

    const code =
        searchParams.get(
            "code",
        );

    const next =
        normalizeReturnPath(
            searchParams.get(
                "next",
            ),
        );

    const authError =
        searchParams.get(
            "error",
        );

    const authErrorDescription =
        searchParams.get(
            "error_description",
        );

    /*
     * Supabase có thể redirect về callback
     * kèm error query param nếu user từ chối OAuth,
     * link hết hạn hoặc verification thất bại.
     */
    if (authError) {
        console.warn(
            "[AUTH CALLBACK ERROR]",
            {
                error:
                    authError,

                description:
                    authErrorDescription,
            },
        );

        const loginUrl =
            new URL(
                "/auth/login",
                origin,
            );

        loginUrl.searchParams.set(
            "error",
            authErrorDescription ??
                "Không thể xác thực tài khoản.",
        );

        return NextResponse.redirect(
            loginUrl,
        );
    }

    if (!code) {
        const loginUrl =
            new URL(
                "/auth/login",
                origin,
            );

        loginUrl.searchParams.set(
            "error",
            "Liên kết xác thực không hợp lệ hoặc đã hết hạn.",
        );

        return NextResponse.redirect(
            loginUrl,
        );
    }

    const supabase =
        await createClient();

    const {
        data,
        error,
    } =
        await supabase.auth.exchangeCodeForSession(
            code,
        );

    if (error) {
        console.error(
            "[AUTH EXCHANGE CODE ERROR]",
            error,
        );

        const loginUrl =
            new URL(
                "/auth/login",
                origin,
            );

        loginUrl.searchParams.set(
            "error",
            "Không thể hoàn tất đăng nhập. Vui lòng thử lại.",
        );

        return NextResponse.redirect(
            loginUrl,
        );
    }

    console.info(
        "[AUTH CALLBACK SUCCESS]",
        {
            userId:
                data.user?.id ??
                null,

            email:
                data.user?.email ??
                null,
        },
    );

    return NextResponse.redirect(
        new URL(
            next,
            origin,
        ),
    );
}