import "server-only";

export type TravelWeatherActivityWarning = {
    dayNumber: number;
    destinationName: string;
    title: string;
    startTime: string;
    severity: "info" | "warning" | "danger";
    label: string;
    detail: string;
    temperature?: number;
    precipitationProbability?: number;
    windSpeed?: number;
};

export type TravelWeatherDay = {
    date: string;
    weatherCode?: number;
    minTemperature?: number;
    maxTemperature?: number;
    precipitationProbabilityMax?: number;
    precipitationSum?: number;
};

export type TravelWeatherResult = {
    source: "open-meteo";
    sourceLabel: "Open-Meteo";
    available: boolean;
    locationName: string;
    resolvedLocationName?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
    days: TravelWeatherDay[];
    activityWarnings: TravelWeatherActivityWarning[];
    message?: string;
};

type WeatherInput = {
    locationName: string;
    startDate: string;
    dayCount: number;

    activities: Array<{
        dayNumber: number;
        destinationName: string;
        title: string;
        description: string;
        startTime: string;
    }>;
};

type GeocodingResponse = {
    results?: Array<{
        name: string;
        latitude: number;
        longitude: number;
        timezone?: string;
        country_code?: string;
        admin1?: string;
    }>;
};

type ForecastResponse = {
    timezone?: string;

    hourly?: {
        time?: string[];
        temperature_2m?: number[];
        precipitation_probability?: number[];
        precipitation?: number[];
        weather_code?: number[];
        wind_speed_10m?: number[];
    };

    daily?: {
        time?: string[];
        weather_code?: number[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        precipitation_probability_max?: number[];
        precipitation_sum?: number[];
    };
};

function normalize(
    value: string,
) {
    return value
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            "",
        )
        .replace(
            /đ/g,
            "d",
        )
        .replace(
            /Đ/g,
            "D",
        )
        .toLowerCase();
}

function addDays(
    iso: string,
    days: number,
) {
    const date =
        new Date(
            `${iso}T00:00:00Z`,
        );

    date.setUTCDate(
        date.getUTCDate() +
            days,
    );

    return date
        .toISOString()
        .slice(
            0,
            10,
        );
}

function getTodayVietnam() {
    return new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone:
                "Asia/Ho_Chi_Minh",

            year:
                "numeric",

            month:
                "2-digit",

            day:
                "2-digit",
        },
    ).format(
        new Date(),
    );
}

function daysBetween(
    startIso: string,
    endIso: string,
) {
    const start =
        new Date(
            `${startIso}T00:00:00Z`,
        ).getTime();

    const end =
        new Date(
            `${endIso}T00:00:00Z`,
        ).getTime();

    return Math.floor(
        (end - start) /
            86_400_000,
    );
}

function isLikelyOutdoor(
    activity:
        WeatherInput[
            "activities"
        ][number],
) {
    const text =
        normalize(
            `${activity.destinationName} ${activity.title} ${activity.description}`,
        );

    const indoor = [
        "bao tang",
        "trung tam thuong mai",
        "mall",
        "cinema",
        "rap phim",
        "spa",
        "nha hang",
        "cafe trong nha",
        "indoor",
    ];

    if (
        indoor.some(
            (keyword) =>
                text.includes(
                    keyword,
                ),
        )
    ) {
        return false;
    }

    const outdoor = [
        "bien",
        "bai tam",
        "nui",
        "deo",
        "thac",
        "song",
        "suoi",
        "dao",
        "ban dao",
        "cau",
        "cong vien",
        "quang truong",
        "pho di bo",
        "vuon",
        "lang",
        "chua",
        "den",
        "dinh",
        "check in",
        "check-in",
        "ngam",
        "di bo",
        "tham quan",
    ];

    return outdoor.some(
        (keyword) =>
            text.includes(
                keyword,
            ),
    );
}

function nearestHourIndex(
    times: string[],
    target: string,
) {
    const exact =
        times.indexOf(
            target,
        );

    if (
        exact >= 0
    ) {
        return exact;
    }

    const targetMs =
        new Date(
            target,
        ).getTime();

    let bestIndex =
        -1;

    let bestDistance =
        Number.POSITIVE_INFINITY;

    times.forEach(
        (
            time,
            index,
        ) => {
            const distance =
                Math.abs(
                    new Date(
                        time,
                    ).getTime() -
                        targetMs,
                );

            if (
                distance <
                bestDistance
            ) {
                bestDistance =
                    distance;

                bestIndex =
                    index;
            }
        },
    );

    return bestIndex;
}

function warningForValues(
    input: {
        rainProbability?: number;
        precipitation?: number;
        temperature?: number;
        windSpeed?: number;
    },
) {
    const rainProbability =
        input.rainProbability ??
        0;

    const precipitation =
        input.precipitation ??
        0;

    const temperature =
        input.temperature;

    const windSpeed =
        input.windSpeed ??
        0;

    if (
        rainProbability >=
            75 ||
        precipitation >= 4
    ) {
        return {
            severity:
                "danger" as const,

            label:
                "Nguy cơ mưa cao",

            detail:
                `Khả năng mưa khoảng ${Math.round(
                    rainProbability,
                )}%, lượng mưa dự báo ${precipitation.toFixed(
                    1,
                )} mm. Nên có phương án trong nhà hoặc đổi khung giờ.`,
        };
    }

    if (
        rainProbability >=
            50 ||
        precipitation >=
            1.5
    ) {
        return {
            severity:
                "warning" as const,

            label:
                "Có thể gặp mưa",

            detail:
                `Khả năng mưa khoảng ${Math.round(
                    rainProbability,
                )}%. Nên mang áo mưa/ô và giữ lịch linh hoạt.`,
        };
    }

    if (
        windSpeed >= 40
    ) {
        return {
            severity:
                "warning" as const,

            label:
                "Gió khá mạnh",

            detail:
                `Gió dự báo khoảng ${Math.round(
                    windSpeed,
                )} km/h. Cần thận trọng với hoạt động ngoài trời, ven biển hoặc trên cao.`,
        };
    }

    if (
        temperature !==
            undefined &&
        temperature >=
            35
    ) {
        return {
            severity:
                "warning" as const,

            label:
                "Nắng nóng",

            detail:
                `Nhiệt độ khoảng ${Math.round(
                    temperature,
                )}°C. Nên ưu tiên sáng sớm/chiều muộn và bổ sung nước.`,
        };
    }

    return null;
}

async function geocodeLocation(
    locationName: string,
) {
    const url =
        new URL(
            "https://geocoding-api.open-meteo.com/v1/search",
        );

    url.searchParams.set(
        "name",
        locationName,
    );

    url.searchParams.set(
        "count",
        "10",
    );

    url.searchParams.set(
        "language",
        "vi",
    );

    url.searchParams.set(
        "format",
        "json",
    );

    const response =
        await fetch(
            url,
            {
                cache:
                    "no-store",
            },
        );

    if (
        !response.ok
    ) {
        throw new Error(
            `Open-Meteo geocoding lỗi ${response.status}`,
        );
    }

    const payload =
        (await response.json()) as GeocodingResponse;

    const rows =
        payload.results ??
        [];

    const target =
        normalize(
            locationName,
        ).trim();

    return (
        rows.find(
            (row) =>
                row.country_code ===
                    "VN" &&
                normalize(
                    row.name,
                ).trim() ===
                    target,
        ) ??
        rows.find(
            (row) =>
                row.country_code ===
                "VN",
        ) ??
        rows[0] ??
        null
    );
}

async function fetchForecast(
    latitude: number,
    longitude: number,
) {
    const url =
        new URL(
            "https://api.open-meteo.com/v1/forecast",
        );

    url.searchParams.set(
        "latitude",
        String(
            latitude,
        ),
    );

    url.searchParams.set(
        "longitude",
        String(
            longitude,
        ),
    );

    url.searchParams.set(
        "hourly",
        [
            "temperature_2m",
            "precipitation_probability",
            "precipitation",
            "weather_code",
            "wind_speed_10m",
        ].join(
            ",",
        ),
    );

    url.searchParams.set(
        "daily",
        [
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_probability_max",
            "precipitation_sum",
        ].join(
            ",",
        ),
    );

    url.searchParams.set(
        "timezone",
        "auto",
    );

    url.searchParams.set(
        "forecast_days",
        "16",
    );

    const response =
        await fetch(
            url,
            {
                cache:
                    "no-store",
            },
        );

    if (
        !response.ok
    ) {
        throw new Error(
            `Open-Meteo forecast lỗi ${response.status}`,
        );
    }

    return (
        await response.json()
    ) as ForecastResponse;
}

export async function checkTravelWeatherService(
    input: WeatherInput,
): Promise<TravelWeatherResult> {
    const today =
        getTodayVietnam();

    const offset =
        daysBetween(
            today,
            input.startDate,
        );

    if (
        offset < 0
    ) {
        return {
            source:
                "open-meteo",

            sourceLabel:
                "Open-Meteo",

            available:
                false,

            locationName:
                input.locationName,

            days: [],

            activityWarnings:
                [],

            message:
                "Ngày khởi hành đã ở trong quá khứ nên Weather Forecast không được dùng cho lịch này.",
        };
    }

    if (
        offset > 15
    ) {
        return {
            source:
                "open-meteo",

            sourceLabel:
                "Open-Meteo",

            available:
                false,

            locationName:
                input.locationName,

            days: [],

            activityWarnings:
                [],

            message:
                "Chuyến đi còn quá xa để có dự báo ngắn hạn đáng tin cậy. SmartTrip sẽ chỉ hiển thị dự báo khi ngày đi nằm trong cửa sổ 16 ngày.",
        };
    }

    const location =
        await geocodeLocation(
            input.locationName,
        );

    if (!location) {
        return {
            source:
                "open-meteo",

            sourceLabel:
                "Open-Meteo",

            available:
                false,

            locationName:
                input.locationName,

            days: [],

            activityWarnings:
                [],

            message:
                "Không xác định được tọa độ để kiểm tra thời tiết.",
        };
    }

    const forecast =
        await fetchForecast(
            location.latitude,
            location.longitude,
        );

    const dailyTimes =
        forecast.daily?.time ??
        [];

    const tripDates =
        Array.from(
            {
                length:
                    input.dayCount,
            },

            (
                _,
                index,
            ) =>
                addDays(
                    input.startDate,
                    index,
                ),
        );

    const days:
        TravelWeatherDay[] =
        tripDates.map(
            (date) => {
                const index =
                    dailyTimes.indexOf(
                        date,
                    );

                return {
                    date,

                    weatherCode:
                        index >=
                        0
                            ? forecast
                                  .daily
                                  ?.weather_code?.[
                                  index
                              ]
                            : undefined,

                    maxTemperature:
                        index >=
                        0
                            ? forecast
                                  .daily
                                  ?.temperature_2m_max?.[
                                  index
                              ]
                            : undefined,

                    minTemperature:
                        index >=
                        0
                            ? forecast
                                  .daily
                                  ?.temperature_2m_min?.[
                                  index
                              ]
                            : undefined,

                    precipitationProbabilityMax:
                        index >=
                        0
                            ? forecast
                                  .daily
                                  ?.precipitation_probability_max?.[
                                  index
                              ]
                            : undefined,

                    precipitationSum:
                        index >=
                        0
                            ? forecast
                                  .daily
                                  ?.precipitation_sum?.[
                                  index
                              ]
                            : undefined,
                };
            },
        );

    const hourlyTimes =
        forecast.hourly
            ?.time ??
        [];

    const warnings:
        TravelWeatherActivityWarning[] =
        [];

    for (
        const activity of
        input.activities
    ) {
        if (
            !isLikelyOutdoor(
                activity,
            )
        ) {
            continue;
        }

        const date =
            addDays(
                input.startDate,
                activity.dayNumber -
                    1,
            );

        const time =
            `${date}T${activity.startTime.padStart(
                5,
                "0",
            )}`;

        const index =
            nearestHourIndex(
                hourlyTimes,
                time,
            );

        if (
            index < 0
        ) {
            continue;
        }

        const temperature =
            forecast.hourly
                ?.temperature_2m?.[
                index
            ];

        const rainProbability =
            forecast.hourly
                ?.precipitation_probability?.[
                index
            ];

        const precipitation =
            forecast.hourly
                ?.precipitation?.[
                index
            ];

        const windSpeed =
            forecast.hourly
                ?.wind_speed_10m?.[
                index
            ];

        const warning =
            warningForValues(
                {
                    rainProbability,
                    precipitation,
                    temperature,
                    windSpeed,
                },
            );

        if (!warning) {
            continue;
        }

        warnings.push({
            dayNumber:
                activity.dayNumber,

            destinationName:
                activity.destinationName,

            title:
                activity.title,

            startTime:
                activity.startTime,

            severity:
                warning.severity,

            label:
                warning.label,

            detail:
                warning.detail,

            temperature,

            precipitationProbability:
                rainProbability,

            windSpeed,
        });
    }

    return {
        source:
            "open-meteo",

        sourceLabel:
            "Open-Meteo",

        available:
            true,

        locationName:
            input.locationName,

        resolvedLocationName:
            [
                location.name,
                location.admin1,
            ]
                .filter(
                    Boolean,
                )
                .join(
                    ", ",
                ),

        latitude:
            location.latitude,

        longitude:
            location.longitude,

        timezone:
            forecast.timezone ??
            location.timezone,

        days,

        activityWarnings:
            warnings,
    };
}