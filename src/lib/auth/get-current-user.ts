import "server-only";

import { createClient } from "@/src/lib/supabase/server";

export type AppRole = "user" | "admin";

export type CurrentAppUser = {
    id: string;
    email: string | null;
    role: AppRole;
};

export async function getCurrentUser(): Promise<CurrentAppUser | null>{
    const supabase = await createClient();

    const{
        data: {user},
        error: userError,
    } = await supabase.auth.getUser();

    if(userError || !user){
        return null;
    }

    const { data: profile, error: profileError} = await supabase.from("profiles").select("role").eq("id",user.id).single();

    if(profileError || !profile){
        return null;
    }

    return {
        id: user.id,
        email: user.email ?? null,
        role: profile.role as AppRole,
    };
}