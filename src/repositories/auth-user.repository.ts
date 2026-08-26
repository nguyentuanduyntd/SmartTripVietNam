import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/src/db";

/**
 * Supabase Auth lưu user ở bảng `auth.users` (schema riêng, ngoài Drizzle schema
 * public của mình). Vì kết nối DATABASE_URL dùng chung 1 Postgres instance với
 * Supabase nên có thể query thẳng bằng raw SQL thay vì gọi Admin API (Admin API
 * của supabase-js hiện không có sẵn hàm "getUserByEmail").
 */
export async function findAuthUserIdByEmail(email: string): Promise<string | null> {
    const rows = await db.execute<{ id: string }>(
        sql`select id from auth.users where lower(email) = lower(${email}) limit 1`,
    );

    const row = rows[0];

    return row?.id ?? null;
}