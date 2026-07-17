import "server-only";
import type { UploadApiOptions, UploadApiResponse } from "cloudinary";
import { cloudinary } from "../lib/cloudinary"; 
import { validateImageFile } from "../utils/image_validation";

export const CLOUDINARY_FOLDERS = {
    profiles: "smart-trip-vietnam/profiles",
    destinationCovers: "smart-trip-vietnam/destinations/covers",
    destinationGallery: "smart-trip-vietnam/destinations/gallery",
    community: "smart-trip-vietnam/community",
} as const;

export type CloudinaryFolder = (typeof CLOUDINARY_FOLDERS)[keyof typeof CLOUDINARY_FOLDERS];

export interface UploadedImage {
    url: string;
    publicId: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
}
export interface UploadImageOptions {
    folder: CloudinaryFolder;
    publicId?: string;
    transformation?: UploadApiOptions["transformation"];
}

export async function uploadImage(
    file: File,
    options: UploadImageOptions,
): Promise<UploadedImage> {
    validateImageFile(file);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadBuffer(buffer, {
        folder: options.folder,
        public_id: options.publicId,
        resource_type: "image",
        overwrite: false,
        unique_filename: true,
        use_filename: false,
        transformation: options.transformation,
    });
    return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,    
    };
}

function uploadBuffer(
    buffer: Buffer,
    options: UploadApiOptions,
) : Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            options,
            (error, result) => {
                if(error){
                    reject(new Error(error.message));
                    return;
                }
                if(!result){
                    reject(new Error("Cloudinary không trả về kết quả upload"));
                    return;
                }
                resolve(result);
            },
        );
        stream.end(buffer);
    });
}

export async function deleteImage(publicId: string): Promise<void>{
    if(!publicId.trim()){
        return;
    }
    const result = await cloudinary.uploader.destroy(publicId,{
        resource_type: "image",
        invalidate: true,
    });
    if(result.result !== "ok" && result.result !== "not found"){
        throw new Error(`Không thể xóa ảnh Cloudinary: ${result.result}`);
    }
}