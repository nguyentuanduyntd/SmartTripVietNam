import { z } from "zod";

export const adminStatsQuerySchema = z.object({
    month: z
        .string()
        .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Tháng phải có dạng YYYY-MM")
        .optional(),
});

export type AdminStatsQuery = z.infer<
    typeof adminStatsQuerySchema
>;
