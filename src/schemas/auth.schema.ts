import { z } from "zod";

const emailSchema = z
    .string()
    .trim()
    .toLowerCase()
    .email("Email không hợp lệ");

// Đồng bộ rule với UI hiện tại ở trang update-password: >=8 ký tự, có chữ và số.
const newPasswordSchema = z
    .string()
    .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
    .max(72, "Mật khẩu không được vượt quá 72 ký tự")
    .regex(/[A-Za-zÀ-ỹ]/, "Mật khẩu phải có ít nhất 1 chữ cái")
    .regex(/\d/, "Mật khẩu phải có ít nhất 1 chữ số");

export const forgotPasswordRequestSchema = z
    .object({
        email: emailSchema,
    })
    .strict()
    .meta({
        id: "ForgotPasswordRequest",
        description: "Yêu cầu gửi mã OTP đặt lại mật khẩu",
    });

export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;

export const resetPasswordWithOtpRequestSchema = z
    .object({
        email: emailSchema,

        otp: z
            .string()
            .trim()
            .regex(/^\d{6}$/, "Mã OTP gồm 6 chữ số"),

        newPassword: newPasswordSchema,

        confirmPassword: z.string(),
    })
    .strict()
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Mật khẩu xác nhận không khớp",
        path: ["confirmPassword"],
    })
    .meta({
        id: "ResetPasswordWithOtpRequest",
        description: "Xác thực OTP và đặt mật khẩu mới",
    });

export type ResetPasswordWithOtpRequest = z.infer<typeof resetPasswordWithOtpRequestSchema>;