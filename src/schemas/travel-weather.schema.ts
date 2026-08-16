import { z } from "zod";

const activitySchema = z.object({
    dayNumber: z.number().int().min(1).max(7),
    destinationName: z.string().trim().min(1).max(180),
    title: z.string().trim().min(1).max(240),
    description: z.string().max(2000).default(""),
    startTime: z.string().regex(/^\d{1,2}:\d{2}$/),
});

export const travelWeatherCheckSchema = z.object({
    locationName: z.string().trim().min(2).max(120),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dayCount: z.number().int().min(1).max(7),
    activities: z.array(activitySchema).max(40).default([]),
});