import { NextResponse } from "next/server";
import { z } from "zod";
import { CLOUDINARY_FOLDERS, uploadImage } from "@/src/services/image.service";

export const runtime = "node.js";

const uploadTypeSchema = z.enum([
    "profile-avatar",
    "destination-cover",
    "destination-gallery",
]);

const folderByUploadType = {
    "profile-avatar": CLOUDINARY_FOLDERS.profiles,
    "destination-cover": CLOUDINARY_FOLDERS.destinationCovers,
    "destination-gallery": CLOUDINARY_FOLDERS.destinationGallery,
} as const;

export async function POST(request: Request){
    try{
        const formData = await request.formData();
        const file = formData.get("file");
        const uploadTypeResult = uploadTypeSchema.safeParse(
            formData.get("type"),
        );
        if(!(file instanceof File)){
            return NextResponse.json(
                {message: "Vui lòng chọn một file ảnh"},
                {status: 400},
            );
        }
        if (!uploadTypeResult.success) {
            return NextResponse.json(
                { message: "Loại upload không hợp lệ" },
                { status: 400 },
            );
        }
        const uploadType = uploadTypeResult.data;
        const image = await uploadImage(file,{
            folder: folderByUploadType[uploadType],
        });

        return NextResponse.json(
            {data: image,},
            {status: 201},
        );
    } catch (error){
        const message = error instanceof Error ? error.message : "Không thể upload ảnh";
        return NextResponse.json(
            {message},
            {status: 400},
        );
    }
}