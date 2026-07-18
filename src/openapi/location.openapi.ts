import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { apiErrorResponseSchema } from "@/src/schemas/common.schema";
import {createLocationRequestSchema,deleteLocationResponseSchema,locationDeleteConflictSchema,
  locationIdParamsSchema,locationListResponseSchema,locationResponseSchema,updateLocationRequestSchema,
} from "@/src/schemas/location.schema";

export function registerLocationOpenApi(registry: OpenAPIRegistry) {
  registry.registerPath({
    method: "get",
    path: "/locations",
    tags: ["Destinations"],
    summary: "Lấy danh sách location (Huế, Đà Nẵng, Hội An, ...)",
    responses: {
      200: {
        description: "Danh sách location",
        content: { "application/json": { schema: locationListResponseSchema } },
      },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/locations",
    tags: ["Destinations"],
    summary: "Tạo location mới (Admin)",
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: createLocationRequestSchema } },
      },
    },
    responses: {
      201: {
        description: "Tạo location thành công",
        content: { "application/json": { schema: locationResponseSchema } },
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
    path: "/locations/{id}",
    tags: ["Destinations"],
    summary: "Lấy chi tiết một location",
    request: { params: locationIdParamsSchema },
    responses: {
      200: {
        description: "Chi tiết location",
        content: { "application/json": { schema: locationResponseSchema } },
      },
      404: {
        description: "Không tìm thấy location",
        content: { "application/json": { schema: apiErrorResponseSchema } },
      },
    },
  });

  registry.registerPath({
    method: "patch",
    path: "/locations/{id}",
    tags: ["Destinations"],
    summary: "Cập nhật location (Admin)",
    request: {
      params: locationIdParamsSchema,
      body: {
        required: true,
        content: { "application/json": { schema: updateLocationRequestSchema } },
      },
    },
    responses: {
      200: {
        description: "Cập nhật thành công",
        content: { "application/json": { schema: locationResponseSchema } },
      },
      400: {
        description: "Dữ liệu không hợp lệ",
        content: { "application/json": { schema: apiErrorResponseSchema } },
      },
      404: {
        description: "Không tìm thấy location",
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
    path: "/locations/{id}",
    tags: ["Destinations"],
    summary: "Xóa location (Admin)",
    request: { params: locationIdParamsSchema },
    responses: {
      200: {
        description: "Xóa thành công",
        content: { "application/json": { schema: deleteLocationResponseSchema } },
      },
      404: {
        description: "Không tìm thấy location",
        content: { "application/json": { schema: apiErrorResponseSchema } },
      },
      409: {
        description: "Còn destination liên kết, không thể xóa",
        content: { "application/json": { schema: locationDeleteConflictSchema } },
      },
    },
  });
}