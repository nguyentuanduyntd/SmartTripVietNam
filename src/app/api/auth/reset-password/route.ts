import { resetPasswordWithOtpRequestSchema } from "@/src/schemas/auth.schema";
import { InvalidOtpError, resetPasswordWithOtp } from "@/src/services/password-reset.service";
import { errorResponse, successResponse, zodErrorToFieldErrors } from "@/src/utils/api_response";

export async function POST(request: Request) {
    const body = await request.json().catch(() => null);
    const parsed = resetPasswordWithOtpRequestSchema.safeParse(body);

    if (!parsed.success) {
        return errorResponse("Dữ liệu không hợp lệ", 400, zodErrorToFieldErrors(parsed.error));
    }

    try {
        await resetPasswordWithOtp(parsed.data.email, parsed.data.otp, parsed.data.newPassword);
    } catch (error) {
        if (error instanceof InvalidOtpError) {
            return errorResponse(error.message, 400);
        }

        throw error;
    }

    return successResponse(null, {
        message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.",
    });
}