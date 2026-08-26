import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "crypto";

const OTP_LENGTH = 6;

function getOtpSecret() {
    const secret = process.env.OTP_HASH_SECRET;

    if (!secret) {
        throw new Error("OTP_HASH_SECRET is not defined");
    }

    return secret;
}

/** Sinh mã OTP 6 chữ số (000000 - 999999), giữ nguyên số 0 ở đầu. */
export function generateOtp(): string {
    return randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
}

/**
 * Hash OTP bằng HMAC-SHA256 với secret riêng (pepper) thay vì lưu plaintext.
 * Vì không gian OTP 6 số khá nhỏ, secret giúp tránh việc ai đó có quyền đọc
 * DB tự dò ngược OTP bằng cách hash thử 1 triệu giá trị.
 */
export function hashOtp(otp: string): string {
    return createHmac("sha256", getOtpSecret()).update(otp).digest("hex");
}

export function verifyOtpHash(otp: string, expectedHash: string): boolean {
    const actualHash = hashOtp(otp);

    const actualBuffer = Buffer.from(actualHash, "hex");
    const expectedBuffer = Buffer.from(expectedHash, "hex");

    if (actualBuffer.length !== expectedBuffer.length) {
        return false;
    }

    // So sánh timing-safe để tránh timing attack khi so hash.
    return timingSafeEqual(actualBuffer, expectedBuffer);
}