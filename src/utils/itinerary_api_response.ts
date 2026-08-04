import "server-only";

import { ItineraryServiceError } from "@/src/services/itinerary.service";
import { errorResponse } from "@/src/utils/api_response";

type FieldErrors = Record<string, string[]>;

type PostgresErrorLike = {
    code?: string;
    constraint?: string;
    constraint_name?: string;
};

function getPostgresError(
    error: unknown,
): PostgresErrorLike | null {
    if (
        typeof error !== "object" ||
        error === null
    ) {
        return null;
    }

    const candidate =
        error as Record<string, unknown>;

    const directCode =
        typeof candidate.code === "string"
            ? candidate.code
            : undefined;

    if (directCode) {
        return {
            code: directCode,

            constraint:
                typeof candidate.constraint ===
                "string"
                    ? candidate.constraint
                    : undefined,

            constraint_name:
                typeof candidate
                    .constraint_name ===
                "string"
                    ? candidate.constraint_name
                    : undefined,
        };
    }

    /*
     * Một số lỗi từ Drizzle hoặc PostgreSQL driver
     * được đặt trong thuộc tính `cause`.
     */
    const cause = candidate.cause;

    if (
        typeof cause !== "object" ||
        cause === null
    ) {
        return null;
    }

    const causeCandidate =
        cause as Record<string, unknown>;

    const causeCode =
        typeof causeCandidate.code ===
        "string"
            ? causeCandidate.code
            : undefined;

    if (!causeCode) {
        return null;
    }

    return {
        code: causeCode,

        constraint:
            typeof causeCandidate.constraint ===
            "string"
                ? causeCandidate.constraint
                : undefined,

        constraint_name:
            typeof causeCandidate
                .constraint_name ===
            "string"
                ? causeCandidate.constraint_name
                : undefined,
    };
}

function getUniqueConstraintErrors(
    constraintName: string | undefined,
): FieldErrors | undefined {
    if (!constraintName) {
        return undefined;
    }

    const errors: FieldErrors = {};

    if (
        constraintName.includes(
            "day_number",
        )
    ) {
        errors.dayNumber = [
            "Số thứ tự ngày đã tồn tại trong hành trình",
        ];

        return errors;
    }

    if (
        constraintName.includes(
            "sort_order",
        )
    ) {
        errors.sortOrder = [
            "Thứ tự đã tồn tại",
        ];

        return errors;
    }

    return undefined;
}

/**
 * Chuyển lỗi nghiệp vụ và lỗi database của module itinerary
 * thành HTTP response thống nhất.
 */
export function handleItineraryServiceError(
    error: unknown,
) {
    if (
        error instanceof
        ItineraryServiceError
    ) {
        return errorResponse(
            error.message,
            error.status,
            error.errors,
        );
    }

    const postgresError =
        getPostgresError(error);

    if (
        postgresError?.code ===
        "23505"
    ) {
        const constraintName =
            postgresError.constraint_name ??
            postgresError.constraint;

        return errorResponse(
            "Dữ liệu bị trùng với bản ghi hiện có",
            409,
            getUniqueConstraintErrors(
                constraintName,
            ),
        );
    }

    if (
        postgresError?.code ===
        "23503"
    ) {
        return errorResponse(
            "Dữ liệu liên quan không tồn tại hoặc đang được sử dụng",
            409,
        );
    }

    if (
        postgresError?.code ===
        "23514"
    ) {
        return errorResponse(
            "Dữ liệu không thỏa mãn ràng buộc của hệ thống",
            400,
        );
    }

    if (
        postgresError?.code ===
        "22P02"
    ) {
        return errorResponse(
            "Dữ liệu không đúng định dạng",
            400,
        );
    }

    console.error(
        "Unhandled itinerary API error",
        error,
    );

    return errorResponse(
        "Đã xảy ra lỗi khi xử lý hành trình",
        500,
    );
}