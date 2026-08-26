import "server-only";
import { findAuthUserIdByEmail } from "@/src/repositories/auth-user.repository";
import {
    countRecentOtpRequests,
    createOtpRequest,
    findActiveOtp,
    findLatestOtpRequest,
    incrementOtpAttempts,
    markOtpConsumed,
} from "@/src/repositories/password-reset-otp.repository";
import { generateOtp, hashOtp, verifyOtpHash } from "@/src/lib/otp";
import { sendPasswordResetOtpEmail } from "@/src/services/email/send-otp-email.service";
import { supabaseAdmin } from "@/src/lib/supabase/admin";

const OTP_TTL_MINUTES = 10;
const MAX_VERIFY_ATTEMPTS = 5;

// Chống spam: tối thiểu 60s giữa 2 lần gửi OTP, tối đa 5 lần / 15 phút.
const RESEND_COOLDOWN_MS = 60 * 1000;
const REQUEST_WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;

export class TooManyOtpRequestsError extends Error {
    constructor(message = "Bạn đã yêu cầu OTP quá nhiều lần. Vui lòng thử lại sau ít phút.") {
        super(message);
        this.name = "TooManyOtpRequestsError";
    }
}

export class InvalidOtpError extends Error {
    constructor(message = "Mã OTP không đúng hoặc đã hết hạn.") {
        super(message);
        this.name = "InvalidOtpError";
    }
}

/**
 * Bước 1: user nhập email -> tạo OTP mới và gửi qua Resend.
 *
 * Lưu ý bảo mật quan trọng: hàm này LUÔN trả về thành công (không throw vì
 * "email không tồn tại"), để không lộ thông tin tài khoản nào đang tồn tại
 * trong hệ thống. Dòng OTP vẫn được tạo trong DB kể cả khi email không tồn
 * tại, để rate-limit hoạt động nhất quán cho cả 2 trường hợp (tồn tại /
 * không tồn tại) — nếu không, kẻ tấn công có thể dò email bằng cách so sánh
 * thời điểm bị rate-limit.
 */
export async function requestPasswordResetOtp(email: string): Promise<void> {
    const latestRequest = await findLatestOtpRequest(email);

    if (latestRequest) {
        const elapsedMs = Date.now() - latestRequest.createdAt.getTime();

        if (elapsedMs < RESEND_COOLDOWN_MS) {
            throw new TooManyOtpRequestsError(
                `Vui lòng chờ ${Math.ceil((RESEND_COOLDOWN_MS - elapsedMs) / 1000)}s trước khi gửi lại mã.`,
            );
        }
    }

    const windowStart = new Date(Date.now() - REQUEST_WINDOW_MS);
    const recentCount = await countRecentOtpRequests(email, windowStart);

    if (recentCount >= MAX_REQUESTS_PER_WINDOW) {
        throw new TooManyOtpRequestsError();
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await createOtpRequest({ email, otpHash, expiresAt });

    const userId = await findAuthUserIdByEmail(email);

    // Chỉ thật sự gửi mail khi email có tài khoản tương ứng.
    if (!userId) {
        return;
    }

    try {
        await sendPasswordResetOtpEmail(email, otp);
    } catch (error) {
        // Không throw ra ngoài để tránh lộ thông tin qua response khác biệt;
        // log lại để dev theo dõi khi Resend gặp sự cố.
        console.error("[SEND OTP EMAIL ERROR]", error);
    }
}

/**
 * Bước 2: user nhập OTP + mật khẩu mới -> verify và đổi mật khẩu trong cùng
 * 1 bước (gộp "verify OTP" và "đặt mật khẩu mới" để giảm state cần quản lý
 * và giảm bề mặt tấn công so với việc tách thành 2 API + reset-token riêng).
 */
export async function resetPasswordWithOtp(
    email: string,
    otp: string,
    newPassword: string,
): Promise<void> {
    const activeOtp = await findActiveOtp(email);

    if (!activeOtp) {
        throw new InvalidOtpError();
    }

    if (activeOtp.attempts >= MAX_VERIFY_ATTEMPTS) {
        throw new InvalidOtpError("Mã OTP đã bị khoá do nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.");
    }

    const isOtpValid = verifyOtpHash(otp, activeOtp.otpHash);

    if (!isOtpValid) {
        await incrementOtpAttempts(activeOtp.id);

        const remaining = MAX_VERIFY_ATTEMPTS - (activeOtp.attempts + 1);

        throw new InvalidOtpError(
            remaining > 0
                ? `Mã OTP không đúng. Bạn còn ${remaining} lần thử.`
                : "Mã OTP đã bị khoá do nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.",
        );
    }

    const userId = await findAuthUserIdByEmail(email);

    if (!userId) {
        // Email không có tài khoản thật nhưng vẫn có OTP hợp lệ (trường hợp
        // rất hiếm, xảy ra khi có OTP request trước đó cho email không tồn
        // tại) -> tiêu huỷ OTP và trả lỗi chung, không tiết lộ nguyên nhân.
        await markOtpConsumed(activeOtp.id);

        throw new InvalidOtpError();
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
    });

    if (error) {
        console.error("[RESET PASSWORD ERROR]", error);

        throw new Error("Không thể đặt lại mật khẩu. Vui lòng thử lại.");
    }

    await markOtpConsumed(activeOtp.id);
}