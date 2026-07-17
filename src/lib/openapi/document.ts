import { OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import { registerProfileAvatarOpenApi } from "@/src/openapi/profile_avatar.openapi";
import { openApiRegistry } from "./registry";

let registered = false;

function registerOpenApiRoutes(){
    if(registered){
        return;
    }
    registerProfileAvatarOpenApi(openApiRegistry);

    registered =true;

}

export function generateOpenApiDocument(){
    registerOpenApiRoutes();

    const generator = new OpenApiGeneratorV31(openApiRegistry.definitions,);

    return generator.generateDocument({
        openapi: "3.1.0",
        info: {
            title: "SmartTripVietNam API",
            version: "1.0.0",
            description: "Tài liệu API cho hệ thống SmartTripVietNam",
        },
        servers:[{
            url:
            process.env.NEXT_PUBLIC_APP_URL ??
            "http://localhost:3000",
            description: "Application server",
        },],
         tags: [
        {
            name: "Profile",
            description:
            "Các chức năng liên quan đến hồ sơ người dùng",
        },
        {
            name: "Destinations",
            description:
            "Quản lý địa điểm du lịch và hình ảnh",
        },
        ],
    });
}
