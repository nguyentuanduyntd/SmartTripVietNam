"use client";

import Link from "next/link";

import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Landmark,
    Mail,
    Send,
} from "lucide-react";

import {
    type FormEvent,
    useMemo,
    useState,
} from "react";

import {
    createClient,
} from "@/src/lib/supabase/client";

function isValidEmail(
    value: string,
) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        value,
    );
}

function getResetErrorMessage(
    message: string,
) {
    const normalized =
        message.toLowerCase();

    if (
        normalized.includes(
            "rate limit",
        ) ||
        normalized.includes(
            "too many requests",
        )
    ) {
        return "Bạn đã gửi quá nhiều yêu cầu. Vui lòng chờ một lúc rồi thử lại.";
    }

    if (
        normalized.includes(
            "invalid email",
        )
    ) {
        return "Địa chỉ email không hợp lệ.";
    }

    return "Chưa thể gửi email khôi phục mật khẩu. Vui lòng thử lại.";
}

export default function ForgotPasswordPage() {
    const supabase =
        useMemo(
            () =>
                createClient(),
            [],
        );

    const [
        email,
        setEmail,
    ] =
        useState("");

    const [
        error,
        setError,
    ] =
        useState<
            string | null
        >(null);

    const [
        isSubmitting,
        setIsSubmitting,
    ] =
        useState(false);

    const [
        sentEmail,
        setSentEmail,
    ] =
        useState<
            string | null
        >(null);

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        setError(null);

        const normalizedEmail =
            email
                .trim()
                .toLowerCase();

        if (
            !isValidEmail(
                normalizedEmail,
            )
        ) {
            setError(
                "Vui lòng nhập địa chỉ email hợp lệ.",
            );

            return;
        }

        setIsSubmitting(
            true,
        );

        try {
            /*
             * Recovery link sau khi Supabase verify:
             *
             * /auth/callback
             *      ↓ exchange code
             * /auth/update-password
             */
            const callbackUrl =
                new URL(
                    "/auth/callback",
                    window.location.origin,
                );

            callbackUrl.searchParams.set(
                "next",
                "/auth/update-password",
            );

            const {
                error:
                    resetError,
            } =
                await supabase.auth.resetPasswordForEmail(
                    normalizedEmail,
                    {
                        redirectTo:
                            callbackUrl.toString(),
                    },
                );

            if (resetError) {
                console.error(
                    "[FORGOT PASSWORD ERROR]",
                    resetError,
                );

                setError(
                    getResetErrorMessage(
                        resetError.message,
                    ),
                );

                return;
            }

            /*
             * Không nói email có tồn tại hay không.
             * Đây là behavior tốt về bảo mật.
             */
            setSentEmail(
                normalizedEmail,
            );
        } catch (caughtError) {
            console.error(
                "[FORGOT PASSWORD ERROR]",
                caughtError,
            );

            setError(
                "Đã xảy ra lỗi khi gửi email khôi phục. Vui lòng thử lại.",
            );
        } finally {
            setIsSubmitting(
                false,
            );
        }
    }

    if (sentEmail) {
        return (
            <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#f7efe1] px-5 py-10 text-[#173a3b]">
                <div className="absolute inset-0 opacity-[0.045] [background-image:radial-gradient(#173a3b_0.7px,transparent_0.7px)] [background-size:8px_8px]" />

                <div className="absolute -right-28 top-10 h-96 w-96 rounded-full bg-[#efbf61]/25 blur-3xl" />

                <div className="absolute -bottom-28 -left-20 h-96 w-96 rounded-full bg-[#59a39e]/18 blur-3xl" />

                <div className="relative w-full max-w-[520px]">
                    <div className="rounded-[34px] border border-white/80 bg-[#fffaf1]/95 p-7 text-center shadow-[0_28px_90px_rgba(30,56,52,0.13)] backdrop-blur sm:p-10">
                        <div className="mx-auto grid h-20 w-20 place-items-center rounded-[26px] bg-[#e6f3ed] text-[#348371]">
                            <CheckCircle2
                                size={38}
                                strokeWidth={
                                    1.8
                                }
                            />
                        </div>

                        <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.2em] text-[#e55c49]">
                            Email đã được gửi
                        </p>

                        <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
                            Kiểm tra hộp thư
                        </h1>

                        <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-[#687572] sm:text-base">
                            Nếu tài khoản tồn
                            tại, SmartTrip đã gửi
                            liên kết đặt lại mật
                            khẩu tới:
                        </p>

                        <p className="mt-2 break-all font-extrabold text-[#173a3b]">
                            {sentEmail}
                        </p>

                        <div className="mt-7 rounded-2xl border border-[#ddd3c4] bg-white/65 px-5 py-4 text-sm leading-6 text-[#64736f]">
                            Mở email và nhấn vào
                            liên kết khôi phục.
                            Liên kết sẽ đưa bạn
                            trở lại SmartTrip để
                            tạo mật khẩu mới.
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setSentEmail(
                                    null,
                                );
                                setError(
                                    null,
                                );
                            }}
                            className="mt-7 flex h-13 w-full items-center justify-center gap-2 rounded-2xl border border-[#d5c9b8] bg-white font-bold text-[#294748] transition hover:border-[#9db9af] hover:bg-[#f6fbf8]"
                        >
                            <Send
                                size={17}
                            />

                            Gửi lại email
                        </button>

                        <Link
                            href="/auth/login"
                            className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#d95643] hover:underline"
                        >
                            <ArrowLeft
                                size={16}
                            />

                            Quay lại đăng nhập
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#f7efe1] px-5 py-10 text-[#173a3b]">
            <div className="absolute inset-0 opacity-[0.045] [background-image:radial-gradient(#173a3b_0.7px,transparent_0.7px)] [background-size:8px_8px]" />

            <div className="absolute -right-28 top-10 h-96 w-96 rounded-full bg-[#efbf61]/25 blur-3xl" />

            <div className="absolute -bottom-28 -left-20 h-96 w-96 rounded-full bg-[#59a39e]/18 blur-3xl" />

            <div className="relative w-full max-w-[520px]">
                <Link
                    href="/"
                    className="mb-8 flex w-fit items-center gap-3"
                >
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f25f4b] text-white">
                        <Landmark
                            size={22}
                        />
                    </span>

                    <span className="font-display text-2xl font-semibold">
                        Rực Rỡ Miền Trung
                    </span>
                </Link>

                <div className="rounded-[34px] border border-white/80 bg-[#fffaf1]/95 p-7 shadow-[0_28px_90px_rgba(30,56,52,0.13)] backdrop-blur sm:p-10">
                    <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#e55c49]">
                        Khôi phục tài khoản
                    </p>

                    <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
                        Quên mật khẩu?
                    </h1>

                    <p className="mt-4 leading-7 text-[#687572]">
                        Nhập email đã đăng ký.
                        SmartTrip sẽ gửi cho bạn
                        một liên kết để đặt lại
                        mật khẩu.
                    </p>

                    <form
                        onSubmit={
                            handleSubmit
                        }
                        className="mt-8 space-y-5"
                    >
                        <div>
                            <label
                                htmlFor="email"
                                className="mb-2 block text-sm font-bold text-[#294748]"
                            >
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
                                    onChange={(
                                        event,
                                    ) => {
                                        setEmail(
                                            event
                                                .target
                                                .value,
                                        );

                                        if (
                                            error
                                        ) {
                                            setError(
                                                null,
                                            );
                                        }
                                    }}
                                    placeholder="ban@example.com"
                                    autoComplete="email"
                                    required
                                    disabled={
                                        isSubmitting
                                    }
                                    className="h-14 w-full rounded-2xl border border-[#d8cdbc] bg-white/75 pl-12 pr-4 text-[#173a3b] outline-none transition placeholder:text-[#a2aaa7] focus:border-[#2f8f8b] focus:bg-white focus:ring-4 focus:ring-[#2f8f8b]/10 disabled:opacity-60"
                                />
                            </div>
                        </div>

                        {error ? (
                            <div
                                role="alert"
                                className="rounded-2xl border border-[#efc5bd] bg-[#fff0eb] px-4 py-3 text-sm leading-6 text-[#a44436]"
                            >
                                {error}
                            </div>
                        ) : null}

                        <button
                            type="submit"
                            disabled={
                                isSubmitting
                            }
                            className="group flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#173a3b] px-6 font-bold text-white shadow-[0_16px_38px_rgba(23,58,59,0.2)] transition hover:-translate-y-0.5 hover:bg-[#21494a] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                        >
                            {isSubmitting
                                ? "Đang gửi email..."
                                : "Gửi liên kết khôi phục"}

                            {!isSubmitting ? (
                                <ArrowRight
                                    size={19}
                                    className="transition-transform group-hover:translate-x-1"
                                />
                            ) : null}
                        </button>
                    </form>

                    <Link
                        href="/auth/login"
                        className="mt-7 flex items-center justify-center gap-2 text-sm font-bold text-[#58706d] transition hover:text-[#d95643]"
                    >
                        <ArrowLeft
                            size={16}
                        />

                        Quay lại đăng nhập
                    </Link>
                </div>
            </div>
        </main>
    );
}