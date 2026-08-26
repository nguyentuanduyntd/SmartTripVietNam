import {
  uploadsApi,
  type UploadType,
} from "@/src/lib/api-client/uploads";

type CoverImageInput = {
  coverImageUrl?: string | null;
  coverImagePublicId?: string | null;
};

type SaveEntityWithCoverOptions<TInput extends CoverImageInput> = {
  input: TInput;
  coverFile: File | null;
  removeCover: boolean;
  uploadFolder: UploadType;
  save: (payload: TInput) => Promise<unknown>;
};

export async function saveEntityWithCover<TInput extends CoverImageInput>({
  input,
  coverFile,
  removeCover,
  uploadFolder,
  save,
}: SaveEntityWithCoverOptions<TInput>) {
  const payload = { ...input };
  let uploadedPublicId: string | null = null;

  try {
    if (coverFile) {
      const uploadedImage = await uploadsApi.upload(coverFile, uploadFolder);

      payload.coverImageUrl = uploadedImage.url;
      payload.coverImagePublicId = uploadedImage.publicId;
      uploadedPublicId = uploadedImage.publicId;
    } else if (removeCover) {
      payload.coverImageUrl = null;
      payload.coverImagePublicId = null;
    }

    await save(payload);
  } catch (error) {
    if (uploadedPublicId) {
      await uploadsApi.remove(uploadedPublicId).catch((cleanupError) => {
        console.error("Không thể rollback ảnh Cloudinary:", cleanupError);
      });
    }

    throw error;
  }
}