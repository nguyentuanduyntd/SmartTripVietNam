import { z } from "zod";

const paceSchema = z.enum([
    "relaxed",
    "balanced",
    "packed",
]);

export const plannerConversationStateSchema = z.object({
    locationId: z.string().min(1).optional(),
    locationName: z.string().trim().min(1).max(120).optional(),
    startDate: z.string().trim().min(1).max(20).optional(),
    dayCount: z.number().int().min(1).max(7).optional(),
    adultCount: z.number().int().min(1).max(20).optional(),
    childCount: z.number().int().min(0).max(20).default(0),
    roomCount: z.number().int().min(1).max(10).default(1),
    budget: z.number().int().positive().max(1_000_000_000).optional(),
    lodgingBudgetPerNight: z.number().int().positive().max(100_000_000).optional(),
    lodgingPreference: z.enum(["any", "hotel", "homestay"]).default("any"),
    pace: paceSchema.default("balanced"),
    interests: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
    note: z.string().trim().max(4000).optional(),
});

const locationOptionSchema = z.object({
    id: z.string().min(1),
    name: z.string().trim().min(1).max(120),
    slug: z.string().trim().min(1).max(160),
});

const historyItemSchema = z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(1500),
});

export const aiTravelChatRequestSchema = z.object({
    message: z.string().trim().min(1).max(1500),
    state: plannerConversationStateSchema,
    locations: z.array(locationOptionSchema).min(1).max(100),
    history: z.array(historyItemSchema).max(12).optional(),
    hasGeneratedPlan: z.boolean().optional().default(false),
});

export type AiTravelChatRequest = z.infer<
    typeof aiTravelChatRequestSchema
>;

export type PlannerConversationStateInput = z.infer<
    typeof plannerConversationStateSchema
>;