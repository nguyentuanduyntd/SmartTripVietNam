import { requireUser } from "@/src/lib/auth/require-user";
import { getStayItineraryTargetsService } from "@/src/services/itinerary-stays.service";
import { errorResponse, successResponse } from "@/src/utils/api_response";

export async function GET() {
  const authResult = await requireUser();

  if (!authResult.ok) {
    return errorResponse(authResult.message, authResult.status);
  }

  try {
    const itineraries = await getStayItineraryTargetsService(authResult.user.id);

    return successResponse({ items: itineraries });
  } catch (error) {
    console.error("[STAY ITINERARY TARGETS ERROR]", error);

    return errorResponse("Chưa thể tải danh sách lịch trình lúc này.", 500);
  }
}
