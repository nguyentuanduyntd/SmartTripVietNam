import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

import { normalizeReturnPath } from "@/src/lib/auth/return-path";

function getCurrentRequestPath(request: NextRequest) {
    return [
        request.nextUrl.pathname,
        request.nextUrl.search,
        request.nextUrl.hash,
    ].join("");
}

function getAuthReturnPath(request: NextRequest) {
    const returnPath = normalizeReturnPath(
        request.nextUrl.searchParams.get("next"),
        "/",
    );

    /*
     * Tránh trường hợp một người dùng đã đăng nhập nhưng tham số next
     * lại tiếp tục trỏ về trang đăng nhập hoặc đăng ký, gây vòng lặp.
     */
    if (
        returnPath === "/auth/login" ||
        returnPath.startsWith("/auth/login?") ||
        returnPath === "/auth/register" ||
        returnPath.startsWith("/auth/register?")
    ) {
        return "/";
    }

    return returnPath;
}

export async function proxy(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const { pathname } = request.nextUrl;

    function redirectWithCookies(path: string) {
        const redirectResponse = NextResponse.redirect(
            new URL(path, request.url),
        );

        for (const cookie of supabaseResponse.cookies.getAll()) {
            redirectResponse.cookies.set(
                cookie.name,
                cookie.value,
                cookie,
            );
        }

        return redirectResponse;
    }

    /*
     * Thiếu cấu hình Supabase, ví dụ chưa thiết lập biến môi trường,
     * thì không chặn request để tránh làm toàn bộ ứng dụng bị lỗi.
     */
    if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
        console.error(
            "[proxy] Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_ANON_KEY, bỏ qua kiểm tra auth.",
        );

        return supabaseResponse;
    }

    try {
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(
                            ({ name, value }) => {
                                request.cookies.set(
                                    name,
                                    value,
                                );
                            },
                        );

                        supabaseResponse = NextResponse.next({
                            request,
                        });

                        cookiesToSet.forEach(
                            ({
                                name,
                                value,
                                options,
                            }) => {
                                supabaseResponse.cookies.set(
                                    name,
                                    value,
                                    options,
                                );
                            },
                        );
                    },
                },
            },
        );

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        /*
         * Token hết hạn, token không hợp lệ hoặc không có user
         * đều được xem là chưa đăng nhập.
         */
        const isAuthenticated =
            !userError && user !== null;

        /*
         * Bảo vệ khu vực quản trị.
         */
        if (pathname.startsWith("/admin")) {
            if (!isAuthenticated) {
                const returnPath =
                    getCurrentRequestPath(request);

                return redirectWithCookies(
                    `/auth/login?next=${encodeURIComponent(
                        returnPath,
                    )}`,
                );
            }

            const {
                data: profile,
                error: profileError,
            } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .maybeSingle();

            if (
                profileError ||
                profile?.role !== "admin"
            ) {
                return redirectWithCookies("/");
            }
        }

        /*
         * Người dùng đã đăng nhập nhưng truy cập lại login/register:
         * ưu tiên đưa họ về đường dẫn next thay vì luôn đưa về trang chủ.
         */
        if (
            isAuthenticated &&
            (pathname === "/auth/login" ||
                pathname === "/auth/register")
        ) {
            return redirectWithCookies(
                getAuthReturnPath(request),
            );
        }

        return supabaseResponse;
    } catch (error) {
        /*
         * Không chặn người dùng nếu Supabase gặp lỗi mạng,
         * sai URL, sai key hoặc một lỗi ngoài dự kiến.
         */
        console.error(
            "[proxy] Lỗi khi kiểm tra auth:",
            error,
        );

        return supabaseResponse;
    }
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};