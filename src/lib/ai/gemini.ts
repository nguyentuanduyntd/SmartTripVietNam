import "server-only";

import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

export const GEMINI_MODEL =
    process.env.GEMINI_MODEL?.trim() ||
    "gemini-3.6-flash";

type GeminiThinkingLevel =
    | "minimal"
    | "low"
    | "medium"
    | "high";

/* -------------------------------------------------------------------------- */
/* Config                                                                      */
/* -------------------------------------------------------------------------- */

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

    client = new GoogleGenAI({
        apiKey,
    });

    return client;
}

/* -------------------------------------------------------------------------- */
/* JSON helpers                                                                */
/* -------------------------------------------------------------------------- */

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
 * Nếu model thêm text trước/sau JSON
 * thì lấy object JSON đầu tiên.
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
/* Error helpers                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Gemini có thể reject Structured Output schema
 * bằng HTTP 400 với message rất chung chung:
 *
 * - Request contains an invalid argument
 * - invalid_request
 *
 * Chỉ fallback trong đúng trường hợp request schema
 * bị API từ chối.
 *
 * Các lỗi khác vẫn throw để tránh che lỗi thật.
 */
function isInvalidStructuredOutputRequest(
    error: unknown,
) {
    if (
        error === null ||
        typeof error !==
            "object"
    ) {
        return false;
    }

    const candidate =
        error as {
            status?: unknown;
            statusCode?: unknown;
            message?: unknown;
            body?: unknown;
        };

    const status =
        typeof candidate.status ===
        "number"
            ? candidate.status
            : typeof candidate.statusCode ===
                "number"
              ? candidate.statusCode
              : undefined;

    if (
        status !==
        400
    ) {
        return false;
    }

    const parts: string[] =
        [];

    if (
        typeof candidate.message ===
        "string"
    ) {
        parts.push(
            candidate.message,
        );
    }

    if (
        typeof candidate.body ===
        "string"
    ) {
        parts.push(
            candidate.body,
        );
    }

    const message =
        parts
            .join(" ")
            .toLowerCase();

    return (
        message.includes(
            "invalid argument",
        ) ||
        message.includes(
            "invalid_request",
        )
    );
}

/**
 * Nếu Structured Output bị Gemini API reject,
 * schema vẫn được đưa trực tiếp vào prompt.
 *
 * Backend sau đó vẫn:
 *
 * Gemini JSON
 * -> hydrate
 * -> Zod
 * -> business validation
 *
 * nên không bỏ validation.
 */
function buildItineraryFallbackPrompt(
    prompt: string,
    schema:
        Record<
            string,
            unknown
        >,
) {
    return `
${prompt}

YÊU CẦU OUTPUT BỔ SUNG

Gemini API hiện không enforce schema ở request này,
vì vậy bạn PHẢI tự tuân thủ chính xác JSON Schema bên dưới.

QUY TẮC:
1. Chỉ trả về duy nhất một JSON object.
2. Không markdown.
3. Không dùng \`\`\`.
4. Không giải thích trước hoặc sau JSON.
5. Không thêm field ngoài cấu trúc cần thiết.
6. Giữ chính xác tên property trong schema.
7. Các mã destinationKey và cuisineKey chỉ được lấy từ CONTEXT.
8. days phải có đúng số ngày được yêu cầu.
9. Nếu cuisines không phù hợp thì trả [].
10. nightCount có thể là null nếu khoản chi không phải accommodation.

JSON SCHEMA:

${JSON.stringify(
    schema,
    null,
    2,
)}
`.trim();
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
/* ITINERARY                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Strategy:
 *
 * Attempt 1:
 * Gemini Interactions + response_format.schema
 *
 * Nếu API chấp nhận:
 * -> dùng Structured Output chuẩn.
 *
 * Nếu API trả 400 invalid_request:
 * -> tự động fallback sang JSON mode
 * -> đưa toàn bộ JSON Schema vào prompt
 * -> backend hydrate + Zod validation như cũ.
 *
 * Nhờ vậy:
 * - không làm hỏng itinerary khi Gemini reject schema
 * - vẫn ưu tiên Structured Output khi Google xử lý được
 * - không bỏ backend validation
 */
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
                "interactions",

            schemaMode:
                "response_format.schema",
        },
    );

    /* ---------------------------------------------------------------------- */
    /* Attempt 1: Structured Output                                            */
    /* ---------------------------------------------------------------------- */

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

                        schema:
                            input.schema,
                    },
                });

        console.info(
            "[GEMINI ITINERARY TIMING]",
            {
                mode:
                    "structured",

                elapsedMs:
                    Math.round(
                        performance.now() -
                            startedAt,
                    ),
            },
        );

        const text =
            response.output_text;

        if (!text) {
            throw new Error(
                "Gemini không trả về nội dung itinerary.",
            );
        }

        return parseJsonOrThrow(
            text,
            "ITINERARY",
            false,
        );
    } catch (error) {
        const elapsedMs =
            Math.round(
                performance.now() -
                    startedAt,
            );

        /**
         * Chỉ fallback nếu Gemini reject
         * Structured Output request bằng HTTP 400.
         */
        if (
            !isInvalidStructuredOutputRequest(
                error,
            )
        ) {
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
                        "interactions",

                    schemaMode:
                        "response_format.schema",

                    elapsedMs,

                    error,
                },
            );

            throw error;
        }

        console.warn(
            "[GEMINI ITINERARY STRUCTURED OUTPUT REJECTED]",
            {
                model:
                    GEMINI_MODEL,

                status:
                    400,

                elapsedMs,

                action:
                    "retry_json_mode_with_schema_in_prompt",
            },
        );
    }

    /* ---------------------------------------------------------------------- */
    /* Attempt 2: JSON mode fallback                                           */
    /* ---------------------------------------------------------------------- */

    const fallbackPrompt =
        buildItineraryFallbackPrompt(
            input.prompt,
            input.schema,
        );

    const fallbackStartedAt =
        performance.now();

    console.info(
        "[GEMINI ITINERARY FALLBACK REQUEST]",
        {
            model:
                GEMINI_MODEL,

            thinkingLevel,

            promptChars:
                fallbackPrompt.length,

            schemaChars,

            structuredSchema:
                false,

            api:
                "interactions",

            schemaMode:
                "prompt_schema",
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
                        fallbackPrompt,

                    generation_config: {
                        thinking_level:
                            thinkingLevel,
                    },

                    /**
                     * Chỉ ép MIME JSON.
                     *
                     * Không gửi schema vào response_format
                     * vì chính schema đang khiến API trả 400.
                     */
                    response_format: {
                        type:
                            "text",

                        mime_type:
                            "application/json",
                    },
                });

        console.info(
            "[GEMINI ITINERARY FALLBACK TIMING]",
            {
                elapsedMs:
                    Math.round(
                        performance.now() -
                            fallbackStartedAt,
                    ),
            },
        );

        const text =
            response.output_text;

        if (!text) {
            throw new Error(
                "Gemini không trả về nội dung itinerary.",
            );
        }

        /**
         * JSON mode đã yêu cầu application/json.
         *
         * Không dùng extractFirstJsonObject để tránh
         * âm thầm cắt mất itinerary bị truncate.
         */
        return parseJsonOrThrow(
            text,
            "ITINERARY_FALLBACK",
            false,
        );
    } catch (fallbackError) {
        console.error(
            "[GEMINI ITINERARY FALLBACK ERROR]",
            {
                model:
                    GEMINI_MODEL,

                thinkingLevel,

                promptChars:
                    fallbackPrompt.length,

                schemaChars,

                structuredSchema:
                    false,

                api:
                    "interactions",

                schemaMode:
                    "prompt_schema",

                elapsedMs:
                    Math.round(
                        performance.now() -
                            fallbackStartedAt,
                    ),

                error:
                    fallbackError,
            },
        );

        throw fallbackError;
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