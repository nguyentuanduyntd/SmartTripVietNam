import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/auth/require-admin";

export async function GET(){
    const authResult = await requireAdmin();

    if(!authResult.ok){
        return NextResponse.json(
            {
                success:false,
                message: authResult.message,
            },
            {
                status: authResult.status,
            },
        );
    }
    return NextResponse.json({
        success: true,
        message: "Bạn có quyền admin",
        user: authResult.user,
    });
}