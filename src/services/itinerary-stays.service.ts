import "server-only";

import {
  addHotelStayToItinerary,
  findUserItineraryStayTargets,
} from "@/src/repositories/itinerary-stays.repository";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class HotelStayServiceError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 404 | 409,
  ) {
    super(message);
    this.name = "HotelStayServiceError";
  }
}

function notFound(message: string): never {
  throw new HotelStayServiceError(message, 404);
}

function conflict(message: string): never {
  throw new HotelStayServiceError(message, 409);
}

function badRequest(message: string): never {
  throw new HotelStayServiceError(message, 400);
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

export type AddHotelToItineraryInput = {
  itineraryId: string;
  name: string;
  address?: string | null;
  checkInDate: string;
  checkOutDate: string;
  roomCount: number;
  pricePerRoomNight: number;
  note?: string | null;
};

/** Trả về danh sách itinerary user có thể thêm nơi lưu trú. */
export async function getStayItineraryTargetsService(userId: string) {
  return findUserItineraryStayTargets(userId);
}

/** Thêm một hotel stay vào itinerary của user. */
export async function addHotelToItineraryService(input: AddHotelToItineraryInput, userId: string) {
  const result = await addHotelStayToItinerary({
    userId,
    itineraryId: input.itineraryId,
    name: input.name,
    address: input.address,
    checkInDate: input.checkInDate,
    checkOutDate: input.checkOutDate,
    roomCount: input.roomCount,
    pricePerRoomNight: input.pricePerRoomNight,
    note: input.note,
  });

  switch (result.status) {
    case "itinerary_not_found":
      notFound("Không tìm thấy lịch trình");
      break;
    case "itinerary_not_editable":
      conflict("Lịch trình này đã hoàn thành hoặc lưu trữ và không thể thêm nơi lưu trú.");
      break;
    case "invalid_dates":
      badRequest("Ngày check-in phải trước ngày check-out.");
      break;
    case "ok":
      break;
  }

  if (result.status !== "ok") {
    throw new Error("Unexpected result status");
  }

  return {
    itinerary: result.itinerary,
    stay: {
      id: result.stay.id,
      name: result.stay.name,
      checkInDate: result.stay.checkInDate,
      checkOutDate: result.stay.checkOutDate,
      roomCount: result.stay.roomCount,
    },
    redirectTo: `/planner/${result.itinerary.id}`,
  };
}
