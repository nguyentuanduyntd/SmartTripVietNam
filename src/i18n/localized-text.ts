import { DEFAULT_LOCALE, isAppLocale, type AppLocale } from "@/src/i18n/config";

export type LocalizedTextValue = string | null | undefined;

type LocalizedTextInput = {
  vi: LocalizedTextValue;
  en: LocalizedTextValue;
};

type LocalizedTextOptions = {
  fallback?: string;

  trim?: boolean;
};

function normalizeText(value: LocalizedTextValue, trim: boolean): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = trim ? value.trim() : value;

  return normalized.length > 0 ? normalized : null;
}

export function localizedText(
  locale: string | null | undefined,
  input: LocalizedTextInput,
  options: LocalizedTextOptions = {},
): string {
  const { fallback = "", trim = true } = options;

  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : DEFAULT_LOCALE;

  const vi = normalizeText(input.vi, trim);

  const en = normalizeText(input.en, trim);

  if (resolvedLocale === "en") {
    return en ?? vi ?? fallback;
  }

  return vi ?? en ?? fallback;
}

export function localizedNullableText(
  locale: string | null | undefined,
  input: LocalizedTextInput,
  options: Omit<LocalizedTextOptions, "fallback"> = {},
): string | null {
  const value = localizedText(locale, input, {
    ...options,
    fallback: "",
  });

  return value.length > 0 ? value : null;
}

export function localizedTextForLocale(
  locale: AppLocale,
  vi: LocalizedTextValue,
  en: LocalizedTextValue,
  fallback = "",
): string {
  return localizedText(
    locale,
    {
      vi,
      en,
    },
    {
      fallback,
    },
  );
}
