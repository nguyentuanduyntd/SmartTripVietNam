import { forgotPasswordRequestSchema } from "@/src/schemas/auth.schema";
import {
    TooManyOtpRequestsError,
    requestPasswordResetOtp,
} from "@/src/services/password-reset.service";
import { errorResponse, successResponse, zodErrorToFieldErrors } from "@/src/utils/api_response";

export async function POST(request: Request) {
    const body = await request.json().catch(() => null);
    const parsed = forgotPasswordRequestSchema.safeParse(body);

    if (!parsed.success) {
        return errorResponse("Dữ liệu không hợp lệ", 400, zodErrorToFieldErrors(parsed.error));
    }

    try {
        await requestPasswordResetOtp(parsed.data.email);
    } catch (error) {
        if (error instanceof TooManyOtpRequestsError) {
            return errorResponse(error.message, 429);
        }

        throw error;
    }

    // Luôn trả message chung chung, không tiết lộ email có tồn tại hay không.
    return successResponse(null, {
        message: "Nếu email tồn tại trong hệ thống, mã OTP đã được gửi tới hộp thư của bạn.",
    });
}