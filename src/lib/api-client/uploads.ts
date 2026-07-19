import { apiFetch, ApiRequestError } from "./http";

export type UploadType = | "profile-avatar" | "destination-cover" | "destination-gallery";

export type UploadedImage = {
    url: string;
    publicId: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
};

type UploadResponse = {
    success?: boolean;
    message?: string;
    data?: UploadedImage;
    errors?: Record<string, string[]>;
};

async function upload(
    file: File,
    type: UploadType,
) : Promise<UploadedImage>{
    const formData = new FormData();

    formData.append("file", file);
    formData.append("type", type);

    const response = await fetch("/api/upload", {method: 'POST', body: formData,});

    const json = (await response.json().catch(() => null)) as UploadResponse | null;
    
    if(!response.ok || !json?.data){
        throw new ApiRequestError(
            json?.message ?? "Không thể upload ảnh",
            response.status,
            json?.errors,
        );
    }
    return json.data;
}

function remove(publicId: string){
    return apiFetch<{publicId: string}>("/api/upload",{
        method: 'DELETE',
        body: JSON.stringify({publicId}),
    });
}

export const uploadsApi = {
    upload, remove,
};