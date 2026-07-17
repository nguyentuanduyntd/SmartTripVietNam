import { NextResponse } from "next/server";
import { generateOpenApiDocument } from "@/src/lib/openapi/document";

export const dynamic = "force-dynamic";

export function GET(){
    const document = generateOpenApiDocument();

    return NextResponse.json(document, {
        headers: {
        "Cache-Control": "no-store",
        },
    });
}