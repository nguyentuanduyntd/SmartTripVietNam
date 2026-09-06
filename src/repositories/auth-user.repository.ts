import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/src/db";

export async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const rows = await db.execute<{ id: string }>(
    sql`select id from auth.users where lower(email) = lower(${email}) limit 1`,
  );

  const row = rows[0];

  return row?.id ?? null;
}
