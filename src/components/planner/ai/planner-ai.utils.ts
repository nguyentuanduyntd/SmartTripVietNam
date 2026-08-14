import type {
    AiPlannerRequest,
    ApiPayload,
    FormState,
    LocationOption,
} from "@/src/components/planner/ai/ai-planner.types";

/* -------------------------------------------------------------------------- */
/* Initial form                                                               */
/* -------------------------------------------------------------------------- */

export function createInitialPlannerForm(
    locations:
        LocationOption[],
): FormState {
    return {
        locationId:
            locations[0]
                ?.id ?? "",

        startDate:
            "",

        dayCount:
            2,

        adultCount:
            2,

        childCount:
            0,

        roomCount:
            1,

        budget:
            "5000000",

        pace:
            "balanced",

        interests: [
            "Biển",
            "Ẩm thực",
        ],

        note:
            "",
    };
}

/* -------------------------------------------------------------------------- */
/* Budget                                                                     */
/* -------------------------------------------------------------------------- */

export function normalizeBudget(
    value: string,
) {
    const normalized =
        value.replace(
            /[^\d]/g,
            "",
        );

    if (!normalized) {
        return undefined;
    }

    const result =
        Number(
            normalized,
        );

    if (
        !Number.isFinite(
            result,
        ) ||
        result <= 0
    ) {
        return undefined;
    }

    return Math.trunc(
        result,
    );
}

/* -------------------------------------------------------------------------- */
/* Request builder                                                            */
/* -------------------------------------------------------------------------- */

export function buildPlannerRequest(
    form: FormState,
): AiPlannerRequest | null {
    if (
        !form.locationId ||
        !form.startDate ||
        form.interests.length ===
            0
    ) {
        return null;
    }

    const budget =
        normalizeBudget(
            form.budget,
        );

    return {
        locationId:
            form.locationId,

        startDate:
            form.startDate,

        dayCount:
            form.dayCount,

        adultCount:
            form.adultCount,

        childCount:
            form.childCount,

        roomCount:
            form.roomCount,

        ...(budget
            ? {
                  budget,
              }
            : {}),

        pace:
            form.pace,

        interests:
            form.interests,

        ...(form.note.trim()
            ? {
                  note:
                      form.note.trim(),
              }
            : {}),
    };
}

/* -------------------------------------------------------------------------- */
/* Compare request                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Dùng để phát hiện user đã sửa form
 * sau khi Generate.
 *
 * Nếu request thay đổi thì preview cũ
 * không được Save bằng generationProof cũ.
 */
export function arePlannerRequestsEqual(
    first:
        AiPlannerRequest | null,
    second:
        AiPlannerRequest | null,
) {
    if (
        !first ||
        !second
    ) {
        return (
            first === second
        );
    }

    return (
        JSON.stringify(
            first,
        ) ===
        JSON.stringify(
            second,
        )
    );
}

/* -------------------------------------------------------------------------- */
/* API response                                                               */
/* -------------------------------------------------------------------------- */

export async function readPlannerApiResponse<T>(
    response: Response,
): Promise<
    ApiPayload<T>
> {
    const contentType =
        response.headers.get(
            "content-type",
        );

    if (
        !contentType?.includes(
            "application/json",
        )
    ) {
        const body =
            await response.text();

        console.error(
            "[AI PLANNER NON JSON RESPONSE]",
            {
                url:
                    response.url,

                status:
                    response.status,

                contentType,

                body:
                    body.slice(
                        0,
                        500,
                    ),
            },
        );

        return {
            success: false,

            message:
                response.status ===
                404
                    ? "Không tìm thấy API AI Planner. Hãy kiểm tra route trong src/app/api/ai/itinerary."
                    : `Server trả về dữ liệu không hợp lệ (${response.status}). Hãy kiểm tra Terminal.`,
        };
    }

    try {
        return (
            await response.json()
        ) as ApiPayload<T>;
    } catch (
        parseError
    ) {
        console.error(
            "[AI PLANNER JSON PARSE ERROR]",
            parseError,
        );

        return {
            success: false,

            message:
                "Không thể đọc dữ liệu trả về từ server.",
        };
    }
}