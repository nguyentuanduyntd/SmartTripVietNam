"use client";

import {
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  type LucideIcon,
} from "lucide-react";

import type { PasswordChecks } from "@/src/lib/auth/auth-form.utils";

type AuthTextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: ReactNode;
  icon: LucideIcon;
  labelAction?: ReactNode;
  invalid?: boolean;
};

export function AuthTextField({
  label,
  icon: Icon,
  labelAction,
  invalid = false,
  className = "",
  id,
  ...props
}: AuthTextFieldProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <label htmlFor={id} className="block text-sm font-bold text-[#294748]">
          {label}
        </label>
        {labelAction}
      </div>

      <div className="relative">
        <Icon
          size={19}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#82908d]"
        />

        <input
          id={id}
          aria-invalid={invalid || undefined}
          className={`h-14 w-full rounded-2xl border bg-white/75 pl-12 pr-4 text-[#173a3b] outline-none transition-all placeholder:text-[#a2aaa7] focus:bg-white focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${
            invalid
              ? "border-[#dc7565] focus:border-[#dc7565] focus:ring-[#dc7565]/10"
              : "border-[#d8cdbc] focus:border-[#2f8f8b] focus:ring-[#2f8f8b]/10"
          } ${className}`}
          {...props}
        />
      </div>
    </div>
  );
}

type AuthPasswordFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label: ReactNode;
  labelAction?: ReactNode;
  invalid?: boolean;
  showLabel?: string;
  hideLabel?: string;
};

export function AuthPasswordField({
  label,
  labelAction,
  invalid = false,
  showLabel = "Hiện mật khẩu",
  hideLabel = "Ẩn mật khẩu",
  className = "",
  id,
  disabled,
  ...props
}: AuthPasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <label htmlFor={id} className="block text-sm font-bold text-[#294748]">
          {label}
        </label>
        {labelAction}
      </div>

      <div className="relative">
        <LockKeyhole
          size={19}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#82908d]"
        />

        <input
          id={id}
          type={visible ? "text" : "password"}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          className={`h-14 w-full rounded-2xl border bg-white/75 pl-12 pr-12 text-[#173a3b] outline-none transition-all placeholder:text-[#a2aaa7] focus:bg-white focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${
            invalid
              ? "border-[#dc7565] focus:border-[#dc7565] focus:ring-[#dc7565]/10"
              : "border-[#d8cdbc] focus:border-[#2f8f8b] focus:ring-[#2f8f8b]/10"
          } ${className}`}
          {...props}
        />

        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          disabled={disabled}
          aria-label={visible ? hideLabel : showLabel}
          className="absolute right-4 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-[#6f7d7a] transition-colors hover:bg-[#efe7d8] hover:text-[#173a3b] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {visible ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </div>
    </div>
  );
}

export function AuthAlert({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={`rounded-2xl border border-[#efc5bd] bg-[#fff0eb] px-4 py-3 text-sm leading-6 text-[#a44436] ${className}`}
    >
      {children}
    </div>
  );
}

type AuthSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingLabel: ReactNode;
  children: ReactNode;
  showArrow?: boolean;
};

export function AuthSubmitButton({
  loading = false,
  loadingLabel,
  children,
  showArrow = true,
  className = "",
  ...props
}: AuthSubmitButtonProps) {
  return (
    <button
      type="submit"
      className={`group flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#173a3b] px-6 font-bold text-white shadow-[0_16px_38px_rgba(23,58,59,0.2)] transition-all hover:-translate-y-0.5 hover:bg-[#21494a] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 ${className}`}
      {...props}
    >
      {loading ? loadingLabel : children}
      {!loading && showArrow ? (
        <ArrowRight
          size={19}
          className="transition-transform group-hover:translate-x-1"
        />
      ) : null}
    </button>
  );
}

export function AuthDivider({ children }: { children: ReactNode }) {
  return (
    <div className="my-7 flex items-center gap-4">
      <span className="h-px flex-1 bg-[#ddd2c1]" />
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#87918e]">
        {children}
      </span>
      <span className="h-px flex-1 bg-[#ddd2c1]" />
    </div>
  );
}

type GoogleAuthButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
};

export function GoogleAuthButton({
  loading = false,
  className = "",
  ...props
}: GoogleAuthButtonProps) {
  return (
    <button
      type="button"
      className={`flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-[#d8cdbc] bg-white px-6 font-bold text-[#294748] transition-all hover:-translate-y-0.5 hover:border-[#b9aa96] hover:bg-[#fffdf8] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 ${className}`}
      {...props}
    >
      <GoogleIcon />
      {loading ? "Đang kết nối Google..." : "Tiếp tục với Google"}
    </button>
  );
}

export function PasswordRequirements({ checks }: { checks: PasswordChecks }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
      <PasswordRule valid={checks.length}>8 ký tự</PasswordRule>
      <PasswordRule valid={checks.letter}>Có chữ</PasswordRule>
      <PasswordRule valid={checks.number}>Có số</PasswordRule>
    </div>
  );
}

function PasswordRule({
  valid,
  children,
}: {
  valid: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold ${
        valid ? "text-[#388372]" : "text-[#969d9a]"
      }`}
    >
      <span
        className={`grid h-4 w-4 place-items-center rounded-full ${
          valid
            ? "bg-[#dff0e9] text-[#388372]"
            : "bg-[#ece8df] text-[#a3a39e]"
        }`}
      >
        <Check size={10} strokeWidth={3} />
      </span>
      {children}
    </span>
  );
}

function GoogleIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.93A6.02 6.02 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.55l3.35-2.62Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.94c1.47 0 2.79.51 3.83 1.5l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"
      />
    </svg>
  );
}