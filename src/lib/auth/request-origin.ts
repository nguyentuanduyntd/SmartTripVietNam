/**
 * Lấy origin URL an toàn cho việc redirect trên server/Docker/proxy.
 * Tránh trường hợp chạy Docker với HOSTNAME=0.0.0.0 khiến Next.js gán URL là 0.0.0.0:3000.
 */
export function getRequestOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  if (host && !host.startsWith("0.0.0.0")) {
    const proto = forwardedProto ?? (request.url.startsWith("https") ? "https" : "http");
    return `${proto}://${host}`;
  }

  try {
    const { origin } = new URL(request.url);
    if (origin && !origin.includes("0.0.0.0")) {
      return origin;
    }
  } catch {
    // URL parse failed, tiếp tục fallback
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  }

  try {
    const { origin } = new URL(request.url);
    if (origin) {
      return origin.replace("0.0.0.0", "localhost");
    }
  } catch {
    // URL parse failed
  }

  return "http://localhost:3000";
}
