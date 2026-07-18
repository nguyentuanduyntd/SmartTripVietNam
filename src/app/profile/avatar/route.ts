import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { ProfileNotFoundError, removeProfileAvatar, replaceProfileAvatar } from "@/src/services/profile.service";

export const runtime = "nodejs";

function errorResponse(error: unknown){
    if(error instanceof ProfileNotFoundError){
        return NextResponse.json({
            success: false,
            message: error.message,
        },{status: 404},);
    }
    const message = error instanceof Error ? error.message: "Đã xảy ra lỗi không xác định";
    return NextResponse.json({
        success: false,
        message,
    }, {status: 400},);
}

async function getAuthenticatedUser(){
    const supabase = await createClient();

    const{data: {user}, error,} = await supabase.auth.getUser();

    if(error || !user){
        return null;
    }
    return user;
}

export async function POST(request: Request){
    try{
        const user = await getAuthenticatedUser();

        if(!user){
            return NextResponse.json({
                success: false,
                message: "Bạn cần đăng nhập để cập nhật avatar",
            },{ status: 401},);
        }
        const formData = await request.formData();
        const file = formData.get("avatar");

        if(!(file instanceof File)){
            return NextResponse.json({
                success: false,
                message: "Vui lòng chọn ảnh avatar",
            },{ status: 400},);
        }
        const avatar = await replaceProfileAvatar(user.id, file);
        return NextResponse.json({
            success: true,
            message: "Cập nhật avatar thành công",
            data: avatar,
        });
    } catch (error){
        console.error(error);
        return errorResponse(error);
    }
}
export async function DELETE(){
    try{
        const user = await getAuthenticatedUser();
        if(!user){return NextResponse.json({
            success: false,
            message: "Bạn cần đăng nhập để xóa avatar",
        },{status: 401},);
        }

        const avatar = await removeProfileAvatar(user.id);

        return NextResponse.json({
            success: true,
            message: "Xóa avatar thành công",
            data: avatar,
        });
    }catch( error){
        console.error(error);
        return errorResponse(error);
    }
}