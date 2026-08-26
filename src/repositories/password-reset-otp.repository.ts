import "server-only";
import { and, desc, eq, gt, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/src/db";
import { passwordResetOtps } from "@/src/db/schema/password_reset_otps";

export async function createOtpRequest(data: {
    email: string;
    otpHash: string;
    expiresAt: Date;
}) {
    const [row] = await db.insert(passwordResetOtps).values(data).returning();

    return row;
}

/** Đếm số lần user đã yêu cầu OTP trong khoảng thời gian gần đây, dùng để rate-limit. */
export async function countRecentOtpRequests(email: string, since: Date) {
    const [{ value }] = await db
        .select({ value: sql<number>`count(*)`.mapWith(Number) })
        .from(passwordResetOtps)
        .where(and(eq(passwordResetOtps.email, email), gte(passwordResetOtps.createdAt, since)));

    return value;
}

/** Lấy lần request OTP gần nhất (bất kể còn hạn hay không) để tính cooldown gửi lại. */
export async function findLatestOtpRequest(email: string) {
    const [row] = await db
        .select()
        .from(passwordResetOtps)
        .where(eq(passwordResetOtps.email, email))
        .orderBy(desc(passwordResetOtps.createdAt))
        .limit(1);

    return row ?? null;
}

/** Lấy OTP còn hiệu lực (chưa dùng, chưa hết hạn) mới nhất để verify. */
export async function findActiveOtp(email: string) {
    const [row] = await db
        .select()
        .from(passwordResetOtps)
        .where(
            and(
                eq(passwordResetOtps.email, email),
                isNull(passwordResetOtps.consumedAt),
                gt(passwordResetOtps.expiresAt, new Date()),
            ),
        )
        .orderBy(desc(passwordResetOtps.createdAt))
        .limit(1);

    return row ?? null;
}

export async function incrementOtpAttempts(id: string) {
    await db
        .update(passwordResetOtps)
        .set({ attempts: sql`${passwordResetOtps.attempts} + 1` })
        .where(eq(passwordResetOtps.id, id));
}

export async function markOtpConsumed(id: string) {
    await db
        .update(passwordResetOtps)
        .set({ consumedAt: new Date() })
        .where(eq(passwordResetOtps.id, id));
}