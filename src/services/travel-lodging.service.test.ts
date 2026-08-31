import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
    search: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock(
    "@/src/services/travel-lodging/liteapi-provider",
    () => ({
        LiteApiHotelProvider: class {
            search = mocks.search;
        },
    }),
);

import {
    searchTravelLodgingService,
} from "@/src/services/travel-lodging.service";
import type {
    HotelSearchInput,
    HotelSearchResult,
} from "@/src/services/travel-lodging/types";

const input: HotelSearchInput = {
    locationName: "Đà Nẵng",
    checkInDate: "2026-09-01",
    checkOutDate: "2026-09-03",
    adultCount: 2,
    childCount: 1,
    childAges: [
        8,
    ],
    roomCount: 1,
    maxPricePerNight: 2_000_000,
    preference: "hotel",
    requirements: [
        "Gần biển",
    ],
};

const providerResult: HotelSearchResult = {
    configured: true,
    provider: "liteapi",
    sourceLabel: "LiteAPI",
    sandbox: true,
    locationName: "Đà Nẵng",
    checkInDate: "2026-09-01",
    checkOutDate: "2026-09-03",
    nights: 2,
    maxPricePerNight: 2_000_000,
    items: [],
};

describe("searchTravelLodgingService", () => {
    beforeEach(() => {
        mocks.search.mockReset();
    });

    it("chuyển nguyên input xuống LiteAPI provider", async () => {
        mocks.search.mockResolvedValue(providerResult);

        await searchTravelLodgingService(input);

        expect(mocks.search).toHaveBeenCalledOnce();
        expect(mocks.search).toHaveBeenCalledWith(input);
    });

    it("trả nguyên kết quả từ provider", async () => {
        mocks.search.mockResolvedValue(providerResult);

        await expect(
            searchTravelLodgingService(input),
        ).resolves.toBe(providerResult);
    });

    it("truyền lỗi provider lên tầng gọi", async () => {
        const error = new Error("LiteAPI unavailable");
        mocks.search.mockRejectedValue(error);

        await expect(
            searchTravelLodgingService(input),
        ).rejects.toBe(error);
    });
});