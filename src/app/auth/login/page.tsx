"use client";

import Link from "next/link";
import {
    ArrowLeft,
    ArrowRight,
    Eye,
    EyeOff,
    Landmark,
    LockKeyhole,
    Mail,
    MapPin,
    Route,
    ShieldCheck,
    Sparkles,
    UserPlus,
} from "lucide-react";
import {
    type FormEvent,
    useMemo,
    useState,
} from "react";

import { CloudinaryVisual } from "@/src/components/home/CloudinaryVisual";
import { HOME_CITIES } from "@/src/constants/home-data";
import { normalizeReturnPath } from "@/src/lib/auth/return-path";
import { createClient } from "@/src/lib/supabase/client";

function getLoginErrorMessage(message: string): string {
    const normalizedMessage = message.toLowerCase();

    if (
        normalizedMessage.includes(
            "invalid login credentials",
        )
    ) {
        return "Email hoặc mật khẩu không chính xác.";
    }

    if (
        normalizedMessage.includes(
            "email not confirmed",
        )
    ) {
        return "Email của bạn chưa được xác nhận. Vui lòng kiểm tra hộp thư.";
    }

    if (
        normalizedMessage.includes("rate limit") ||
        normalizedMessage.includes("too many requests")
    ) {
        return "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau.";
    }

    return message;
}

function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
    );
}

/**
 * Lấy đường dẫn nội bộ mà người dùng muốn quay lại sau
 * khi đăng nhập.
 *
 * Ví dụ:
 * /auth/login?next=/tours/hue-da-nang-hoi-an
 */
function getRequestedReturnPath(): string {
    if (typeof window === "undefined") {
        return "";
    }

    const searchParams = new URLSearchParams(
        window.location.search,
    );

    return normalizeReturnPath(
        searchParams.get("next"),
        "",
    );
}

export default function LoginPage() {
    const supabase = useMemo(
        () => createClient(),
        [],
    );

    const loginVisual =
        HOME_CITIES.find(
            (city) => city.id === "hoi-an",
        ) ?? HOME_CITIES[0];

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] =
        useState(false);

    const [error, setError] = useState<
        string | null
    >(null);

    const [isSubmitting, setIsSubmitting] =
        useState(false);

    const [
        isGoogleSubmitting,
        setIsGoogleSubmitting,
    ] = useState(false);

    const isBusy =
        isSubmitting || isGoogleSubmitting;

    async function handleLogin(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (isBusy) {
            return;
        }

        setError(null);
        setIsSubmitting(true);

        try {
            const {
                data,
                error: loginError,
            } =
                await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password,
                });

            if (loginError) {
                setError(
                    getLoginErrorMessage(
                        loginError.message,
                    ),
                );

                return;
            }

            if (!data.session) {
                setError(
                    "Đăng nhập thành công nhưng chưa tạo được phiên làm việc.",
                );

                return;
            }

            /*
             * Kiểm tra quyền admin để giữ hành vi cũ:
             *
             * - Có next: quay lại trang người dùng đang thao tác.
             * - Không có next và là admin: vào trang quản trị.
             * - Không có next và là user: về trang chủ.
             */
            const adminCheckResponse = await fetch(
                "/api/admin/check",
                {
                    method: "GET",
                    headers: {
                        Accept: "application/json",
                    },
                },
            ).catch(() => null);

            const adminCheckResult: unknown =
                adminCheckResponse
                    ? await adminCheckResponse
                          .json()
                          .catch(() => null)
                    : null;

            const isAdmin =
                adminCheckResponse?.ok === true &&
                isRecord(adminCheckResult) &&
                adminCheckResult.success === true;

            const requestedReturnPath =
                getRequestedReturnPath();

            const fallbackPath = isAdmin
                ? "/admin/destinations"
                : "/";

            window.location.assign(
                requestedReturnPath ||
                    fallbackPath,
            );
        } catch (caughtError) {
            console.error(
                "Lỗi đăng nhập:",
                caughtError,
            );

            setError(
                "Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại.",
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleGoogleLogin() {
        if (isBusy) {
            return;
        }

        setError(null);
        setIsGoogleSubmitting(true);

        try {
            const requestedReturnPath =
                getRequestedReturnPath();

            const callbackUrl = new URL(
                "/auth/callback",
                window.location.origin,
            );

            /*
             * Chỉ truyền next khi người dùng thực sự đi tới
             * trang đăng nhập từ một luồng khác.
             */
            if (requestedReturnPath) {
                callbackUrl.searchParams.set(
                    "next",
                    requestedReturnPath,
                );
            }

            const { error: googleError } =
                await supabase.auth.signInWithOAuth({
                    provider: "google",
                    options: {
                        redirectTo:
                            callbackUrl.toString(),
                        queryParams: {
                            prompt: "select_account",
                        },
                    },
                });

            if (googleError) {
                console.error(
                    "Lỗi đăng nhập Google:",
                    googleError,
                );

                setError(
                    "Không thể đăng nhập bằng Google. Vui lòng thử lại.",
                );

                setIsGoogleSubmitting(false);
            }
        } catch (caughtError) {
            console.error(
                "Lỗi đăng nhập Google:",
                caughtError,
            );

            setError(
                "Đã xảy ra lỗi khi kết nối với Google. Vui lòng thử lại.",
            );

            setIsGoogleSubmitting(false);
        }
    }

    return (
        <main className="min-h-dvh bg-[#f7efe1] text-[#173a3b]">
            <div className="grid min-h-dvh lg:grid-cols-[1.08fr_0.92fr]">
                {/* Khối hình ảnh bên trái */}
                <section className="relative hidden min-h-dvh overflow-hidden lg:block">
                    <CloudinaryVisual
                        source={
                            loginVisual?.image ?? ""
                        }
                        alt={
                            loginVisual?.imageAlt ??
                            "Khung cảnh miền Trung Việt Nam"
                        }
                        priority
                        imageOptions={{
                            width: 1500,
                            height: 1600,
                            crop: "fill",
                            gravity: "auto",
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
                                        size={24}
                                        strokeWidth={1.8}
                                    />
                                </span>

                                <span className="font-display text-3xl font-semibold">
                                    Rực Rỡ Miền Trung
                                </span>
                            </Link>

                            <div className="max-w-2xl pb-8">
                                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#f7d38f] backdrop-blur">
                                    <Sparkles size={15} />
                                    Chào mừng trở lại
                                </div>

                                <h1 className="mt-6 font-display text-6xl font-semibold leading-[0.96] tracking-[-0.045em] text-white xl:text-7xl">
                                    Tiếp tục hành trình

                                    <span className="block italic text-[#f6d796]">
                                        còn đang dang dở.
                                    </span>
                                </h1>

                                <p className="mt-6 max-w-xl text-lg leading-8 text-white/72">
                                    Đăng nhập để lưu địa
                                    điểm yêu thích, quản lý
                                    lịch trình và nhận các
                                    gợi ý được cá nhân hóa
                                    dành riêng cho bạn.
                                </p>

                                <div className="mt-9 grid max-w-xl grid-cols-3 gap-3">
                                    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                                        <MapPin
                                            size={21}
                                            className="text-[#f6ca73]"
                                        />

                                        <p className="mt-3 text-sm font-semibold text-white">
                                            Lưu điểm đến
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                                        <Route
                                            size={21}
                                            className="text-[#f6ca73]"
                                        />

                                        <p className="mt-3 text-sm font-semibold text-white">
                                            Tạo lịch trình
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                                        <ShieldCheck
                                            size={21}
                                            className="text-[#f6ca73]"
                                        />

                                        <p className="mt-3 text-sm font-semibold text-white">
                                            Đồng bộ dữ liệu
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CloudinaryVisual>
                </section>

                {/* Khối form đăng nhập */}
                <section className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-10 sm:px-8 lg:px-12">
                    <div className="absolute inset-0 opacity-[0.045] [background-image:radial-gradient(#173a3b_0.7px,transparent_0.7px)] [background-size:8px_8px]" />

                    <div className="absolute -right-28 top-12 h-80 w-80 rounded-full bg-[#efbf61]/24 blur-3xl" />

                    <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-[#59a39e]/18 blur-3xl" />

                    <div className="relative w-full max-w-[500px]">
                        {/* Logo mobile */}
                        <div className="mb-10 flex items-center justify-between lg:hidden">
                            <Link
                                href="/"
                                className="flex items-center gap-3"
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
                        </div>

                        <Link
                            href="/"
                            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[#58706d] transition-colors hover:text-[#f25f4b]"
                        >
                            <ArrowLeft size={17} />
                            Về trang chủ
                        </Link>

                        <div className="rounded-[32px] border border-white/80 bg-[#fffaf1]/95 p-6 shadow-[0_28px_90px_rgba(30,56,52,0.13)] backdrop-blur sm:p-9">
                            <div>
                                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#e55c49]">
                                    Đăng nhập tài khoản
                                </p>

                                <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.035em] text-[#173a3b] sm:text-5xl">
                                    Chào mừng trở lại
                                </h2>

                                <p className="mt-4 leading-7 text-[#687572]">
                                    Nhập thông tin tài khoản
                                    để tiếp tục khám phá hành
                                    trình miền Trung.
                                </p>
                            </div>

                            <form
                                className="mt-8 space-y-5"
                                onSubmit={handleLogin}
                                aria-busy={isBusy}
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
                                            name="email"
                                            type="email"
                                            value={email}
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
                                            disabled={isBusy}
                                            className="h-14 w-full rounded-2xl border border-[#d8cdbc] bg-white/75 pl-12 pr-4 text-[#173a3b] outline-none transition-all placeholder:text-[#a2aaa7] focus:border-[#2f8f8b] focus:bg-white focus:ring-4 focus:ring-[#2f8f8b]/10 disabled:cursor-not-allowed disabled:opacity-60"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label
                                        htmlFor="password"
                                        className="mb-2 block text-sm font-bold text-[#294748]"
                                    >
                                        Mật khẩu
                                    </label>

                                    <div className="relative">
                                        <LockKeyhole
                                            size={19}
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
                                            value={password}
                                            onChange={(
                                                event,
                                            ) =>
                                                setPassword(
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                            placeholder="Nhập mật khẩu"
                                            autoComplete="current-password"
                                            required
                                            disabled={isBusy}
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
                                            className="absolute right-4 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-[#6f7d7a] transition-colors hover:bg-[#efe7d8] hover:text-[#173a3b]"
                                            aria-label={
                                                showPassword
                                                    ? "Ẩn mật khẩu"
                                                    : "Hiện mật khẩu"
                                            }
                                            disabled={isBusy}
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
                                    disabled={isBusy}
                                    className="group flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#173a3b] px-6 font-bold text-white shadow-[0_16px_38px_rgba(23,58,59,0.2)] transition-all hover:-translate-y-0.5 hover:bg-[#21494a] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                                >
                                    {isSubmitting
                                        ? "Đang đăng nhập..."
                                        : "Đăng nhập"}

                                    {!isSubmitting ? (
                                        <ArrowRight
                                            size={19}
                                            className="transition-transform group-hover:translate-x-1"
                                        />
                                    ) : null}
                                </button>
                            </form>

                            <div className="my-7 flex items-center gap-4">
                                <span className="h-px flex-1 bg-[#ddd2c1]" />

                                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#87918e]">
                                    Hoặc tiếp tục với
                                </span>

                                <span className="h-px flex-1 bg-[#ddd2c1]" />
                            </div>

                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                disabled={isBusy}
                                className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-[#d8cdbc] bg-white px-6 font-bold text-[#294748] transition-all hover:-translate-y-0.5 hover:border-[#b9aa96] hover:bg-[#fffdf8] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                            >
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
                                        d="M12 5.94c1.47 0 2.79.51 3.83 1.5l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"
                                    />
                                </svg>

                                {isGoogleSubmitting
                                    ? "Đang kết nối Google..."
                                    : "Tiếp tục với Google"}
                            </button>

                            <div className="my-7 flex items-center gap-4">
                                <span className="h-px flex-1 bg-[#ddd2c1]" />

                                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#87918e]">
                                    Chưa có tài khoản?
                                </span>

                                <span className="h-px flex-1 bg-[#ddd2c1]" />
                            </div>

                            <Link
                                href="/auth/register"
                                className="group flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-[#cfc3b2] bg-[#f5eddf] px-6 font-bold text-[#294748] transition-all hover:border-[#f25f4b] hover:bg-[#fff4ef] hover:text-[#df513f]"
                            >
                                <UserPlus size={19} />
                                Tạo tài khoản mới
                            </Link>

                            <p className="mt-6 text-center text-xs leading-5 text-[#8a9491]">
                                Bằng việc đăng nhập, bạn
                                đồng ý sử dụng dịch vụ theo
                                các điều khoản của Rực Rỡ
                                Miền Trung.
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}