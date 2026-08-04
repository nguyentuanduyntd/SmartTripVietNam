import { z } from "zod";

import {
    COST_CALCULATION_UNITS,
    COST_CATEGORIES,
    ITINERARY_STATUSES,
    TRAVELER_SCOPES,
} from "@/src/constants/itinerary";
import {
    MEAL_TYPES,
    TRANSPORT_METHODS,
} from "@/src/constants/tour_community";

const MAX_TRAVELERS = 50;
const MAX_ROOMS = 30;
const MAX_TITLE_LENGTH = 200;
const MAX_SHORT_TEXT_LENGTH = 300;
const MAX_DESCRIPTION_LENGTH = 5_000;
const MAX_NOTE_LENGTH = 2_000;
const MAX_MONEY_VALUE = 999_999_999_999;
const MAX_QUANTITY_VALUE = 99_999_999.99;
const MAX_SORT_ORDER = 100_000;
const MAX_DAY_NUMBER = 365;
const MAX_TRAVEL_MINUTES = 10_080;

const PLANNER_STATUSES = [
    "draft",
    "planned",
    "completed",
] as const;

function isValidCalendarDate(value: string) {
    const [year, month, day] = value
        .split("-")
        .map((part) => Number(part));

    if (
        !Number.isInteger(year) ||
        !Number.isInteger(month) ||
        !Number.isInteger(day)
    ) {
        return false;
    }

    const date = new Date(
        Date.UTC(year, month - 1, day),
    );

    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
}

function timeToSeconds(value: string) {
    const [hour, minute, second = "0"] =
        value.split(":");

    return (
        Number(hour) * 3_600 +
        Number(minute) * 60 +
        Number(second)
    );
}

function hasAtLeastOneDefinedValue(
    data: object,
) {
    return Object.values(data).some(
        (value) => value !== undefined,
    );
}

function addDuplicateIssues(
    values: Array<string | number | null>,
    pathPrefix: string,
    fieldName: string,
    message: string,
    context: z.RefinementCtx,
) {
    const seen = new Map<
        string | number,
        number
    >();

    values.forEach((value, index) => {
        if (value === null) {
            return;
        }

        const previousIndex = seen.get(value);

        if (previousIndex !== undefined) {
            context.addIssue({
                code: "custom",
                path: [
                    pathPrefix,
                    index,
                    fieldName,
                ],
                message,
            });

            return;
        }

        seen.set(value, index);
    });
}

export const itineraryUuidSchema = (
    fieldName: string,
) =>
    z
        .string()
        .trim()
        .uuid(
            `${fieldName} không đúng định dạng UUID`,
        );

export const itineraryStatusSchema = z.enum(
    ITINERARY_STATUSES,
);

export const plannerStatusSchema = z.enum(
    PLANNER_STATUSES,
);

export const itineraryTitleSchema = z
    .string()
    .trim()
    .min(
        2,
        "Tên hành trình phải có ít nhất 2 ký tự",
    )
    .max(
        MAX_TITLE_LENGTH,
        `Tên hành trình không được vượt quá ${MAX_TITLE_LENGTH} ký tự`,
    );

export const itineraryDescriptionSchema = z
    .string()
    .trim()
    .max(
        MAX_DESCRIPTION_LENGTH,
        `Mô tả không được vượt quá ${MAX_DESCRIPTION_LENGTH} ký tự`,
    )
    .nullable();

export const itineraryShortTextSchema = (
    fieldName: string,
) =>
    z
        .string()
        .trim()
        .max(
            MAX_SHORT_TEXT_LENGTH,
            `${fieldName} không được vượt quá ${MAX_SHORT_TEXT_LENGTH} ký tự`,
        )
        .nullable();

export const itineraryNoteSchema = z
    .string()
    .trim()
    .max(
        MAX_NOTE_LENGTH,
        `Ghi chú không được vượt quá ${MAX_NOTE_LENGTH} ký tự`,
    )
    .nullable();

export const itineraryStartDateSchema = z
    .string()
    .trim()
    .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "Ngày khởi hành phải có định dạng YYYY-MM-DD",
    )
    .refine(
        isValidCalendarDate,
        "Ngày khởi hành không hợp lệ",
    );

export const itineraryTimeSchema = z
    .string()
    .trim()
    .regex(
        /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/,
        "Thời gian phải có định dạng HH:mm hoặc HH:mm:ss",
    );

export const itineraryAdultCountSchema = z
    .number({
        error: "Số người lớn phải là số",
    })
    .int("Số người lớn phải là số nguyên")
    .min(
        1,
        "Hành trình phải có ít nhất 1 người lớn",
    )
    .max(
        MAX_TRAVELERS,
        `Số người lớn không được vượt quá ${MAX_TRAVELERS}`,
    );

export const itineraryChildCountSchema = z
    .number({
        error: "Số trẻ em phải là số",
    })
    .int("Số trẻ em phải là số nguyên")
    .min(0, "Số trẻ em không được âm")
    .max(
        MAX_TRAVELERS,
        `Số trẻ em không được vượt quá ${MAX_TRAVELERS}`,
    );

export const itineraryRoomCountSchema = z
    .number({
        error: "Số phòng phải là số",
    })
    .int("Số phòng phải là số nguyên")
    .min(
        1,
        "Hành trình phải có ít nhất 1 phòng",
    )
    .max(
        MAX_ROOMS,
        `Số phòng không được vượt quá ${MAX_ROOMS}`,
    );

export const itinerarySortOrderSchema = z
    .number({
        error: "Thứ tự phải là số",
    })
    .int("Thứ tự phải là số nguyên")
    .min(0, "Thứ tự không được âm")
    .max(
        MAX_SORT_ORDER,
        "Thứ tự vượt quá giới hạn cho phép",
    );

export const itineraryDayNumberSchema = z
    .number({
        error: "Số ngày phải là số",
    })
    .int("Số ngày phải là số nguyên")
    .min(1, "Số ngày phải lớn hơn 0")
    .max(
        MAX_DAY_NUMBER,
        `Số ngày không được vượt quá ${MAX_DAY_NUMBER}`,
    );

export const itineraryMoneySchema = z
    .number({
        error: "Số tiền phải là số",
    })
    .finite("Số tiền không hợp lệ")
    .min(0, "Số tiền không được âm")
    .max(
        MAX_MONEY_VALUE,
        "Số tiền vượt quá giới hạn cho phép",
    );

export const itineraryQuantitySchema = z
    .number({
        error: "Số lượng phải là số",
    })
    .finite("Số lượng không hợp lệ")
    .gt(0, "Số lượng phải lớn hơn 0")
    .max(
        MAX_QUANTITY_VALUE,
        "Số lượng vượt quá giới hạn cho phép",
    );

/* -------------------------------------------------------------------------- */
/* Setup and overview                                                         */
/* -------------------------------------------------------------------------- */

export const itinerarySetupFormSchema = z
    .object({
        title: itineraryTitleSchema,
        startDate: itineraryStartDateSchema,
        adultCount: itineraryAdultCountSchema,
        childCount: itineraryChildCountSchema,
        roomCount: itineraryRoomCountSchema,
    })
    .strict()
    .superRefine((data, context) => {
        const travelerCount =
            data.adultCount + data.childCount;

        if (travelerCount > MAX_TRAVELERS) {
            context.addIssue({
                code: "custom",
                path: ["childCount"],
                message: `Tổng số người không được vượt quá ${MAX_TRAVELERS}`,
            });
        }
    });

export const cloneTourToItineraryRequestSchema =
    itinerarySetupFormSchema.safeExtend({
        sourceTourId:
            itineraryUuidSchema("Tour nguồn"),
    });

export const itineraryOverviewFormSchema = z
    .object({
        title: itineraryTitleSchema,

        description:
            itineraryDescriptionSchema.default(
                null,
            ),

        startDate: itineraryStartDateSchema,

        adultCount: itineraryAdultCountSchema,

        childCount: itineraryChildCountSchema,

        roomCount: itineraryRoomCountSchema,

        meetingPoint:
            itineraryShortTextSchema(
                "Điểm tập trung",
            ).default(null),
    })
    .strict()
    .superRefine((data, context) => {
        const travelerCount =
            data.adultCount + data.childCount;

        if (travelerCount > MAX_TRAVELERS) {
            context.addIssue({
                code: "custom",
                path: ["childCount"],
                message: `Tổng số người không được vượt quá ${MAX_TRAVELERS}`,
            });
        }
    });

export const updateItineraryRequestSchema = z
    .object({
        title: itineraryTitleSchema.optional(),

        description:
            itineraryDescriptionSchema.optional(),

        startDate:
            itineraryStartDateSchema.optional(),

        adultCount:
            itineraryAdultCountSchema.optional(),

        childCount:
            itineraryChildCountSchema.optional(),

        roomCount:
            itineraryRoomCountSchema.optional(),

        meetingPoint:
            itineraryShortTextSchema(
                "Điểm tập trung",
            ).optional(),

        status: plannerStatusSchema.optional(),
    })
    .strict()
    .refine(
        (data) =>
            hasAtLeastOneDefinedValue(data),
        {
            message:
                "Phải cung cấp ít nhất một trường cần cập nhật",
        },
    )
    .superRefine((data, context) => {
        if (
            data.adultCount !== undefined &&
            data.childCount !== undefined &&
            data.adultCount +
                data.childCount >
                MAX_TRAVELERS
        ) {
            context.addIssue({
                code: "custom",
                path: ["childCount"],
                message: `Tổng số người không được vượt quá ${MAX_TRAVELERS}`,
            });
        }
    });

export const updateItineraryStatusRequestSchema =
    z
        .object({
            status: plannerStatusSchema,
        })
        .strict();

/* -------------------------------------------------------------------------- */
/* Route params and move requests                                             */
/* -------------------------------------------------------------------------- */

export const itineraryIdParamsSchema = z
    .object({
        id: itineraryUuidSchema(
            "Itinerary ID",
        ),
    })
    .strict();

export const itineraryDayIdParamsSchema = z
    .object({
        id: itineraryUuidSchema(
            "Itinerary ID",
        ),

        dayId: itineraryUuidSchema(
            "Itinerary day ID",
        ),
    })
    .strict();

export const itineraryItemIdParamsSchema = z
    .object({
        id: itineraryUuidSchema(
            "Itinerary ID",
        ),

        itemId: itineraryUuidSchema(
            "Itinerary item ID",
        ),
    })
    .strict();

export const itineraryMealIdParamsSchema = z
    .object({
        id: itineraryUuidSchema(
            "Itinerary ID",
        ),

        mealId: itineraryUuidSchema(
            "Itinerary meal ID",
        ),
    })
    .strict();

export const itineraryStayIdParamsSchema = z
    .object({
        id: itineraryUuidSchema(
            "Itinerary ID",
        ),

        stayId: itineraryUuidSchema(
            "Itinerary stay ID",
        ),
    })
    .strict();

export const itineraryCostIdParamsSchema = z
    .object({
        id: itineraryUuidSchema(
            "Itinerary ID",
        ),

        costId: itineraryUuidSchema(
            "Itinerary cost ID",
        ),
    })
    .strict();

export const moveItineraryEntityRequestSchema =
    z
        .object({
            direction: z.enum([
                "up",
                "down",
            ]),
        })
        .strict();

/* -------------------------------------------------------------------------- */
/* Days                                                                       */
/* -------------------------------------------------------------------------- */

export const createItineraryDayRequestSchema =
    z
        .object({
            dayNumber:
                itineraryDayNumberSchema,

            title: z
                .string()
                .trim()
                .min(
                    2,
                    "Tiêu đề ngày phải có ít nhất 2 ký tự",
                )
                .max(
                    MAX_TITLE_LENGTH,
                    `Tiêu đề ngày không được vượt quá ${MAX_TITLE_LENGTH} ký tự`,
                ),

            description:
                itineraryDescriptionSchema.default(
                    null,
                ),
        })
        .strict();

export const updateItineraryDayRequestSchema =
    z
        .object({
            dayNumber:
                itineraryDayNumberSchema.optional(),

            title: z
                .string()
                .trim()
                .min(
                    2,
                    "Tiêu đề ngày phải có ít nhất 2 ký tự",
                )
                .max(
                    MAX_TITLE_LENGTH,
                    `Tiêu đề ngày không được vượt quá ${MAX_TITLE_LENGTH} ký tự`,
                )
                .optional(),

            description:
                itineraryDescriptionSchema.optional(),
        })
        .strict()
        .refine(
            (data) =>
                hasAtLeastOneDefinedValue(data),
            {
                message:
                    "Phải cung cấp ít nhất một trường của ngày cần cập nhật",
            },
        );

/* -------------------------------------------------------------------------- */
/* Activities                                                                 */
/* -------------------------------------------------------------------------- */

const itineraryItemBaseSchema = z
    .object({
        destinationId:
            itineraryUuidSchema(
                "Destination ID",
            )
                .nullable()
                .default(null),

        destinationName:
            itineraryShortTextSchema(
                "Tên địa điểm",
            ).default(null),

        title: z
            .string()
            .trim()
            .min(
                2,
                "Tên hoạt động phải có ít nhất 2 ký tự",
            )
            .max(
                MAX_TITLE_LENGTH,
                `Tên hoạt động không được vượt quá ${MAX_TITLE_LENGTH} ký tự`,
            ),

        description:
            itineraryDescriptionSchema.default(
                null,
            ),

        startTime:
            itineraryTimeSchema
                .nullable()
                .default(null),

        endTime:
            itineraryTimeSchema
                .nullable()
                .default(null),

        sortOrder:
            itinerarySortOrderSchema.default(0),

        transportMethod: z
            .enum(TRANSPORT_METHODS)
            .nullable()
            .default(null),

        transportNote:
            itineraryShortTextSchema(
                "Ghi chú di chuyển",
            ).default(null),

        estimatedTravelMinutes: z
            .number({
                error:
                    "Thời gian di chuyển phải là số",
            })
            .int(
                "Thời gian di chuyển phải là số nguyên",
            )
            .min(
                0,
                "Thời gian di chuyển không được âm",
            )
            .max(
                MAX_TRAVEL_MINUTES,
                "Thời gian di chuyển vượt quá giới hạn cho phép",
            )
            .nullable()
            .default(null),
    })
    .strict();

function validateItemTimeRange(
    data: {
        startTime?: string | null;
        endTime?: string | null;
    },
    context: z.RefinementCtx,
) {
    if (
        data.startTime &&
        data.endTime &&
        timeToSeconds(data.startTime) >=
            timeToSeconds(data.endTime)
    ) {
        context.addIssue({
            code: "custom",
            path: ["endTime"],
            message:
                "Giờ kết thúc phải sau giờ bắt đầu",
        });
    }
}

export const createItineraryItemRequestSchema =
    itineraryItemBaseSchema.superRefine(
        validateItemTimeRange,
    );

export const updateItineraryItemRequestSchema =
    z
        .object({
            destinationId:
                itineraryUuidSchema(
                    "Destination ID",
                )
                    .nullable()
                    .optional(),

            destinationName:
                itineraryShortTextSchema(
                    "Tên địa điểm",
                ).optional(),

            title: z
                .string()
                .trim()
                .min(
                    2,
                    "Tên hoạt động phải có ít nhất 2 ký tự",
                )
                .max(
                    MAX_TITLE_LENGTH,
                    `Tên hoạt động không được vượt quá ${MAX_TITLE_LENGTH} ký tự`,
                )
                .optional(),

            description:
                itineraryDescriptionSchema.optional(),

            startTime:
                itineraryTimeSchema
                    .nullable()
                    .optional(),

            endTime:
                itineraryTimeSchema
                    .nullable()
                    .optional(),

            sortOrder:
                itinerarySortOrderSchema.optional(),

            transportMethod: z
                .enum(TRANSPORT_METHODS)
                .nullable()
                .optional(),

            transportNote:
                itineraryShortTextSchema(
                    "Ghi chú di chuyển",
                ).optional(),

            estimatedTravelMinutes: z
                .number({
                    error:
                        "Thời gian di chuyển phải là số",
                })
                .int(
                    "Thời gian di chuyển phải là số nguyên",
                )
                .min(
                    0,
                    "Thời gian di chuyển không được âm",
                )
                .max(
                    MAX_TRAVEL_MINUTES,
                    "Thời gian di chuyển vượt quá giới hạn cho phép",
                )
                .nullable()
                .optional(),
        })
        .strict()
        .refine(
            (data) =>
                hasAtLeastOneDefinedValue(data),
            {
                message:
                    "Phải cung cấp ít nhất một trường của hoạt động cần cập nhật",
            },
        )
        .superRefine(
            validateItemTimeRange,
        );

/* -------------------------------------------------------------------------- */
/* Meals and cuisines                                                         */
/* -------------------------------------------------------------------------- */

export const itineraryMealCuisineInputSchema =
    z
        .object({
            cuisineId:
                itineraryUuidSchema(
                    "Cuisine ID",
                )
                    .nullable()
                    .default(null),

            cuisineName: z
                .string()
                .trim()
                .min(
                    1,
                    "Tên món ăn không được để trống",
                )
                .max(
                    MAX_SHORT_TEXT_LENGTH,
                    `Tên món ăn không được vượt quá ${MAX_SHORT_TEXT_LENGTH} ký tự`,
                ),

            sortOrder:
                itinerarySortOrderSchema.default(
                    0,
                ),

            note:
                itineraryNoteSchema.default(null),
        })
        .strict();

function validateMealCuisines(
    cuisines: Array<{
        cuisineId: string | null;
        sortOrder: number;
    }>,
    context: z.RefinementCtx,
) {
    addDuplicateIssues(
        cuisines.map(
            (item) => item.sortOrder,
        ),
        "cuisines",
        "sortOrder",
        "Thứ tự món ăn bị trùng",
        context,
    );

    addDuplicateIssues(
        cuisines.map(
            (item) => item.cuisineId,
        ),
        "cuisines",
        "cuisineId",
        "Cuisine bị trùng trong cùng bữa ăn",
        context,
    );
}

export const createItineraryMealRequestSchema =
    z
        .object({
            mealType: z.enum(MEAL_TYPES),

            startTime:
                itineraryTimeSchema
                    .nullable()
                    .default(null),

            venueName:
                itineraryShortTextSchema(
                    "Tên địa điểm ăn uống",
                ).default(null),

            note:
                itineraryNoteSchema.default(null),

            isIncluded:
                z.boolean().default(false),

            sortOrder:
                itinerarySortOrderSchema.default(
                    0,
                ),

            cuisines: z
                .array(
                    itineraryMealCuisineInputSchema,
                )
                .max(
                    50,
                    "Một bữa ăn không được có quá 50 món",
                )
                .default([]),
        })
        .strict()
        .superRefine((data, context) => {
            validateMealCuisines(
                data.cuisines,
                context,
            );
        });

export const updateItineraryMealRequestSchema =
    z
        .object({
            mealType:
                z.enum(MEAL_TYPES).optional(),

            startTime:
                itineraryTimeSchema
                    .nullable()
                    .optional(),

            venueName:
                itineraryShortTextSchema(
                    "Tên địa điểm ăn uống",
                ).optional(),

            note:
                itineraryNoteSchema.optional(),

            isIncluded:
                z.boolean().optional(),

            sortOrder:
                itinerarySortOrderSchema.optional(),

            cuisines: z
                .array(
                    itineraryMealCuisineInputSchema,
                )
                .max(
                    50,
                    "Một bữa ăn không được có quá 50 món",
                )
                .optional(),
        })
        .strict()
        .refine(
            (data) =>
                hasAtLeastOneDefinedValue(data),
            {
                message:
                    "Phải cung cấp ít nhất một trường của bữa ăn cần cập nhật",
            },
        )
        .superRefine((data, context) => {
            if (data.cuisines) {
                validateMealCuisines(
                    data.cuisines,
                    context,
                );
            }
        });

/* -------------------------------------------------------------------------- */
/* Accommodation                                                              */
/* -------------------------------------------------------------------------- */

function validateStayDateRange(
    data: {
        checkInDate?: string;
        checkOutDate?: string;
    },
    context: z.RefinementCtx,
) {
    if (
        data.checkInDate &&
        data.checkOutDate &&
        data.checkInDate >=
            data.checkOutDate
    ) {
        context.addIssue({
            code: "custom",
            path: ["checkOutDate"],
            message:
                "Ngày trả phòng phải sau ngày nhận phòng",
        });
    }
}

export const createItineraryStayRequestSchema =
    z
        .object({
            name: z
                .string()
                .trim()
                .min(
                    2,
                    "Tên nơi lưu trú phải có ít nhất 2 ký tự",
                )
                .max(
                    MAX_TITLE_LENGTH,
                    `Tên nơi lưu trú không được vượt quá ${MAX_TITLE_LENGTH} ký tự`,
                ),

            address:
                itineraryShortTextSchema(
                    "Địa chỉ",
                ).default(null),

            checkInDate:
                itineraryStartDateSchema,

            checkOutDate:
                itineraryStartDateSchema,

            roomCount:
                itineraryRoomCountSchema,

            pricePerRoomNight:
                itineraryMoneySchema.default(0),

            note:
                itineraryNoteSchema.default(null),

            sortOrder:
                itinerarySortOrderSchema.default(
                    0,
                ),
        })
        .strict()
        .superRefine(
            validateStayDateRange,
        );

export const updateItineraryStayRequestSchema =
    z
        .object({
            name: z
                .string()
                .trim()
                .min(
                    2,
                    "Tên nơi lưu trú phải có ít nhất 2 ký tự",
                )
                .max(
                    MAX_TITLE_LENGTH,
                    `Tên nơi lưu trú không được vượt quá ${MAX_TITLE_LENGTH} ký tự`,
                )
                .optional(),

            address:
                itineraryShortTextSchema(
                    "Địa chỉ",
                ).optional(),

            checkInDate:
                itineraryStartDateSchema.optional(),

            checkOutDate:
                itineraryStartDateSchema.optional(),

            roomCount:
                itineraryRoomCountSchema.optional(),

            pricePerRoomNight:
                itineraryMoneySchema.optional(),

            note:
                itineraryNoteSchema.optional(),

            sortOrder:
                itinerarySortOrderSchema.optional(),
        })
        .strict()
        .refine(
            (data) =>
                hasAtLeastOneDefinedValue(data),
            {
                message:
                    "Phải cung cấp ít nhất một trường của nơi lưu trú cần cập nhật",
            },
        )
        .superRefine(
            validateStayDateRange,
        );

/* -------------------------------------------------------------------------- */
/* Costs                                                                      */
/* -------------------------------------------------------------------------- */

const itineraryCostTargetFields = {
    itineraryDayId:
        itineraryUuidSchema(
            "Itinerary day ID",
        )
            .nullable()
            .default(null),

    itineraryItemId:
        itineraryUuidSchema(
            "Itinerary item ID",
        )
            .nullable()
            .default(null),

    itineraryMealId:
        itineraryUuidSchema(
            "Itinerary meal ID",
        )
            .nullable()
            .default(null),
};

function validateCostRules(
    data: {
        itineraryDayId?: string | null;
        itineraryItemId?: string | null;
        itineraryMealId?: string | null;

        calculationUnit?:
            | (typeof COST_CALCULATION_UNITS)[number];

        travelerScope?:
            | (typeof TRAVELER_SCOPES)[number];

        nightCount?: number | null;
    },
    context: z.RefinementCtx,
) {
    const targetCount = [
        data.itineraryDayId,
        data.itineraryItemId,
        data.itineraryMealId,
    ].filter(Boolean).length;

    if (targetCount > 1) {
        context.addIssue({
            code: "custom",
            path: ["itineraryDayId"],
            message:
                "Một khoản chi phí chỉ được gắn với tối đa một ngày, hoạt động hoặc bữa ăn",
        });
    }

    if (
        data.calculationUnit &&
        data.calculationUnit !==
            "per_person" &&
        data.travelerScope &&
        data.travelerScope !== "all"
    ) {
        context.addIssue({
            code: "custom",
            path: ["travelerScope"],
            message:
                "Phạm vi khách chỉ áp dụng cho chi phí tính theo người",
        });
    }

    if (
        data.calculationUnit &&
        data.calculationUnit !==
            "per_room" &&
        data.nightCount !== undefined &&
        data.nightCount !== null
    ) {
        context.addIssue({
            code: "custom",
            path: ["nightCount"],
            message:
                "Số đêm chỉ áp dụng cho chi phí tính theo phòng",
        });
    }
}

export const createItineraryCostRequestSchema =
    z
        .object({
            ...itineraryCostTargetFields,

            title: z
                .string()
                .trim()
                .min(
                    2,
                    "Tên khoản chi phải có ít nhất 2 ký tự",
                )
                .max(
                    MAX_TITLE_LENGTH,
                    `Tên khoản chi không được vượt quá ${MAX_TITLE_LENGTH} ký tự`,
                ),

            category:
                z.enum(COST_CATEGORIES),

            calculationUnit: z.enum(
                COST_CALCULATION_UNITS,
            ),

            travelerScope: z
                .enum(TRAVELER_SCOPES)
                .default("all"),

            unitPrice:
                itineraryMoneySchema.default(0),

            quantity:
                itineraryQuantitySchema.default(
                    1,
                ),

            nightCount: z
                .number({
                    error:
                        "Số đêm phải là số",
                })
                .int(
                    "Số đêm phải là số nguyên",
                )
                .min(
                    1,
                    "Số đêm phải lớn hơn 0",
                )
                .max(
                    365,
                    "Số đêm không được vượt quá 365",
                )
                .nullable()
                .default(null),

            note:
                itineraryNoteSchema.default(null),

            sortOrder:
                itinerarySortOrderSchema.default(
                    0,
                ),
        })
        .strict()
        .superRefine(validateCostRules);

export const updateItineraryCostRequestSchema =
    z
        .object({
            itineraryDayId:
                itineraryUuidSchema(
                    "Itinerary day ID",
                )
                    .nullable()
                    .optional(),

            itineraryItemId:
                itineraryUuidSchema(
                    "Itinerary item ID",
                )
                    .nullable()
                    .optional(),

            itineraryMealId:
                itineraryUuidSchema(
                    "Itinerary meal ID",
                )
                    .nullable()
                    .optional(),

            title: z
                .string()
                .trim()
                .min(
                    2,
                    "Tên khoản chi phải có ít nhất 2 ký tự",
                )
                .max(
                    MAX_TITLE_LENGTH,
                    `Tên khoản chi không được vượt quá ${MAX_TITLE_LENGTH} ký tự`,
                )
                .optional(),

            category: z
                .enum(COST_CATEGORIES)
                .optional(),

            calculationUnit: z
                .enum(
                    COST_CALCULATION_UNITS,
                )
                .optional(),

            travelerScope: z
                .enum(TRAVELER_SCOPES)
                .optional(),

            unitPrice:
                itineraryMoneySchema.optional(),

            quantity:
                itineraryQuantitySchema.optional(),

            nightCount: z
                .number({
                    error:
                        "Số đêm phải là số",
                })
                .int(
                    "Số đêm phải là số nguyên",
                )
                .min(
                    1,
                    "Số đêm phải lớn hơn 0",
                )
                .max(
                    365,
                    "Số đêm không được vượt quá 365",
                )
                .nullable()
                .optional(),

            note:
                itineraryNoteSchema.optional(),

            sortOrder:
                itinerarySortOrderSchema.optional(),
        })
        .strict()
        .refine(
            (data) =>
                hasAtLeastOneDefinedValue(data),
            {
                message:
                    "Phải cung cấp ít nhất một trường của khoản chi cần cập nhật",
            },
        )
        .superRefine(validateCostRules);

/* -------------------------------------------------------------------------- */
/* Inferred request types                                                     */
/* -------------------------------------------------------------------------- */

export type ItinerarySetupForm = z.infer<
    typeof itinerarySetupFormSchema
>;

export type CloneTourToItineraryRequest =
    z.infer<
        typeof cloneTourToItineraryRequestSchema
    >;

export type ItineraryOverviewForm = z.infer<
    typeof itineraryOverviewFormSchema
>;

export type UpdateItineraryRequest = z.infer<
    typeof updateItineraryRequestSchema
>;

export type UpdateItineraryStatusRequest =
    z.infer<
        typeof updateItineraryStatusRequestSchema
    >;

export type ItineraryIdParams = z.infer<
    typeof itineraryIdParamsSchema
>;

export type ItineraryDayIdParams = z.infer<
    typeof itineraryDayIdParamsSchema
>;

export type ItineraryItemIdParams = z.infer<
    typeof itineraryItemIdParamsSchema
>;

export type ItineraryMealIdParams = z.infer<
    typeof itineraryMealIdParamsSchema
>;

export type ItineraryStayIdParams = z.infer<
    typeof itineraryStayIdParamsSchema
>;

export type ItineraryCostIdParams = z.infer<
    typeof itineraryCostIdParamsSchema
>;

export type MoveItineraryEntityRequest =
    z.infer<
        typeof moveItineraryEntityRequestSchema
    >;

export type CreateItineraryDayRequest =
    z.infer<
        typeof createItineraryDayRequestSchema
    >;

export type UpdateItineraryDayRequest =
    z.infer<
        typeof updateItineraryDayRequestSchema
    >;

export type CreateItineraryItemRequest =
    z.infer<
        typeof createItineraryItemRequestSchema
    >;

export type UpdateItineraryItemRequest =
    z.infer<
        typeof updateItineraryItemRequestSchema
    >;

export type ItineraryMealCuisineInput =
    z.infer<
        typeof itineraryMealCuisineInputSchema
    >;

export type CreateItineraryMealRequest =
    z.infer<
        typeof createItineraryMealRequestSchema
    >;

export type UpdateItineraryMealRequest =
    z.infer<
        typeof updateItineraryMealRequestSchema
    >;

export type CreateItineraryStayRequest =
    z.infer<
        typeof createItineraryStayRequestSchema
    >;

export type UpdateItineraryStayRequest =
    z.infer<
        typeof updateItineraryStayRequestSchema
    >;

export type CreateItineraryCostRequest =
    z.infer<
        typeof createItineraryCostRequestSchema
    >;

export type UpdateItineraryCostRequest =
    z.infer<
        typeof updateItineraryCostRequestSchema
    >;