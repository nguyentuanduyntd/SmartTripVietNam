import "server-only";

import {GoogleGenAI,} from "@google/genai";

let client: GoogleGenAI | null =null;

export const GEMINI_MODEL =
    process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";

function getGeminiClient() {
    if (client) {
        return client;
    }
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
        throw new Error(
            "GEMINI_API_KEY chưa được cấu hình.",
        );
    }
    client =new GoogleGenAI({apiKey,});

    return client;
}

export async function generateGeminiJson(
    input: {
        prompt: string;
        schema: Record<
            string,
            unknown
        >;
    },
) {
    const response =
        await getGeminiClient().interactions.create({
            model: GEMINI_MODEL,
            input: input.prompt,
            generation_config: {
                thinking_level: "low",
            },
            response_format: {
                type: "text",
                mime_type: "application/json",
                schema: input.schema,
            },
        });

    if (
        !response.output_text
    ) {
        throw new Error(
            "Gemini không trả về nội dung.",
        );
    }

    try {
        return JSON.parse(
            response.output_text,
        ) as unknown;
    } catch {
        console.error(
            "[GEMINI INVALID JSON]",
            response.output_text,
        );

        throw new Error(
            "Gemini trả về JSON không hợp lệ.",
        );
    }
}