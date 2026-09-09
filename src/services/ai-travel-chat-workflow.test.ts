import { describe, expect, it, vi } from "vitest";

process.env.DATABASE_URL = "postgres://fake:fake@localhost:5432/fake";
process.env.AI_ITINERARY_PROOF_SECRET = "12345678901234567890123456789012";
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
  findSingleBestDestination,
  buildTripSummary,
  makeNextTripDetailResponse,
} from "@/src/services/ai-travel-chat.service";
import type {
  PlannerConversationState,
  SelectedDestinationItem,
} from "@/src/components/planner/ai/chat/ai-travel-chat.types";

describe("SmartTrip AI Planner 7-Step Workflow & Single Destination Flow", () => {
  const sampleBeachDestinations = [
    {
      id: "dest-my-khe",
      name: "Bãi biển Mỹ Khê",
      description: "Bãi biển quyến rũ bậc nhất hành tinh với cát trắng và sóng êm.",
      address: "Đà Nẵng",
      coverImageUrl: "https://example.com/mykhe.jpg",
      locationId: "loc-danang",
      locationName: "Đà Nẵng",
    },
    {
      id: "dest-linh-ung",
      name: "Chùa Linh Ứng Bãi Bụt",
      description: "Ngôi chùa nổi tiếng trên bán đảo Sơn Trà cạnh bờ biển.",
      address: "Đà Nẵng",
      coverImageUrl: "https://example.com/linhung.jpg",
      locationId: "loc-danang",
      locationName: "Đà Nẵng",
    },
    {
      id: "dest-an-bang",
      name: "Bãi biển An Bàng",
      description: "Bãi biển hoang sơ, yên tĩnh của Hội An.",
      address: "Hội An",
      coverImageUrl: "https://example.com/anbang.jpg",
      locationId: "loc-hoian",
      locationName: "Hội An",
    },
    {
      id: "dest-khai-dinh",
      name: "Lăng Khải Định",
      description: "Lăng tẩm kiến trúc độc đáo triều Nguyễn.",
      address: "Huế",
      coverImageUrl: "https://example.com/khaidinh.jpg",
      locationId: "loc-hue",
      locationName: "Huế",
    },
  ];

  it("findSingleBestDestination returns EXACTLY 1 most relevant beach destination and filters out pagodas/tombs", async () => {
    mockSelect.mockResolvedValueOnce(sampleBeachDestinations);

    const result = await findSingleBestDestination({
      theme: "biển",
    });

    expect(result).not.toBeNull();
    expect(result?.id).toBe("dest-my-khe");
    expect(result?.name).toBe("Bãi biển Mỹ Khê");
    expect(result?.tags).toContain("Bãi biển");
  });

  it("findSingleBestDestination suggests alternative destination when previous one was rejected", async () => {
    mockSelect.mockResolvedValueOnce(sampleBeachDestinations);

    const result = await findSingleBestDestination({
      theme: "biển",
      rejectedIds: ["dest-my-khe"],
    });

    expect(result).not.toBeNull();
    expect(result?.id).toBe("dest-an-bang");
    expect(result?.name).toBe("Bãi biển An Bàng");
  });

  it("buildTripSummary computes correct total capacity, free slots, and destination items", () => {
    const state: PlannerConversationState = {
      currentStep: "confirm_trip_summary",
      dayCount: 2,
      activitiesPerDay: 3,
      adultCount: 2,
      childCount: 0,
      childAges: [],
      roomCount: 1,
      lodgingPreference: "any",
      lodgingRequirements: [],
      pace: "balanced",
      interests: ["Biển"],
      startDate: "2026-09-15",
      budget: 5000000,
      suggestedDestinations: [],
      rejectedDestinationIds: [],
      selectedDestinations: [
        {
          destinationId: "dest-my-khe",
          destinationName: "Bãi biển Mỹ Khê",
          locationName: "Đà Nẵng",
          activityType: "Tắm biển",
        },
      ],
    };

    const summary = buildTripSummary(state);
    expect(summary.dayCount).toBe(2);
    expect(summary.activitiesPerDay).toBe(3);
    // Total capacity = 2 * 3 = 6 slots. 1 selected -> 5 free slots
    expect(summary.freeSlots).toBe(5);
    expect(summary.destinations).toHaveLength(1);
    expect(summary.destinations[0].destinationId).toBe("dest-my-khe");
  });

  it("makeNextTripDetailResponse sequentially asks missing fields: dayCount -> adultCount -> startDate -> budget", () => {
    const baseState: PlannerConversationState = {
      currentStep: "collect_trip_details",
      childCount: 0,
      childAges: [],
      roomCount: 1,
      lodgingPreference: "any",
      lodgingRequirements: [],
      pace: "balanced",
      interests: [],
      activitiesPerDay: 3,
      suggestedDestinations: [],
      rejectedDestinationIds: [],
      selectedDestinations: [
        {
          destinationId: "dest-my-khe",
          destinationName: "Bãi biển Mỹ Khê",
          locationName: "Đà Nẵng",
          activityType: "Tắm biển",
        },
      ],
    };

    // Step 1: Missing dayCount
    const res1 = makeNextTripDetailResponse(baseState);
    expect(res1.reply).toContain("mấy ngày");
    expect(res1.quickReplies?.some((qr) => qr.label === "2 ngày")).toBe(true);

    // Step 2: Has dayCount, missing adultCount
    const stateWithDay = { ...baseState, dayCount: 3 };
    const res2 = makeNextTripDetailResponse(stateWithDay);
    expect(res2.reply).toContain("bao nhiêu người lớn");

    // Step 3: Has adultCount, missing startDate
    const stateWithAdults = { ...stateWithDay, adultCount: 2 };
    const res3 = makeNextTripDetailResponse(stateWithAdults);
    expect(res3.reply).toContain("khởi hành vào ngày nào");

    // Step 4: Has startDate, missing budget
    const stateWithDate = { ...stateWithAdults, startDate: "2026-09-15" };
    const res4 = makeNextTripDetailResponse(stateWithDate);
    expect(res4.reply).toContain("Ngân sách dự kiến");

    // Step 5: All details filled -> generates Trip Summary with confirm quick reply
    const stateComplete = { ...stateWithDate, budget: 10000000 };
    const res5 = makeNextTripDetailResponse(stateComplete);
    expect(res5.reply).toContain("Mình đã tổng hợp đầy đủ kế hoạch");
    expect(res5.tripSummary).toBeDefined();
    expect(res5.quickReplies?.some((qr) => qr.value === "Tạo lịch trình ngay")).toBe(true);
  });

  it("makeNextTripDetailResponse validates capacity when selectedDestinations exceeds dayCount * activitiesPerDay", () => {
    const selected: SelectedDestinationItem[] = [
      { destinationId: "d1", destinationName: "Điểm 1", locationName: "Đà Nẵng", activityType: "Tham quan" },
      { destinationId: "d2", destinationName: "Điểm 2", locationName: "Đà Nẵng", activityType: "Tham quan" },
      { destinationId: "d3", destinationName: "Điểm 3", locationName: "Đà Nẵng", activityType: "Tham quan" },
      { destinationId: "d4", destinationName: "Điểm 4", locationName: "Đà Nẵng", activityType: "Tham quan" },
    ];

    const stateOverCapacity: PlannerConversationState = {
      currentStep: "collect_trip_details",
      dayCount: 1,
      activitiesPerDay: 2, // capacity = 2, selected = 4 -> OVER CAPACITY!
      adultCount: 2,
      childCount: 0,
      childAges: [],
      roomCount: 1,
      lodgingPreference: "any",
      lodgingRequirements: [],
      pace: "relaxed",
      interests: [],
      startDate: "2026-09-20",
      budget: 3000000,
      suggestedDestinations: [],
      rejectedDestinationIds: [],
      selectedDestinations: selected,
    };

    const res = makeNextTripDetailResponse(stateOverCapacity);
    expect(res.reply).toContain("tối đa là 2 hoạt động");
    expect(res.reply).toContain("tăng thêm ngày đi hay tăng số hoạt động");
    expect(res.tripSummary).toBeUndefined(); // Does NOT show summary yet
  });

  it("generateItineraryForSelectedDestinations produces itinerary with ONLY confirmed destinations, empty meals, and free time slots", async () => {
    const { generateItineraryForSelectedDestinations } = await import("@/src/services/ai-itinerary.service");

    const validLocId = "b5000000-0000-0000-0000-000000000001";
    const validDestId = "c6000000-0000-0000-0000-000000000001";

    const request = {
      locationId: validLocId,
      startDate: "2026-09-15",
      dayCount: 2,
      pace: "balanced" as const,
      interests: ["Biển"],
      adultCount: 2,
      childCount: 0,
      childAges: [],
      roomCount: 1,
      budget: 5000000,
      activitiesPerDay: 2, // 2 days * 2 activities/day = 4 total slots
      selectedDestinations: [
        {
          destinationId: validDestId,
          destinationName: "Bãi biển Mỹ Khê",
          locationName: "Đà Nẵng",
          activityType: "Tắm biển",
        },
      ],
    };

    const location = {
      id: validLocId,
      name: "Đà Nẵng",
      slug: "da-nang",
      description: "Thành phố biển đáng sống",
      imageUrl: "https://example.com/danang.jpg",
      isActive: true,
      displayOrder: 1,
    };

    const dbDestinations = [
      {
        id: validDestId,
        name: "Bãi biển Mỹ Khê",
        locationId: validLocId,
      },
    ];

    const result = generateItineraryForSelectedDestinations(request, location, dbDestinations, "user-123");

    expect(result.plan.days).toHaveLength(2);

    // Verify meals: [] on all days (No restaurants or dining)
    for (const day of result.plan.days) {
      expect(day.meals).toEqual([]);
      expect(day.activities).toHaveLength(2); // each day has 2 slots
    }

    // Day 1 should have 1 confirmed destination and 1 free time slot
    const day1Activities = result.plan.days[0].activities;
    expect(day1Activities[0].destinationId).toBe(validDestId);
    expect(day1Activities[0].destinationName).toBe("Bãi biển Mỹ Khê");
    expect(day1Activities[1].title).toBe("Thời gian tự do & Nghỉ ngơi");

    // Day 2 should have 2 free time slots anchored to confirmed destination
    const day2Activities = result.plan.days[1].activities;
    expect(day2Activities[0].title).toBe("Thời gian tự do & Nghỉ ngơi");
    expect(day2Activities[1].title).toBe("Thời gian tự do & Nghỉ ngơi");

    // Verify estimatedCosts has NO accommodation
    const accommodationCosts = result.plan.estimatedCosts.filter((c) => c.category === "accommodation");
    expect(accommodationCosts).toHaveLength(0);
    expect(result.plan.estimatedCosts.length).toBeGreaterThan(0);

    // Verification of signed proof
    const rawPayload = JSON.parse(Buffer.from(result.generationProof.split(".")[0], "base64url").toString("utf8"));
    expect(rawPayload.allowedCuisineIds).toEqual([]);
    expect(rawPayload.allowedDestinationIds).toEqual([validDestId]);
    expect(rawPayload.userId).toBe("user-123");
  });

  it("findIndoorDestinations retrieves museums and indoor markets, excluding outdoor beaches", async () => {
    const { findIndoorDestinations } = await import("@/src/services/ai-travel-chat.service");

    const sampleDestinations = [
      {
        id: "dest-cham",
        name: "Bảo tàng Điêu khắc Chăm",
        description: "Bảo tàng lưu giữ hiện vật điêu khắc Champa trong nhà.",
        locationId: "loc-danang",
        locationName: "Đà Nẵng",
      },
      {
        id: "dest-cho-han",
        name: "Chợ Hàn",
        description: "Chợ trung tâm có khu mua sắm đặc sản và ẩm thực trong nhà.",
        locationId: "loc-danang",
        locationName: "Đà Nẵng",
      },
      {
        id: "dest-my-khe",
        name: "Bãi biển Mỹ Khê",
        description: "Bãi biển ngoài trời cát trắng.",
        locationId: "loc-danang",
        locationName: "Đà Nẵng",
      },
    ];

    mockSelect.mockResolvedValueOnce(sampleDestinations);

    const results = await findIndoorDestinations("loc-danang");
    expect(results.length).toBeGreaterThan(0);
    const names = results.map((r) => r.name);
    expect(names).toContain("Bảo tàng Điêu khắc Chăm");
    expect(names).toContain("Chợ Hàn");
    expect(names).not.toContain("Bãi biển Mỹ Khê");
  });

  it("handleWeatherRainAdaptation replaces beach with indoor destinations and triggers generation", async () => {
    const { handleWeatherRainAdaptation } = await import("@/src/services/ai-travel-chat.service");

    mockSelect.mockResolvedValueOnce([
      {
        id: "dest-cham",
        name: "Bảo tàng Điêu khắc Chăm",
        description: "Bảo tàng trong nhà.",
        locationId: "loc-danang",
        locationName: "Đà Nẵng",
      },
      {
        id: "dest-cho-han",
        name: "Chợ Hàn",
        description: "Chợ đặc sản trong nhà.",
        locationId: "loc-danang",
        locationName: "Đà Nẵng",
      },
    ]);

    const state: PlannerConversationState = {
      currentStep: "confirm_trip_summary",
      locationId: "loc-danang",
      locationName: "Đà Nẵng",
      dayCount: 1,
      activitiesPerDay: 2,
      adultCount: 2,
      childCount: 0,
      childAges: [],
      roomCount: 1,
      lodgingPreference: "any",
      lodgingRequirements: [],
      pace: "balanced",
      interests: ["Biển"],
      startDate: "2026-09-10",
      budget: 3000000,
      suggestedDestinations: [],
      rejectedDestinationIds: [],
      selectedDestinations: [
        {
          destinationId: "dest-my-khe",
          destinationName: "Bãi biển Mỹ Khê",
          locationName: "Đà Nẵng",
          activityType: "Tắm biển",
        },
      ],
    };

    const input = {
      message: "Đổi các hoạt động ngày có mưa sang trải nghiệm trong nhà giúp mình",
      state,
      locations: [{ id: "loc-danang", name: "Đà Nẵng", slug: "da-nang" }],
      hasGeneratedPlan: true,
      actionPayload: {
        actionType: "adapt_weather_rain" as const,
      },
    };

    const response = await handleWeatherRainAdaptation(input);

    expect(response.action).toBe("generate");
    expect(response.readyToGenerate).toBe(true);
    expect(response.state.contextTheme).toBe("trải nghiệm trong nhà");
    // Verify beach is replaced by indoor destinations for 1-day rainy trip
    const selectedNames = response.state.selectedDestinations.map((d) => d.destinationName);
    expect(selectedNames).toContain("Bảo tàng Điêu khắc Chăm");
    expect(selectedNames).not.toContain("Bãi biển Mỹ Khê");
    expect(response.reply).toContain("Bảo tàng Điêu khắc Chăm");
  });

  it("handleAiTravelChatService intercepts rain text prompt and triggers indoor generation", async () => {
    const { handleAiTravelChatService } = await import("@/src/services/ai-travel-chat.service");

    mockSelect.mockResolvedValueOnce([
      {
        id: "dest-cham",
        name: "Bảo tàng Điêu khắc Chăm",
        description: "Bảo tàng trong nhà.",
        locationId: "loc-danang",
        locationName: "Đà Nẵng",
      },
    ]);

    const state: PlannerConversationState = {
      currentStep: "confirm_trip_summary",
      locationId: "loc-danang",
      locationName: "Đà Nẵng",
      dayCount: 1,
      activitiesPerDay: 2,
      adultCount: 2,
      childCount: 0,
      childAges: [],
      roomCount: 1,
      lodgingPreference: "any",
      lodgingRequirements: [],
      pace: "balanced",
      interests: ["Biển"],
      startDate: "2026-09-10",
      budget: 3000000,
      suggestedDestinations: [],
      rejectedDestinationIds: [],
      selectedDestinations: [
        {
          destinationId: "dest-my-khe",
          destinationName: "Bãi biển Mỹ Khê",
          locationName: "Đà Nẵng",
          activityType: "Tắm biển",
        },
      ],
    };

    // User types natural text: "muốn đổi hoạt động trong nhà vì mưa"
    const input = {
      message: "muốn đổi hoạt động trong nhà vì mưa",
      state,
      locations: [{ id: "loc-danang", name: "Đà Nẵng", slug: "da-nang" }],
      hasGeneratedPlan: true,
    };

    const response = await handleAiTravelChatService(input);

    expect(response.action).toBe("generate");
    expect(response.readyToGenerate).toBe(true);
    expect(response.state.selectedDestinations.some((d) => d.destinationName === "Bảo tàng Điêu khắc Chăm")).toBe(true);
    expect(response.reply).toContain("Bảo tàng Điêu khắc Chăm");
  });

  it("AI scheduled itinerary excludes accommodation costs and only counts accommodation when stay is added", async () => {
    const { generateItineraryForSelectedDestinations } = await import("@/src/services/ai-itinerary.service");
    const { calculateCostsTotal } = await import("@/src/lib/costs/cost-calculator");

    const validLocId = "b5000000-0000-0000-0000-000000000001";
    const validDestId = "c6000000-0000-0000-0000-000000000001";

    // 3-day trip (which previously automatically added accommodation)
    const request = {
      locationId: validLocId,
      startDate: "2026-09-15",
      dayCount: 3,
      pace: "balanced" as const,
      interests: ["Biển"],
      adultCount: 2,
      childCount: 1,
      childAges: [6],
      roomCount: 2,
      budget: 10000000,
      activitiesPerDay: 2,
      selectedDestinations: [
        {
          destinationId: validDestId,
          destinationName: "Bãi biển Mỹ Khê",
          locationName: "Đà Nẵng",
          activityType: "Tắm biển",
        },
      ],
    };

    const location = {
      id: validLocId,
      name: "Đà Nẵng",
      slug: "da-nang",
      description: "Thành phố biển",
      imageUrl: "https://example.com/danang.jpg",
      isActive: true,
      displayOrder: 1,
    };

    const dbDestinations = [
      {
        id: validDestId,
        name: "Bãi biển Mỹ Khê",
        locationId: validLocId,
      },
    ];

    const result = generateItineraryForSelectedDestinations(request, location, dbDestinations, "user-456");

    // 1. Ensure NO accommodation item in estimatedCosts
    const accommodationItems = result.plan.estimatedCosts.filter((c) => c.category === "accommodation");
    expect(accommodationItems).toHaveLength(0);

    // 2. Calculate total: should strictly be sum of transport + tickets, NO accommodation
    const nonAccommodationCosts = result.plan.estimatedCosts.filter((c) => c.category !== "accommodation");
    const totalWithoutStay = calculateCostsTotal(nonAccommodationCosts, {
      adultCount: request.adultCount,
      childCount: request.childCount,
      roomCount: request.roomCount,
      defaultNightCount: 2,
    });

    // Transport (150,000 * 3 = 450,000 per group) + Ticket (50,000 * 2 adults = 100,000) = 550,000
    expect(totalWithoutStay).toBe(550000);

    // 3. When a stay is added by the user (e.g. 2 rooms * 2 nights * 1,000,000 = 4,000,000)
    const userStayCost = 2 * 2 * 1000000;
    const totalWithUserStay = totalWithoutStay + userStayCost;
    expect(totalWithUserStay).toBe(4550000);
  });
});

