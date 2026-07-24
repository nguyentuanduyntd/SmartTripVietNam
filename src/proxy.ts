import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function proxy(request: NextRequest) {
    let supabaseResponse = NextResponse.next({request});

    const {pathname} = request.nextUrl;

    function redirectWithCookies(path:string){
        const redirectResponse = NextResponse.redirect(
            new URL(path, request.url),
        );

        for(const cookie of supabaseResponse.cookies.getAll()){
            redirectResponse.cookies.set(
                cookie.name,
                cookie.value,
                cookie,
            );
        }
        return redirectResponse;
    }

    // Thiếu cấu hình Supabase (vd: chưa set env) -> không chặn request,
    // chỉ đơn giản là để request đi qua như bình thường thay vì crash.
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
                    getAll(){
                        return request.cookies.getAll();
                    },
                    setAll(cookiesToSet){
                        cookiesToSet.forEach(({name, value}) =>
                        request.cookies.set(name, value));
                        supabaseResponse = NextResponse.next({ request});
                        cookiesToSet.forEach(({name, value, options})=>
                        supabaseResponse.cookies.set(name, value, options));
                    },
                },
            }
        );

        const {
            data: {user},
            error: userError,
        } = await supabase.auth.getUser();

        // Có lỗi khi lấy user (token hết hạn/không hợp lệ...) -> coi như chưa đăng nhập,
        // tránh việc bounce nhầm người dùng chưa login ra khỏi trang /auth/login.
        const isAuthenticated = !userError && !!user;

        //Bảo vệ route /admin
        if(pathname.startsWith('/admin')){
            if(!isAuthenticated){
                return redirectWithCookies("/auth/login");
            }
            const { data: profile, error} = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user!.id)
                .single();

            if(error || profile?.role !== "admin"){
                return redirectWithCookies("/");
            }
        }

        if (isAuthenticated && (pathname === "/auth/login" || pathname === "/auth/register")){
            return redirectWithCookies("/");
        }

        return supabaseResponse;
    } catch (err) {
        // Lỗi bất ngờ khi gọi Supabase (network, sai url/key,...) -> không chặn
        // người dùng, chỉ log lại để debug.
        console.error("[proxy] Lỗi khi kiểm tra auth:", err);
        return supabaseResponse;
    }
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};