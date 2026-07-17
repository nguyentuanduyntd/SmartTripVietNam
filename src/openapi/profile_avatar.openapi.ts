import type { OpenAPIRegistry } from"@asteasolutions/zod-to-openapi";
import {avatarSuccessResponseSchema,updateAvatarRequestSchema,} from "@/src/schemas/profile_avatar.schema";
import { apiErrorResponseSchema } from "../schemas/common.schema";
export function registerProfileAvatarOpenApi(
  registry: OpenAPIRegistry,
) {
  registry.registerPath({
    method: "post",
    path: "/profile/avatar",
    tags: ["Profile"],
    summary: "Cập nhật avatar người dùng",

    request: {
      body: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: updateAvatarRequestSchema,
          },
        },
      },
    },

    responses: {
      200: {
        description: "Cập nhật avatar thành công",
        content: {
          "application/json": {
            schema: avatarSuccessResponseSchema,
          },
        },
      },

      400: {
        description: "Ảnh không hợp lệ",
        content: {
          "application/json": {
            schema: apiErrorResponseSchema,
          },
        },
      },

      401: {
        description: "Chưa đăng nhập",
        content: {
          "application/json": {
            schema: apiErrorResponseSchema,
          },
        },
      },

      404: {
        description: "Không tìm thấy profile",
        content: {
          "application/json": {
            schema: apiErrorResponseSchema,
          },
        },
      },

      500: {
        description: "Lỗi hệ thống",
        content: {
          "application/json": {
            schema: apiErrorResponseSchema,
          },
        },
      },
    },
  });

  registry.registerPath({
    method: "delete",
    path: "/profile/avatar",
    tags: ["Profile"],
    summary: "Xóa avatar người dùng",

    responses: {
      200: {
        description: "Xóa avatar thành công",
        content: {
          "application/json": {
            schema: avatarSuccessResponseSchema,
          },
        },
      },

      401: {
        description: "Chưa đăng nhập",
        content: {
          "application/json": {
            schema: apiErrorResponseSchema,
          },
        },
      },

      404: {
        description: "Không tìm thấy profile",
        content: {
          "application/json": {
            schema: apiErrorResponseSchema,
          },
        },
      },

      500: {
        description: "Lỗi hệ thống",
        content: {
          "application/json": {
            schema: apiErrorResponseSchema,
          },
        },
      },
    },
  });
}