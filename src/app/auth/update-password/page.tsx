"use client";

import Link from "next/link";

import {
    ArrowRight,
    Check,
    CheckCircle2,
    Eye,
    EyeOff,
    KeyRound,
    Landmark,
    LockKeyhole,
} from "lucide-react";

import {
    type FormEvent,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    createClient,
} from "@/src/lib/supabase/client";

function getPasswordChecks(
    password: string,
) {
    return {
        length:
            password.length >= 8,

        letter:
            /[A-Za-zÀ-ỹ]/.test(
                password,
            ),

        number:
            /\d/.test(
                password,
            ),
    };
}

function PasswordRule({
    valid,
    children,
}: {
    valid: boolean;
    children:
        React.ReactNode;
}) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                valid
                    ? "text-[#388372]"
                    : "text-[#969d9a]"
            }`}
        >
            <span
                className={`grid h-4 w-4 place-items-center rounded-full ${
                    valid
                        ? "bg-[#dff0e9] text-[#388372]"
                        : "bg-[#ece8df] text-[#a3a39e]"
                }`}
            >
                <Check
                    size={10}
                    strokeWidth={3}
                />
            </span>

            {children}
        </span>
    );
}

export default function UpdatePasswordPage() {
    const supabase =
        useMemo(
            () =>
                createClient(),
            [],
        );

    const [
        password,
        setPassword,
    ] =
        useState("");

    const [
        confirmPassword,
        setConfirmPassword,
    ] =
        useState("");

    const [
        showPassword,
        setShowPassword,
    ] =
        useState(false);

    const [
        showConfirmPassword,
        setShowConfirmPassword,
    ] =
        useState(false);

    const [
        isCheckingSession,
        setIsCheckingSession,
    ] =
        useState(true);

    const [
        hasRecoverySession,
        setHasRecoverySession,
    ] =
        useState(false);

    const [
        isSubmitting,
        setIsSubmitting,
    ] =
        useState(false);

    const [
        success,
        setSuccess,
    ] =
        useState(false);

    const [
        error,
        setError,
    ] =
        useState<
            string | null
        >(null);

    const passwordChecks =
        useMemo(
            () =>
                getPasswordChecks(
                    password,
                ),
            [password],
        );

    const passwordValid =
        passwordChecks.length &&
        passwordChecks.letter &&
        passwordChecks.number;

    useEffect(() => {
        let mounted = true;

        async function checkSession() {
            try {
                const {
                    data,
                } =
                    await supabase.auth.getSession();

                if (!mounted) {
                    return;
                }

                setHasRecoverySession(
                    Boolean(
                        data.session,
                    ),
                );
            } catch (
                sessionError
            ) {
                console.error(
                    "[PASSWORD RECOVERY SESSION ERROR]",
                    sessionError,
                );

                if (mounted) {
                    setHasRecoverySession(
                        false,
                    );
                }
            } finally {
                if (mounted) {
                    setIsCheckingSession(
                        false,
                    );
                }
            }
        }

        void checkSession();

        return () => {
            mounted = false;
        };
    }, [supabase]);

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        setError(null);

        if (!passwordValid) {
            setError(
                "Mật khẩu cần có ít nhất 8 ký tự, bao gồm chữ và số.",
            );

            return;
        }

        if (
            password !==
            confirmPassword
        ) {
            setError(
                "Mật khẩu xác nhận không khớp.",
            );

            return;
        }

        setIsSubmitting(
            true,
        );

        try {
            const {
                error:
                    updateError,
            } =
                await supabase.auth.updateUser(
                    {
                        password,
                    },
                );

            if (updateError) {
                console.error(
                    "[UPDATE PASSWORD ERROR]",
                    updateError,
                );

                const normalized =
                    updateError.message.toLowerCase();

                if (
                    normalized.includes(
                        "same password",
                    )
                ) {
                    setError(
                        "Mật khẩu mới phải khác mật khẩu hiện tại.",
                    );
                } else if (
                    normalized.includes(
                        "password should be at least",
                    )
                ) {
                    setError(
                        "Mật khẩu chưa đủ mạnh.",
                    );
                } else {
                    setError(
                        "Chưa thể cập nhật mật khẩu. Liên kết có thể đã hết hạn.",
                    );
                }

                return;
            }

            setSuccess(true);

            /*
             * Đăng xuất recovery session.
             * Sau đó user login lại bằng password mới.
             */
            await supabase.auth.signOut();
        } catch (caughtError) {
            console.error(
                "[UPDATE PASSWORD ERROR]",
                caughtError,
            );

            setError(
                "Đã xảy ra lỗi khi cập nhật mật khẩu.",
            );
        } finally {
            setIsSubmitting(
                false,
            );
        }
    }

    if (isCheckingSession) {
        return (
            <main className="flex min-h-dvh items-center justify-center bg-[#f7efe1] text-[#173a3b]">
                <div className="text-center">
                    <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#d9d0c1] border-t-[#173a3b]" />

                    <p className="mt-4 text-sm font-semibold text-[#687572]">
                        Đang kiểm tra liên kết
                        khôi phục...
                    </p>
                </div>
            </main>
        );
    }

    if (success) {
        return (
            <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#f7efe1] px-5 py-10 text-[#173a3b]">
                <div className="absolute inset-0 opacity-[0.045] [background-image:radial-gradient(#173a3b_0.7px,transparent_0.7px)] [background-size:8px_8px]" />

                <div className="relative w-full max-w-[520px]">
                    <div className="rounded-[34px] border border-white/80 bg-[#fffaf1]/95 p-8 text-center shadow-[0_28px_90px_rgba(30,56,52,0.13)] sm:p-10">
                        <div className="mx-auto grid h-20 w-20 place-items-center rounded-[26px] bg-[#e6f3ed] text-[#348371]">
                            <CheckCircle2
                                size={38}
                            />
                        </div>

                        <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.2em] text-[#e55c49]">
                            Thành công
                        </p>

                        <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">
                            Đã đổi mật khẩu
                        </h1>

                        <p className="mt-5 leading-7 text-[#687572]">
                            Mật khẩu của bạn đã
                            được cập nhật. Hãy
                            đăng nhập lại bằng mật
                            khẩu mới.
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
                    </div>
                </div>
            </main>
        );
    }

    if (!hasRecoverySession) {
        return (
            <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#f7efe1] px-5 py-10 text-[#173a3b]">
                <div className="relative w-full max-w-[520px]">
                    <div className="rounded-[34px] border border-white/80 bg-[#fffaf1]/95 p-8 text-center shadow-[0_28px_90px_rgba(30,56,52,0.13)] sm:p-10">
                        <div className="mx-auto grid h-20 w-20 place-items-center rounded-[26px] bg-[#fff0eb] text-[#d95643]">
                            <KeyRound
                                size={36}
                            />
                        </div>

                        <h1 className="mt-6 font-display text-4xl font-semibold">
                            Liên kết không hợp lệ
                        </h1>

                        <p className="mt-4 leading-7 text-[#687572]">
                            Phiên khôi phục mật
                            khẩu không tồn tại
                            hoặc đã hết hạn. Hãy
                            yêu cầu một liên kết
                            mới.
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
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#f7efe1] px-5 py-10 text-[#173a3b]">
            <div className="absolute inset-0 opacity-[0.045] [background-image:radial-gradient(#173a3b_0.7px,transparent_0.7px)] [background-size:8px_8px]" />

            <div className="absolute -right-20 top-10 h-96 w-96 rounded-full bg-[#efbf61]/25 blur-3xl" />

            <div className="absolute -bottom-24 -left-20 h-96 w-96 rounded-full bg-[#59a39e]/18 blur-3xl" />

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

                <div className="rounded-[34px] border border-white/80 bg-[#fffaf1]/95 p-7 shadow-[0_28px_90px_rgba(30,56,52,0.13)] sm:p-10">
                    <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#e55c49]">
                        Bảo mật tài khoản
                    </p>

                    <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">
                        Tạo mật khẩu mới
                    </h1>

                    <p className="mt-4 leading-7 text-[#687572]">
                        Mật khẩu mới nên khác
                        mật khẩu cũ và đủ mạnh để
                        bảo vệ tài khoản của bạn.
                    </p>

                    <form
                        onSubmit={
                            handleSubmit
                        }
                        className="mt-8 space-y-5"
                    >
                        <div>
                            <label
                                htmlFor="password"
                                className="mb-2 block text-sm font-bold text-[#294748]"
                            >
                                Mật khẩu mới
                            </label>

                            <div className="relative">
                                <LockKeyhole
                                    size={19}
                                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#82908d]"
                                />

                                <input
                                    id="password"
                                    type={
                                        showPassword
                                            ? "text"
                                            : "password"
                                    }
                                    value={
                                        password
                                    }
                                    onChange={(
                                        event,
                                    ) => {
                                        setPassword(
                                            event
                                                .target
                                                .value,
                                        );

                                        setError(
                                            null,
                                        );
                                    }}
                                    autoComplete="new-password"
                                    placeholder="Ít nhất 8 ký tự"
                                    required
                                    minLength={8}
                                    disabled={
                                        isSubmitting
                                    }
                                    className="h-14 w-full rounded-2xl border border-[#d8cdbc] bg-white/75 pl-12 pr-12 outline-none transition focus:border-[#2f8f8b] focus:ring-4 focus:ring-[#2f8f8b]/10"
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword(
                                            (
                                                value,
                                            ) =>
                                                !value,
                                        )
                                    }
                                    className="absolute right-4 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-[#6f7d7a] hover:bg-[#efe7d8]"
                                >
                                    {showPassword ? (
                                        <EyeOff
                                            size={19}
                                        />
                                    ) : (
                                        <Eye
                                            size={19}
                                        />
                                    )}
                                </button>
                            </div>

                            {password ? (
                                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                                    <PasswordRule
                                        valid={
                                            passwordChecks.length
                                        }
                                    >
                                        8 ký tự
                                    </PasswordRule>

                                    <PasswordRule
                                        valid={
                                            passwordChecks.letter
                                        }
                                    >
                                        Có chữ
                                    </PasswordRule>

                                    <PasswordRule
                                        valid={
                                            passwordChecks.number
                                        }
                                    >
                                        Có số
                                    </PasswordRule>
                                </div>
                            ) : null}
                        </div>

                        <div>
                            <label
                                htmlFor="confirmPassword"
                                className="mb-2 block text-sm font-bold text-[#294748]"
                            >
                                Xác nhận mật khẩu
                            </label>

                            <div className="relative">
                                <LockKeyhole
                                    size={19}
                                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#82908d]"
                                />

                                <input
                                    id="confirmPassword"
                                    type={
                                        showConfirmPassword
                                            ? "text"
                                            : "password"
                                    }
                                    value={
                                        confirmPassword
                                    }
                                    onChange={(
                                        event,
                                    ) => {
                                        setConfirmPassword(
                                            event
                                                .target
                                                .value,
                                        );

                                        setError(
                                            null,
                                        );
                                    }}
                                    autoComplete="new-password"
                                    placeholder="Nhập lại mật khẩu"
                                    required
                                    disabled={
                                        isSubmitting
                                    }
                                    className="h-14 w-full rounded-2xl border border-[#d8cdbc] bg-white/75 pl-12 pr-12 outline-none transition focus:border-[#2f8f8b] focus:ring-4 focus:ring-[#2f8f8b]/10"
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowConfirmPassword(
                                            (
                                                value,
                                            ) =>
                                                !value,
                                        )
                                    }
                                    className="absolute right-4 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-[#6f7d7a] hover:bg-[#efe7d8]"
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff
                                            size={19}
                                        />
                                    ) : (
                                        <Eye
                                            size={19}
                                        />
                                    )}
                                </button>
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
                            className="group flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#173a3b] font-bold text-white transition hover:bg-[#21494a] disabled:opacity-60"
                        >
                            {isSubmitting
                                ? "Đang cập nhật..."
                                : "Cập nhật mật khẩu"}

                            {!isSubmitting ? (
                                <ArrowRight
                                    size={19}
                                />
                            ) : null}
                        </button>
                    </form>
                </div>
            </div>
        </main>
    );
}