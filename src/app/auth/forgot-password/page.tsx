"use client";

import Link from "next/link";

import {
    ArrowLeft,
    ArrowRight,
    Check,
    CheckCircle2,
    Eye,
    EyeOff,
    Landmark,
    Mail,
    RotateCw,
    ShieldCheck,
} from "lucide-react";

import { type FormEvent, useState } from "react";

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getPasswordChecks(password: string) {
    return {
        length: password.length >= 8,
        letter: /[A-Za-zÀ-ỹ]/.test(password),
        number: /\d/.test(password),
    };
}

function PasswordRule({ valid, children }: { valid: boolean; children: React.ReactNode }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                valid ? "text-[#388372]" : "text-[#969d9a]"
            }`}
        >
            <span
                className={`grid h-4 w-4 place-items-center rounded-full ${
                    valid ? "bg-[#dff0e9] text-[#388372]" : "bg-[#ece8df] text-[#a3a39e]"
                }`}
            >
                <Check size={10} strokeWidth={3} />
            </span>
            {children}
        </span>
    );
}

type ApiResponse = {
    success: boolean;
    message?: string;
    errors?: Record<string, string[]>;
};

async function callApi(path: string, body: unknown): Promise<ApiResponse> {
    const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    return (await res.json()) as ApiResponse;
}

type Step = "request" | "reset" | "done";

export default function ForgotPasswordPage() {
    const [step, setStep] = useState<Step>("request");

    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    const passwordChecks = getPasswordChecks(password);
    const passwordValid = passwordChecks.length && passwordChecks.letter && passwordChecks.number;

    function startResendCooldown() {
        setResendCooldown(60);
        const timer = setInterval(() => {
            setResendCooldown((current) => {
                if (current <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return current - 1;
            });
        }, 1000);
    }

    async function handleRequestOtp(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (isSubmitting) return;

        setError(null);

        const normalizedEmail = email.trim().toLowerCase();

        if (!isValidEmail(normalizedEmail)) {
            setError("Vui lòng nhập địa chỉ email hợp lệ.");
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await callApi("/api/auth/forgot-password", {
                email: normalizedEmail,
            });

            if (!result.success) {
                setError(result.message ?? "Chưa thể gửi mã OTP. Vui lòng thử lại.");
                return;
            }

            setEmail(normalizedEmail);
            setStep("reset");
            startResendCooldown();
        } catch (caughtError) {
            console.error("[FORGOT PASSWORD ERROR]", caughtError);
            setError("Đã xảy ra lỗi khi gửi mã OTP. Vui lòng thử lại.");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleResendOtp() {
        if (isSubmitting || resendCooldown > 0) return;

        setError(null);
        setIsSubmitting(true);

        try {
            const result = await callApi("/api/auth/forgot-password", { email });

            if (!result.success) {
                setError(result.message ?? "Chưa thể gửi lại mã OTP.");
                return;
            }

            startResendCooldown();
        } catch (caughtError) {
            console.error("[RESEND OTP ERROR]", caughtError);
            setError("Đã xảy ra lỗi khi gửi lại mã OTP.");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (isSubmitting) return;

        setError(null);

        if (!/^\d{6}$/.test(otp)) {
            setError("Mã OTP gồm 6 chữ số.");
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
            const result = await callApi("/api/auth/reset-password", {
                email,
                otp,
                newPassword: password,
                confirmPassword,
            });

            if (!result.success) {
                setError(result.message ?? "Chưa thể đặt lại mật khẩu. Vui lòng thử lại.");
                return;
            }

            setStep("done");
        } catch (caughtError) {
            console.error("[RESET PASSWORD ERROR]", caughtError);
            setError("Đã xảy ra lỗi khi đặt lại mật khẩu.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#f7efe1] px-5 py-10 text-[#173a3b]">
            <div className="absolute inset-0 opacity-[0.045] [background-image:radial-gradient(#173a3b_0.7px,transparent_0.7px)] [background-size:8px_8px]" />
            <div className="absolute -right-28 top-10 h-96 w-96 rounded-full bg-[#efbf61]/25 blur-3xl" />
            <div className="absolute -bottom-28 -left-20 h-96 w-96 rounded-full bg-[#59a39e]/18 blur-3xl" />

            <div className="relative w-full max-w-[520px]">
                {step !== "done" ? (
                    <Link href="/" className="mb-8 flex w-fit items-center gap-3">
                        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f25f4b] text-white">
                            <Landmark size={22} />
                        </span>
                        <span className="font-display text-2xl font-semibold">Rực Rỡ Miền Trung</span>
                    </Link>
                ) : null}

                <div className="rounded-[34px] border border-white/80 bg-[#fffaf1]/95 p-7 shadow-[0_28px_90px_rgba(30,56,52,0.13)] backdrop-blur sm:p-10">
                    {step === "request" ? (
                        <>
                            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#e55c49]">
                                Khôi phục tài khoản
                            </p>
                            <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
                                Quên mật khẩu?
                            </h1>
                            <p className="mt-4 leading-7 text-[#687572]">
                                Nhập email đã đăng ký. SmartTrip sẽ gửi cho bạn một mã OTP gồm 6
                                chữ số để đặt lại mật khẩu.
                            </p>

                            <form onSubmit={handleRequestOtp} className="mt-8 space-y-5">
                                <div>
                                    <label htmlFor="email" className="mb-2 block text-sm font-bold text-[#294748]">
                                        Email
                                    </label>
                                    <div className="relative">
                                        <Mail
                                            size={19}
                                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#82908d]"
                                        />
                                        <input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(event) => {
                                                setEmail(event.target.value);
                                                if (error) setError(null);
                                            }}
                                            placeholder="ban@example.com"
                                            autoComplete="email"
                                            required
                                            disabled={isSubmitting}
                                            className="h-14 w-full rounded-2xl border border-[#d8cdbc] bg-white/75 pl-12 pr-4 text-[#173a3b] outline-none transition placeholder:text-[#a2aaa7] focus:border-[#2f8f8b] focus:bg-white focus:ring-4 focus:ring-[#2f8f8b]/10 disabled:opacity-60"
                                        />
                                    </div>
                                </div>

                                {error ? (
                                    <div role="alert" className="rounded-2xl border border-[#efc5bd] bg-[#fff0eb] px-4 py-3 text-sm leading-6 text-[#a44436]">
                                        {error}
                                    </div>
                                ) : null}

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="group flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#173a3b] px-6 font-bold text-white shadow-[0_16px_38px_rgba(23,58,59,0.2)] transition hover:-translate-y-0.5 hover:bg-[#21494a] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                                >
                                    {isSubmitting ? "Đang gửi mã..." : "Gửi mã OTP"}
                                    {!isSubmitting ? (
                                        <ArrowRight size={19} className="transition-transform group-hover:translate-x-1" />
                                    ) : null}
                                </button>
                            </form>

                            <Link href="/auth/login" className="mt-7 flex items-center justify-center gap-2 text-sm font-bold text-[#58706d] transition hover:text-[#d95643]">
                                <ArrowLeft size={16} />
                                Quay lại đăng nhập
                            </Link>
                        </>
                    ) : null}

                    {step === "reset" ? (
                        <>
                            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#e55c49]">
                                Xác thực OTP
                            </p>
                            <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
                                Nhập mã & mật khẩu mới
                            </h1>
                            <p className="mt-4 leading-7 text-[#687572]">
                                SmartTrip đã gửi mã OTP tới{" "}
                                <span className="font-extrabold text-[#173a3b]">{email}</span>. Mã có
                                hiệu lực trong 10 phút.
                            </p>

                            <form onSubmit={handleResetPassword} className="mt-8 space-y-5">
                                <div>
                                    <label htmlFor="otp" className="mb-2 block text-sm font-bold text-[#294748]">
                                        Mã OTP (6 chữ số)
                                    </label>
                                    <div className="relative">
                                        <ShieldCheck
                                            size={19}
                                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#82908d]"
                                        />
                                        <input
                                            id="otp"
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={6}
                                            value={otp}
                                            onChange={(event) => {
                                                setOtp(event.target.value.replace(/\D/g, ""));
                                                if (error) setError(null);
                                            }}
                                            placeholder="000000"
                                            required
                                            disabled={isSubmitting}
                                            className="h-14 w-full rounded-2xl border border-[#d8cdbc] bg-white/75 pl-12 pr-4 text-center text-lg font-bold tracking-[0.4em] text-[#173a3b] outline-none transition placeholder:text-[#a2aaa7] focus:border-[#2f8f8b] focus:bg-white focus:ring-4 focus:ring-[#2f8f8b]/10 disabled:opacity-60"
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleResendOtp}
                                        disabled={isSubmitting || resendCooldown > 0}
                                        className="mt-2 flex items-center gap-1.5 text-xs font-bold text-[#2f8f8b] hover:underline disabled:cursor-not-allowed disabled:text-[#a3a39e] disabled:no-underline"
                                    >
                                        <RotateCw size={13} />
                                        {resendCooldown > 0 ? `Gửi lại mã (${resendCooldown}s)` : "Gửi lại mã"}
                                    </button>
                                </div>

                                <div>
                                    <label htmlFor="password" className="mb-2 block text-sm font-bold text-[#294748]">
                                        Mật khẩu mới
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(event) => {
                                                setPassword(event.target.value);
                                                if (error) setError(null);
                                            }}
                                            autoComplete="new-password"
                                            required
                                            disabled={isSubmitting}
                                            className="h-14 w-full rounded-2xl border border-[#d8cdbc] bg-white/75 px-4 pr-12 text-[#173a3b] outline-none transition focus:border-[#2f8f8b] focus:bg-white focus:ring-4 focus:ring-[#2f8f8b]/10 disabled:opacity-60"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((value) => !value)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#82908d]"
                                        >
                                            {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                                        </button>
                                    </div>

                                    <div className="mt-2 flex flex-wrap gap-3">
                                        <PasswordRule valid={passwordChecks.length}>Tối thiểu 8 ký tự</PasswordRule>
                                        <PasswordRule valid={passwordChecks.letter}>Có chữ cái</PasswordRule>
                                        <PasswordRule valid={passwordChecks.number}>Có chữ số</PasswordRule>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="confirmPassword" className="mb-2 block text-sm font-bold text-[#294748]">
                                        Xác nhận mật khẩu mới
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="confirmPassword"
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(event) => {
                                                setConfirmPassword(event.target.value);
                                                if (error) setError(null);
                                            }}
                                            autoComplete="new-password"
                                            required
                                            disabled={isSubmitting}
                                            className="h-14 w-full rounded-2xl border border-[#d8cdbc] bg-white/75 px-4 pr-12 text-[#173a3b] outline-none transition focus:border-[#2f8f8b] focus:bg-white focus:ring-4 focus:ring-[#2f8f8b]/10 disabled:opacity-60"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword((value) => !value)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#82908d]"
                                        >
                                            {showConfirmPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                                        </button>
                                    </div>
                                </div>

                                {error ? (
                                    <div role="alert" className="rounded-2xl border border-[#efc5bd] bg-[#fff0eb] px-4 py-3 text-sm leading-6 text-[#a44436]">
                                        {error}
                                    </div>
                                ) : null}

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="group flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#173a3b] px-6 font-bold text-white shadow-[0_16px_38px_rgba(23,58,59,0.2)] transition hover:-translate-y-0.5 hover:bg-[#21494a] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                                >
                                    {isSubmitting ? "Đang xử lý..." : "Đặt lại mật khẩu"}
                                </button>
                            </form>

                            <button
                                type="button"
                                onClick={() => {
                                    setStep("request");
                                    setError(null);
                                    setOtp("");
                                }}
                                className="mt-7 flex w-full items-center justify-center gap-2 text-sm font-bold text-[#58706d] transition hover:text-[#d95643]"
                            >
                                <ArrowLeft size={16} />
                                Dùng email khác
                            </button>
                        </>
                    ) : null}

                    {step === "done" ? (
                        <div className="text-center">
                            <div className="mx-auto grid h-20 w-20 place-items-center rounded-[26px] bg-[#e6f3ed] text-[#348371]">
                                <CheckCircle2 size={38} strokeWidth={1.8} />
                            </div>

                            <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.2em] text-[#e55c49]">
                                Thành công
                            </p>
                            <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
                                Đã đổi mật khẩu
                            </h1>
                            <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-[#687572] sm:text-base">
                                Mật khẩu của bạn đã được cập nhật. Hãy đăng nhập lại bằng mật khẩu
                                mới.
                            </p>

                            <Link
                                href="/auth/login"
                                className="group mt-7 flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#173a3b] font-bold text-white transition hover:bg-[#21494a]"
                            >
                                Đăng nhập
                                <ArrowRight size={19} className="transition-transform group-hover:translate-x-1" />
                            </Link>
                        </div>
                    ) : null}
                </div>
            </div>
        </main>
    );
}