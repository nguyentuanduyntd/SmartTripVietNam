import "server-only";

import { getCurrentUser } from "./get-current-user";

type AdminCheckResult = | {
    ok: true;
    user: {
        id: string;
        email: string | null;
        role: "admin";
    };
} | {
    ok: false;
    status: 401 | 403;
    message: string;
};

export async function requireAdmin(): Promise<AdminCheckResult>{
    const user = await getCurrentUser();

    if(!user){
        return {
            ok: false,
            status: 401,
            message: "Bạn chưa đăng nhập.",
        };
    }
    if(user.role !== "admin"){
        return {
            ok: false,
            status: 403,
            message: "Bạn không có quyền quản trị.",
        };
    }
    return{
        ok: true,
        user: {
            ...user,
            role: "admin",
        },
    };
}