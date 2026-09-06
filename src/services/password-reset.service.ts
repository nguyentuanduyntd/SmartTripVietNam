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

async function requireValidPasswordResetOtp(email: string, otp: string) {
  const activeOtp = await findActiveOtp(email);

  if (!activeOtp) {
    throw new InvalidOtpError();
  }

  if (activeOtp.attempts >= MAX_VERIFY_ATTEMPTS) {
    throw new InvalidOtpError("Mã OTP đã bị khoá do nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.");
  }

  if (!verifyOtpHash(otp, activeOtp.otpHash)) {
    await incrementOtpAttempts(activeOtp.id);

    const remaining = MAX_VERIFY_ATTEMPTS - (activeOtp.attempts + 1);

    throw new InvalidOtpError(
      remaining > 0
        ? `Mã OTP không đúng. Bạn còn ${remaining} lần thử.`
        : "Mã OTP đã bị khoá do nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.",
    );
  }

  return activeOtp;
}

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

  if (!userId) {
    return;
  }

  try {
    await sendPasswordResetOtpEmail(email, otp);
  } catch (error) {
    console.error("[SEND OTP EMAIL ERROR]", error);
  }
}

export async function verifyPasswordResetOtp(email: string, otp: string): Promise<void> {
  await requireValidPasswordResetOtp(email, otp);
}

export async function resetPasswordWithOtp(email: string, otp: string, newPassword: string): Promise<void> {
  const activeOtp = await requireValidPasswordResetOtp(email, otp);

  const userId = await findAuthUserIdByEmail(email);

  if (!userId) {
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
