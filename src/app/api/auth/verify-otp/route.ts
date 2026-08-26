import { verifyPasswordResetOtpRequestSchema } from "@/src/schemas/auth.schema";
import {
    InvalidOtpError,
    verifyPasswordResetOtp,
} from "@/src/services/password-reset.service";
import {
    errorResponse,
    successResponse,
    zodErrorToFieldErrors,
} from "@/src/utils/api_response";

export async function POST(request: Request) {
    const body = await request.json().catch(() => null);
    const parsed = verifyPasswordResetOtpRequestSchema.safeParse(body);

    if (!parsed.success) {
        return errorResponse(
            "Dữ liệu không hợp lệ",
            400,
            zodErrorToFieldErrors(parsed.error),
        );
    }

    try {
        await verifyPasswordResetOtp(parsed.data.email, parsed.data.otp);
    } catch (error) {
        if (error instanceof InvalidOtpError) {
            return errorResponse(error.message, 400, undefined, {
                code: "INVALID_OTP",
            });
        }

        throw error;
    }

    return successResponse(null, {
        message: "Mã OTP hợp lệ. Bạn có thể tạo mật khẩu mới.",
    });
}
