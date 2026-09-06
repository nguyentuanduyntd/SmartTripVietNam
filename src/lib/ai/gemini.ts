import "server-only";

import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

export const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";

type GeminiThinkingLevel = "minimal" | "low" | "medium" | "high";

function parseThinkingLevel(value?: string | null): GeminiThinkingLevel | null {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "minimal" || normalized === "low" || normalized === "medium" || normalized === "high") {
    return normalized;
  }

  return null;
}

function getConfiguredThinkingLevel(
  envName: "GEMINI_CHAT_THINKING_LEVEL" | "GEMINI_ITINERARY_THINKING_LEVEL",
  fallback: GeminiThinkingLevel,
): GeminiThinkingLevel {
  const specific = parseThinkingLevel(process.env[envName]);

  if (specific) {
    return specific;
  }

  const global = parseThinkingLevel(process.env.GEMINI_THINKING_LEVEL);

  if (global) {
    return global;
  }

  return fallback;
}

function getGeminiClient() {
  if (client) {
    return client;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY chưa được cấu hình.");
  }

  client = new GoogleGenAI({
    apiKey,
  });

  return client;
}

function cleanJsonText(value: string) {
  let text = value.trim();

  if (text.startsWith("```json")) {
    text = text.slice(7);
  } else if (text.startsWith("```")) {
    text = text.slice(3);
  }

  if (text.endsWith("```")) {
    text = text.slice(0, -3);
  }

  return text.trim();
}

function extractFirstJsonObject(value: string) {
  const text = cleanJsonText(value);

  const start = text.indexOf("{");

  if (start < 0) {
    return text;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;

        continue;
      }

      if (char === "\\") {
        escaped = true;

        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;

      continue;
    }

    if (char === "{") {
      depth += 1;

      continue;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  return text;
}

function parseJsonOrThrow(rawText: string, label: string, extractObject = false) {
  const cleaned = extractObject ? extractFirstJsonObject(rawText) : cleanJsonText(rawText);

  try {
    return JSON.parse(cleaned) as unknown;
  } catch (parseError) {
    console.error("[GEMINI INVALID JSON]", {
      label,
      parseError,
      raw: rawText,
    });

    throw new Error("Gemini trả về JSON không hợp lệ.");
  }
}

async function requestGeminiLooseJson(input: { prompt: string; label: string }) {
  const thinkingLevel = getConfiguredThinkingLevel("GEMINI_CHAT_THINKING_LEVEL", "minimal");

  const startedAt = performance.now();

  console.info(`[GEMINI ${input.label} REQUEST]`, {
    model: GEMINI_MODEL,

    thinkingLevel,

    promptChars: input.prompt.length,

    structuredSchema: false,

    api: "interactions",

    schemaMode: "json_only",
  });

  try {
    const response = await getGeminiClient().interactions.create({
      model: GEMINI_MODEL,

      input: input.prompt,

      generation_config: {
        thinking_level: thinkingLevel,
      },

      response_format: {
        type: "text",

        mime_type: "application/json",
      },
    });

    console.info(`[GEMINI ${input.label} TIMING]`, {
      elapsedMs: Math.round(performance.now() - startedAt),
    });

    if (!response.output_text) {
      throw new Error("Gemini không trả về nội dung.");
    }

    return parseJsonOrThrow(response.output_text, input.label, true);
  } catch (error) {
    console.error(`[GEMINI ${input.label} ERROR]`, {
      model: GEMINI_MODEL,

      thinkingLevel,

      promptChars: input.prompt.length,

      elapsedMs: Math.round(performance.now() - startedAt),

      error,
    });

    throw error;
  }
}

export async function generateGeminiJson(input: {
  prompt: string;

  schema: Record<string, unknown>;
}) {
  const thinkingLevel = getConfiguredThinkingLevel("GEMINI_ITINERARY_THINKING_LEVEL", "minimal");

  const schemaChars = JSON.stringify(input.schema).length;

  const useStructuredSchema = process.env.GEMINI_ITINERARY_USE_SCHEMA?.trim().toLowerCase() === "true";

  const startedAt = performance.now();

  console.info("[GEMINI ITINERARY REQUEST]", {
    model: GEMINI_MODEL,

    thinkingLevel,

    promptChars: input.prompt.length,

    schemaChars,

    structuredSchema: useStructuredSchema,

    api: "interactions",

    schemaMode: useStructuredSchema ? "response_format.schema" : "json_only",
  });

  try {
    const response = await getGeminiClient().interactions.create({
      model: GEMINI_MODEL,

      input: input.prompt,

      generation_config: {
        thinking_level: thinkingLevel,
      },

      response_format: useStructuredSchema
        ? {
            type: "text",

            mime_type: "application/json",

            schema: input.schema,
          }
        : {
            type: "text",

            mime_type: "application/json",
          },
    });

    console.info("[GEMINI ITINERARY TIMING]", {
      elapsedMs: Math.round(performance.now() - startedAt),

      thinkingLevel,

      structuredSchema: useStructuredSchema,
    });

    const text = response.output_text;

    if (!text) {
      throw new Error("Gemini không trả về nội dung itinerary.");
    }

    return parseJsonOrThrow(text, "ITINERARY", false);
  } catch (error) {
    console.error("[GEMINI ITINERARY ERROR]", {
      model: GEMINI_MODEL,

      thinkingLevel,

      promptChars: input.prompt.length,

      schemaChars,

      structuredSchema: useStructuredSchema,

      api: "interactions",

      schemaMode: useStructuredSchema ? "response_format.schema" : "json_only",

      elapsedMs: Math.round(performance.now() - startedAt),

      error,
    });

    throw error;
  }
}

export async function generateGeminiLooseJson(input: { prompt: string }) {
  return requestGeminiLooseJson({
    prompt: input.prompt,

    label: "CHAT",
  });
}
