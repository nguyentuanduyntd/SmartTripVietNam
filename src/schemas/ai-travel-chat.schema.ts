import { z } from "zod";

const paceSchema = z.enum([
    "relaxed",
    "balanced",
    "packed",
]);

const lodgingPreferenceSchema = z.enum([
    "any",
    "hotel",
    "homestay",
]);

const childAgeSchema = z
    .number()
    .int()
    .min(0)
    .max(17);

export const plannerConversationStateSchema =
    z.object({
        locationId: z
            .string()
            .min(1)
            .optional(),

        locationName: z
            .string()
            .trim()
            .min(1)
            .max(120)
            .optional(),

        startDate: z
            .string()
            .trim()
            .min(1)
            .max(20)
            .optional(),

        dayCount: z
            .number()
            .int()
            .min(1)
            .max(7)
            .optional(),

        adultCount: z
            .number()
            .int()
            .min(1)
            .max(20)
            .optional(),

        childCount: z
            .number()
            .int()
            .min(0)
            .max(20)
            .default(0),

        /**
         * Tuổi từng trẻ em đã biết trong hội thoại.
         *
         * Không ép length === childCount ở conversation-state schema,
         * vì state trung gian như:
         *
         * childCount = 2
         * childAges = [5]
         *
         * là hợp lệ trong lúc SmartTrip đang chờ tuổi bé còn lại.
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

        budget: z
            .number()
            .int()
            .positive()
            .max(
                1_000_000_000,
            )
            .optional(),

        lodgingBudgetPerNight:
            z
                .number()
                .int()
                .positive()
                .max(
                    100_000_000,
                )
                .optional(),

        lodgingPreference:
            lodgingPreferenceSchema.default(
                "any",
            ),

        lodgingRequirements:
            z
                .array(
                    z
                        .string()
                        .trim()
                        .min(1)
                        .max(100),
                )
                .max(12)
                .default([]),

        pace: paceSchema.default(
            "balanced",
        ),

        interests: z
            .array(
                z
                    .string()
                    .trim()
                    .min(1)
                    .max(100),
            )
            .max(20)
            .default([]),

        note: z
            .string()
            .trim()
            .max(4000)
            .optional(),
    });

const locationOptionSchema =
    z.object({
        id: z
            .string()
            .min(1),

        name: z
            .string()
            .trim()
            .min(1)
            .max(120),

        slug: z
            .string()
            .trim()
            .min(1)
            .max(160),
    });

const historyItemSchema =
    z.object({
        role: z.enum([
            "user",
            "assistant",
        ]),

        content: z
            .string()
            .trim()
            .min(1)
            .max(1500),
    });

export const aiTravelChatRequestSchema =
    z.object({
        message: z
            .string()
            .trim()
            .min(1)
            .max(1500),

        state:
            plannerConversationStateSchema,

        locations: z
            .array(
                locationOptionSchema,
            )
            .min(1)
            .max(100),

        history: z
            .array(
                historyItemSchema,
            )
            .max(12)
            .optional(),

        hasGeneratedPlan:
            z
                .boolean()
                .optional()
                .default(false),
    });

export type AiTravelChatRequest =
    z.infer<
        typeof aiTravelChatRequestSchema
    >;

export type PlannerConversationStateInput =
    z.infer<
        typeof plannerConversationStateSchema
    >;