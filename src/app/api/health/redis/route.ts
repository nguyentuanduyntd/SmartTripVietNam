import {
  pingRedis,
} from "@/src/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  try {
    const response =
      await pingRedis();

    return Response.json({
      success: true,
      data: {
        status: "healthy",
        response,
        latencyMs:
          Date.now() - startedAt,
      },
    });
  } catch (error) {
    console.error(
      "[REDIS HEALTHCHECK ERROR]",
      error,
    );

    return Response.json(
      {
        success: false,
        message:
          "Redis is unavailable",
      },
      {
        status: 503,
      },
    );
  }
}