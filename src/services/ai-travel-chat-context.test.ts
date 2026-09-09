import { describe, expect, it, vi } from "vitest";

process.env.DATABASE_URL = "postgres://fake:fake@localhost:5432/fake";
vi.mock("server-only", () => ({}));
const mockSelect = vi.fn();
vi.mock("@/src/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        innerJoin: () => mockSelect(),
        where: () => mockSelect(),
      }),
    }),
  },
}));

import {
  THEME_PATTERNS,
  normalizeText,
  matchesDestinationName,
  findDestinationsByThemeGlobal,
} from "@/src/services/ai-travel-chat.service";

describe("AI Travel Chat Context & Theme Logic", () => {
  it("has correct keywords for biển theme", () => {
    const beachPattern = THEME_PATTERNS.find((p) => p.theme === "biển");
    expect(beachPattern).toBeDefined();
    expect(beachPattern?.keywords).toContain("bien");
    expect(beachPattern?.keywords).toContain("bai bien");
    expect(beachPattern?.destinationKeywords).toContain("my khe");
    expect(beachPattern?.destinationKeywords).toContain("an bang");
  });

  it("extracts contextTheme = 'biển' from various user chat messages", () => {
    function extractTheme(text: string): string | undefined {
      const normalized = normalizeText(text);
      for (const rule of THEME_PATTERNS) {
        if (rule.keywords.some((k) => normalized.includes(normalizeText(k)))) {
          return rule.theme;
        }
      }
      return undefined;
    }

    expect(extractTheme("tôi muốn đi biển")).toBe("biển");
    expect(extractTheme("tôi muốn đi biển biển")).toBe("biển");
    expect(extractTheme("mình thích tắm biển")).toBe("biển");
    expect(extractTheme("đi ngắm biển ở đà nẵng")).toBe("biển");
  });

  it("accurately matches destination aliases and short names using matchesDestinationName", () => {
    expect(matchesDestinationName("toi muon di my khe", "Bãi biển Mỹ Khê")).toBe(true);
    expect(matchesDestinationName("chon bai an bang", "Bãi biển An Bàng")).toBe(true);
    expect(matchesDestinationName("ghe tham chua linh ung", "Chùa Linh Ứng Bãi Bụt")).toBe(true);
    expect(matchesDestinationName("di ngu hanh son", "Danh thắng Ngũ Hành Sơn")).toBe(true);
    expect(matchesDestinationName("toi muon an pho", "Bãi biển Mỹ Khê")).toBe(false);
  });

  it("excludes pagodas/tombs and strictly selects beaches for biển theme", async () => {
    mockSelect.mockResolvedValueOnce([
      {
        id: "dest-1",
        name: "Bãi biển Mỹ Khê",
        description: "Bãi biển đẹp gần trung tâm",
        locationId: "loc-1",
        locationName: "Đà Nẵng",
      },
      {
        id: "dest-2",
        name: "Chùa Linh Ứng Bãi Bụt",
        description: "Chùa thanh tịnh trên bán đảo Sơn Trà cạnh bãi bụt",
        locationId: "loc-1",
        locationName: "Đà Nẵng",
      },
      {
        id: "dest-3",
        name: "Bãi biển An Bàng",
        description: "Bãi biển yên bình phía đông Hội An",
        locationId: "loc-2",
        locationName: "Hội An",
      },
      {
        id: "dest-4",
        name: "Lăng Khải Định",
        description: "Lăng tẩm triều Nguyễn",
        locationId: "loc-3",
        locationName: "Huế",
      },
    ]);

    const results = await findDestinationsByThemeGlobal("biển");
    expect(results).toHaveLength(2);
    expect(results.map((r: { name: string }) => r.name)).toContain("Bãi biển Mỹ Khê");
    expect(results.map((r: { name: string }) => r.name)).toContain("Bãi biển An Bàng");
    expect(results.map((r: { name: string }) => r.name)).not.toContain("Chùa Linh Ứng Bãi Bụt");
    expect(results.map((r: { name: string }) => r.name)).not.toContain("Lăng Khải Định");
    expect(results[0].tags).toBeDefined();
    expect(results[0].tags?.length).toBeGreaterThan(0);
  });

  it("recognizes time slot patterns properly", () => {
    function parseTimeSlot(text: string): string | undefined {
      const normalized = normalizeText(text);
      if (/\b(canh sang|buoi sang|sang som|chi di sang)\b/.test(normalized)) {
        return "buổi sáng";
      } else if (/\b(canh trua|buoi trua|chi di trua)\b/.test(normalized)) {
        return "buổi trưa";
      } else if (/\b(buoi toi|canh toi|chieu toi|buoi chieu|chi di toi)\b/.test(normalized)) {
        return "buổi chiều - tối";
      } else if (/\b(sang va chieu|sang chieu|canh sang va chieu)\b/.test(normalized)) {
        return "sáng và chiều";
      } else if (/\b(ca ngay|ca ngay linh hoat|nguyen ngay|linh hoat|full ngay)\b/.test(normalized)) {
        return "cả ngày linh hoạt";
      }
      return undefined;
    }

    expect(parseTimeSlot("tôi muốn đi canh sáng")).toBe("buổi sáng");
    expect(parseTimeSlot("mình muốn đi cả ngày linh hoạt")).toBe("cả ngày linh hoạt");
    expect(parseTimeSlot("tập trung buổi chiều - tối")).toBe("buổi chiều - tối");
    expect(parseTimeSlot("đi sáng và chiều")).toBe("sáng và chiều");
  });

  it("recognizes selected destinations from suggested items", () => {
    const suggested = ["Bãi biển Mỹ Khê", "Chùa Linh Ứng Bãi Bụt", "Rạn Nam Ô"];

    function parseDestinations(text: string, suggestedList: string[]): string[] {
      const normalized = normalizeText(text);
      if (
        /\b(tat ca|theo goi y|cac diem tren|cac diem goi y|goi y tren|cac diem bien|tat ca diem tren|di het|cac diem nay)\b/.test(
          normalized,
        )
      ) {
        return [...suggestedList];
      }
      const selected: string[] = [];
      for (const item of suggestedList) {
        if (normalized.includes(normalizeText(item))) {
          selected.push(item);
        }
      }
      return selected;
    }

    expect(parseDestinations("Tôi chọn các điểm biển gợi ý trên, đi cả ngày", suggested)).toEqual(suggested);
    expect(parseDestinations("Tôi chỉ muốn đi Bãi biển Mỹ Khê thôi", suggested)).toEqual(["Bãi biển Mỹ Khê"]);
  });

  it("detects proactive weather alert criteria for beach/outdoor activities with high rain", () => {
    function shouldTriggerRainAlert(params: {
      days: Array<{ date: string; precipitationProbabilityMax?: number }>;
      warnings: Array<{ severity: string; label: string }>;
      contextTheme?: string;
      interests: string[];
      activities: Array<{ destinationName: string; title: string }>;
    }): boolean {
      const rainyDays = params.days.filter((d) => (d.precipitationProbabilityMax ?? 0) >= 50);
      const dangerWarnings = params.warnings.filter((w) => w.severity === "danger" || /mưa/i.test(w.label));

      const isBeachOrOutdoor =
        Boolean(params.contextTheme && /biển|bien|núi|nui|thiên nhiên|thien nhien/i.test(params.contextTheme)) ||
        params.interests.some((i) => /biển|bien|núi|nui|thiên nhiên|thien nhien|ngoài trời|ngoai troi/i.test(i)) ||
        params.activities.some((act) =>
          /biển|bãi|tắm|lặn|cano|đảo|núi|rừng|công viên|sơn trà|mỹ khê/i.test(act.destinationName + " " + act.title),
        );

      return (rainyDays.length > 0 || dangerWarnings.length > 0) && isBeachOrOutdoor;
    }

    // Case 1: Beach trip with 75% rain on Day 2 -> triggers alert
    const result1 = shouldTriggerRainAlert({
      days: [
        { date: "2026-09-10", precipitationProbabilityMax: 20 },
        { date: "2026-09-11", precipitationProbabilityMax: 75 },
      ],
      warnings: [{ severity: "warning", label: "Có thể gặp mưa" }],
      contextTheme: "biển",
      interests: ["Biển"],
      activities: [{ destinationName: "Bãi biển Mỹ Khê", title: "Tắm biển và chơi thể thao nước" }],
    });
    expect(result1).toBe(true);

    // Case 2: Beach trip with clear weather -> does NOT trigger alert
    const result2 = shouldTriggerRainAlert({
      days: [
        { date: "2026-09-10", precipitationProbabilityMax: 10 },
        { date: "2026-09-11", precipitationProbabilityMax: 20 },
      ],
      warnings: [],
      contextTheme: "biển",
      interests: ["Biển"],
      activities: [{ destinationName: "Bãi biển Mỹ Khê", title: "Tắm biển" }],
    });
    expect(result2).toBe(false);

    // Case 3: Rainy weather but 100% indoor museum/spa trip -> does NOT trigger outdoor beach alert
    const result3 = shouldTriggerRainAlert({
      days: [{ date: "2026-09-10", precipitationProbabilityMax: 80 }],
      warnings: [],
      contextTheme: "bảo tàng",
      interests: ["Bảo tàng", "Spa"],
      activities: [{ destinationName: "Bảo tàng Điêu khắc Chăm", title: "Tham quan bảo tàng" }],
    });
    expect(result3).toBe(false);
  });
});
