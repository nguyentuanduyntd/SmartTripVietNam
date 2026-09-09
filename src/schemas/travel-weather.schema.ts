import { z } from "zod";

const activitySchema = z.object({
  dayNumber: z.number().int().min(1).max(7),
  destinationName: z.string().trim().min(1).max(300),
  title: z.string().trim().min(1).max(300),
  description: z
    .string()
    .nullish()
    .transform((val) => val ?? ""),
  startTime: z
    .string()
    .trim()
    .regex(/^\d{1,2}:\d{2}$/)
    .or(z.string().default("08:00")),
});

export const travelWeatherCheckSchema = z.object({
  locationName: z.string().trim().min(1).max(160),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayCount: z.number().int().min(1).max(7),
  activities: z.array(activitySchema).max(100).default([]),
});
