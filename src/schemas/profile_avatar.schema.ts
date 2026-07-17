import { z } from "zod";

export const AVATAR_MAX_SIZE = 5 * 1024 * 1024;

export const AVATAR_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export const avatarFileSchema = z
  .instanceof(File, {
    message: "Vui lòng chọn ảnh avatar",
  })
  .refine(
    (file) => file.size > 0,
    "File ảnh không được để trống",
  )
  .refine(
    (file) => file.size <= AVATAR_MAX_SIZE,
    "Ảnh avatar không được vượt quá 5MB",
  )
  .refine(
    (file) =>
      AVATAR_ALLOWED_TYPES.includes(
        file.type as (typeof AVATAR_ALLOWED_TYPES)[number],
      ),
    "Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc AVIF",
  )
  .meta({
    type: "string",
    format: "binary",
    description:
      "Ảnh avatar JPEG, PNG, WebP hoặc AVIF, tối đa 5MB",
  });

export const updateAvatarRequestSchema = z
  .object({
    avatar: avatarFileSchema,
  })
  .strict()
  .meta({
    id: "UpdateAvatarRequest",
  });

export const avatarDataSchema = z
  .object({
    avatarUrl: z
      .url()
      .nullable()
      .meta({
        example:
          "https://res.cloudinary.com/example/image/upload/avatar.webp",
      }),

    avatarPublicId: z
      .string()
      .nullable()
      .meta({
        example:
          "smart-trip-vietnam/profiles/user-example",
      }),
  })
  .meta({
    id: "AvatarData",
  });

export const avatarSuccessResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string(),
    data: avatarDataSchema,
  })
  .meta({
    id: "AvatarSuccessResponse",
  });
