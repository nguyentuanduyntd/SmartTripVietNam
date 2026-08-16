import { z } from "zod";

export const travelLodgingSearchSchema = z.object({
    locationName: z.string().trim().min(2).max(120),
    checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    adultCount: z.number().int().min(1).max(20),
    childCount: z.number().int().min(0).max(20).default(0),
    roomCount: z.number().int().min(1).max(10).default(1),
    maxPricePerNight: z.number().int().positive().max(100_000_000).optional(),
    preference: z.enum(["any", "hotel", "homestay"]).default("any"),
});