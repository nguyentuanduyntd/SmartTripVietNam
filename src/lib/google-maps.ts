export type GoogleMapsSearchInput = {
    latitude?: number | null;
    longitude?: number | null;
    query?: string | null;
};

export function buildGoogleMapsSearchHref({
    latitude,
    longitude,
    query,
}: GoogleMapsSearchInput): string | null {
    if (
        typeof latitude === "number" &&
        Number.isFinite(latitude) &&
        typeof longitude === "number" &&
        Number.isFinite(longitude)
    ) {
        return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    }

    const normalizedQuery = query?.trim();

    if (!normalizedQuery) {
        return null;
    }

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        normalizedQuery,
    )}`;
}