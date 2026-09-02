import { z } from "zod";

const normalizedFullNameSchema = z
    .string()
    .transform((value) =>
        value
            .trim()
            .replace(/\s+/g, " "),
    )
    .pipe(
        z
            .string()
            .min(
                2,
                "Họ và tên phải có ít nhất 2 ký tự",
            )
            .max(
                80,
                "Họ và tên không được vượt quá 80 ký tự",
            )
            .refine(
                (value) =>
                    /[\p{L}\p{N}]/u.test(
                        value,
                    ),
                "Họ và tên phải chứa chữ cái hoặc chữ số",
            ),
    );

export const updateProfileSchema = z
    .object({
        fullName:
            normalizedFullNameSchema,
    })
    .strict();

export type UpdateProfileInput = z.infer<
    typeof updateProfileSchema
>;
