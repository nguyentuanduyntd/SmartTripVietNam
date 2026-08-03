import { z } from "zod";

const MAX_TRAVELERS = 50;
const MAX_ROOMS = 30;

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

    const date = new Date(Date.UTC(year, month - 1, day));

    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
}

const uuidSchema = (fieldName: string) =>
    z.string().uuid(`${fieldName} không đúng định dạng UUID`);

export const itineraryTitleSchema = z
    .string()
    .trim()
    .min(2, "Tên hành trình phải có ít nhất 2 ký tự")
    .max(200, "Tên hành trình không được vượt quá 200 ký tự");

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

export const itineraryAdultCountSchema = z
    .number({
        error: "Số người lớn phải là số",
    })
    .int("Số người lớn phải là số nguyên")
    .min(1, "Hành trình phải có ít nhất 1 người lớn")
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
    .min(1, "Hành trình phải có ít nhất 1 phòng")
    .max(
        MAX_ROOMS,
        `Số phòng không được vượt quá ${MAX_ROOMS}`,
    );

/**
 * Dữ liệu người dùng nhập trong hộp thiết lập
 * trước khi sao chép tour mẫu.
 */
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

/**
 * Body gửi đến API:
 *
 * POST /api/itineraries/from-tour
 */
export const cloneTourToItineraryRequestSchema =
    itinerarySetupFormSchema.safeExtend({
        sourceTourId: uuidSchema("Tour nguồn"),
    });

export const itineraryIdParamsSchema = z
    .object({
        id: uuidSchema("Itinerary ID"),
    })
    .strict();

export type ItinerarySetupForm = z.infer<
    typeof itinerarySetupFormSchema
>;

export type CloneTourToItineraryRequest = z.infer<
    typeof cloneTourToItineraryRequestSchema
>;

export type ItineraryIdParams = z.infer<
    typeof itineraryIdParamsSchema
>;