import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

vi.mock("server-only", () => ({}));

import {
    checkTravelWeatherService,
} from "@/src/services/travel-weather.service";

const fetchMock = vi.fn<typeof fetch>();

const baseInput = {
    locationName: "Đà Nẵng",
    startDate: "2026-08-30",
    dayCount: 2,
    activities: [],
};

const geocodingResult = {
    results: [
        {
            name: "Đà Nẵng",
            admin1: "Đà Nẵng",
            latitude: 16.0544,
            longitude: 108.2022,
            timezone: "Asia/Ho_Chi_Minh",
            country_code: "VN",
        },
    ],
};

const forecastResult = {
    timezone: "Asia/Ho_Chi_Minh",
    daily: {
        time: [
            "2026-08-30",
            "2026-08-31",
        ],
        weather_code: [
            1,
            61,
        ],
        temperature_2m_max: [
            33,
            31,
        ],
        temperature_2m_min: [
            25,
            24,
        ],
        precipitation_probability_max: [
            10,
            70,
        ],
        precipitation_sum: [
            0,
            5.5,
        ],
    },
    hourly: {
        time: [],
        temperature_2m: [],
        precipitation_probability: [],
        precipitation: [],
        weather_code: [],
        wind_speed_10m: [],
    },
};

function jsonResponse(
    body: unknown,
    status = 200,
) {
    return new Response(
        JSON.stringify(body),
        {
            status,
            headers: {
                "Content-Type": "application/json",
            },
        },
    );
}

function mockSuccessfulApi(
    forecast: unknown = forecastResult,
    geocoding: unknown = geocodingResult,
) {
    fetchMock
        .mockResolvedValueOnce(jsonResponse(geocoding))
        .mockResolvedValueOnce(jsonResponse(forecast));
}

describe("checkTravelWeatherService", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(
            new Date("2026-08-29T00:00:00.000Z"),
        );
        fetchMock.mockReset();
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it("không gọi API cho ngày khởi hành trong quá khứ", async () => {
        const result = await checkTravelWeatherService({
            ...baseInput,
            startDate: "2026-08-28",
        });

        expect(result).toMatchObject({
            available: false,
            locationName: "Đà Nẵng",
            days: [],
            activityWarnings: [],
            message: expect.stringContaining("trong quá khứ"),
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("không gọi API khi chuyến đi nằm ngoài cửa sổ 16 ngày", async () => {
        const result = await checkTravelWeatherService({
            ...baseInput,
            startDate: "2026-09-14",
        });

        expect(result).toMatchObject({
            available: false,
            days: [],
            activityWarnings: [],
            message: expect.stringContaining("cửa sổ 16 ngày"),
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("trả unavailable khi không tìm thấy tọa độ", async () => {
        fetchMock.mockResolvedValueOnce(
            jsonResponse({}),
        );

        const result = await checkTravelWeatherService(baseInput);

        expect(result).toMatchObject({
            available: false,
            days: [],
            activityWarnings: [],
            message: "Không xác định được tọa độ để kiểm tra thời tiết.",
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("truyền lỗi HTTP từ geocoding", async () => {
        fetchMock.mockResolvedValueOnce(
            jsonResponse({}, 503),
        );

        await expect(
            checkTravelWeatherService(baseInput),
        ).rejects.toThrow("Open-Meteo geocoding lỗi 503");
    });

    it("truyền lỗi HTTP từ forecast", async () => {
        fetchMock
            .mockResolvedValueOnce(jsonResponse(geocodingResult))
            .mockResolvedValueOnce(jsonResponse({}, 429));

        await expect(
            checkTravelWeatherService(baseInput),
        ).rejects.toThrow("Open-Meteo forecast lỗi 429");
    });

    it("ưu tiên địa điểm Việt Nam trùng tên sau khi bỏ dấu", async () => {
        mockSuccessfulApi(forecastResult, {
            results: [
                {
                    name: "Huế",
                    latitude: 16.4,
                    longitude: 107.5,
                    country_code: "VN",
                },
                {
                    name: "Da Nang",
                    latitude: 16.1,
                    longitude: 108.2,
                    country_code: "VN",
                },
            ],
        });

        const result = await checkTravelWeatherService(baseInput);

        expect(result.resolvedLocationName).toBe("Da Nang");
        expect(result.latitude).toBe(16.1);
        expect(String(fetchMock.mock.calls[1]?.[0])).toContain(
            "latitude=16.1",
        );
    });

    it("fallback sang kết quả Việt Nam đầu tiên rồi kết quả toàn cầu đầu tiên", async () => {
        mockSuccessfulApi(forecastResult, {
            results: [
                {
                    name: "Bangkok",
                    latitude: 13.7,
                    longitude: 100.5,
                    country_code: "TH",
                },
                {
                    name: "Hội An",
                    latitude: 15.8,
                    longitude: 108.3,
                    country_code: "VN",
                },
            ],
        });

        const vietnamResult = await checkTravelWeatherService({
            ...baseInput,
            locationName: "Không trùng tên",
        });
        expect(vietnamResult.resolvedLocationName).toBe("Hội An");

        fetchMock.mockReset();
        mockSuccessfulApi(forecastResult, {
            results: [
                {
                    name: "Bangkok",
                    latitude: 13.7,
                    longitude: 100.5,
                    country_code: "TH",
                },
            ],
        });

        const globalResult = await checkTravelWeatherService({
            ...baseInput,
            locationName: "Không trùng tên",
        });
        expect(globalResult.resolvedLocationName).toBe("Bangkok");
    });

    it("ánh xạ dự báo từng ngày và để trống ngày không có dữ liệu", async () => {
        mockSuccessfulApi();

        const result = await checkTravelWeatherService({
            ...baseInput,
            dayCount: 3,
        });

        expect(result).toMatchObject({
            source: "open-meteo",
            sourceLabel: "Open-Meteo",
            available: true,
            locationName: "Đà Nẵng",
            resolvedLocationName: "Đà Nẵng, Đà Nẵng",
            latitude: 16.0544,
            longitude: 108.2022,
            timezone: "Asia/Ho_Chi_Minh",
            activityWarnings: [],
        });
        expect(result.days).toEqual([
            {
                date: "2026-08-30",
                weatherCode: 1,
                maxTemperature: 33,
                minTemperature: 25,
                precipitationProbabilityMax: 10,
                precipitationSum: 0,
            },
            {
                date: "2026-08-31",
                weatherCode: 61,
                maxTemperature: 31,
                minTemperature: 24,
                precipitationProbabilityMax: 70,
                precipitationSum: 5.5,
            },
            {
                date: "2026-09-01",
                weatherCode: undefined,
                maxTemperature: undefined,
                minTemperature: undefined,
                precipitationProbabilityMax: undefined,
                precipitationSum: undefined,
            },
        ]);
    });

    it("dùng timezone geocoding khi forecast không cung cấp timezone", async () => {
        mockSuccessfulApi({});

        const result = await checkTravelWeatherService(baseInput);

        expect(result.timezone).toBe("Asia/Ho_Chi_Minh");
        expect(result.days).toEqual([
            {
                date: "2026-08-30",
                weatherCode: undefined,
                maxTemperature: undefined,
                minTemperature: undefined,
                precipitationProbabilityMax: undefined,
                precipitationSum: undefined,
            },
            {
                date: "2026-08-31",
                weatherCode: undefined,
                maxTemperature: undefined,
                minTemperature: undefined,
                precipitationProbabilityMax: undefined,
                precipitationSum: undefined,
            },
        ]);
    });

    it("tạo đủ cảnh báo mưa lớn, mưa vừa, gió mạnh và nắng nóng", async () => {
        const hourlyForecast = {
            ...forecastResult,
            hourly: {
                time: [
                    "2026-08-30T08:00",
                    "2026-08-30T10:00",
                    "2026-08-30T12:00",
                    "2026-08-30T14:00",
                    "2026-08-30T16:00",
                ],
                temperature_2m: [
                    25,
                    26,
                    27,
                    36,
                    30,
                ],
                precipitation_probability: [
                    80,
                    55,
                    10,
                    0,
                    0,
                ],
                precipitation: [
                    0.5,
                    0,
                    0,
                    0,
                    0,
                ],
                wind_speed_10m: [
                    5,
                    5,
                    45,
                    5,
                    5,
                ],
            },
        };
        mockSuccessfulApi(hourlyForecast);

        const activities = [
            {
                dayNumber: 1,
                destinationName: "Bãi biển",
                title: "Tắm biển",
                description: "",
                startTime: "8:00",
            },
            {
                dayNumber: 1,
                destinationName: "Công viên",
                title: "Đi bộ",
                description: "",
                startTime: "9:40",
            },
            {
                dayNumber: 1,
                destinationName: "Cầu Rồng",
                title: "Tham quan",
                description: "",
                startTime: "12:00",
            },
            {
                dayNumber: 1,
                destinationName: "Bán đảo Sơn Trà",
                title: "Ngắm cảnh",
                description: "",
                startTime: "14:00",
            },
            {
                dayNumber: 1,
                destinationName: "Phố đi bộ",
                title: "Dạo phố",
                description: "",
                startTime: "16:00",
            },
        ];

        const result = await checkTravelWeatherService({
            ...baseInput,
            activities,
        });

        expect(result.activityWarnings).toHaveLength(4);
        expect(
            result.activityWarnings.map((warning) => warning.label),
        ).toEqual([
            "Nguy cơ mưa cao",
            "Có thể gặp mưa",
            "Gió khá mạnh",
            "Nắng nóng",
        ]);
        expect(result.activityWarnings[0]).toMatchObject({
            severity: "danger",
            startTime: "8:00",
            temperature: 25,
            precipitationProbability: 80,
            windSpeed: 5,
        });
    });

    it("cảnh báo mưa lớn khi lượng mưa cao dù xác suất thấp", async () => {
        mockSuccessfulApi({
            hourly: {
                time: [
                    "2026-08-30T06:00",
                ],
                precipitation_probability: [
                    10,
                ],
                precipitation: [
                    4,
                ],
            },
        });

        const result = await checkTravelWeatherService({
            ...baseInput,
            activities: [
                {
                    dayNumber: 1,
                    destinationName: "Bãi biển",
                    title: "Ngắm bình minh",
                    description: "",
                    startTime: "6:00",
                },
            ],
        });

        expect(result.activityWarnings[0]).toMatchObject({
            severity: "danger",
            label: "Nguy cơ mưa cao",
            precipitationProbability: 10,
        });
    });

    it("không cảnh báo khi hourly có mốc giờ nhưng thiếu toàn bộ số liệu", async () => {
        mockSuccessfulApi({
            hourly: {
                time: [
                    "2026-08-30T06:00",
                ],
            },
        });

        const result = await checkTravelWeatherService({
            ...baseInput,
            activities: [
                {
                    dayNumber: 1,
                    destinationName: "Bãi biển",
                    title: "Ngắm bình minh",
                    description: "",
                    startTime: "6:00",
                },
            ],
        });

        expect(result.activityWarnings).toEqual([]);
    });

    it("bỏ qua hoạt động trong nhà, không rõ ngoài trời và giờ không có dữ liệu", async () => {
        mockSuccessfulApi({
            hourly: {
                time: [],
                temperature_2m: [],
                precipitation_probability: [],
                precipitation: [],
                wind_speed_10m: [],
            },
        });

        const result = await checkTravelWeatherService({
            ...baseInput,
            activities: [
                {
                    dayNumber: 1,
                    destinationName: "Bảo tàng Chăm",
                    title: "Tham quan indoor",
                    description: "",
                    startTime: "8:00",
                },
                {
                    dayNumber: 1,
                    destinationName: "Khách sạn",
                    title: "Nghỉ ngơi",
                    description: "",
                    startTime: "9:00",
                },
                {
                    dayNumber: 1,
                    destinationName: "Bãi biển",
                    title: "Tắm biển",
                    description: "",
                    startTime: "10:00",
                },
            ],
        });

        expect(result.activityWarnings).toEqual([]);
    });
});
