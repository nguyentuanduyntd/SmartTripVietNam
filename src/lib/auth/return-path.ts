export function normalizeReturnPath(
    value: string | null | undefined,
    fallback = "/",
): string {
    if (typeof value !== "string") {
        return fallback;
    }

    const candidate = value.trim();

    if (
        !candidate.startsWith("/") ||
        candidate.startsWith("//") ||
        candidate.includes("\\") ||
        /[\u0000-\u001f\u007f]/.test(candidate)
    ) {
        return fallback;
    }

    try {
        const internalOrigin = "https://smarttrip.local";
        const parsedUrl = new URL(candidate, internalOrigin);

        if (parsedUrl.origin !== internalOrigin) {
            return fallback;
        }

        return [
            parsedUrl.pathname,
            parsedUrl.search,
            parsedUrl.hash,
        ].join("");
    } catch {
        return fallback;
    }
}