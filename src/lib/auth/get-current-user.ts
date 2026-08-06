import "server-only";

import { createClient } from "@/src/lib/supabase/server";

export type AppRole = "user" | "admin";

export type CurrentAppUser = {
    id: string;
    email: string | null;
    role: AppRole;
};

function normalizeAppRole(role: unknown): AppRole {
    return role === "admin" ? "admin" : "user";
}

export async function getCurrentUser(): Promise<CurrentAppUser | null> {
    const supabase = await createClient();

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    /*
     * Chỉ xem là chưa đăng nhập khi Supabase Auth không trả về user.
     * Việc thiếu profile không được phép làm mất trạng thái đăng nhập.
     */
    if (userError || !user) {
        return null;
    }

    const {
        data: profile,
        error: profileError,
    } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    /*
     * Auth user vẫn hợp lệ ngay cả khi:
     * - chưa có bản ghi trong bảng profiles;
     * - bảng profiles tạm thời gặp lỗi;
     * - role chứa giá trị không hợp lệ.
     *
     * Trong các trường hợp đó, dùng quyền thấp nhất là "user".
     * Không bao giờ tự động cấp quyền admin.
     */
    if (profileError) {
        console.error(
            `[getCurrentUser] Không thể đọc profile của user ${user.id}:`,
            profileError,
        );
    }

    return {
        id: user.id,
        email: user.email ?? null,
        role: normalizeAppRole(profile?.role),
    };
}