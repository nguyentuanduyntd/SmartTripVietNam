import "server-only";
import { RESEND_FROM_EMAIL, resend } from "@/src/lib/email/resend";

function buildOtpEmailHtml(otp: string) {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #173a3b;">
        <h2 style="margin-bottom: 4px;">Mã xác thực đặt lại mật khẩu</h2>
        <p style="color: #55625f;">
            Sử dụng mã bên dưới để đặt lại mật khẩu SmartTrip của bạn.
            Mã có hiệu lực trong 10 phút.
        </p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; background: #f7efe1; padding: 16px 24px; border-radius: 12px; text-align: center; margin: 24px 0;">
            ${otp}
        </div>
        <p style="color: #838f8c; font-size: 13px;">
            Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
            Không chia sẻ mã này cho bất kỳ ai.
        </p>
    </div>`;
}

export async function sendPasswordResetOtpEmail(email: string, otp: string) {
    await resend.emails.send({
        from: RESEND_FROM_EMAIL,
        to: email,
        subject: "Mã OTP đặt lại mật khẩu SmartTrip",
        html: buildOtpEmailHtml(otp),
    });
}