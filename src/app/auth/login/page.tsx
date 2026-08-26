"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Mail,
  MapPin,
  Route,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";

import {
  AuthAlert,
  AuthDivider,
  AuthPasswordField,
  AuthSubmitButton,
  AuthTextField,
  GoogleAuthButton,
} from "@/src/components/auth/AuthFormControls";
import {
  AuthBackHomeLink,
  AuthCard,
  AuthHeader,
  AuthSplitShell,
  AuthVisualPanel,
} from "@/src/components/auth/AuthShell";
import { HOME_CITIES } from "@/src/constants/home-data";
import { normalizeEmail } from "@/src/lib/auth/auth-form.utils";
import { normalizeReturnPath } from "@/src/lib/auth/return-path";
import { createClient } from "@/src/lib/supabase/client";

function getLoginErrorMessage(message: string): string {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("invalid login credentials")) {
    return "Email hoặc mật khẩu không chính xác.";
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return "Email của bạn chưa được xác nhận. Vui lòng kiểm tra hộp thư.";
  }

  if (
    normalizedMessage.includes("rate limit") ||
    normalizedMessage.includes("too many requests")
  ) {
    return "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau.";
  }

  if (
    normalizedMessage.includes("email link is invalid") ||
    normalizedMessage.includes("link is invalid")
  ) {
    return "Liên kết xác thực không hợp lệ hoặc đã hết hạn.";
  }

  if (normalizedMessage.includes("expired")) {
    return "Liên kết xác thực đã hết hạn. Vui lòng đăng nhập hoặc yêu cầu lại email xác nhận.";
  }

  if (normalizedMessage.includes("access_denied")) {
    return "Bạn đã hủy quá trình đăng nhập.";
  }

  return message;
}

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), []);
  const loginVisual =
    HOME_CITIES.find((city) => city.id === "hoi-an") ?? HOME_CITIES[0];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [nextPath, setNextPath] = useState("/");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const callbackError = params.get("error");
    const requestedNext = normalizeReturnPath(params.get("next"));
    const timeoutId = window.setTimeout(() => {
      setNextPath(requestedNext);

      if (callbackError) {
        setError(getLoginErrorMessage(callbackError));
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting || isGoogleSubmitting) {
      return;
    }

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      setError("Vui lòng nhập email.");
      return;
    }

    if (!password) {
      setError("Vui lòng nhập mật khẩu.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

      if (loginError) {
        setError(getLoginErrorMessage(loginError.message));
        return;
      }

      if (!data.session) {
        setError("Đăng nhập thành công nhưng chưa tạo được phiên làm việc.");
        return;
      }

      const adminCheckResponse = await fetch("/api/admin/check", {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      }).catch(() => null);

      const adminCheckResult = adminCheckResponse
        ? await adminCheckResponse.json().catch(() => null)
        : null;
      const isAdmin =
        adminCheckResponse?.ok === true && adminCheckResult?.success === true;

      window.location.assign(isAdmin ? "/admin/destinations" : nextPath);
    } catch (caughtError) {
      console.error("[LOGIN ERROR]", caughtError);
      setError("Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    if (isSubmitting || isGoogleSubmitting) {
      return;
    }

    setError(null);
    setIsGoogleSubmitting(true);

    try {
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", nextPath);

      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
          queryParams: { prompt: "select_account" },
        },
      });

      if (googleError) {
        console.error("[GOOGLE LOGIN ERROR]", googleError);
        setError(getLoginErrorMessage(googleError.message));
        setIsGoogleSubmitting(false);
      }
    } catch (caughtError) {
      console.error("[GOOGLE LOGIN ERROR]", caughtError);
      setError("Đã xảy ra lỗi khi kết nối với Google. Vui lòng thử lại.");
      setIsGoogleSubmitting(false);
    }
  }

  const busy = isSubmitting || isGoogleSubmitting;
  const registerHref =
    nextPath === "/"
      ? "/auth/register"
      : `/auth/register?next=${encodeURIComponent(nextPath)}`;

  return (
    <AuthSplitShell
      maxWidthClassName="max-w-[500px]"
      visual={
        <AuthVisualPanel
          source={loginVisual?.image ?? ""}
          alt={loginVisual?.imageAlt ?? "Khung cảnh miền Trung Việt Nam"}
          badgeIcon={Sparkles}
          badge="Chào mừng trở lại"
          title="Tiếp tục hành trình"
          accentTitle="còn đang dang dở."
          description="Đăng nhập để lưu địa điểm yêu thích, quản lý lịch trình và nhận các gợi ý được cá nhân hóa dành riêng cho bạn."
          features={[
            { icon: MapPin, label: "Lưu điểm đến" },
            { icon: Route, label: "Tạo lịch trình" },
            { icon: ShieldCheck, label: "Đồng bộ dữ liệu" },
          ]}
        />
      }
    >
      <AuthBackHomeLink className="mb-8" />

      <AuthCard compact>
        <AuthHeader
          eyebrow="Đăng nhập tài khoản"
          title="Chào mừng trở lại"
          description="Nhập thông tin tài khoản để tiếp tục khám phá hành trình miền Trung."
        />

        {error ? <AuthAlert className="mt-6">{error}</AuthAlert> : null}

        <form
          className="mt-8 space-y-5"
          onSubmit={handleLogin}
          aria-busy={isSubmitting}
        >
          <AuthTextField
            id="email"
            name="email"
            type="email"
            label="Email"
            icon={Mail}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError(null);
            }}
            placeholder="ban@example.com"
            autoComplete="email"
            required
            disabled={isSubmitting}
          />

          <AuthPasswordField
            id="password"
            name="password"
            label="Mật khẩu"
            labelAction={
              <Link
                href="/auth/forgot-password"
                className="text-xs font-extrabold text-[#d95643] transition-colors hover:text-[#b94738] hover:underline"
              >
                Quên mật khẩu?
              </Link>
            }
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError(null);
            }}
            placeholder="Nhập mật khẩu"
            autoComplete="current-password"
            required
            disabled={isSubmitting}
          />

          <AuthSubmitButton
            loading={isSubmitting}
            loadingLabel="Đang đăng nhập..."
            disabled={busy}
          >
            Đăng nhập
          </AuthSubmitButton>
        </form>

        <AuthDivider>Hoặc tiếp tục với</AuthDivider>
        <GoogleAuthButton
          onClick={handleGoogleLogin}
          disabled={busy}
          loading={isGoogleSubmitting}
        />

        <AuthDivider>Chưa có tài khoản?</AuthDivider>
        <Link
          href={registerHref}
          className="group flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-[#cfc3b2] bg-[#f5eddf] px-6 font-bold text-[#294748] transition-all hover:border-[#f25f4b] hover:bg-[#fff4ef] hover:text-[#df513f]"
        >
          <UserPlus size={19} />
          Tạo tài khoản mới
        </Link>

        <p className="mt-6 text-center text-xs leading-5 text-[#8a9491]">
          Bằng việc đăng nhập, bạn đồng ý sử dụng dịch vụ theo các điều khoản
          của Rực Rỡ Miền Trung.
        </p>
      </AuthCard>
    </AuthSplitShell>
  );
}
