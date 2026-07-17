export const IMAGE_UPLOAD_CONFIG = {
    maxFileSize: 5 * 1024 * 1024,
    allowedMimeTypes: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/avif", 
    ],
} as const;

export function validateImageFile(file: File): void{
    if(file.size === 0){
        throw new Error("File ảnh đang trống");
    }
    if(file.size > IMAGE_UPLOAD_CONFIG.maxFileSize){
        throw new Error("Kích thước ảnh không được vượt quá 5MB");
    }
    const allowedTypes: readonly string[] = IMAGE_UPLOAD_CONFIG.allowedMimeTypes;

    if(!allowedTypes.includes(file.type)){
        throw new Error("Chỉ chấp nhận ảnh JPEG, PNG, WebP, hoặc AVIF");
    }
}