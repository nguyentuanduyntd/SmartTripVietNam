import { z } from "zod";

const isoDateSchema = z
    .string()
    .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "Ngày phải có định dạng YYYY-MM-DD.",
    );

const childAgeSchema = z
    .number()
    .int()
    .min(0)
    .max(17);

export const travelLodgingSearchSchema =
    z
        .object({
            locationName: z
                .string()
                .trim()
                .min(1)
                .max(120),

            checkInDate:
                isoDateSchema,

            checkOutDate:
                isoDateSchema,

            adultCount: z
                .number()
                .int()
                .min(1)
                .max(20),

            childCount: z
                .number()
                .int()
                .min(0)
                .max(20)
                .default(0),

            /**
             * LiteAPI dùng tuổi cụ thể của từng trẻ
             * trong occupancies[].children.
             *
             * Khác conversation state, request search hotel
             * chỉ hợp lệ khi đã có đủ tuổi cho tất cả trẻ em.
             */
            childAges: z
                .array(
                    childAgeSchema,
                )
                .max(20)
                .default([]),

            roomCount: z
                .number()
                .int()
                .min(1)
                .max(10)
                .default(1),

            maxPricePerNight:
                z
                    .number()
                    .int()
                    .positive()
                    .max(
                        100_000_000,
                    )
                    .optional(),

            preference: z
                .enum([
                    "any",
                    "hotel",
                    "homestay",
                ])
                .default(
                    "any",
                ),

            requirements: z
                .array(
                    z
                        .string()
                        .trim()
                        .min(1)
                        .max(100),
                )
                .max(12)
                .default([]),
        })
        .superRefine(
            (
                value,
                ctx,
            ) => {
                const checkIn =
                    Date.parse(
                        `${value.checkInDate}T00:00:00Z`,
                    );

                const checkOut =
                    Date.parse(
                        `${value.checkOutDate}T00:00:00Z`,
                    );

                if (
                    !Number.isFinite(
                        checkIn,
                    ) ||
                    !Number.isFinite(
                        checkOut,
                    ) ||
                    checkOut <=
                        checkIn
                ) {
                    ctx.addIssue({
                        code:
                            "custom",
                        path: [
                            "checkOutDate",
                        ],
                        message:
                            "Ngày check-out phải sau ngày check-in.",
                    });
                }

                if (
                    value.childAges
                        .length !==
                    value.childCount
                ) {
                    ctx.addIssue({
                        code:
                            "custom",
                        path: [
                            "childAges",
                        ],
                        message:
                            value.childCount ===
                            0
                                ? "Không được gửi tuổi trẻ em khi childCount = 0."
                                : `Cần đúng ${value.childCount} tuổi trẻ em để tìm giá phòng chính xác.`,
                    });
                }

                if (
                    value.roomCount >
                    value.adultCount
                ) {
                    ctx.addIssue({
                        code:
                            "custom",
                        path: [
                            "roomCount",
                        ],
                        message:
                            "Mỗi phòng cần ít nhất 1 người lớn, nên số phòng không được lớn hơn số người lớn.",
                    });
                }
            },
        );

export type TravelLodgingSearchInput =
    z.infer<
        typeof travelLodgingSearchSchema
    >;