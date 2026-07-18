import { requireAdmin } from "@/src/lib/auth/require-admin";
import { locationIdParamsSchema, updateLocationRequestSchema } from "@/src/schemas/location.schema";
import { LocationInUseError, LocationNotFoundError, LocationSlugConflictError,
    deleteLocationService, getLocationById, updateLocationService,
} from "@/src/services/location.service";
import { errorResponse, successResponse, zodErrorToFieldErrors } from "@/src/utils/api_response";
import { error } from "console";

type RouteContext = {params: Promise<{id : string}>};

async function parseId(context: RouteContext){
    const {id} = await context.params;

    return locationIdParamsSchema.safeParse({id});
}

export async function GET(_request: Request, context: RouteContext){
    const parsedId = await parseId(context);
    
    if(!parsedId.success){
        return errorResponse("Location ID không hợp lệ", 400, zodErrorToFieldErrors(parsedId.error),);
    }

    try{
        const location = await getLocationById(parsedId.data.id);

        return successResponse(location);
    } catch(error){
        if(error instanceof LocationNotFoundError){
            return errorResponse(error.message, 404);
        }
        throw error;
    }
}

export async function PATCH(request: Request, context: RouteContext){
    const authResult = await requireAdmin();

    if(!authResult.ok){
        return errorResponse(authResult.message, authResult.status);
    }
    const parsedId = await parseId(context);
    if(!parsedId.success){
        return errorResponse("Location ID không hợp lệ", 400, zodErrorToFieldErrors(parsedId.error),);
    }

    const body = await request.json().catch(() => null);
    const parsedBody = updateLocationRequestSchema.safeParse(body);

    if(!parsedBody.success){
        return errorResponse("Dữ liệu không hợp lệ", 400, zodErrorToFieldErrors(parsedBody.error),);
    }

    try{
        const location = await updateLocationService(parsedId.data.id, parsedBody.data,);

        return successResponse(location, {message:"Cập nhật location thành công"});
    } catch(error){
        if(error instanceof LocationNotFoundError){
            return errorResponse(error.message, 404);
        }
        if(error instanceof LocationSlugConflictError){
            return errorResponse(error.message, 409);
        }
        throw error;
    }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireAdmin();

  if (!authResult.ok) {
    return errorResponse(authResult.message, authResult.status);
  }

  const parsedId = await parseId(context);

  if (!parsedId.success) {
    return errorResponse("Location ID không hợp lệ",400,zodErrorToFieldErrors(parsedId.error),);
  }

  try {
    const deleted = await deleteLocationService(parsedId.data.id);

    return successResponse(
      { id: deleted.id },
      { message: "Xóa location thành công" },
    );
  } catch (error) {
    if (error instanceof LocationNotFoundError) {
      return errorResponse(error.message, 404);
    }
    if (error instanceof LocationInUseError) {
      return errorResponse(error.message, 409, undefined, {
        destinationCount: error.destinationCount,
        requiresReassignment: true,
      });
    }

    throw error;
  }
}