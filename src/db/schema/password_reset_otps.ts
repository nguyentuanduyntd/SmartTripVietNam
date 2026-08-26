import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Lưu OTP xác thực khi user thực hiện "quên mật khẩu".
 *
 * - Mỗi lần user bấm "Gửi mã" sẽ tạo 1 dòng mới (không update đè dòng cũ),
 *   giúp việc rate-limit theo `createdAt` đơn giản và chính xác.
 * - `otpHash` là HMAC-SHA256 của mã OTP, không lưu OTP dạng plaintext.
 * - `consumedAt` được set khi OTP đã được dùng để đổi mật khẩu thành công
 *   (hoặc bị vô hiệu hoá thủ công), để không thể tái sử dụng.
 */
export const passwordResetOtps = pgTable(
    "password_reset_otps",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        // Luôn lưu dạng lowercase, đã trim ở tầng service.
        email: text("email").notNull(),

        otpHash: text("otp_hash").notNull(),

        expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

        attempts: integer("attempts").notNull().default(0),

        consumedAt: timestamp("consumed_at", { withTimezone: true }),

        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        index("password_reset_otps_email_created_at_idx").on(table.email, table.createdAt),
    ],
);

export type PasswordResetOtp = typeof passwordResetOtps.$inferSelect;
export type NewPasswordResetOtp = typeof passwordResetOtps.$inferInsert;