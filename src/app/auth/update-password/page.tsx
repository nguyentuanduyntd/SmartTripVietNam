"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, KeyRound } from "lucide-react";

import {
  AuthAlert,
  AuthPasswordField,
  AuthSubmitButton,
  PasswordRequirements,
} from "@/src/components/auth/AuthFormControls";
import {
  AuthCard,
  AuthCenteredShell,
  AuthHeader,
} from "@/src/components/auth/AuthShell";
import {
  getPasswordChecks,
  isPasswordValid,
} from "@/src/lib/auth/auth-form.utils";
import { createClient } from "@/src/lib/supabase/client";

function getUpdatePasswordError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("same password")) {
    return "Mật khẩu mới phải khác mật khẩu hiện tại.";
  }

  if (normalized.includes("password should be at least")) {
    return "Mật khẩu chưa đủ mạnh.";
  }

  return "Chưa thể cập nhật mật khẩu. Liên kết có thể đã hết hạn.";
}

export default function UpdatePasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordChecks = useMemo(
    () => getPasswordChecks(password),
    [password],
  );
  const passwordValid = isPasswordValid(passwordChecks);
  const passwordsMismatch = Boolean(
    confirmPassword && password !== confirmPassword,
  );

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const { data } = await supabase.auth.getSession();

        if (mounted) {
          setHasRecoverySession(Boolean(data.session));
        }
      } catch (sessionError) {
        console.error("[PASSWORD RECOVERY SESSION ERROR]", sessionError);

        if (mounted) {
          setHasRecoverySession(false);
        }
      } finally {
        if (mounted) {
          setIsCheckingSession(false);
        }
      }
    }

    void checkSession();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError(null);

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
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        console.error("[UPDATE PASSWORD ERROR]", updateError);
        setError(getUpdatePasswordError(updateError.message));
        return;
      }

      setSuccess(true);

      // Kết thúc recovery session; người dùng đăng nhập lại bằng mật khẩu mới.
      await supabase.auth.signOut();
    } catch (caughtError) {
      console.error("[UPDATE PASSWORD ERROR]", caughtError);
      setError("Đã xảy ra lỗi khi cập nhật mật khẩu.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isCheckingSession) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#f7efe1] text-[#173a3b]">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#d9d0c1] border-t-[#173a3b]" />
          <p className="mt-4 text-sm font-semibold text-[#687572]">
            Đang kiểm tra liên kết khôi phục...
          </p>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <AuthCenteredShell>
        <AuthCard centered>
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-[26px] bg-[#e6f3ed] text-[#348371]">
            <CheckCircle2 size={38} />
          </div>
          <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.2em] text-[#e55c49]">
            Thành công
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">
            Đã đổi mật khẩu
          </h1>
          <p className="mt-5 leading-7 text-[#687572]">
            Mật khẩu của bạn đã được cập nhật. Hãy đăng nhập lại bằng mật khẩu
            mới.
          </p>
          <Link
            href="/auth/login"
            className="group mt-7 flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#173a3b] font-bold text-white transition hover:bg-[#21494a]"
          >
            Đăng nhập
            <ArrowRight
              size={19}
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>
        </AuthCard>
      </AuthCenteredShell>
    );
  }

  if (!hasRecoverySession) {
    return (
      <AuthCenteredShell>
        <AuthCard centered>
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-[26px] bg-[#fff0eb] text-[#d95643]">
            <KeyRound size={36} />
          </div>
          <h1 className="mt-6 font-display text-4xl font-semibold">
            Liên kết không hợp lệ
          </h1>
          <p className="mt-4 leading-7 text-[#687572]">
            Phiên khôi phục mật khẩu không tồn tại hoặc đã hết hạn. Hãy yêu cầu
            một liên kết mới.
          </p>
          <Link
            href="/auth/forgot-password"
            className="mt-7 flex h-14 w-full items-center justify-center rounded-2xl bg-[#173a3b] font-bold text-white transition hover:bg-[#21494a]"
          >
            Gửi lại liên kết
          </Link>
          <Link
            href="/auth/login"
            className="mt-5 inline-block text-sm font-bold text-[#d95643] hover:underline"
          >
            Quay lại đăng nhập
          </Link>
        </AuthCard>
      </AuthCenteredShell>
    );
  }

  return (
    <AuthCenteredShell showBrand>
      <AuthCard>
        <AuthHeader
          eyebrow="Bảo mật tài khoản"
          title="Tạo mật khẩu mới"
          description="Mật khẩu mới nên khác mật khẩu cũ và đủ mạnh để bảo vệ tài khoản của bạn."
        />

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <AuthPasswordField
              id="password"
              label="Mật khẩu mới"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError(null);
              }}
              autoComplete="new-password"
              placeholder="Ít nhất 8 ký tự"
              required
              minLength={8}
              disabled={isSubmitting}
            />
            {password ? <PasswordRequirements checks={passwordChecks} /> : null}
          </div>

          <AuthPasswordField
            id="confirmPassword"
            label="Xác nhận mật khẩu"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setError(null);
            }}
            autoComplete="new-password"
            placeholder="Nhập lại mật khẩu"
            required
            disabled={isSubmitting}
            invalid={passwordsMismatch}
            showLabel="Hiện mật khẩu xác nhận"
            hideLabel="Ẩn mật khẩu xác nhận"
          />

          {error ? <AuthAlert>{error}</AuthAlert> : null}

          <AuthSubmitButton
            loading={isSubmitting}
            loadingLabel="Đang cập nhật..."
            disabled={isSubmitting}
          >
            Cập nhật mật khẩu
          </AuthSubmitButton>
        </form>
      </AuthCard>
    </AuthCenteredShell>
  );
}
