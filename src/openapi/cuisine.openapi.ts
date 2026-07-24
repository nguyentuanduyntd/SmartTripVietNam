import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { apiErrorResponseSchema } from "../schemas/common.schema";
import { createCuisineRequestSchema, cuisineIdParamsSchema, cuisineListQuerySchema, cuisineListResponseSchema, 
    cuisineResponseSchema, deleteCuisineResponseSchema, updateCuisineRequestSchema
} from "../schemas/cuisine.schema";

export function registerCuisineOpenApi(registry: OpenAPIRegistry){
    registry.registerPath({
        method: "get",
        path: "/cuisines",
        tags: ["Cuisines"],
        summary: "Lấy danh sách món ăn (có lọc & phân trang)",
        request: {query: cuisineListQuerySchema},
        responses: {
            200: {
                description: "Danh sách món ăn",
                content: {
                    "application/json" : {schema: cuisineListResponseSchema},
                },
            },
            400: {
                description: "Query không hợp lệ",
                content: {"application/json": {schema: apiErrorResponseSchema}},
            },
        },
    });

    registry.registerPath({
        method: "post",
        path: "/cuisines",
        tags: ["Cuisines"],
        summary: "Tạo món ăn mới (Admin)",
        request: {
        body: {
            required: true,
            content: {
            "application/json": { schema: createCuisineRequestSchema },
            },
        },
        },
        responses: {
        201: {
            description: "Tạo món ăn thành công",
            content: { "application/json": { schema: cuisineResponseSchema } },
        },
        400: {
            description: "Dữ liệu không hợp lệ",
            content: { "application/json": { schema: apiErrorResponseSchema } },
        },
        401: {
            description: "Chưa đăng nhập",
            content: { "application/json": { schema: apiErrorResponseSchema } },
        },
        403: {
            description: "Không có quyền admin",
            content: { "application/json": { schema: apiErrorResponseSchema } },
        },
        409: {
            description: "Slug đã tồn tại",
            content: { "application/json": { schema: apiErrorResponseSchema } },
        },
        },
    });
    registry.registerPath({
         method: "get",
        path: "/cuisines/{id}",
        tags: ["Cuisines"],
        summary: "Lấy chi tiết một món ăn",
        request: { params: cuisineIdParamsSchema },
        responses: {
        200: {
            description: "Chi tiết món ăn",
            content: { "application/json": { schema: cuisineResponseSchema } },
        },
        404: {
            description: "Không tìm thấy món ăn",
            content: { "application/json": { schema: apiErrorResponseSchema } },
        },
        },
    });
    registry.registerPath({
        method: "patch",
        path: "/cuisines/{id}",
        tags: ["Cuisines"],
        summary: "Cập nhật món ăn (Admin)",
        request: {
        params: cuisineIdParamsSchema,
        body: {
            required: true,
            content: {
            "application/json": { schema: updateCuisineRequestSchema },
            },
        },
        },
        responses: {
            200: {
                description: "Cập nhật thành công",
                content: { "application/json": { schema: cuisineResponseSchema } },
            },
            400: {
                description: "Dữ liệu không hợp lệ",
                content: { "application/json": { schema: apiErrorResponseSchema } },
            },
            404: {
                description: "Không tìm thấy món ăn",
                content: { "application/json": { schema: apiErrorResponseSchema } },
            },
            409: {
                description: "Slug đã tồn tại",
                content: { "application/json": { schema: apiErrorResponseSchema } },
            },
        },
    });
    registry.registerPath({
        method: "delete",
        path: "/cuisines/{id}",
        tags: ["Cuisines"],
        summary: "Xóa món ăn (Admin)",
        request: { params: cuisineIdParamsSchema },
        responses: {
        200: {
            description: "Xóa thành công",
            content: {
            "application/json": { schema: deleteCuisineResponseSchema },
            },
        },
        404: {
            description: "Không tìm thấy món ăn",
            content: { "application/json": { schema: apiErrorResponseSchema } },
        },
        },
    });
}