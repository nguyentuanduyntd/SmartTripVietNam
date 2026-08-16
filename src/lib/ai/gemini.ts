import "server-only";

import {
    GoogleGenAI,
    ThinkingLevel,
} from "@google/genai";

let client: GoogleGenAI | null = null;

export const GEMINI_MODEL =
    process.env.GEMINI_MODEL?.trim() ||
    "gemini-3.6-flash";

type GeminiThinkingLevel =
    | "minimal"
    | "low"
    | "medium"
    | "high";

function getGeminiThinkingLevel(): GeminiThinkingLevel {
    const configured =
        process.env.GEMINI_THINKING_LEVEL?.trim();

    if (
        configured === "minimal" ||
        configured === "low" ||
        configured === "medium" ||
        configured === "high"
    ) {
        return configured;
    }

    return "low";
}

function toSdkThinkingLevel(
    level: GeminiThinkingLevel,
): ThinkingLevel {
    switch (level) {
        case "minimal":
            return ThinkingLevel.MINIMAL;

        case "medium":
            return ThinkingLevel.MEDIUM;

        case "high":
            return ThinkingLevel.HIGH;

        case "low":
        default:
            return ThinkingLevel.LOW;
    }
}

function getGeminiClient() {
    if (client) {
        return client;
    }

    const apiKey =
        process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
        throw new Error(
            "GEMINI_API_KEY chưa được cấu hình.",
        );
    }

    client =
        new GoogleGenAI({
            apiKey,
        });

    return client;
}

function cleanJsonText(
    value: string,
) {
    let text =
        value.trim();

    if (
        text.startsWith(
            "```json",
        )
    ) {
        text =
            text.slice(7);
    } else if (
        text.startsWith(
            "```",
        )
    ) {
        text =
            text.slice(3);
    }

    if (
        text.endsWith(
            "```",
        )
    ) {
        text =
            text.slice(
                0,
                -3,
            );
    }

    return text.trim();
}

/**
 * Chỉ dùng cho JSON nhỏ của Chat/NLU.
 *
 * Nếu model vô tình thêm text trước/sau JSON,
 * lấy object JSON đầu tiên có dấu ngoặc cân bằng.
 */
function extractFirstJsonObject(
    value: string,
) {
    const text =
        cleanJsonText(
            value,
        );

    const start =
        text.indexOf(
            "{",
        );

    if (start < 0) {
        return text;
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (
        let index = start;
        index < text.length;
        index += 1
    ) {
        const char =
            text[index];

        if (inString) {
            if (escaped) {
                escaped =
                    false;

                continue;
            }

            if (
                char === "\\"
            ) {
                escaped =
                    true;

                continue;
            }

            if (
                char === '"'
            ) {
                inString =
                    false;
            }

            continue;
        }

        if (
            char === '"'
        ) {
            inString =
                true;

            continue;
        }

        if (
            char === "{"
        ) {
            depth += 1;

            continue;
        }

        if (
            char === "}"
        ) {
            depth -= 1;

            if (
                depth === 0
            ) {
                return text.slice(
                    start,
                    index + 1,
                );
            }
        }
    }

    return text;
}

function parseJsonOrThrow(
    rawText: string,
    label: string,
    extractObject = false,
) {
    const cleaned =
        extractObject
            ? extractFirstJsonObject(
                  rawText,
              )
            : cleanJsonText(
                  rawText,
              );

    try {
        return JSON.parse(
            cleaned,
        ) as unknown;
    } catch (
        parseError
    ) {
        console.error(
            "[GEMINI INVALID JSON]",
            {
                label,
                parseError,
                raw:
                    rawText,
            },
        );

        throw new Error(
            "Gemini trả về JSON không hợp lệ.",
        );
    }
}

/* -------------------------------------------------------------------------- */
/* CHAT / NLU                                                                 */
/* -------------------------------------------------------------------------- */

async function requestGeminiLooseJson(
    input: {
        prompt: string;
        label: string;
    },
) {
    const thinkingLevel =
        getGeminiThinkingLevel();

    const startedAt =
        performance.now();

    console.info(
        `[GEMINI ${input.label} REQUEST]`,
        {
            model:
                GEMINI_MODEL,

            thinkingLevel,

            promptChars:
                input.prompt.length,

            structuredSchema:
                false,

            api:
                "interactions",
        },
    );

    try {
        const response =
            await getGeminiClient()
                .interactions
                .create({
                    model:
                        GEMINI_MODEL,

                    input:
                        input.prompt,

                    generation_config: {
                        thinking_level:
                            thinkingLevel,
                    },

                    response_format: {
                        type:
                            "text",

                        mime_type:
                            "application/json",
                    },
                });

        console.info(
            `[GEMINI ${input.label} TIMING]`,
            {
                elapsedMs:
                    Math.round(
                        performance.now() -
                            startedAt,
                    ),
            },
        );

        if (
            !response.output_text
        ) {
            throw new Error(
                "Gemini không trả về nội dung.",
            );
        }

        return parseJsonOrThrow(
            response.output_text,
            input.label,
            true,
        );
    } catch (error) {
        console.error(
            `[GEMINI ${input.label} ERROR]`,
            {
                model:
                    GEMINI_MODEL,

                thinkingLevel,

                promptChars:
                    input.prompt.length,

                elapsedMs:
                    Math.round(
                        performance.now() -
                            startedAt,
                    ),

                error,
            },
        );

        throw error;
    }
}

/* -------------------------------------------------------------------------- */
/* ITINERARY STRUCTURED OUTPUT                                                 */
/* -------------------------------------------------------------------------- */

export async function generateGeminiJson(
    input: {
        prompt: string;

        schema:
            Record<
                string,
                unknown
            >;
    },
) {
    const thinkingLevel =
        getGeminiThinkingLevel();

    const sdkThinkingLevel =
        toSdkThinkingLevel(
            thinkingLevel,
        );

    const schemaChars =
        JSON.stringify(
            input.schema,
        ).length;

    const startedAt =
        performance.now();

    console.info(
        "[GEMINI ITINERARY REQUEST]",
        {
            model:
                GEMINI_MODEL,

            thinkingLevel,

            promptChars:
                input.prompt.length,

            schemaChars,

            structuredSchema:
                true,

            api:
                "generateContent",

            schemaMode:
                "responseJsonSchema",
        },
    );

    try {
        const response =
            await getGeminiClient()
                .models
                .generateContent({
                    model:
                        GEMINI_MODEL,

                    contents:
                        input.prompt,

                    config: {
                        /**
                         * QUAN TRỌNG:
                         *
                         * Schema lần này được Gemini API enforce
                         * thật sự, không còn chỉ nằm trong prompt.
                         */
                        responseMimeType:
                            "application/json",

                        responseJsonSchema:
                            input.schema,

                        thinkingConfig: {
                            thinkingLevel:
                                sdkThinkingLevel,
                        },
                    },
                });

        console.info(
            "[GEMINI ITINERARY TIMING]",
            {
                elapsedMs:
                    Math.round(
                        performance.now() -
                            startedAt,
                    ),
            },
        );

        const text =
            response.text;

        if (!text) {
            throw new Error(
                "Gemini không trả về nội dung itinerary.",
            );
        }

        /**
         * Không sử dụng extractFirstJsonObject ở đây.
         *
         * Vì itinerary bắt buộc phải có toàn bộ:
         * - title
         * - description
         * - days
         * - estimatedCosts
         *
         * Nếu JSON bị thiếu phần cuối thì phải fail,
         * không được âm thầm chấp nhận.
         */
        return parseJsonOrThrow(
            text,
            "ITINERARY",
            false,
        );
    } catch (error) {
        console.error(
            "[GEMINI ITINERARY ERROR]",
            {
                model:
                    GEMINI_MODEL,

                thinkingLevel,

                promptChars:
                    input.prompt.length,

                schemaChars,

                structuredSchema:
                    true,

                api:
                    "generateContent",

                elapsedMs:
                    Math.round(
                        performance.now() -
                            startedAt,
                    ),

                error,
            },
        );

        throw error;
    }
}

/* -------------------------------------------------------------------------- */
/* PUBLIC CHAT JSON                                                            */
/* -------------------------------------------------------------------------- */

export async function generateGeminiLooseJson(
    input: {
        prompt: string;
    },
) {
    return requestGeminiLooseJson({
        prompt:
            input.prompt,

        label:
            "CHAT",
    });
}