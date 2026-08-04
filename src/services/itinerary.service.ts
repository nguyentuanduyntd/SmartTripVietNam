import "server-only";

import type { ItineraryStatus } from "@/src/constants/itinerary";
import type {
    CloneTourToItineraryRequest,
    UpdateItineraryRequest,
} from "@/src/db/schema/itinerary.schema";
import {
    clonePublishedTourToItinerary,
    findUserItineraryById,
} from "@/src/repositories/itinerary.repository";
import {
    findUserItineraryPlannerDetailById,
    updateUserItineraryPlannerById,
    type UpdateUserItineraryPlannerRecord,
    type UserItineraryPlannerDetail,
} from "@/src/repositories/itinerary-planner.repository";

type PlannerStatus =
    | "draft"
    | "planned"
    | "completed";

const MAX_TRAVELERS = 50;

const ALLOWED_STATUS_TRANSITIONS: Record<
    ItineraryStatus,
    readonly PlannerStatus[]
> = {
    draft: ["draft", "planned"],
    planned: [
        "draft",
        "planned",
        "completed",
    ],
    completed: [
        "planned",
        "completed",
    ],
    archived: [],
};

export class ItineraryServiceError extends Error {
    constructor(
        message: string,
        public readonly status:
            | 400
            | 404
            | 409,
        public readonly errors?: Record<
            string,
            string[]
        >,
    ) {
        super(message);

        this.name = "ItineraryServiceError";
    }
}

function badRequest(
    message: string,
    errors?: Record<string, string[]>,
): never {
    throw new ItineraryServiceError(
        message,
        400,
        errors,
    );
}

function notFound(message: string): never {
    throw new ItineraryServiceError(
        message,
        404,
    );
}

function conflict(
    message: string,
    errors?: Record<string, string[]>,
): never {
    throw new ItineraryServiceError(
        message,
        409,
        errors,
    );
}

function ensureStatusTransition(
    currentStatus: ItineraryStatus,
    nextStatus: PlannerStatus,
) {
    const allowedStatuses:
        readonly PlannerStatus[] =
        ALLOWED_STATUS_TRANSITIONS[
            currentStatus
        ];

    if (
        !allowedStatuses.includes(
            nextStatus,
        )
    ) {
        conflict(
            `Không thể chuyển trạng thái từ "${currentStatus}" sang "${nextStatus}"`,
            {
                status: [
                    "Chuyển trạng thái hành trình không hợp lệ",
                ],
            },
        );
    }
}

function ensureTravelerCountIsValid(
    adultCount: number,
    childCount: number,
) {
    if (
        adultCount + childCount >
        MAX_TRAVELERS
    ) {
        badRequest(
            "Số lượng hành khách không hợp lệ",
            {
                childCount: [
                    `Tổng số người không được vượt quá ${MAX_TRAVELERS}`,
                ],
            },
        );
    }
}

function ensurePlannerReady(
    itinerary: Pick<
        UserItineraryPlannerDetail,
        | "title"
        | "startDate"
        | "days"
    >,
) {
    const errors: Record<
        string,
        string[]
    > = {};

    if (!itinerary.title.trim()) {
        errors.title = [
            "Hành trình phải có tên",
        ];
    }

    if (!itinerary.startDate) {
        errors.startDate = [
            "Hành trình phải có ngày khởi hành",
        ];
    }

    if (itinerary.days.length === 0) {
        errors.days = [
            "Hành trình phải có ít nhất một ngày",
        ];
    } else {
        const dayNumbers = itinerary.days
            .map((day) => day.dayNumber)
            .sort(
                (left, right) =>
                    left - right,
            );

        const missingDayNumbers: number[] =
            [];

        for (
            let dayNumber = 1;
            dayNumber <=
            dayNumbers.length;
            dayNumber += 1
        ) {
            if (
                dayNumbers[
                    dayNumber - 1
                ] !== dayNumber
            ) {
                missingDayNumbers.push(
                    dayNumber,
                );
            }
        }

        if (
            missingDayNumbers.length > 0
        ) {
            errors.days = [
                `Lịch trình phải có số ngày liên tục từ 1. Đang thiếu ngày: ${missingDayNumbers.join(
                    ", ",
                )}`,
            ];
        }
    }

    if (
        Object.keys(errors).length >
        0
    ) {
        badRequest(
            "Hành trình chưa đủ điều kiện để chuyển trạng thái",
            errors,
        );
    }
}

function hasOverviewChanges(
    input: UpdateItineraryRequest,
) {
    return Object.entries(input).some(
        ([field, value]) =>
            field !== "status" &&
            value !== undefined,
    );
}

/**
 * Sao chép một tour mẫu đã được xuất bản thành hành trình
 * cá nhân thuộc tài khoản hiện tại.
 *
 * userId phải lấy từ phiên đăng nhập phía server,
 * tuyệt đối không nhận từ request body.
 */
export async function cloneTourToItineraryService(
    input: CloneTourToItineraryRequest,
    userId: string,
) {
    const result =
        await clonePublishedTourToItinerary(
            {
                userId,

                sourceTourId:
                    input.sourceTourId,

                title:
                    input.title,

                startDate:
                    input.startDate,

                adultCount:
                    input.adultCount,

                childCount:
                    input.childCount,

                roomCount:
                    input.roomCount,
            },
        );

    if (!result) {
        notFound(
            "Không tìm thấy tour mẫu",
        );
    }

    return {
        id:
            result.itinerary.id,

        title:
            result.itinerary.title,

        status:
            result.itinerary.status,

        source:
            result.itinerary.source,

        sourceTourId:
            result.itinerary
                .sourceTourId,

        startDate:
            result.itinerary.startDate,

        adultCount:
            result.itinerary
                .adultCount,

        childCount:
            result.itinerary
                .childCount,

        roomCount:
            result.itinerary.roomCount,

        copied:
            result.copied,
    };
}

/**
 * Đọc thông tin cơ bản của một hành trình cá nhân.
 */
export async function getUserItineraryByIdService(
    itineraryId: string,
    userId: string,
) {
    const itinerary =
        await findUserItineraryById(
            itineraryId,
            userId,
        );

    if (!itinerary) {
        notFound(
            "Không tìm thấy hành trình",
        );
    }

    return itinerary;
}

/**
 * Đọc toàn bộ dữ liệu dùng cho trang `/planner/[id]`.
 */
export async function getUserItineraryPlannerDetailService(
    itineraryId: string,
    userId: string,
) {
    const itinerary =
        await findUserItineraryPlannerDetailById(
            itineraryId,
            userId,
        );

    if (!itinerary) {
        notFound(
            "Không tìm thấy hành trình",
        );
    }

    return itinerary;
}

/**
 * Cập nhật thông tin chung và trạng thái của hành trình.
 *
 * Quy tắc trạng thái:
 *
 * - draft     -> planned
 * - planned   -> draft hoặc completed
 * - completed -> planned để mở lại
 * - archived  -> không chỉnh sửa qua trang planner
 */
export async function updateUserItineraryPlannerService(
    itineraryId: string,
    userId: string,
    input: UpdateItineraryRequest,
) {
    const current =
        await findUserItineraryPlannerDetailById(
            itineraryId,
            userId,
        );

    if (!current) {
        notFound(
            "Không tìm thấy hành trình",
        );
    }

    if (
        current.status ===
        "archived"
    ) {
        conflict(
            "Hành trình đã lưu trữ và không thể chỉnh sửa",
        );
    }

    const nextStatus: PlannerStatus =
        input.status ??
        current.status;

    ensureStatusTransition(
        current.status,
        nextStatus,
    );

    if (
        current.status ===
            "completed" &&
        hasOverviewChanges(input) &&
        input.status !== "planned"
    ) {
        conflict(
            "Hành trình đã hoàn thành. Hãy mở lại về trạng thái đã lên kế hoạch trước khi chỉnh sửa.",
            {
                status: [
                    "Chuyển trạng thái về planned để tiếp tục chỉnh sửa",
                ],
            },
        );
    }

    const nextAdultCount =
        input.adultCount ??
        current.adultCount;

    const nextChildCount =
        input.childCount ??
        current.childCount;

    ensureTravelerCountIsValid(
        nextAdultCount,
        nextChildCount,
    );

    const candidate = {
        title:
            input.title ??
            current.title,

        startDate:
            input.startDate ??
            current.startDate,

        days:
            current.days,
    };

    if (
        nextStatus === "planned" ||
        nextStatus === "completed"
    ) {
        ensurePlannerReady(candidate);
    }

    const updateData: UpdateUserItineraryPlannerRecord =
        {};

    if (
        input.title !== undefined
    ) {
        updateData.title =
            input.title;
    }

    if (
        input.description !==
        undefined
    ) {
        updateData.description =
            input.description;
    }

    if (
        input.startDate !==
        undefined
    ) {
        updateData.startDate =
            input.startDate;
    }

    if (
        input.adultCount !==
        undefined
    ) {
        updateData.adultCount =
            input.adultCount;
    }

    if (
        input.childCount !==
        undefined
    ) {
        updateData.childCount =
            input.childCount;
    }

    if (
        input.roomCount !==
        undefined
    ) {
        updateData.roomCount =
            input.roomCount;
    }

    if (
        input.meetingPoint !==
        undefined
    ) {
        updateData.meetingPoint =
            input.meetingPoint;
    }

    if (
        input.status !== undefined
    ) {
        updateData.status =
            input.status;
    }

    const updated =
        await updateUserItineraryPlannerById(
            itineraryId,
            userId,
            updateData,
        );

    if (!updated) {
        notFound(
            "Không tìm thấy hành trình",
        );
    }

    const detail =
        await findUserItineraryPlannerDetailById(
            itineraryId,
            userId,
        );

    if (!detail) {
        throw new Error(
            "Hành trình đã cập nhật nhưng không thể đọc lại dữ liệu",
        );
    }

    return detail;
}