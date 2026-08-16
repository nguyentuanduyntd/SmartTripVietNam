import "server-only";

import type {
    HotelProvider,
    HotelSearchInput,
    HotelSearchItem,
    HotelSearchResult,
    LodgingPreference,
} from "@/src/services/travel-lodging/types";

const BASE_URL =
    "https://api.liteapi.travel/v3.0";

/**
 * LiteAPI khuyến nghị timeout live search khoảng 6-12 giây.
 * Đây là timeout provider-side gửi trong request body.
 */
const PROVIDER_TIMEOUT_SECONDS = 8;

/**
 * Timeout network phía server SmartTrip.
 * Đặt dài hơn provider timeout một chút để API có thời gian trả response.
 */
const FETCH_TIMEOUT_MS = 15_000;

const SEARCH_LIMIT = 20;
const DISPLAY_LIMIT = 8;
const COORDINATE_SEARCH_RADIUS_METERS = 25_000;

type Money = {
    amount?: number | string;
    currency?: string;
};

type LiteRate = {
    rateId?: string;
    occupancyNumber?: number;
    name?: string;
    boardName?: string;

    retailRate?: {
        total?: Money[];

        taxesAndFees?: Array<{
            included?: boolean;
            amount?: number | string;
            currency?: string;
        }>;
    };

    cancellationPolicies?: {
        refundableTag?: string;
    };
};

type LiteRoomType = {
    offerId?: string;

    /**
     * Tổng giá của toàn offer (đặc biệt hữu ích khi tìm nhiều phòng).
     * Nếu provider trả field này thì ưu tiên dùng thay vì tự cộng rate.
     */
    offerRetailRate?: Money;

    rates?: LiteRate[];
};

type LiteRateHotel = {
    hotelId?: string;
    roomTypes?: LiteRoomType[];
};

type LiteHotelMeta = {
    id?: string;
    hotelId?: string;
    name?: string;
    address?: string;
    main_photo?: string;
    mainPhoto?: string;
    rating?: number | string;
    latitude?: number;
    longitude?: number;

    location?: {
        latitude?: number;
        longitude?: number;
    };
};

type LiteRatesResponse = {
    data?: LiteRateHotel[];
    hotels?: LiteHotelMeta[];
    sandbox?: boolean;
    guestLevel?: number;
};

type Occupancy = {
    adults: number;
    children?: number[];
};

type GeoPoint = {
    latitude: number;
    longitude: number;
    name?: string;
};

type SearchStrategy =
    | "city"
    | "coordinates"
    | "aiSearch";

type SearchAttempt = {
    strategy: SearchStrategy;
    response: LiteRatesResponse;
};

function getApiKey() {
    return (
        process.env.LITEAPI_API_KEY?.trim() ??
        ""
    );
}

function diffNights(
    checkInDate: string,
    checkOutDate: string,
) {
    const start = new Date(
        `${checkInDate}T00:00:00Z`,
    ).getTime();

    const end = new Date(
        `${checkOutDate}T00:00:00Z`,
    ).getTime();

    return Math.max(
        1,
        Math.round(
            (end - start) / 86_400_000,
        ),
    );
}

function normalizeVietnamese(
    value: string,
) {
    return value
        .normalize("NFD")
        .replace(/[^\S\r\n]+/g, " ")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .trim();
}

function resolveProviderCityName(
    locationName: string,
) {
    const normalized =
        normalizeVietnamese(
            locationName,
        ).toLowerCase();

    const aliases: Record<string, string> = {
        "ha noi": "Hanoi",
        hanoi: "Hanoi",
        "ho chi minh": "Ho Chi Minh City",
        "ho chi minh city": "Ho Chi Minh City",
        "tp ho chi minh": "Ho Chi Minh City",
        "thanh pho ho chi minh": "Ho Chi Minh City",
        "sai gon": "Ho Chi Minh City",
        "da nang": "Da Nang",
        "hoi an": "Hoi An",
        hue: "Hue",
        "nha trang": "Nha Trang",
        "da lat": "Da Lat",
        "phu quoc": "Phu Quoc",
        "ha long": "Ha Long",
        "vung tau": "Vung Tau",
        "quy nhon": "Quy Nhon",
        "can tho": "Can Tho",
    };

    return (
        aliases[normalized] ??
        normalizeVietnamese(locationName)
    );
}

function buildOccupancies(
    input: HotelSearchInput,
): Occupancy[] {
    /**
     * LiteAPI cần tuổi cụ thể của từng trẻ em.
     * SmartTrip hiện mới chỉ có childCount nên không tự đoán tuổi.
     */
    if (input.childCount > 0) {
        return [];
    }

    const roomCount = Math.max(
        1,
        Math.min(
            input.roomCount,
            input.adultCount,
        ),
    );

    const baseAdults = Math.floor(
        input.adultCount / roomCount,
    );

    let remainder =
        input.adultCount % roomCount;

    return Array.from(
        { length: roomCount },
        () => {
            const adults =
                baseAdults +
                (remainder > 0 ? 1 : 0);

            if (remainder > 0) {
                remainder -= 1;
            }

            return {
                adults: Math.max(1, adults),
            };
        },
    );
}

function buildAiSearch(
    locationName: string,
    preference: LodgingPreference,
) {
    const city =
        resolveProviderCityName(
            locationName,
        );

    if (preference === "homestay") {
        return `Affordable homestays and guesthouses in ${city}, Vietnam`;
    }

    if (preference === "hotel") {
        return `Affordable hotels in ${city}, Vietnam`;
    }

    return `Affordable accommodation in ${city}, Vietnam`;
}

function toNumber(value: unknown) {
    if (
        typeof value === "number" &&
        Number.isFinite(value)
    ) {
        return value;
    }

    if (
        typeof value === "string" &&
        value.trim()
    ) {
        const parsed = Number(value);

        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return undefined;
}

function parseRefundable(
    tag?: string,
): boolean | null {
    if (!tag) {
        return null;
    }

    const value = tag.toUpperCase();

    if (value === "RFN") {
        return true;
    }

    if (
        value === "NRFN" ||
        value === "NRF"
    ) {
        return false;
    }

    return null;
}

function parseTaxesIncluded(
    rate: LiteRate,
): boolean | null {
    const values = (
        rate.retailRate?.taxesAndFees ?? []
    )
        .map((item) => item.included)
        .filter(
            (value): value is boolean =>
                typeof value === "boolean",
        );

    if (values.length === 0) {
        return null;
    }

    return values.every(Boolean);
}

function combinedRefundable(
    rates: LiteRate[],
): boolean | null {
    const values = rates
        .map((rate) =>
            parseRefundable(
                rate.cancellationPolicies
                    ?.refundableTag,
            ),
        )
        .filter(
            (value): value is boolean =>
                typeof value === "boolean",
        );

    if (values.length === 0) {
        return null;
    }

    if (values.every(Boolean)) {
        return true;
    }

    if (values.some((value) => !value)) {
        return false;
    }

    return null;
}

function combinedTaxesIncluded(
    rates: LiteRate[],
): boolean | null {
    const values = rates
        .map(parseTaxesIncluded)
        .filter(
            (value): value is boolean =>
                typeof value === "boolean",
        );

    if (values.length === 0) {
        return null;
    }

    return values.every(Boolean);
}

/**
 * Tìm giá tổng của một offer.
 *
 * LiteAPI có thể trả offerRetailRate ở cấp roomType. Đây là tổng của toàn bộ
 * rates trong offer và là field an toàn nhất khi user tìm nhiều phòng.
 *
 * Nếu response không có offerRetailRate thì fallback cộng retailRate.total
 * của từng rate.
 */
function getOfferTotal(
    roomType: LiteRoomType,
) {
    const directAmount = toNumber(
        roomType.offerRetailRate?.amount,
    );

    if (
        directAmount !== undefined &&
        directAmount > 0
    ) {
        return {
            amount: directAmount,
            currency:
                roomType.offerRetailRate
                    ?.currency,
        };
    }

    const rates = roomType.rates ?? [];

    if (rates.length === 0) {
        return null;
    }

    const totals = rates.map((rate) => {
        const total =
            rate.retailRate?.total?.[0];

        return {
            amount: toNumber(total?.amount),
            currency: total?.currency,
        };
    });

    if (
        totals.some(
            (item) =>
                item.amount === undefined ||
                item.amount <= 0,
        )
    ) {
        return null;
    }

    return {
        amount: totals.reduce(
            (sum, item) =>
                sum + (item.amount ?? 0),
            0,
        ),
        currency:
            totals.find(
                (item) => item.currency,
            )?.currency,
    };
}

function findCheapestOffer(
    hotel: LiteRateHotel,
) {
    let best:
        | {
              offerId?: string;
              rates: LiteRate[];
              amount: number;
              currency?: string;
          }
        | undefined;

    for (
        const roomType of
        hotel.roomTypes ?? []
    ) {
        const rates = roomType.rates ?? [];
        const total =
            getOfferTotal(roomType);

        if (!total) {
            continue;
        }

        if (
            !best ||
            total.amount < best.amount
        ) {
            best = {
                offerId: roomType.offerId,
                rates,
                amount: total.amount,
                currency: total.currency,
            };
        }
    }

    return best;
}

function uniqueText(
    values: Array<string | undefined>,
) {
    const result = Array.from(
        new Set(
            values.filter(Boolean) as string[],
        ),
    );

    return result.length > 0
        ? result.join(" + ")
        : undefined;
}

/**
 * Parse toàn bộ hotel có rate trước.
 * Budget được lọc ở search() để log được rõ:
 * - provider có trả hotel hay không
 * - parser đọc được hay không
 * - bao nhiêu hotel bị loại do budget
 */
function toHotelItems(
    response: LiteRatesResponse,
    input: HotelSearchInput,
): HotelSearchItem[] {
    const nights = diffNights(
        input.checkInDate,
        input.checkOutDate,
    );

    const metadataById =
        new Map<string, LiteHotelMeta>();

    for (
        const hotel of response.hotels ?? []
    ) {
        const id =
            hotel.id ?? hotel.hotelId;

        if (id) {
            metadataById.set(id, hotel);
        }
    }

    const items: HotelSearchItem[] = [];

    for (
        const hotel of response.data ?? []
    ) {
        if (!hotel.hotelId) {
            continue;
        }

        const offer =
            findCheapestOffer(hotel);

        if (!offer) {
            continue;
        }

        const metadata =
            metadataById.get(
                hotel.hotelId,
            );

        const currency =
            offer.currency ?? "VND";

        const totalPrice = offer.amount;

        const pricePerNight =
            totalPrice / nights;

        items.push({
            provider: "liteapi",
            hotelId: hotel.hotelId,
            name:
                metadata?.name ??
                `Hotel ${hotel.hotelId}`,
            address: metadata?.address,
            imageUrl:
                metadata?.main_photo ??
                metadata?.mainPhoto,
            latitude:
                metadata?.latitude ??
                metadata?.location?.latitude,
            longitude:
                metadata?.longitude ??
                metadata?.location?.longitude,
            rating: toNumber(
                metadata?.rating,
            ),
            available: true,
            offerId: offer.offerId,
            checkInDate: input.checkInDate,
            checkOutDate:
                input.checkOutDate,
            roomDescription:
                uniqueText(
                    offer.rates.map(
                        (rate) => rate.name,
                    ),
                ),
            boardName:
                uniqueText(
                    offer.rates.map(
                        (rate) =>
                            rate.boardName,
                    ),
                ),
            currency,
            totalPrice,
            pricePerNight,
            refundable:
                combinedRefundable(
                    offer.rates,
                ),
            taxesIncluded:
                combinedTaxesIncluded(
                    offer.rates,
                ),
        });
    }

    return items.sort(
        (a, b) =>
            (a.pricePerNight ??
                Number.POSITIVE_INFINITY) -
            (b.pricePerNight ??
                Number.POSITIVE_INFINITY),
    );
}

function hasRateData(
    response: LiteRatesResponse,
) {
    return Boolean(
        response.data?.some(
            (hotel) =>
                hotel.roomTypes?.some(
                    (roomType) =>
                        Boolean(
                            roomType.offerId ||
                                roomType
                                    .rates
                                    ?.length,
                        ),
                ),
        ),
    );
}

async function geocodeVietnamLocation(
    locationName: string,
): Promise<GeoPoint | null> {
    try {
        const url = new URL(
            "https://geocoding-api.open-meteo.com/v1/search",
        );

        url.searchParams.set(
            "name",
            locationName,
        );
        url.searchParams.set("count", "10");
        url.searchParams.set("language", "vi");
        url.searchParams.set("format", "json");

        const response = await fetch(url, {
            cache: "no-store",
        });

        if (!response.ok) {
            console.warn(
                "[LITEAPI GEOCODE] Open-Meteo lỗi",
                response.status,
            );

            return null;
        }

        const payload =
            (await response.json()) as {
                results?: Array<{
                    name?: string;
                    latitude?: number;
                    longitude?: number;
                    country_code?: string;
                }>;
            };

        const rows =
            payload.results ?? [];

        const target =
            normalizeVietnamese(
                locationName,
            ).toLowerCase();

        const match =
            rows.find((row) => {
                if (
                    row.country_code !== "VN"
                ) {
                    return false;
                }

                return (
                    normalizeVietnamese(
                        row.name ?? "",
                    ).toLowerCase() === target
                );
            }) ??
            rows.find(
                (row) =>
                    row.country_code === "VN",
            ) ??
            rows[0];

        if (
            !match ||
            typeof match.latitude !==
                "number" ||
            typeof match.longitude !==
                "number"
        ) {
            return null;
        }

        return {
            latitude: match.latitude,
            longitude: match.longitude,
            name: match.name,
        };
    } catch (error) {
        console.warn(
            "[LITEAPI GEOCODE ERROR]",
            error,
        );

        return null;
    }
}

function summarizeRawResponse(
    response: LiteRatesResponse,
) {
    const firstHotel =
        response.data?.[0];

    const firstRoomType =
        firstHotel?.roomTypes?.[0];

    const firstRate =
        firstRoomType?.rates?.[0];

    return {
        sandbox: response.sandbox,
        guestLevel: response.guestLevel,
        dataCount:
            response.data?.length ?? 0,
        hotelsCount:
            response.hotels?.length ?? 0,
        firstHotelId:
            firstHotel?.hotelId,
        firstHotelRooms:
            firstHotel?.roomTypes?.length ??
            0,
        firstOfferId:
            firstRoomType?.offerId,
        firstOfferRetailRate:
            firstRoomType
                ?.offerRetailRate,
        firstRateTotal:
            firstRate?.retailRate
                ?.total?.[0],
        firstHotelMeta:
            response.hotels?.[0]
                ? {
                      id:
                          response.hotels[0]
                              .id,
                      hotelId:
                          response.hotels[0]
                              .hotelId,
                      name:
                          response.hotels[0]
                              .name,
                      rating:
                          response.hotels[0]
                              .rating,
                  }
                : null,
    };
}

async function requestRates(
    apiKey: string,
    body: Record<string, unknown>,
    strategy: SearchStrategy,
) {
    const controller =
        new AbortController();

    const timeout = setTimeout(
        () => controller.abort(),
        FETCH_TIMEOUT_MS,
    );

    const startedAt =
        performance.now();

    console.info(
        "[LITEAPI SEARCH ATTEMPT]",
        {
            strategy,
            body,
        },
    );

    try {
        const response = await fetch(
            `${BASE_URL}/hotels/rates`,
            {
                method: "POST",
                headers: {
                    Accept:
                        "application/json",
                    "Content-Type":
                        "application/json",
                    "X-API-Key": apiKey,
                },
                body: JSON.stringify(body),
                cache: "no-store",
                signal: controller.signal,
            },
        );

        /**
         * LiteAPI dùng HTTP 204 khi không có availability.
         * 204 không có JSON body nên không được gọi response.json().
         */
        if (response.status === 204) {
            console.info(
                "[LITEAPI SEARCH RESPONSE]",
                {
                    strategy,
                    status: 204,
                    elapsedMs: Math.round(
                        performance.now() -
                            startedAt,
                    ),
                    noAvailability: true,
                },
            );

            return {
                data: [],
                hotels: [],
            } satisfies LiteRatesResponse;
        }

        if (!response.ok) {
            const text =
                await response.text();

            throw new Error(
                `LiteAPI rates lỗi ${response.status}: ${text.slice(
                    0,
                    500,
                )}`,
            );
        }

        const text =
            await response.text();

        if (!text.trim()) {
            return {
                data: [],
                hotels: [],
            } satisfies LiteRatesResponse;
        }

        const payload =
            JSON.parse(
                text,
            ) as LiteRatesResponse;

        console.info(
            "[LITEAPI SEARCH RESPONSE]",
            {
                strategy,
                status: response.status,
                elapsedMs: Math.round(
                    performance.now() -
                        startedAt,
                ),
                ...summarizeRawResponse(
                    payload,
                ),
            },
        );

        return payload;
    } catch (error) {
        if (
            error instanceof DOMException &&
            error.name === "AbortError"
        ) {
            throw new Error(
                `LiteAPI search timeout sau ${FETCH_TIMEOUT_MS}ms (${strategy}).`,
            );
        }

        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

async function runSearchStrategies(
    apiKey: string,
    input: HotelSearchInput,
    commonBody: Record<
        string,
        unknown
    >,
    preference: LodgingPreference,
): Promise<SearchAttempt> {
    const providerCityName =
        resolveProviderCityName(
            input.locationName,
        );

    const geocodePromise =
        geocodeVietnamLocation(
            input.locationName,
        );

    const strategies: Array<
        () => Promise<SearchAttempt>
    > = [];

    const citySearch = async () => ({
        strategy: "city" as const,
        response: await requestRates(
            apiKey,
            {
                ...commonBody,
                countryCode: "VN",
                cityName: providerCityName,
            },
            "city",
        ),
    });

    const aiSearch = async () => ({
        strategy: "aiSearch" as const,
        response: await requestRates(
            apiKey,
            {
                ...commonBody,
                aiSearch: buildAiSearch(
                    input.locationName,
                    preference,
                ),
            },
            "aiSearch",
        ),
    });

    const coordinateSearch = async () => {
        const geo = await geocodePromise;

        if (!geo) {
            return {
                strategy:
                    "coordinates" as const,
                response: {
                    data: [],
                    hotels: [],
                },
            };
        }

        return {
            strategy:
                "coordinates" as const,
            response: await requestRates(
                apiKey,
                {
                    ...commonBody,
                    latitude: geo.latitude,
                    longitude: geo.longitude,
                    radius:
                        COORDINATE_SEARCH_RADIUS_METERS,
                },
                "coordinates",
            ),
        };
    };

    /**
     * Homestay/guesthouse là intent semantic nên ưu tiên aiSearch.
     * Hotel/any ưu tiên city trước để kết quả ổn định hơn.
     */
    if (preference === "homestay") {
        strategies.push(
            aiSearch,
            citySearch,
            coordinateSearch,
        );
    } else {
        strategies.push(
            citySearch,
            coordinateSearch,
            aiSearch,
        );
    }

    let lastAttempt: SearchAttempt = {
        strategy: "city",
        response: {
            data: [],
            hotels: [],
        },
    };

    for (const strategy of strategies) {
        const attempt = await strategy();

        lastAttempt = attempt;

        if (hasRateData(attempt.response)) {
            return attempt;
        }

        console.info(
            "[LITEAPI HOTEL SEARCH] No rate data, trying fallback",
            {
                strategy:
                    attempt.strategy,
                locationName:
                    input.locationName,
            },
        );
    }

    return lastAttempt;
}

export class LiteApiHotelProvider
    implements HotelProvider
{
    readonly id = "liteapi" as const;

    isConfigured() {
        return Boolean(getApiKey());
    }

    async search(
        input: HotelSearchInput,
    ): Promise<HotelSearchResult> {
        const nights = diffNights(
            input.checkInDate,
            input.checkOutDate,
        );

        const apiKey = getApiKey();

        const baseResult = {
            provider: "liteapi" as const,
            sourceLabel:
                "Nuitee Connect / LiteAPI",
            locationName:
                input.locationName,
            checkInDate:
                input.checkInDate,
            checkOutDate:
                input.checkOutDate,
            nights,
            maxPricePerNight:
                input.maxPricePerNight,
        };

        if (!apiKey) {
            return {
                ...baseResult,
                configured: false,
                items: [],
                message:
                    "Chưa cấu hình LITEAPI_API_KEY nên SmartTrip chưa thể lấy giá phòng thật.",
            };
        }

        /**
         * LiteAPI cần tuổi từng trẻ để tính giá chính xác.
         * Không tự giả định tuổi trẻ em.
         */
        if (input.childCount > 0) {
            return {
                ...baseResult,
                configured: true,
                items: [],
                message:
                    "LiteAPI cần tuổi của từng trẻ em để tính giá chính xác. SmartTrip hiện mới biết số trẻ em nên chưa gửi truy vấn giá để tránh báo sai.",
            };
        }

        const occupancies =
            buildOccupancies(input);

        if (occupancies.length === 0) {
            return {
                ...baseResult,
                configured: true,
                items: [],
                message:
                    "Thông tin số phòng/người chưa đủ để tạo occupancy tìm khách sạn.",
            };
        }

        const preference =
            input.preference ?? "any";

        const commonBody = {
            occupancies,
            currency: "VND",
            guestNationality: "VN",
            checkin: input.checkInDate,
            checkout: input.checkOutDate,
            timeout:
                PROVIDER_TIMEOUT_SECONDS,
            maxRatesPerHotel: 1,
            roomMapping: true,
            includeHotelData: true,
            limit: SEARCH_LIMIT,
        } satisfies Record<
            string,
            unknown
        >;

        const providerCityName =
            resolveProviderCityName(
                input.locationName,
            );

        console.info(
            "[LITEAPI HOTEL SEARCH]",
            {
                locationName:
                    input.locationName,
                providerCityName,
                checkInDate:
                    input.checkInDate,
                checkOutDate:
                    input.checkOutDate,
                adultCount:
                    input.adultCount,
                childCount:
                    input.childCount,
                roomCount:
                    input.roomCount,
                occupancies,
                maxPricePerNight:
                    input.maxPricePerNight,
                preference,
            },
        );

        const attempt =
            await runSearchStrategies(
                apiKey,
                input,
                commonBody,
                preference,
            );

        const response =
            attempt.response;

        console.info(
            "[LITEAPI RAW RESPONSE]",
            {
                strategy:
                    attempt.strategy,
                ...summarizeRawResponse(
                    response,
                ),
            },
        );

        /**
         * Parse trước khi filter budget để biết API có phòng thật hay parser lỗi.
         */
        const parsedItems =
            toHotelItems(
                response,
                input,
            );

        const nonVndItems =
            parsedItems.filter(
                (item) =>
                    item.currency &&
                    item.currency !== "VND",
            );

        /**
         * Budget của SmartTrip là VND.
         * Khi có budget, chỉ so sánh những rate provider trả đúng VND.
         * Không tự đổi tỷ giá tại đây vì sẽ làm giá phòng sai thời điểm.
         */
        const budgetFilteredItems =
            input.maxPricePerNight
                ? parsedItems.filter(
                      (item) =>
                          item.currency ===
                              "VND" &&
                          item.pricePerNight !==
                              undefined &&
                          item.pricePerNight <=
                              input.maxPricePerNight!,
                  )
                : parsedItems;

        const items =
            budgetFilteredItems.slice(
                0,
                DISPLAY_LIMIT,
            );

        const cheapestParsed =
            parsedItems[0];

        console.info(
            "[LITEAPI PARSED RESULT]",
            {
                strategy:
                    attempt.strategy,
                rawHotels:
                    response.data?.length ??
                    0,
                parsedHotels:
                    parsedItems.length,
                afterBudgetFilter:
                    items.length,
                budgetPerNight:
                    input.maxPricePerNight,
                nonVndCount:
                    nonVndItems.length,
                cheapest:
                    cheapestParsed
                        ? {
                              name:
                                  cheapestParsed.name,
                              pricePerNight:
                                  cheapestParsed.pricePerNight,
                              totalPrice:
                                  cheapestParsed.totalPrice,
                              currency:
                                  cheapestParsed.currency,
                          }
                        : null,
                prices:
                    parsedItems
                        .slice(0, 8)
                        .map((item) => ({
                            name: item.name,
                            pricePerNight:
                                item.pricePerNight,
                            totalPrice:
                                item.totalPrice,
                            currency:
                                item.currency,
                        })),
            },
        );

        let message: string | undefined;

        if (items.length === 0) {
            if (
                (response.data?.length ?? 0) ===
                0
            ) {
                message =
                    "LiteAPI chưa trả về phòng khả dụng cho điểm đến/ngày này. SmartTrip đã thử tìm theo thành phố, tọa độ và AI search.";
            } else if (
                parsedItems.length === 0
            ) {
                message =
                    "LiteAPI có trả dữ liệu khách sạn nhưng chưa có offer/rate hợp lệ để SmartTrip hiển thị. Hãy xem log [LITEAPI RAW RESPONSE] để kiểm tra cấu trúc response.";
            } else if (
                input.maxPricePerNight &&
                nonVndItems.length ===
                    parsedItems.length
            ) {
                message =
                    "LiteAPI có phòng nhưng sandbox không trả giá bằng VND cho kết quả này, nên SmartTrip chưa thể so sánh chính xác với ngân sách VNĐ của bạn.";
            } else if (
                input.maxPricePerNight &&
                cheapestParsed?.currency ===
                    "VND" &&
                cheapestParsed.pricePerNight
            ) {
                const cheapestLabel =
                    new Intl.NumberFormat(
                        "vi-VN",
                        {
                            style: "currency",
                            currency: "VND",
                            maximumFractionDigits: 0,
                        },
                    ).format(
                        cheapestParsed.pricePerNight,
                    );

                message =
                    `LiteAPI có phòng khả dụng nhưng chưa có lựa chọn nào dưới ${new Intl.NumberFormat(
                        "vi-VN",
                        {
                            style: "currency",
                            currency: "VND",
                            maximumFractionDigits: 0,
                        },
                    ).format(
                        input.maxPricePerNight,
                    )}/đêm. Giá thấp nhất hiện tại khoảng ${cheapestLabel}/đêm.`;
            } else {
                message =
                    "LiteAPI chưa trả về chỗ ở phù hợp bộ lọc hiện tại. Bạn có thể đổi ngày hoặc nới điều kiện tìm kiếm.";
            }
        }

        return {
            ...baseResult,
            configured: true,
            sandbox: response.sandbox,
            items,
            message,
        };
    }
}