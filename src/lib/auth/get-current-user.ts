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

  if (userError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(`[getCurrentUser] Không thể đọc profile của user ${user.id}:`, profileError);
  }

  return {
    id: user.id,
    email: user.email ?? null,
    role: normalizeAppRole(profile?.role),
  };
}
