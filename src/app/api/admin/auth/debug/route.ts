import { NextResponse } from "next/server";

import { createClient } from "@/src/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      {
        authenticated: false,
        authError: authError
          ? {
              message: authError.message,
              status: authError.status,
            }
          : null,
      },
      {
        status: 401,
      },
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    authenticated: true,

    user: {
      id: user.id,
      email: user.email,
    },

    profile,

    profileError: profileError
      ? {
          message: profileError.message,
          code: profileError.code,
          details: profileError.details,
          hint: profileError.hint,
        }
      : null,
  });
}