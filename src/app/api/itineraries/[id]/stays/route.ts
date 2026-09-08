import { z } from "zod";
import { requireUser } from "@/src/lib/auth/require-user";
import { addHotelToItineraryService, HotelStayServiceError } from "@/src/services/itinerary-stays.service";
import { errorResponse, successResponse, zodErrorToFieldErrors } from "@/src/utils/api_response";
import { handleItineraryServiceError } from "@/src/utils/itinerary_api_response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const addHotelStaySchema = z.object({
  name: z.string().min(1, "Tên khách sạn không được để trống").max(300),
  address: z.string().max(500).nullable().optional(),
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày check-in không hợp lệ"),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày check-out không hợp lệ"),
  roomCount: z.number().int().min(1).max(50),
  pricePerRoomNight: z.number().min(0),
  note: z.string().max(500).nullable().optional(),
});

export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireUser();

  if (!authResult.ok) {
    return errorResponse(authResult.message, authResult.status);
  }

  const { id } = await context.params;

  if (!id || typeof id !== "string") {
    return errorResponse("ID lịch trình không hợp lệ", 400);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("Body request không hợp lệ", 400);
  }

  const parsed = addHotelStaySchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse("Dữ liệu không hợp lệ", 422, zodErrorToFieldErrors(parsed.error));
  }

  try {
    const result = await addHotelToItineraryService(
      {
        itineraryId: id,
        ...parsed.data,
      },
      authResult.user.id,
    );

    return successResponse(result, { status: 201 });
  } catch (error) {
    if (error instanceof HotelStayServiceError) {
      return errorResponse(error.message, error.status);
    }

    return handleItineraryServiceError(error);
  }
}
