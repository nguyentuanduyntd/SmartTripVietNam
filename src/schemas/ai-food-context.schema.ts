import { z } from "zod";

const foodContextHistoryItemSchema = z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(700),
});

export const aiFoodContextRequestSchema = z
    .object({
        entityType: z.literal("restaurant"),
        entityId: z.string().uuid(),
        question: z
            .string()
            .trim()
            .min(2, "Hãy nhập câu hỏi về quán hoặc món ăn.")
            .max(700),
        history: z
            .array(foodContextHistoryItemSchema)
            .max(8)
            .optional()
            .default([]),
    })
    .strict();

export type AiFoodContextRequest = z.infer<
    typeof aiFoodContextRequestSchema
>;