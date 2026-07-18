import { requireAdmin } from "@/src/lib/auth/require-admin";
import { createLocationRequestSchema } from "@/src/schemas/location.schema";
import { LocationSlugConflictError, createLocationService, listLocation } from "@/src/services/location.service";
import { errorResponse, successResponse, zodErrorToFieldErrors } from "@/src/utils/api_response";

export async function GET(){
    const locations = await listLocation();

    return successResponse(locations);
}

export async function POST(request: Request){
    const authResult = await requireAdmin();

    if(!authResult.ok){return errorResponse(authResult.message, authResult.status);}
    
    const body = await request.json().catch(() => null);
    const parsed = createLocationRequestSchema.safeParse(body);

    if(!parsed.success){
        return errorResponse("Dữ liệu không hợp lệ", 400, zodErrorToFieldErrors(parsed.error),);
    }
    try{
        const location = await createLocationService(parsed.data);

        return successResponse(location, {
            status: 201,
            message: "Tạo location thành công",
        });
    } catch (error){
        if (error instanceof LocationSlugConflictError) {
            return errorResponse(error.message, 409);
        }
        throw error;
    }
}