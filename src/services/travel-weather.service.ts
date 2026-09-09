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
  sourceLabel: string;
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

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00Z`);

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function getTodayVietnam() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",

    year: "numeric",

    month: "2-digit",

    day: "2-digit",
  }).format(new Date());
}

function daysBetween(startIso: string, endIso: string) {
  const start = new Date(`${startIso}T00:00:00Z`).getTime();

  const end = new Date(`${endIso}T00:00:00Z`).getTime();

  return Math.floor((end - start) / 86_400_000);
}

function isLikelyOutdoor(activity: WeatherInput["activities"][number]) {
  const text = normalize(`${activity.destinationName} ${activity.title} ${activity.description}`);

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

  if (indoor.some((keyword) => text.includes(keyword))) {
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

  return outdoor.some((keyword) => text.includes(keyword));
}

function nearestHourIndex(times: string[], target: string) {
  const exact = times.indexOf(target);

  if (exact >= 0) {
    return exact;
  }

  const targetMs = new Date(target).getTime();

  let bestIndex = -1;

  let bestDistance = Number.POSITIVE_INFINITY;

  times.forEach((time, index) => {
    const distance = Math.abs(new Date(time).getTime() - targetMs);

    if (distance < bestDistance) {
      bestDistance = distance;

      bestIndex = index;
    }
  });

  return bestIndex;
}

function warningForValues(input: {
  rainProbability?: number;
  precipitation?: number;
  temperature?: number;
  windSpeed?: number;
}) {
  const rainProbability = input.rainProbability ?? 0;

  const precipitation = input.precipitation ?? 0;

  const temperature = input.temperature;

  const windSpeed = input.windSpeed ?? 0;

  if (rainProbability >= 75 || precipitation >= 4) {
    return {
      severity: "danger" as const,

      label: "Nguy cơ mưa cao",

      detail: `Khả năng mưa khoảng ${Math.round(rainProbability)}%, lượng mưa dự báo ${precipitation.toFixed(
        1,
      )} mm. Nên có phương án trong nhà hoặc đổi khung giờ.`,
    };
  }

  if (rainProbability >= 50 || precipitation >= 1.5) {
    return {
      severity: "warning" as const,

      label: "Có thể gặp mưa",

      detail: `Khả năng mưa khoảng ${Math.round(rainProbability)}%. Nên mang áo mưa/ô và giữ lịch linh hoạt.`,
    };
  }

  if (windSpeed >= 40) {
    return {
      severity: "warning" as const,

      label: "Gió khá mạnh",

      detail: `Gió dự báo khoảng ${Math.round(
        windSpeed,
      )} km/h. Cần thận trọng với hoạt động ngoài trời, ven biển hoặc trên cao.`,
    };
  }

  if (temperature !== undefined && temperature >= 35) {
    return {
      severity: "warning" as const,

      label: "Nắng nóng",

      detail: `Nhiệt độ khoảng ${Math.round(temperature)}°C. Nên ưu tiên sáng sớm/chiều muộn và bổ sung nước.`,
    };
  }

  return null;
}

const KNOWN_COORDINATES: Record<
  string,
  {
    latitude: number;
    longitude: number;
    name: string;
    admin1?: string;
  }
> = {
  "da nang": { latitude: 16.06778, longitude: 108.22083, name: "Đà Nẵng", admin1: "Đà Nẵng" },
  "hue": { latitude: 16.4619, longitude: 107.59546, name: "Huế", admin1: "Thừa Thiên Huế" },
  "hoi an": { latitude: 15.87944, longitude: 108.335, name: "Hội An", admin1: "Quảng Nam" },
  "ha noi": { latitude: 21.0245, longitude: 105.84117, name: "Hà Nội", admin1: "Hà Nội" },
  "ho chi minh": { latitude: 10.82302, longitude: 106.62965, name: "TP. Hồ Chí Minh", admin1: "Hồ Chí Minh" },
  "sai gon": { latitude: 10.82302, longitude: 106.62965, name: "TP. Hồ Chí Minh", admin1: "Hồ Chí Minh" },
  "nha trang": { latitude: 12.24507, longitude: 109.19432, name: "Nha Trang", admin1: "Khánh Hòa" },
  "da lat": { latitude: 11.94646, longitude: 108.44193, name: "Đà Lạt", admin1: "Lâm Đồng" },
  "phu quoc": { latitude: 10.2289, longitude: 103.9572, name: "Phú Quốc", admin1: "Kiên Giang" },
  "sa pa": { latitude: 22.3364, longitude: 103.8438, name: "Sa Pa", admin1: "Lào Cai" },
  "sapa": { latitude: 22.3364, longitude: 103.8438, name: "Sa Pa", admin1: "Lào Cai" },
  "ninh binh": { latitude: 20.2506, longitude: 105.9745, name: "Ninh Bình", admin1: "Ninh Bình" },
  "ha long": { latitude: 20.9505, longitude: 107.0734, name: "Hạ Long", admin1: "Quảng Ninh" },
  "quy nhon": { latitude: 13.783, longitude: 109.2197, name: "Quy Nhơn", admin1: "Bình Định" },
  "vung tau": { latitude: 10.346, longitude: 107.0843, name: "Vũng Tàu", admin1: "Bà Rịa - Vũng Tàu" },
  "phan thiet": { latitude: 10.9289, longitude: 108.1021, name: "Phan Thiết", admin1: "Bình Thuận" },
};

function cleanLocationPrefix(value: string) {
  return value
    .replace(/^(?:tp\.?|thành phố|thanh pho|tỉnh|tinh)\s+/i, "")
    .trim();
}

function shiftYear(isoDate: string, yearDelta: number): string {
  const parts = isoDate.split("-");
  const targetYear = Number(parts[0]) + yearDelta;
  if (parts[1] === "02" && parts[2] === "29") {
    return `${targetYear}-02-28`;
  }
  return `${targetYear}-${parts[1]}-${parts[2]}`;
}

async function geocodeLocation(locationName: string) {
  const cleaned = cleanLocationPrefix(locationName);
  const targetCleaned = normalize(cleaned).trim();
  const targetRaw = normalize(locationName).trim();

  // 1. Direct dictionary match for high accuracy & zero network failure for known VN destinations
  for (const [key, known] of Object.entries(KNOWN_COORDINATES)) {
    if (
      targetCleaned === key ||
      targetRaw === key ||
      targetCleaned.includes(key) ||
      key.includes(targetCleaned)
    ) {
      return {
        name: known.name,
        latitude: known.latitude,
        longitude: known.longitude,
        country_code: "VN",
        admin1: known.admin1,
      };
    }
  }

  // 2. Open-Meteo Geocoding API with cleaned name
  const query = cleaned || locationName;
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", "10");
  url.searchParams.set("language", "vi");
  url.searchParams.set("format", "json");

  try {
    const response = await fetch(url, {
      cache: "no-store",
    });

    if (response.ok) {
      const payload = (await response.json()) as GeocodingResponse;
      const rows = payload.results ?? [];

      const match =
        rows.find((row) => row.country_code === "VN" && normalize(row.name).trim() === targetCleaned) ??
        rows.find((row) => row.country_code === "VN") ??
        rows[0] ??
        null;

      if (match) {
        return match;
      }
    }
  } catch (error) {
    console.warn("[WEATHER GEOCODE ERROR]", error);
  }

  return null;
}

async function fetchForecast(latitude: number, longitude: number) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");

  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "hourly",
    ["temperature_2m", "precipitation_probability", "precipitation", "weather_code", "wind_speed_10m"].join(","),
  );
  url.searchParams.set(
    "daily",
    [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
      "precipitation_sum",
    ].join(","),
  );
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "16");

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo forecast lỗi ${response.status}`);
  }

  return (await response.json()) as ForecastResponse;
}

async function fetchArchiveWeather(
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string,
) {
  const url = new URL("https://archive-api.open-meteo.com/v1/archive");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);
  url.searchParams.set(
    "daily",
    [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
    ].join(","),
  );
  url.searchParams.set("timezone", "auto");

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo archive lỗi ${response.status}`);
  }

  return (await response.json()) as ForecastResponse;
}

export async function checkTravelWeatherService(input: WeatherInput): Promise<TravelWeatherResult> {
  const today = getTodayVietnam();
  const offset = daysBetween(today, input.startDate);

  console.info("[WEATHER CHECK]", {
    locationName: input.locationName,
    startDate: input.startDate,
    today,
    offsetDays: offset,
    dayCount: input.dayCount,
    activitiesCount: input.activities.length,
  });

  const location = await geocodeLocation(input.locationName);

  if (!location) {
    console.warn("[WEATHER CHECK] Geocoding failed - no location found", { locationName: input.locationName });

    return {
      source: "open-meteo",
      sourceLabel: "Open-Meteo",
      available: false,
      locationName: input.locationName,
      days: [],
      activityWarnings: [],
      message: "Không xác định được tọa độ để kiểm tra thời tiết.",
    };
  }

  console.info("[WEATHER CHECK] Geocoded location", {
    locationName: input.locationName,
    resolvedName: location.name,
    countryCode: location.country_code,
    lat: location.latitude,
    lng: location.longitude,
  });

  const tripDates = Array.from(
    {
      length: input.dayCount,
    },
    (_, index) => addDays(input.startDate, index),
  );
  const lastTripDate = tripDates[tripDates.length - 1];

  // Case 1: Dates in the past (offset < 0) -> Fetch real recorded weather from Archive API
  if (offset < 0) {
    try {
      const archive = await fetchArchiveWeather(location.latitude, location.longitude, input.startDate, lastTripDate);
      const dailyTimes = archive.daily?.time ?? [];

      const days: TravelWeatherDay[] = tripDates.map((date, idx) => {
        const index = dailyTimes.indexOf(date);
        const effectiveIndex = index >= 0 ? index : idx;

        const precipitationSum = archive.daily?.precipitation_sum?.[effectiveIndex];

        return {
          date,
          weatherCode: archive.daily?.weather_code?.[effectiveIndex],
          maxTemperature: archive.daily?.temperature_2m_max?.[effectiveIndex],
          minTemperature: archive.daily?.temperature_2m_min?.[effectiveIndex],
          precipitationProbabilityMax: precipitationSum ? Math.min(Math.round(precipitationSum * 15), 95) : 0,
          precipitationSum,
        };
      });

      return {
        source: "open-meteo",
        sourceLabel: "Open-Meteo (Thời tiết đã ghi nhận)",
        available: true,
        locationName: input.locationName,
        resolvedLocationName: [location.name, location.admin1].filter(Boolean).join(", "),
        latitude: location.latitude,
        longitude: location.longitude,
        timezone: archive.timezone ?? location.timezone,
        days,
        activityWarnings: [],
        message: "Thời tiết thực tế ghi nhận tại điểm đến trong khoảng thời gian diễn ra lịch trình.",
      };
    } catch (archiveError) {
      console.warn("[WEATHER ARCHIVE PAST ERROR]", archiveError);
    }
  }

  // Case 2: Far future dates (offset > 15) -> Fetch same calendar period from previous year as climate baseline
  if (offset > 15) {
    try {
      const archiveStart = shiftYear(input.startDate, -1);
      const archiveEnd = shiftYear(lastTripDate, -1);

      const archive = await fetchArchiveWeather(location.latitude, location.longitude, archiveStart, archiveEnd);
      const archiveTimes = archive.daily?.time ?? [];

      const days: TravelWeatherDay[] = tripDates.map((date, idx) => {
        const matchingArchiveDate = shiftYear(date, -1);
        const index = archiveTimes.indexOf(matchingArchiveDate);
        const effectiveIndex = index >= 0 ? index : idx;

        const precipitationSum = archive.daily?.precipitation_sum?.[effectiveIndex];

        return {
          date,
          weatherCode: archive.daily?.weather_code?.[effectiveIndex],
          maxTemperature: archive.daily?.temperature_2m_max?.[effectiveIndex],
          minTemperature: archive.daily?.temperature_2m_min?.[effectiveIndex],
          precipitationProbabilityMax: precipitationSum ? Math.min(Math.round(precipitationSum * 15), 90) : 10,
          precipitationSum,
        };
      });

      return {
        source: "open-meteo",
        sourceLabel: "Open-Meteo (Khí hậu tham khảo)",
        available: true,
        locationName: input.locationName,
        resolvedLocationName: [location.name, location.admin1].filter(Boolean).join(", "),
        latitude: location.latitude,
        longitude: location.longitude,
        timezone: archive.timezone ?? location.timezone,
        days,
        activityWarnings: [],
        message:
          "Chuyến đi khởi hành sau hơn 16 ngày. SmartTrip cung cấp số liệu khí hậu và nhiệt độ tham khảo cùng kỳ năm trước để bạn chuẩn bị kế hoạch tốt nhất.",
      };
    } catch (climateError) {
      console.warn("[WEATHER CLIMATE REFERENCE ERROR]", climateError);
    }
  }

  // Case 3: Near forecast window (0 <= offset <= 15) -> Live 16-day forecast
  const forecast = await fetchForecast(location.latitude, location.longitude);
  const dailyTimes = forecast.daily?.time ?? [];

  const days: TravelWeatherDay[] = tripDates.map((date) => {
    const index = dailyTimes.indexOf(date);

    return {
      date,
      weatherCode: index >= 0 ? forecast.daily?.weather_code?.[index] : undefined,
      maxTemperature: index >= 0 ? forecast.daily?.temperature_2m_max?.[index] : undefined,
      minTemperature: index >= 0 ? forecast.daily?.temperature_2m_min?.[index] : undefined,
      precipitationProbabilityMax: index >= 0 ? forecast.daily?.precipitation_probability_max?.[index] : undefined,
      precipitationSum: index >= 0 ? forecast.daily?.precipitation_sum?.[index] : undefined,
    };
  });

  const hourlyTimes = forecast.hourly?.time ?? [];
  const warnings: TravelWeatherActivityWarning[] = [];

  for (const activity of input.activities) {
    if (!isLikelyOutdoor(activity)) {
      continue;
    }

    const date = addDays(input.startDate, activity.dayNumber - 1);
    const time = `${date}T${(activity.startTime || "08:00").padStart(5, "0")}`;

    const index = nearestHourIndex(hourlyTimes, time);

    if (index < 0) {
      continue;
    }

    const temperature = forecast.hourly?.temperature_2m?.[index];
    const rainProbability = forecast.hourly?.precipitation_probability?.[index];
    const precipitation = forecast.hourly?.precipitation?.[index];
    const windSpeed = forecast.hourly?.wind_speed_10m?.[index];

    const warning = warningForValues({
      rainProbability,
      precipitation,
      temperature,
      windSpeed,
    });

    if (!warning) {
      continue;
    }

    warnings.push({
      dayNumber: activity.dayNumber,
      destinationName: activity.destinationName,
      title: activity.title,
      startTime: activity.startTime,
      severity: warning.severity,
      label: warning.label,
      detail: warning.detail,
      temperature,
      precipitationProbability: rainProbability,
      windSpeed,
    });
  }

  return {
    source: "open-meteo",
    sourceLabel: "Open-Meteo",
    available: true,
    locationName: input.locationName,
    resolvedLocationName: [location.name, location.admin1].filter(Boolean).join(", "),
    latitude: location.latitude,
    longitude: location.longitude,
    timezone: forecast.timezone ?? location.timezone,
    days,
    activityWarnings: warnings,
    message: "Dự báo thời tiết đối chiếu theo ngày đi của lịch trình.",
  };
}
