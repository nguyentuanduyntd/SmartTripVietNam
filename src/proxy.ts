import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function proxy(request: NextRequest) {
    let supabaseResponse = NextResponse.next({request});

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
    } = await supabase.auth.getUser();

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

    //Bảo vệ route /admin
    if(pathname.startsWith('/admin')){
        if(!user){
            return redirectWithCookies("/auth/login");
        }
        const { data: profile, error} = await supabase.from("profiles").select("role").eq("id",user.id).single();

        if(error || profile?.role !== "admin"){
            return redirectWithCookies("/");
        }
    }
    if ( user && (pathname === "/auth/login" || pathname === "/auth/register")){
        return redirectWithCookies("/");
    }
    return supabaseResponse;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};