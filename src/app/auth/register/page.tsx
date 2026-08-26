

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Mail,
  MapPin,
  Route,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import {
  AuthAlert,
  AuthDivider,
  AuthPasswordField,
  AuthSubmitButton,
  AuthTextField,
  GoogleAuthButton,
  PasswordRequirements,
} from "@/src/components/auth/AuthFormControls";
import {
  AuthBackHomeLink,
  AuthCard,
  AuthCenteredShell,
  AuthHeader,
  AuthSplitShell,
  AuthVisualPanel,
} from "@/src/components/auth/AuthShell";
import { HOME_CITIES } from "@/src/constants/home-data";
import {
  getPasswordChecks,
  isPasswordValid,
  isValidEmail,
  normalizeEmail,
} from "@/src/lib/auth/auth-form.utils";
import { createClient } from "@/src/lib/supabase/client";

function getRegisterErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("user already registered") ||
    normalizedMessage.includes("already been registered")
  ) {
    return "Email này đã được sử dụng. Bạn có thể đăng nhập bằng tài khoản hiện có.";
  }

  if (
    normalizedMessage.includes("password should be at least") ||
    normalizedMessage.includes("password must be at least")
  ) {
    return "Mật khẩu chưa đủ mạnh. Vui lòng sử dụng ít nhất 8 ký tự.";
  }

  if (
    normalizedMessage.includes("unable to validate email address") ||
    normalizedMessage.includes("invalid email")
  ) {
    return "Địa chỉ email không hợp lệ.";
  }

  if (
    normalizedMessage.includes("signup is disabled") ||
    normalizedMessage.includes("signups not allowed")
  ) {
    return "Hệ thống hiện đang tạm khóa đăng ký tài khoản.";
  }

  if (
    normalizedMessage.includes("rate limit") ||
    normalizedMessage.includes("too many requests") ||
    normalizedMessage.includes("email rate limit")
  ) {
    return "Bạn đã gửi quá nhiều yêu cầu đăng ký. Vui lòng thử lại sau.";
  }

  return message;
}

export default function RegisterPage() {
  const supabase = useMemo(() => createClient(), []);
  const registerVisual =
    HOME_CITIES.find((city) => city.id === "hue") ?? HOME_CITIES[0];

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [registrationEmail, setRegistrationEmail] = useState<string | null>(
    null,
  );

  const passwordChecks = useMemo(
    () => getPasswordChecks(password),
    [password],
  );
  const passwordValid = isPasswordValid(passwordChecks);
  const passwordsMismatch = Boolean(
    confirmPassword && password !== confirmPassword,
  );

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting || isGoogleSubmitting) {
      return;
    }

    setError(null);

    const normalizedName = fullName.trim().replace(/\s+/g, " ");
    const normalizedEmail = normalizeEmail(email);

    if (normalizedName.length < 2) {
      setError("Vui lòng nhập họ và tên của bạn.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError("Vui lòng nhập địa chỉ email hợp lệ.");
      return;
    }

    if (!passwordValid) {
      setError("Mật khẩu cần có ít nhất 8 ký tự, bao gồm chữ và số.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error: registerError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { full_name: normalizedName },
        },
      });

      if (registerError) {
        setError(getRegisterErrorMessage(registerError.message));
        return;
      }

      if (data.session) {
        window.location.assign("/");
        return;
      }

      setRegistrationEmail(normalizedEmail);
    } catch (caughtError) {
      console.error("Lỗi đăng ký:", caughtError);
      setError("Đã xảy ra lỗi khi tạo tài khoản. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleRegister() {
    if (isSubmitting || isGoogleSubmitting) {
      return;
    }

    setError(null);
    setIsGoogleSubmitting(true);

    try {
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: "select_account" },
        },
      });

      if (googleError) {
        console.error("Lỗi đăng ký Google:", googleError);
        setError("Không thể tiếp tục bằng Google. Vui lòng thử lại.");
        setIsGoogleSubmitting(false);
      }
    } catch (caughtError) {
      console.error("Lỗi đăng ký Google:", caughtError);
      setError("Đã xảy ra lỗi khi kết nối với Google.");
      setIsGoogleSubmitting(false);
    }
  }

  if (registrationEmail) {
    return (
      <AuthCenteredShell maxWidthClassName="max-w-[540px]">
        <AuthCard centered>
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-[26px] bg-[#e9f5ef] text-[#2f8f78]">
            <CheckCircle2 size={38} strokeWidth={1.8} />
          </div>
          <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.2em] text-[#e55c49]">
            Gần hoàn tất
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
            Kiểm tra email của bạn
          </h1>
          <p className="mx-auto mt-5 max-w-md leading-7 text-[#687572]">
            SmartTrip đã gửi email xác nhận tới
          </p>
          <p className="mt-2 break-all font-bold text-[#173a3b]">
            {registrationEmail}
          </p>
          <div className="mt-7 rounded-2xl border border-[#ddd3c4] bg-white/65 px-5 py-4 text-sm leading-6 text-[#64736f]">
            Nhấn vào liên kết trong email để xác nhận tài khoản. Sau đó bạn có
            thể đăng nhập và bắt đầu tạo lịch trình.
          </div>
          <Link
            href="/auth/login"
            className="group mt-7 flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#173a3b] px-6 font-bold text-white shadow-[0_16px_38px_rgba(23,58,59,0.2)] transition-all hover:-translate-y-0.5 hover:bg-[#21494a]"
          >
            Đến trang đăng nhập
            <ArrowRight
              size={19}
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>
          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#687572] transition-colors hover:text-[#e55c49]"
          >
            <ArrowLeft size={16} />
            Về trang chủ
          </Link>
        </AuthCard>
      </AuthCenteredShell>
    );
  }

  const busy = isSubmitting || isGoogleSubmitting;

  return (
    <AuthSplitShell
      visual={
        <AuthVisualPanel
          source={registerVisual?.image ?? ""}
          alt={registerVisual?.imageAlt ?? "Khung cảnh miền Trung Việt Nam"}
          badgeIcon={Sparkles}
          badge="Bắt đầu hành trình"
          title="Mỗi chuyến đi bắt đầu từ"
          accentTitle="một ý tưởng."
          description="Tạo tài khoản SmartTrip để lưu điểm đến, xây dựng lịch trình và quản lý toàn bộ chuyến đi của bạn tại một nơi."
          features={[
            { icon: MapPin, label: "Khám phá điểm đến" },
            { icon: Route, label: "Lưu lịch trình" },
            { icon: ShieldCheck, label: "Đồng bộ dữ liệu" },
          ]}
        />
      }
    >
      <AuthBackHomeLink className="mb-7" />

      <AuthCard compact>
        <AuthHeader
          eyebrow="Tạo tài khoản"
          title="Bắt đầu khám phá"
          description="Tạo tài khoản SmartTrip để lưu lại những hành trình bạn yêu thích."
        />

        <form
          className="mt-7 space-y-4"
          onSubmit={handleRegister}
          aria-busy={isSubmitting}
        >
          <AuthTextField
            id="fullName"
            name="fullName"
            type="text"
            label="Họ và tên"
            icon={UserRound}
            value={fullName}
            onChange={(event) => {
              setFullName(event.target.value);
              setError(null);
            }}
            placeholder="Nguyễn Minh Anh"
            autoComplete="name"
            required
            disabled={isSubmitting}
          />

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

          <div>
            <AuthPasswordField
              id="password"
              name="password"
              label="Mật khẩu"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError(null);
              }}
              placeholder="Ít nhất 8 ký tự"
              autoComplete="new-password"
              minLength={8}
              required
              disabled={isSubmitting}
            />
            {password ? <PasswordRequirements checks={passwordChecks} /> : null}
          </div>

          <div>
            <AuthPasswordField
              id="confirmPassword"
              name="confirmPassword"
              label="Xác nhận mật khẩu"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setError(null);
              }}
              placeholder="Nhập lại mật khẩu"
              autoComplete="new-password"
              required
              disabled={isSubmitting}
              invalid={passwordsMismatch}
              showLabel="Hiện mật khẩu xác nhận"
              hideLabel="Ẩn mật khẩu xác nhận"
            />

            {confirmPassword && !passwordsMismatch ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#388372]">
                <Check size={14} />
                Mật khẩu đã khớp
              </p>
            ) : null}
          </div>

          {error ? <AuthAlert>{error}</AuthAlert> : null}

          <AuthSubmitButton
            loading={isSubmitting}
            loadingLabel="Đang tạo tài khoản..."
            disabled={busy}
          >
            Tạo tài khoản
          </AuthSubmitButton>
        </form>

        <AuthDivider>Hoặc tiếp tục với</AuthDivider>
        <GoogleAuthButton
          onClick={handleGoogleRegister}
          disabled={busy}
          loading={isGoogleSubmitting}
        />

        <p className="mt-7 text-center text-sm text-[#687572]">
          Bạn đã có tài khoản?{" "}
          <Link
            href="/auth/login"
            className="font-extrabold text-[#d95643] transition-colors hover:text-[#b94738] hover:underline"
          >
            Đăng nhập
          </Link>
        </p>
        <p className="mt-5 text-center text-[11px] leading-5 text-[#929996]">
          Bằng việc tạo tài khoản, bạn đồng ý sử dụng SmartTrip cho mục đích lập
          và quản lý hành trình cá nhân.
        </p>
      </AuthCard>
    </AuthSplitShell>
  );
}