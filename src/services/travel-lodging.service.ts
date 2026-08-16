import "server-only";

import {
    LiteApiHotelProvider,
} from "@/src/services/travel-lodging/liteapi-provider";

import type {
    HotelSearchInput,
} from "@/src/services/travel-lodging/types";

const provider =
    new LiteApiHotelProvider();

export async function searchTravelLodgingService(
    input:
        HotelSearchInput,
) {
    return provider.search(
        input,
    );
}