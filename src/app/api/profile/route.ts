import { createClient } from "@/src/lib/supabase/server";
import { updateProfileSchema } from "@/src/schemas/profile.schema";
import { updateProfileBasics } from "@/src/services/profile.service";
import {
    errorResponse,
    successResponse,
    zodErrorToFieldErrors,
} from "@/src/utils/api_response";

export async function PATCH(
    request: Request,
) {
    const supabase = await createClient();

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return errorResponse(
            "Bạn cần đăng nhập để cập nhật tài khoản",
            401,
        );
    }

    let body: unknown;

    try {
        body = await request.json();
    } catch {
        return errorResponse(
            "Dữ liệu gửi lên không hợp lệ",
            400,
        );
    }

    const parsed =
        updateProfileSchema.safeParse(
            body,
        );

    if (!parsed.success) {
        return errorResponse(
            "Thông tin tài khoản không hợp lệ",
            400,
            zodErrorToFieldErrors(
                parsed.error,
            ),
        );
    }

    try {
        const profile =
            await updateProfileBasics(
                user.id,
                parsed.data,
            );

        /*
         * Đồng bộ tên vào metadata để tên mới vẫn hiển thị
         * nếu việc đọc bảng profiles tạm thời gặp lỗi.
         */
        const { error: metadataError } =
            await supabase.auth.updateUser({
                data: {
                    full_name:
                        profile.fullName,
                },
            });

        if (metadataError) {
            console.warn(
                "[PROFILE METADATA SYNC ERROR]",
                metadataError,
            );
        }

        return successResponse(
            profile,
            {
                message:
                    "Cập nhật thông tin thành công",
            },
        );
    } catch (error) {
        console.error(
            "[PROFILE UPDATE ERROR]",
            error,
        );

        return errorResponse(
            "Chưa thể cập nhật tài khoản lúc này",
            500,
        );
    }
}
