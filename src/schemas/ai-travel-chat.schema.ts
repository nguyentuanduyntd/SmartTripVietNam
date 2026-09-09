import { z } from "zod";

const paceSchema = z.enum(["relaxed", "balanced", "packed"]);

const lodgingPreferenceSchema = z.enum(["any", "hotel", "homestay"]);

const childAgeSchema = z.number().int().min(0).max(17);

export const plannerChatStepSchema = z.enum([
  "collect_experience",
  "suggest_one_destination",
  "confirm_destination",
  "ask_add_more",
  "collect_trip_details",
  "confirm_trip_summary",
  "generate_itinerary",
]);

export const selectedDestinationItemSchema = z.object({
  destinationId: z.string().min(1),
  destinationName: z.string().trim().min(1).max(200),
  locationName: z.string().trim().min(1).max(120),
  activityType: z.string().trim().min(1).max(100).default("Tham quan"),
});

export const destinationCardItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  locationName: z.string().trim().min(1).max(120),
  locationId: z.string().optional(),
  imageUrl: z.string().optional(),
  address: z.string().optional(),
  description: z.string().trim().max(2000),
  tags: z.array(z.string()).optional(),
  relevanceScore: z.number().optional(),
});

export const plannerConversationStateSchema = z.object({
  currentStep: plannerChatStepSchema.default("collect_experience"),
  locationId: z.string().min(1).optional(),
  locationName: z.string().trim().min(1).max(120).optional(),
  startDate: z.string().trim().min(1).max(20).optional(),
  dayCount: z.number().int().min(1).max(7).optional(),
  adultCount: z.number().int().min(1).max(20).optional(),
  childCount: z.number().int().min(0).max(20).default(0),
  childAges: z.array(childAgeSchema).max(20).default([]),
  roomCount: z.number().int().min(1).max(10).default(1),
  budget: z.number().int().positive().max(1_000_000_000).optional(),
  lodgingBudgetPerNight: z.number().int().positive().max(100_000_000).optional(),
  lodgingPreference: lodgingPreferenceSchema.default("any"),
  lodgingRequirements: z.array(z.string().trim().min(1).max(100)).max(12).default([]),
  pace: paceSchema.default("balanced"),
  interests: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
  note: z.string().trim().max(4000).optional(),
  contextTheme: z.string().trim().max(100).optional(),
  activitiesPerDay: z.number().int().min(1).max(5).optional(),
  selectedDestinations: z.array(selectedDestinationItemSchema).default([]),
  pendingDestination: destinationCardItemSchema.optional(),
  rejectedDestinationIds: z.array(z.string()).default([]),
  preferredTimeSlot: z.string().trim().max(100).optional(),
  suggestedDestinations: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
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

export const travelChatActionPayloadSchema = z.object({
  actionType: z.enum([
    "select_destination",
    "reject_destination",
    "confirm_add_more",
    "decline_add_more",
    "confirm_summary",
    "adapt_weather_rain",
    "reorder_weather_days",
    "keep_weather_plan",
  ]),
  destinationId: z.string().optional(),
  destinationName: z.string().optional(),
  locationName: z.string().optional(),
  activityType: z.string().optional(),
});

export const aiTravelChatRequestSchema = z.object({
  message: z.string().trim().max(1500).default(""),
  state: plannerConversationStateSchema,
  locations: z.array(locationOptionSchema).min(1).max(100),
  history: z.array(historyItemSchema).max(12).optional(),
  hasGeneratedPlan: z.boolean().optional().default(false),
  actionPayload: travelChatActionPayloadSchema.optional(),
});

export type AiTravelChatRequest = z.infer<typeof aiTravelChatRequestSchema>;
export type PlannerConversationStateInput = z.infer<typeof plannerConversationStateSchema>;
