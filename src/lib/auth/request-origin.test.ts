import { afterEach, describe, expect, it } from "vitest";

import { getRequestOrigin } from "./request-origin";

describe("getRequestOrigin", () => {
  const originalEnv = process.env.NEXT_PUBLIC_APP_URL;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_APP_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_APP_URL;
    }
  });

  it("ưu tiên x-forwarded-host và x-forwarded-proto khi đứng sau reverse proxy", () => {
    const request = new Request("http://0.0.0.0:3000/auth/callback", {
      headers: {
        "x-forwarded-host": "smarttrip.vn",
        "x-forwarded-proto": "https",
        host: "0.0.0.0:3000",
      },
    });

    expect(getRequestOrigin(request)).toBe("https://smarttrip.vn");
  });

  it("dùng host header thay vì 0.0.0.0 trong môi trường Docker", () => {
    const request = new Request("http://0.0.0.0:3000/auth/callback?code=123", {
      headers: {
        host: "localhost:3000",
      },
    });

    expect(getRequestOrigin(request)).toBe("http://localhost:3000");
  });

  it("giữ nguyên host khi truy cập bằng IP mạng LAN", () => {
    const request = new Request("http://0.0.0.0:3000/auth/callback", {
      headers: {
        host: "192.168.1.15:3000",
      },
    });

    expect(getRequestOrigin(request)).toBe("http://192.168.1.15:3000");
  });

  it("fallback sang NEXT_PUBLIC_APP_URL nếu host là 0.0.0.0", () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000/";

    const request = new Request("http://0.0.0.0:3000/auth/callback", {
      headers: {
        host: "0.0.0.0:3000",
      },
    });

    expect(getRequestOrigin(request)).toBe("http://localhost:3000");
  });

  it("thay thế 0.0.0.0 bằng localhost nếu không có cấu hình nào khác", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;

    const request = new Request("http://0.0.0.0:3000/auth/callback", {
      headers: {
        host: "0.0.0.0:3000",
      },
    });

    expect(getRequestOrigin(request)).toBe("http://localhost:3000");
  });

  it("giữ nguyên origin bình thường khi chạy dev ngoài Docker", () => {
    const request = new Request("http://localhost:3000/auth/callback");

    expect(getRequestOrigin(request)).toBe("http://localhost:3000");
  });
});
