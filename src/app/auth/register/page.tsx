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
    LockKeyhole,
    Mail,
    MapPin,
    Route,
    ShieldCheck,
    Sparkles,
    UserRound,
} from "lucide-react";

import {
    type FormEvent,
    useMemo,
    useState,
} from "react";

import {
    CloudinaryVisual,
} from "@/src/components/home/CloudinaryVisual";

import {
    HOME_CITIES,
} from "@/src/constants/home-data";

import {
    createClient,
} from "@/src/lib/supabase/client";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getRegisterErrorMessage(
    message: string,
) {
    const normalizedMessage =
        message.toLowerCase();

    if (
        normalizedMessage.includes(
            "user already registered",
        ) ||
        normalizedMessage.includes(
            "already been registered",
        )
    ) {
        return "Email này đã được sử dụng. Bạn có thể đăng nhập bằng tài khoản hiện có.";
    }

    if (
        normalizedMessage.includes(
            "password should be at least",
        ) ||
        normalizedMessage.includes(
            "password must be at least",
        )
    ) {
        return "Mật khẩu chưa đủ mạnh. Vui lòng sử dụng ít nhất 8 ký tự.";
    }

    if (
        normalizedMessage.includes(
            "unable to validate email address",
        ) ||
        normalizedMessage.includes(
            "invalid email",
        )
    ) {
        return "Địa chỉ email không hợp lệ.";
    }

    if (
        normalizedMessage.includes(
            "signup is disabled",
        ) ||
        normalizedMessage.includes(
            "signups not allowed",
        )
    ) {
        return "Hệ thống hiện đang tạm khóa đăng ký tài khoản.";
    }

    if (
        normalizedMessage.includes(
            "rate limit",
        ) ||
        normalizedMessage.includes(
            "too many requests",
        ) ||
        normalizedMessage.includes(
            "email rate limit",
        )
    ) {
        return "Bạn đã gửi quá nhiều yêu cầu đăng ký. Vui lòng thử lại sau.";
    }

    return message;
}

function isValidEmail(
    value: string,
) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        value,
    );
}

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

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function RegisterPage() {
    const supabase =
        useMemo(
            () =>
                createClient(),
            [],
        );

    const registerVisual =
        HOME_CITIES.find(
            (city) =>
                city.id ===
                "hue",
        ) ?? HOME_CITIES[0];

    const [
        fullName,
        setFullName,
    ] = useState("");

    const [
        email,
        setEmail,
    ] = useState("");

    const [
        password,
        setPassword,
    ] = useState("");

    const [
        confirmPassword,
        setConfirmPassword,
    ] = useState("");

    const [
        showPassword,
        setShowPassword,
    ] = useState(false);

    const [
        showConfirmPassword,
        setShowConfirmPassword,
    ] = useState(false);

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
        isGoogleSubmitting,
        setIsGoogleSubmitting,
    ] =
        useState(false);

    const [
        registrationEmail,
        setRegistrationEmail,
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

    /* ---------------------------------------------------------------------- */
    /* Email signup                                                            */
    /* ---------------------------------------------------------------------- */

    async function handleRegister(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (
            isSubmitting ||
            isGoogleSubmitting
        ) {
            return;
        }

        setError(null);

        const normalizedName =
            fullName
                .trim()
                .replace(
                    /\s+/g,
                    " ",
                );

        const normalizedEmail =
            email
                .trim()
                .toLowerCase();

        if (
            normalizedName.length <
            2
        ) {
            setError(
                "Vui lòng nhập họ và tên của bạn.",
            );

            return;
        }

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
                data,
                error:
                    registerError,
            } =
                await supabase.auth.signUp(
                    {
                        email:
                            normalizedEmail,

                        password,

                        options: {
                            emailRedirectTo:
                                `${window.location.origin}/auth/callback`,

                            data: {
                                full_name:
                                    normalizedName,
                            },
                        },
                    },
                );

            if (
                registerError
            ) {
                setError(
                    getRegisterErrorMessage(
                        registerError.message,
                    ),
                );

                return;
            }

            /*
             * Nếu Supabase đang tắt email confirmation,
             * signup sẽ trả session ngay.
             */
            if (data.session) {
                window.location.assign(
                    "/",
                );

                return;
            }

            /*
             * Email confirmation đang bật.
             */
            setRegistrationEmail(
                normalizedEmail,
            );
        } catch (
            caughtError
        ) {
            console.error(
                "Lỗi đăng ký:",
                caughtError,
            );

            setError(
                "Đã xảy ra lỗi khi tạo tài khoản. Vui lòng thử lại.",
            );
        } finally {
            setIsSubmitting(
                false,
            );
        }
    }

    /* ---------------------------------------------------------------------- */
    /* Google OAuth                                                            */
    /* ---------------------------------------------------------------------- */

    async function handleGoogleRegister() {
        if (
            isSubmitting ||
            isGoogleSubmitting
        ) {
            return;
        }

        setError(null);

        setIsGoogleSubmitting(
            true,
        );

        try {
            const {
                error:
                    googleError,
            } =
                await supabase.auth.signInWithOAuth(
                    {
                        provider:
                            "google",

                        options: {
                            redirectTo:
                                `${window.location.origin}/auth/callback`,

                            queryParams: {
                                prompt:
                                    "select_account",
                            },
                        },
                    },
                );

            if (googleError) {
                console.error(
                    "Lỗi đăng ký Google:",
                    googleError,
                );

                setError(
                    "Không thể tiếp tục bằng Google. Vui lòng thử lại.",
                );

                setIsGoogleSubmitting(
                    false,
                );
            }
        } catch (
            caughtError
        ) {
            console.error(
                "Lỗi đăng ký Google:",
                caughtError,
            );

            setError(
                "Đã xảy ra lỗi khi kết nối với Google.",
            );

            setIsGoogleSubmitting(
                false,
            );
        }
    }

    /* ---------------------------------------------------------------------- */
    /* Success screen                                                          */
    /* ---------------------------------------------------------------------- */

    if (
        registrationEmail
    ) {
        return (
            <main className="flex min-h-dvh items-center justify-center bg-[#f7efe1] px-5 py-10 text-[#173a3b]">
                <div className="absolute inset-0 opacity-[0.045] [background-image:radial-gradient(#173a3b_0.7px,transparent_0.7px)] [background-size:8px_8px]" />

                <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-[#efbf61]/20 blur-3xl" />

                <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-[#59a39e]/18 blur-3xl" />

                <div className="relative w-full max-w-[540px]">
                    <div className="rounded-[34px] border border-white/80 bg-[#fffaf1]/95 p-7 text-center shadow-[0_28px_90px_rgba(30,56,52,0.13)] backdrop-blur sm:p-10">
                        <div className="mx-auto grid h-20 w-20 place-items-center rounded-[26px] bg-[#e9f5ef] text-[#2f8f78]">
                            <CheckCircle2
                                size={38}
                                strokeWidth={
                                    1.8
                                }
                            />
                        </div>

                        <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.2em] text-[#e55c49]">
                            Gần hoàn tất
                        </p>

                        <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
                            Kiểm tra email
                            của bạn
                        </h1>

                        <p className="mx-auto mt-5 max-w-md leading-7 text-[#687572]">
                            SmartTrip đã gửi
                            email xác nhận tới
                        </p>

                        <p className="mt-2 break-all font-bold text-[#173a3b]">
                            {
                                registrationEmail
                            }
                        </p>

                        <div className="mt-7 rounded-2xl border border-[#ddd3c4] bg-white/65 px-5 py-4 text-sm leading-6 text-[#64736f]">
                            Nhấn vào liên kết
                            trong email để xác
                            nhận tài khoản. Sau
                            đó bạn có thể đăng
                            nhập và bắt đầu tạo
                            lịch trình.
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
                            <ArrowLeft
                                size={16}
                            />

                            Về trang chủ
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    /* ---------------------------------------------------------------------- */
    /* Register UI                                                             */
    /* ---------------------------------------------------------------------- */

    return (
        <main className="min-h-dvh bg-[#f7efe1] text-[#173a3b]">
            <div className="grid min-h-dvh lg:grid-cols-[1.08fr_0.92fr]">
                {/* ========================================================== */}
                {/* Left visual                                                */}
                {/* ========================================================== */}

                <section className="relative hidden min-h-dvh overflow-hidden lg:block">
                    <CloudinaryVisual
                        source={
                            registerVisual?.image ??
                            ""
                        }
                        alt={
                            registerVisual?.imageAlt ??
                            "Khung cảnh miền Trung Việt Nam"
                        }
                        priority
                        imageOptions={{
                            width:
                                1500,
                            height:
                                1600,
                            crop:
                                "fill",
                            gravity:
                                "auto",
                        }}
                        className="absolute inset-0"
                    >
                        <div className="absolute inset-0 bg-linear-to-r from-[#102f30]/88 via-[#102f30]/52 to-[#102f30]/18" />

                        <div className="absolute inset-0 bg-linear-to-t from-[#102f30]/88 via-transparent to-[#102f30]/20" />

                        <div className="absolute -left-24 top-1/3 h-80 w-80 rounded-full bg-[#f3bd59]/22 blur-3xl" />

                        <div className="relative flex min-h-dvh flex-col justify-between p-10 xl:p-14">
                            <Link
                                href="/"
                                className="inline-flex w-fit items-center gap-3 text-white"
                                aria-label="Quay về trang chủ"
                            >
                                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f25f4b] shadow-[0_14px_35px_rgba(242,95,75,0.28)]">
                                    <Landmark
                                        size={
                                            24
                                        }
                                        strokeWidth={
                                            1.8
                                        }
                                    />
                                </span>

                                <span className="font-display text-3xl font-semibold">
                                    Rực Rỡ
                                    Miền Trung
                                </span>
                            </Link>

                            <div className="max-w-2xl pb-8">
                                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#f7d38f] backdrop-blur">
                                    <Sparkles
                                        size={
                                            15
                                        }
                                    />

                                    Bắt đầu
                                    hành trình
                                </div>

                                <h1 className="mt-6 font-display text-6xl font-semibold leading-[0.96] tracking-[-0.045em] text-white xl:text-7xl">
                                    Mỗi chuyến đi
                                    bắt đầu từ

                                    <span className="block italic text-[#f6d796]">
                                        một ý tưởng.
                                    </span>
                                </h1>

                                <p className="mt-6 max-w-xl text-lg leading-8 text-white/72">
                                    Tạo tài khoản
                                    SmartTrip để lưu
                                    điểm đến, xây dựng
                                    lịch trình và quản
                                    lý toàn bộ chuyến
                                    đi của bạn tại một
                                    nơi.
                                </p>

                                <div className="mt-9 grid max-w-xl grid-cols-3 gap-3">
                                    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                                        <MapPin
                                            size={
                                                21
                                            }
                                            className="text-[#f6ca73]"
                                        />

                                        <p className="mt-3 text-sm font-semibold text-white">
                                            Khám phá
                                            điểm đến
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                                        <Route
                                            size={
                                                21
                                            }
                                            className="text-[#f6ca73]"
                                        />

                                        <p className="mt-3 text-sm font-semibold text-white">
                                            Lưu lịch
                                            trình
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                                        <ShieldCheck
                                            size={
                                                21
                                            }
                                            className="text-[#f6ca73]"
                                        />

                                        <p className="mt-3 text-sm font-semibold text-white">
                                            Đồng bộ
                                            dữ liệu
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CloudinaryVisual>
                </section>

                {/* ========================================================== */}
                {/* Register form                                              */}
                {/* ========================================================== */}

                <section className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-10 sm:px-8 lg:px-12">
                    <div className="absolute inset-0 opacity-[0.045] [background-image:radial-gradient(#173a3b_0.7px,transparent_0.7px)] [background-size:8px_8px]" />

                    <div className="absolute -right-28 top-12 h-80 w-80 rounded-full bg-[#efbf61]/24 blur-3xl" />

                    <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-[#59a39e]/18 blur-3xl" />

                    <div className="relative w-full max-w-[520px]">
                        {/* Mobile logo */}

                        <div className="mb-8 flex items-center justify-between lg:hidden">
                            <Link
                                href="/"
                                className="flex items-center gap-3"
                            >
                                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f25f4b] text-white">
                                    <Landmark
                                        size={
                                            22
                                        }
                                    />
                                </span>

                                <span className="font-display text-2xl font-semibold">
                                    Rực Rỡ
                                    Miền Trung
                                </span>
                            </Link>
                        </div>

                        <Link
                            href="/"
                            className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-[#58706d] transition-colors hover:text-[#f25f4b]"
                        >
                            <ArrowLeft
                                size={17}
                            />

                            Về trang chủ
                        </Link>

                        <div className="rounded-[32px] border border-white/80 bg-[#fffaf1]/95 p-6 shadow-[0_28px_90px_rgba(30,56,52,0.13)] backdrop-blur sm:p-9">
                            {/* Header */}

                            <div>
                                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#e55c49]">
                                    Tạo tài
                                    khoản
                                </p>

                                <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.035em] text-[#173a3b] sm:text-5xl">
                                    Bắt đầu
                                    khám phá
                                </h2>

                                <p className="mt-4 leading-7 text-[#687572]">
                                    Tạo tài khoản
                                    SmartTrip để lưu
                                    lại những hành
                                    trình bạn yêu
                                    thích.
                                </p>
                            </div>

                            {/* Form */}

                            <form
                                className="mt-7 space-y-4"
                                onSubmit={
                                    handleRegister
                                }
                                aria-busy={
                                    isSubmitting
                                }
                            >
                                {/* Full name */}

                                <div>
                                    <label
                                        htmlFor="fullName"
                                        className="mb-2 block text-sm font-bold text-[#294748]"
                                    >
                                        Họ và tên
                                    </label>

                                    <div className="relative">
                                        <UserRound
                                            size={
                                                19
                                            }
                                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#82908d]"
                                        />

                                        <input
                                            id="fullName"
                                            name="fullName"
                                            type="text"
                                            value={
                                                fullName
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setFullName(
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                            placeholder="Nguyễn Văn An"
                                            autoComplete="name"
                                            required
                                            disabled={
                                                isSubmitting
                                            }
                                            className="h-14 w-full rounded-2xl border border-[#d8cdbc] bg-white/75 pl-12 pr-4 text-[#173a3b] outline-none transition-all placeholder:text-[#a2aaa7] focus:border-[#2f8f8b] focus:bg-white focus:ring-4 focus:ring-[#2f8f8b]/10 disabled:cursor-not-allowed disabled:opacity-60"
                                        />
                                    </div>
                                </div>

                                {/* Email */}

                                <div>
                                    <label
                                        htmlFor="email"
                                        className="mb-2 block text-sm font-bold text-[#294748]"
                                    >
                                        Email
                                    </label>

                                    <div className="relative">
                                        <Mail
                                            size={
                                                19
                                            }
                                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#82908d]"
                                        />

                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            value={
                                                email
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setEmail(
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                            placeholder="ban@example.com"
                                            autoComplete="email"
                                            required
                                            disabled={
                                                isSubmitting
                                            }
                                            className="h-14 w-full rounded-2xl border border-[#d8cdbc] bg-white/75 pl-12 pr-4 text-[#173a3b] outline-none transition-all placeholder:text-[#a2aaa7] focus:border-[#2f8f8b] focus:bg-white focus:ring-4 focus:ring-[#2f8f8b]/10 disabled:cursor-not-allowed disabled:opacity-60"
                                        />
                                    </div>
                                </div>

                                {/* Password */}

                                <div>
                                    <label
                                        htmlFor="password"
                                        className="mb-2 block text-sm font-bold text-[#294748]"
                                    >
                                        Mật khẩu
                                    </label>

                                    <div className="relative">
                                        <LockKeyhole
                                            size={
                                                19
                                            }
                                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#82908d]"
                                        />

                                        <input
                                            id="password"
                                            name="password"
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
                                            ) =>
                                                setPassword(
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                            placeholder="Ít nhất 8 ký tự"
                                            autoComplete="new-password"
                                            minLength={
                                                8
                                            }
                                            required
                                            disabled={
                                                isSubmitting
                                            }
                                            className="h-14 w-full rounded-2xl border border-[#d8cdbc] bg-white/75 pl-12 pr-12 text-[#173a3b] outline-none transition-all placeholder:text-[#a2aaa7] focus:border-[#2f8f8b] focus:bg-white focus:ring-4 focus:ring-[#2f8f8b]/10 disabled:cursor-not-allowed disabled:opacity-60"
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowPassword(
                                                    (
                                                        currentValue,
                                                    ) =>
                                                        !currentValue,
                                                )
                                            }
                                            aria-label={
                                                showPassword
                                                    ? "Ẩn mật khẩu"
                                                    : "Hiện mật khẩu"
                                            }
                                            disabled={
                                                isSubmitting
                                            }
                                            className="absolute right-4 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-[#6f7d7a] transition-colors hover:bg-[#efe7d8] hover:text-[#173a3b]"
                                        >
                                            {showPassword ? (
                                                <EyeOff
                                                    size={
                                                        19
                                                    }
                                                />
                                            ) : (
                                                <Eye
                                                    size={
                                                        19
                                                    }
                                                />
                                            )}
                                        </button>
                                    </div>

                                    {/* Password requirements */}

                                    {password ? (
                                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
                                            <PasswordRule
                                                valid={
                                                    passwordChecks.length
                                                }
                                            >
                                                8 ký
                                                tự
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

                                {/* Confirm password */}

                                <div>
                                    <label
                                        htmlFor="confirmPassword"
                                        className="mb-2 block text-sm font-bold text-[#294748]"
                                    >
                                        Xác nhận mật
                                        khẩu
                                    </label>

                                    <div className="relative">
                                        <LockKeyhole
                                            size={
                                                19
                                            }
                                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#82908d]"
                                        />

                                        <input
                                            id="confirmPassword"
                                            name="confirmPassword"
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
                                            ) =>
                                                setConfirmPassword(
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                            placeholder="Nhập lại mật khẩu"
                                            autoComplete="new-password"
                                            required
                                            disabled={
                                                isSubmitting
                                            }
                                            className={`h-14 w-full rounded-2xl border bg-white/75 pl-12 pr-12 text-[#173a3b] outline-none transition-all placeholder:text-[#a2aaa7] focus:bg-white focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${
                                                confirmPassword &&
                                                password !==
                                                    confirmPassword
                                                    ? "border-[#dc7565] focus:border-[#dc7565] focus:ring-[#dc7565]/10"
                                                    : "border-[#d8cdbc] focus:border-[#2f8f8b] focus:ring-[#2f8f8b]/10"
                                            }`}
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowConfirmPassword(
                                                    (
                                                        currentValue,
                                                    ) =>
                                                        !currentValue,
                                                )
                                            }
                                            aria-label={
                                                showConfirmPassword
                                                    ? "Ẩn mật khẩu xác nhận"
                                                    : "Hiện mật khẩu xác nhận"
                                            }
                                            disabled={
                                                isSubmitting
                                            }
                                            className="absolute right-4 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-[#6f7d7a] transition-colors hover:bg-[#efe7d8] hover:text-[#173a3b]"
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff
                                                    size={
                                                        19
                                                    }
                                                />
                                            ) : (
                                                <Eye
                                                    size={
                                                        19
                                                    }
                                                />
                                            )}
                                        </button>
                                    </div>

                                    {confirmPassword &&
                                    password ===
                                        confirmPassword ? (
                                        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#388372]">
                                            <Check
                                                size={
                                                    14
                                                }
                                            />

                                            Mật khẩu
                                            đã khớp
                                        </p>
                                    ) : null}
                                </div>

                                {/* Error */}

                                {error ? (
                                    <div
                                        role="alert"
                                        className="rounded-2xl border border-[#efc5bd] bg-[#fff0eb] px-4 py-3 text-sm leading-6 text-[#a44436]"
                                    >
                                        {
                                            error
                                        }
                                    </div>
                                ) : null}

                                {/* Submit */}

                                <button
                                    type="submit"
                                    disabled={
                                        isSubmitting ||
                                        isGoogleSubmitting
                                    }
                                    className="group flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#173a3b] px-6 font-bold text-white shadow-[0_16px_38px_rgba(23,58,59,0.2)] transition-all hover:-translate-y-0.5 hover:bg-[#21494a] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                                >
                                    {isSubmitting
                                        ? "Đang tạo tài khoản..."
                                        : "Tạo tài khoản"}

                                    {!isSubmitting ? (
                                        <ArrowRight
                                            size={
                                                19
                                            }
                                            className="transition-transform group-hover:translate-x-1"
                                        />
                                    ) : null}
                                </button>
                            </form>

                            {/* Divider */}

                            <div className="my-6 flex items-center gap-4">
                                <span className="h-px flex-1 bg-[#ddd2c1]" />

                                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#87918e]">
                                    Hoặc tiếp
                                    tục với
                                </span>

                                <span className="h-px flex-1 bg-[#ddd2c1]" />
                            </div>

                            {/* Google */}

                            <button
                                type="button"
                                onClick={
                                    handleGoogleRegister
                                }
                                disabled={
                                    isSubmitting ||
                                    isGoogleSubmitting
                                }
                                className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-[#d8cdbc] bg-white px-6 font-bold text-[#294748] transition-all hover:-translate-y-0.5 hover:border-[#b9aa96] hover:bg-[#fffdf8] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                            >
                                <GoogleIcon />

                                {isGoogleSubmitting
                                    ? "Đang kết nối Google..."
                                    : "Tiếp tục với Google"}
                            </button>

                            {/* Login */}

                            <p className="mt-7 text-center text-sm text-[#687572]">
                                Bạn đã có tài
                                khoản?{" "}

                                <Link
                                    href="/auth/login"
                                    className="font-extrabold text-[#d95643] transition-colors hover:text-[#b94738] hover:underline"
                                >
                                    Đăng nhập
                                </Link>
                            </p>

                            <p className="mt-5 text-center text-[11px] leading-5 text-[#929996]">
                                Bằng việc tạo tài
                                khoản, bạn đồng ý sử
                                dụng SmartTrip cho
                                mục đích lập và quản
                                lý hành trình cá
                                nhân.
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}

/* -------------------------------------------------------------------------- */
/* Components                                                                 */
/* -------------------------------------------------------------------------- */

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
            className={`inline-flex items-center gap-1.5 font-semibold ${
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
                    strokeWidth={
                        3
                    }
                />
            </span>

            {children}
        </span>
    );
}

function GoogleIcon() {
    return (
        <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            aria-hidden="true"
        >
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
                d="M12 5.94c1.47 0 2.79.51 3.83 1.5l2.87-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"
            />
        </svg>
    );
}