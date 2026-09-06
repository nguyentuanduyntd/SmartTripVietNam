import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const passwordResetOtps = pgTable(
  "password_reset_otps",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    email: text("email").notNull(),

    otpHash: text("otp_hash").notNull(),

    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

    attempts: integer("attempts").notNull().default(0),

    consumedAt: timestamp("consumed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("password_reset_otps_email_created_at_idx").on(table.email, table.createdAt)],
);

export type PasswordResetOtp = typeof passwordResetOtps.$inferSelect;
export type NewPasswordResetOtp = typeof passwordResetOtps.$inferInsert;
