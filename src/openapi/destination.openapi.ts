import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { apiErrorResponseSchema } from "@/src/schemas/common.schema";
import {createDestinationRequestSchema,deleteDestinationResponseSchema,destinationIdParamsSchema,destinationListQuerySchema,destinationListResponseSchema,destinationResponseSchema,updateDestinationRequestSchema,} from "@/src/schemas/destination.schema";

export function registerDestinationOpenApi(registry: OpenAPIRegistry) {
  registry.registerPath({
    method: "get",
    path: "/destinations",
    tags: ["Destinations"],
    summary: "Lấy danh sách destination (có lọc & phân trang)",
    request: { query: destinationListQuerySchema },
    responses: {
      200: {
        description: "Danh sách destination",
        content: {
          "application/json": { schema: destinationListResponseSchema },
        },
      },
      400: {
        description: "Query không hợp lệ",
        content: { "application/json": { schema: apiErrorResponseSchema } },
      },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/destinations",
    tags: ["Destinations"],
    summary: "Tạo destination mới (Admin)",
    request: {
      body: {
        required: true,
        content: {
          "application/json": { schema: createDestinationRequestSchema },
        },
      },
    },
    responses: {
      201: {
        description: "Tạo destination thành công",
        content: { "application/json": { schema: destinationResponseSchema } },
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
    path: "/destinations/{id}",
    tags: ["Destinations"],
    summary: "Lấy chi tiết một destination",
    request: { params: destinationIdParamsSchema },
    responses: {
      200: {
        description: "Chi tiết destination",
        content: { "application/json": { schema: destinationResponseSchema } },
      },
      404: {
        description: "Không tìm thấy destination",
        content: { "application/json": { schema: apiErrorResponseSchema } },
      },
    },
  });

  registry.registerPath({
    method: "patch",
    path: "/destinations/{id}",
    tags: ["Destinations"],
    summary: "Cập nhật destination (Admin)",
    request: {
      params: destinationIdParamsSchema,
      body: {
        required: true,
        content: {
          "application/json": { schema: updateDestinationRequestSchema },
        },
      },
    },
    responses: {
      200: {
        description: "Cập nhật thành công",
        content: { "application/json": { schema: destinationResponseSchema } },
      },
      400: {
        description: "Dữ liệu không hợp lệ",
        content: { "application/json": { schema: apiErrorResponseSchema } },
      },
      404: {
        description: "Không tìm thấy destination",
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
    path: "/destinations/{id}",
    tags: ["Destinations"],
    summary: "Xóa destination (Admin)",
    request: { params: destinationIdParamsSchema },
    responses: {
      200: {
        description: "Xóa thành công",
        content: {
          "application/json": { schema: deleteDestinationResponseSchema },
        },
      },
      404: {
        description: "Không tìm thấy destination",
        content: { "application/json": { schema: apiErrorResponseSchema } },
      },
    },
  });
}