import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { travelWeatherCheckSchema } from "@/src/schemas/travel-weather.schema";
import { checkTravelWeatherService } from "@/src/services/travel-weather.service";

describe("travel-weather.service & schema", () => {
  it("validates travelWeatherCheckSchema successfully even with null description and prefixed location", () => {
    const valid = travelWeatherCheckSchema.safeParse({
      locationName: "TP. Đà Nẵng",
      startDate: "2026-09-10",
      dayCount: 3,
      activities: [
        {
          dayNumber: 1,
          destinationName: "Bán đảo Sơn Trà & Chùa Linh Ứng",
          title: "Tham quan và ngắm cảnh",
          description: null,
          startTime: "08:30",
        },
      ],
    });

    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.locationName).toBe("TP. Đà Nẵng");
      expect(valid.data.activities[0].description).toBe("");
    }
  });

  it("fetches live forecast for dates within 16-day window", async () => {
    const result = await checkTravelWeatherService({
      locationName: "Đà Nẵng",
      startDate: "2026-09-10",
      dayCount: 3,
      activities: [
        {
          dayNumber: 1,
          destinationName: "Biển Mỹ Khê",
          title: "Tắm biển",
          description: "Hoạt động ngoài trời",
          startTime: "08:00",
        },
      ],
    });

    expect(result.available).toBe(true);
    expect(result.days.length).toBe(3);
    expect(result.days[0].date).toBe("2026-09-10");
    expect(result.source).toBe("open-meteo");
    expect(result.resolvedLocationName).toContain("Đà Nẵng");
  });

  it("fetches climate baseline for dates beyond 16 days", async () => {
    const result = await checkTravelWeatherService({
      locationName: "Huế",
      startDate: "2026-10-20",
      dayCount: 3,
      activities: [],
    });

    expect(result.available).toBe(true);
    expect(result.days.length).toBe(3);
    expect(result.days[0].date).toBe("2026-10-20");
    expect(result.days[0].maxTemperature).toBeDefined();
    expect(result.sourceLabel).toContain("Khí hậu");
  });

  it("fetches recorded weather for past dates", async () => {
    const result = await checkTravelWeatherService({
      locationName: "Hội An",
      startDate: "2026-08-15",
      dayCount: 2,
      activities: [],
    });

    expect(result.available).toBe(true);
    expect(result.days.length).toBe(2);
    expect(result.days[0].date).toBe("2026-08-15");
    expect(result.days[0].maxTemperature).toBeDefined();
    expect(result.sourceLabel).toContain("đã ghi nhận");
  });

  it("handles city names with administrative prefixes (TP. Đà Nẵng, TP. Huế)", async () => {
    const result = await checkTravelWeatherService({
      locationName: "TP. Đà Nẵng",
      startDate: "2026-09-11",
      dayCount: 2,
      activities: [],
    });

    expect(result.available).toBe(true);
    expect(result.resolvedLocationName).toContain("Đà Nẵng");
    expect(result.latitude).toBeCloseTo(16.06, 1);
  });
});
