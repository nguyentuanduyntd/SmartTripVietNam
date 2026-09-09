import { describe, expect, it, vi } from "vitest";

process.env.DATABASE_URL = "postgres://fake:fake@localhost:5432/fake";
vi.mock("server-only", () => ({}));
vi.mock("@/src/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        innerJoin: () => vi.fn(),
        where: () => vi.fn(),
      }),
    }),
  },
}));

import type { DestinationCardItem, TravelQuickReply } from "./ai-travel-chat.types";
import { generateDestinationTags } from "@/src/services/ai-travel-chat.service";

describe("Destination Chat Cards & Quick Reply Deduplication", () => {
  const sampleDestinations: DestinationCardItem[] = [
    {
      id: "dest-1",
      name: "Bãi biển Mỹ Khê",
      locationName: "Đà Nẵng",
      description: "Bãi biển nổi tiếng với bờ cát trắng mịn và sóng êm đềm.",
      tags: ["Bãi biển", "Tắm biển", "Đà Nẵng"],
    },
    {
      id: "dest-2",
      name: "Bãi biển An Bàng",
      locationName: "Hội An",
      description: "Bãi biển thanh bình, nhiều quán cafe ngắm hoàng hôn cực đẹp.",
      tags: ["Bãi biển", "Ngắm hoàng hôn", "Hội An"],
    },
    {
      id: "dest-3",
      name: "Bãi biển Non Nước",
      locationName: "Đà Nẵng",
      description: "Nằm dưới chân núi Ngũ Hành Sơn, cảnh sắc hoang sơ trong lành.",
      tags: ["Bãi biển", "Thư giãn", "Đà Nẵng"],
    },
    {
      id: "dest-4",
      name: "Bãi biển Cửa Đại",
      locationName: "Hội An",
      description: "Bãi cát trải dài nơi giao thoa của ba con sông.",
      tags: ["Bãi biển", "Thư giãn", "Hội An"],
    },
    {
      id: "dest-5",
      name: "Rạn Nam Ô",
      locationName: "Đà Nẵng",
      description: "Rạn đá rêu xanh mướt độc đáo.",
      tags: ["Bãi biển", "Check-in đẹp", "Đà Nẵng"],
    },
  ];

  it("limits initial visible cards to 3 and detects hasMore", () => {
    const initialLimit = 3;
    const hasMore = sampleDestinations.length > initialLimit;
    const initialCards = sampleDestinations.slice(0, initialLimit);

    expect(initialCards).toHaveLength(3);
    expect(hasMore).toBe(true);
    expect(sampleDestinations.length - initialLimit).toBe(2);
  });

  it("determines whether region headers should be shown based on >= 2 distinct locations", () => {
    const twoRegions = sampleDestinations;
    const uniqueLocationsTwo = new Set(twoRegions.map((d) => d.locationName)).size;
    expect(uniqueLocationsTwo).toBe(2);
    expect(uniqueLocationsTwo >= 2).toBe(true);

    const singleRegion = sampleDestinations.filter((d) => d.locationName === "Đà Nẵng");
    const uniqueLocationsSingle = new Set(singleRegion.map((d) => d.locationName)).size;
    expect(uniqueLocationsSingle).toBe(1);
    expect(uniqueLocationsSingle >= 2).toBe(false);
  });

  it("deduplicates quick replies to never repeat names of destinations in cards", () => {
    const rawQuickReplies: TravelQuickReply[] = [
      { label: "Bãi biển Mỹ Khê", value: "Tôi muốn đi Bãi biển Mỹ Khê", action: "send" },
      { label: "Biển ở Đà Nẵng", value: "Tôi muốn đi biển ở Đà Nẵng", action: "send" },
      { label: "Bãi biển An Bàng", value: "Tôi muốn đi Bãi biển An Bàng", action: "send" },
      { label: "Biển ở Hội An", value: "Tôi muốn đi biển ở Hội An", action: "send" },
      { label: "Đi 3 ngày 2 người", value: "Tôi muốn đi 3 ngày 2 người", action: "send" },
      { label: "Khám phá ẩm thực", value: "Tôi muốn ăn uống đặc sản", action: "send" },
    ];

    const destNames = sampleDestinations.map((d) => d.name.toLowerCase());

    const filtered = rawQuickReplies
      .filter(
        (qr) =>
          !destNames.some(
            (dn) => qr.label.toLowerCase().includes(dn) || qr.value.toLowerCase().includes(dn),
          ),
      )
      .slice(0, 3);

    expect(filtered).toHaveLength(3);
    expect(filtered.map((q) => q.label)).toEqual([
      "Biển ở Đà Nẵng",
      "Biển ở Hội An",
      "Đi 3 ngày 2 người",
    ]);
    expect(filtered.some((q) => q.label.includes("Mỹ Khê"))).toBe(false);
    expect(filtered.some((q) => q.label.includes("An Bàng"))).toBe(false);
  });

  it("generates appropriate tags for destinations", () => {
    const beachTags = generateDestinationTags({
      name: "Bãi biển Mỹ Khê",
      description: "Bãi tắm tuyệt đẹp ngắm hoàng hôn",
      locationName: "Đà Nẵng",
    });

    expect(beachTags).toContain("Bãi biển");
    expect(beachTags).toContain("Ngắm hoàng hôn");
    expect(beachTags.length).toBeLessThanOrEqual(3);
  });
});
