"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import {
    ChevronDown,
    LayoutDashboard,
    Landmark,
    LogOut,
    Menu,
    Route,
    UserRound,
    X,
} from "lucide-react";
import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import { NAV_ITEMS } from "@/src/constants/home-data";
import { createClient } from "@/src/lib/supabase/client";

interface UserProfile {
    full_name: string | null;
    avatar_url: string | null;
    role: "user" | "admin" | null;
}

interface UserAvatarProps {
    avatarUrl: string | null;
    displayName: string;
    initials: string;
    className?: string;
}

function UserAvatar({
    avatarUrl,
    displayName,
    initials,
    className = "h-10 w-10",
}: UserAvatarProps) {
    if (avatarUrl) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={avatarUrl}
                alt={`Ảnh đại diện của ${displayName}`}
                referrerPolicy="no-referrer"
                className={`${className} shrink-0 rounded-full object-cover ring-2 ring-white`}
            />
        );
    }

    return (
        <span
            className={`${className} grid shrink-0 place-items-center rounded-full bg-[#f25f4b] font-bold uppercase text-white ring-2 ring-white`}
            aria-hidden="true"
        >
            {initials}
        </span>
    );
}

function getMetadataString(value: unknown): string | null {
    if (
        typeof value !== "string" ||
        !value.trim()
    ) {
        return null;
    }

    return value.trim();
}

function getInitials(name: string): string {
    const words = name
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (words.length === 0) {
        return "U";
    }

    if (words.length === 1) {
        return words[0]
            .slice(0, 2)
            .toUpperCase();
    }

    return `${words[0][0]}${
        words[words.length - 1][0]
    }`.toUpperCase();
}

export function HomeHeader() {
    const router = useRouter();

    const supabase = useMemo(
        () => createClient(),
        [],
    );

    const userMenuRef =
        useRef<HTMLDivElement>(null);

    const [isOpen, setIsOpen] =
        useState(false);

    const [
        isUserMenuOpen,
        setIsUserMenuOpen,
    ] = useState(false);

    const [user, setUser] =
        useState<User | null>(null);

    const [profile, setProfile] =
        useState<UserProfile | null>(null);

    const [
        isAuthLoading,
        setIsAuthLoading,
    ] = useState(true);

    const [
        isSigningOut,
        setIsSigningOut,
    ] = useState(false);

    /*
     * Kiểm tra người dùng hiện tại khi Header được mount
     * và theo dõi các thay đổi đăng nhập/đăng xuất.
     */
    useEffect(() => {
        let isMounted = true;

        async function loadCurrentSession() {
            try {
                const {
                    data: { session },
                    error,
                } = await supabase.auth.getSession();

                if (!isMounted) {
                    return;
                }

                if (error) {
                    console.error(
                        "Không thể lấy thông tin người dùng:",
                        error,
                    );

                    setUser(null);
                    return;
                }

                setUser(session?.user ?? null);
            } catch (error) {
                console.error(
                    "Lỗi kiểm tra phiên đăng nhập:",
                    error,
                );

                if (isMounted) {
                    setUser(null);
                }
            } finally {
                if (isMounted) {
                    setIsAuthLoading(false);
                }
            }
        }

        void loadCurrentSession();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                if (!isMounted) {
                    return;
                }

                const nextUser =
                    session?.user ?? null;

                setUser(nextUser);
                setIsAuthLoading(false);

                if (!nextUser) {
                    setProfile(null);
                    setIsUserMenuOpen(false);
                }
            },
        );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [supabase]);

    /*
     * Sau khi có auth user, lấy thông tin mở rộng
     * từ bảng profiles.
     */
    useEffect(() => {
        let isMounted = true;

        if (!user) {
            setProfile(null);

            return () => {
                isMounted = false;
            };
        }

        async function loadProfile() {
            const {
                data,
                error,
            } = await supabase
                .from("profiles")
                .select(
                    "full_name, avatar_url, role",
                )
                .eq("id", user!.id)
                .maybeSingle();

            if (!isMounted) {
                return;
            }

            if (error) {
                /*
                 * Header vẫn hiển thị email từ Supabase Auth
                 * nếu chưa đọc được bảng profiles.
                 */
                console.error(
                    "Không thể tải profile người dùng:",
                    error,
                );

                setProfile(null);
                return;
            }

            setProfile(
                data as UserProfile | null,
            );
        }

        void loadProfile();

        return () => {
            isMounted = false;
        };
    }, [supabase, user]);

    /*
     * Đóng dropdown khi bấm ra ngoài hoặc nhấn Escape.
     */
    useEffect(() => {
        if (!isUserMenuOpen) {
            return;
        }

        function handlePointerDown(
            event: PointerEvent,
        ) {
            const target =
                event.target as Node;

            if (
                userMenuRef.current &&
                !userMenuRef.current.contains(
                    target,
                )
            ) {
                setIsUserMenuOpen(false);
            }
        }

        function handleKeyDown(
            event: KeyboardEvent,
        ) {
            if (event.key === "Escape") {
                setIsUserMenuOpen(false);
            }
        }

        document.addEventListener(
            "pointerdown",
            handlePointerDown,
        );

        document.addEventListener(
            "keydown",
            handleKeyDown,
        );

        return () => {
            document.removeEventListener(
                "pointerdown",
                handlePointerDown,
            );

            document.removeEventListener(
                "keydown",
                handleKeyDown,
            );
        };
    }, [isUserMenuOpen]);

    const metadataFullName =
        getMetadataString(
            user?.user_metadata?.full_name,
        ) ??
        getMetadataString(
            user?.user_metadata?.name,
        );

    const metadataAvatarUrl =
        getMetadataString(
            user?.user_metadata?.avatar_url,
        ) ??
        getMetadataString(
            user?.user_metadata?.picture,
        );

    const email =
        user?.email ?? "Chưa có email";

    const displayName =
        profile?.full_name?.trim() ||
        metadataFullName ||
        user?.email?.split("@")[0] ||
        "Thành viên";

    const avatarUrl =
        profile?.avatar_url ||
        metadataAvatarUrl ||
        null;

    const initials =
        getInitials(displayName);

    const roleLabel =
        profile?.role === "admin"
            ? "Quản trị viên"
            : "Thành viên";

    const closeMenu = () => {
        setIsOpen(false);
        setIsUserMenuOpen(false);
    };

    async function handleSignOut() {
        if (isSigningOut) {
            return;
        }

        setIsSigningOut(true);

        try {
            const { error } =
                await supabase.auth.signOut({
                    scope: "local",
                });

            if (error) {
                console.error(
                    "Không thể đăng xuất:",
                    error,
                );

                return;
            }

            setUser(null);
            setProfile(null);
            setIsOpen(false);
            setIsUserMenuOpen(false);

            router.replace("/");
            router.refresh();
        } catch (error) {
            console.error(
                "Lỗi đăng xuất:",
                error,
            );
        } finally {
            setIsSigningOut(false);
        }
    }

    return (
        <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8 lg:pt-6">
            <div className="mx-auto flex max-w-[1440px] items-center justify-between rounded-[24px] border border-white/60 bg-[#fffaf0]/88 px-4 py-3 shadow-[0_20px_70px_rgba(35,45,43,0.10)] backdrop-blur-xl sm:px-6 lg:px-8">
                {/* Logo */}
                <Link
                    href="/"
                    className="group flex items-center gap-3 text-[#173a3b]"
                    aria-label="Rực Rỡ Miền Trung - Trang chủ"
                    onClick={closeMenu}
                >
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f25f4b] text-white shadow-[0_10px_30px_rgba(242,95,75,0.24)] transition-transform group-hover:-rotate-3 group-hover:scale-105">
                        <Landmark
                            size={23}
                            strokeWidth={1.8}
                        />
                    </span>

                    <span className="font-display text-[22px] font-semibold tracking-[-0.02em] sm:text-[26px]">
                        Rực Rỡ Miền Trung
                    </span>
                </Link>

                {/* Desktop navigation */}
                <nav
                    className="hidden items-center gap-7 lg:flex"
                    aria-label="Điều hướng chính"
                >
                    {NAV_ITEMS.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="relative py-2 text-[15px] font-medium text-[#294748] transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-[#f25f4b] after:transition-transform hover:text-[#f25f4b] hover:after:scale-x-100"
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>

                {/* Desktop actions */}
                <div className="hidden items-center gap-3 lg:flex">
                    {isAuthLoading ? (
                        <div className="h-11 w-36 animate-pulse rounded-full bg-[#e8dfd1]" />
                    ) : user ? (
                        <div
                            ref={userMenuRef}
                            className="relative"
                        >
                            <button
                                type="button"
                                onClick={() => {
                                    setIsUserMenuOpen(
                                        (
                                            currentValue,
                                        ) =>
                                            !currentValue,
                                    );
                                }}
                                className="flex h-12 max-w-56 items-center gap-3 rounded-full border border-[#d8cdbc] bg-white/65 py-1.5 pl-1.5 pr-3 text-left transition-all hover:border-[#bcae9a] hover:bg-white"
                                aria-expanded={
                                    isUserMenuOpen
                                }
                                aria-controls="home-user-menu"
                            >
                                <UserAvatar
                                    avatarUrl={
                                        avatarUrl
                                    }
                                    displayName={
                                        displayName
                                    }
                                    initials={
                                        initials
                                    }
                                    className="h-9 w-9 text-xs"
                                />

                                <span className="min-w-0">
                                    <span className="block truncate text-[11px] font-medium text-[#77827f]">
                                        Xin chào
                                    </span>

                                    <span className="block truncate text-sm font-bold text-[#294748]">
                                        {displayName}
                                    </span>
                                </span>

                                <ChevronDown
                                    size={17}
                                    className={`ml-auto shrink-0 text-[#77827f] transition-transform ${
                                        isUserMenuOpen
                                            ? "rotate-180"
                                            : ""
                                    }`}
                                />
                            </button>

                            {isUserMenuOpen ? (
                                <div
                                    id="home-user-menu"
                                    className="absolute right-0 top-[calc(100%+10px)] w-80 overflow-hidden rounded-[24px] border border-[#ddd2c2] bg-[#fffaf3] p-3 shadow-[0_24px_70px_rgba(30,52,49,0.18)]"
                                >
                                    <div className="flex items-center gap-3 rounded-[18px] bg-[#f1e9dc] p-4">
                                        <UserAvatar
                                            avatarUrl={
                                                avatarUrl
                                            }
                                            displayName={
                                                displayName
                                            }
                                            initials={
                                                initials
                                            }
                                            className="h-12 w-12 text-sm"
                                        />

                                        <div className="min-w-0">
                                            <p className="truncate font-bold text-[#173a3b]">
                                                {
                                                    displayName
                                                }
                                            </p>

                                            <p className="mt-0.5 truncate text-xs text-[#6d7a77]">
                                                {email}
                                            </p>

                                            <span className="mt-2 inline-flex rounded-full bg-[#dcebe7] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#2f7773]">
                                                {
                                                    roleLabel
                                                }
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-2 grid gap-1">
                                        {profile?.role ===
                                        "admin" ? (
                                            <Link
                                                href="/admin"
                                                onClick={
                                                    closeMenu
                                                }
                                                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-[#294748] transition-colors hover:bg-[#efe6d8]"
                                            >
                                                <LayoutDashboard
                                                    size={
                                                        18
                                                    }
                                                />

                                                Trang quản trị
                                            </Link>
                                        ) : (
                                            <div className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-[#294748]">
                                                <UserRound
                                                    size={
                                                        18
                                                    }
                                                />

                                                Tài khoản của tôi
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => {
                                                void handleSignOut();
                                            }}
                                            disabled={
                                                isSigningOut
                                            }
                                            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-[#c94f3e] transition-colors hover:bg-[#fff0eb] disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <LogOut
                                                size={
                                                    18
                                                }
                                            />

                                            {isSigningOut
                                                ? "Đang đăng xuất..."
                                                : "Đăng xuất"}
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <Link
                            href="/auth/login"
                            className="rounded-full px-4 py-2.5 text-sm font-semibold text-[#294748] transition-colors hover:bg-[#efe7d8]"
                        >
                            Đăng nhập
                        </Link>
                    )}

                    <Link
                        href="/planner"
                        className="inline-flex items-center gap-2 rounded-full bg-[#173a3b] px-5 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#20494a]"
                    >
                        <Route size={17} />
                        Lập hành trình
                    </Link>
                </div>

                {/* Mobile menu button */}
                <button
                    type="button"
                    className="grid h-11 w-11 place-items-center rounded-full border border-[#d9d0c1] text-[#173a3b] transition-colors hover:bg-[#efe7d8] lg:hidden"
                    onClick={() => {
                        setIsOpen(
                            (currentValue) =>
                                !currentValue,
                        );
                    }}
                    aria-expanded={isOpen}
                    aria-controls="home-mobile-menu"
                    aria-label={
                        isOpen
                            ? "Đóng menu"
                            : "Mở menu"
                    }
                >
                    {isOpen ? (
                        <X size={22} />
                    ) : (
                        <Menu size={22} />
                    )}
                </button>
            </div>

            {/* Mobile navigation */}
            {isOpen ? (
                <div
                    id="home-mobile-menu"
                    className="mx-auto mt-2 max-w-[1440px] rounded-[24px] border border-white/70 bg-[#fffaf3]/96 p-4 shadow-2xl backdrop-blur-xl lg:hidden"
                >
                    <nav
                        className="grid gap-1"
                        aria-label="Điều hướng trên điện thoại"
                    >
                        {NAV_ITEMS.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={closeMenu}
                                className="rounded-2xl px-4 py-3 font-medium text-[#294748] transition-colors hover:bg-[#efe7d8]"
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="mt-3 border-t border-[#ded5c6] pt-4">
                        {isAuthLoading ? (
                            <div className="h-20 animate-pulse rounded-2xl bg-[#e8dfd1]" />
                        ) : user ? (
                            <div className="rounded-[22px] border border-[#ddd2c2] bg-white/65 p-3">
                                <div className="flex items-center gap-3 rounded-2xl bg-[#f1e9dc] p-3">
                                    <UserAvatar
                                        avatarUrl={
                                            avatarUrl
                                        }
                                        displayName={
                                            displayName
                                        }
                                        initials={
                                            initials
                                        }
                                        className="h-12 w-12 text-sm"
                                    />

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-bold text-[#173a3b]">
                                            {
                                                displayName
                                            }
                                        </p>

                                        <p className="truncate text-xs text-[#6d7a77]">
                                            {email}
                                        </p>

                                        <span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-[0.08em] text-[#2f7773]">
                                            {
                                                roleLabel
                                            }
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-2 grid gap-2">
                                    {profile?.role ===
                                    "admin" ? (
                                        <Link
                                            href="/admin"
                                            onClick={
                                                closeMenu
                                            }
                                            className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#cfc5b5] px-4 text-sm font-semibold text-[#294748]"
                                        >
                                            <LayoutDashboard
                                                size={
                                                    17
                                                }
                                            />

                                            Trang quản trị
                                        </Link>
                                    ) : null}

                                    <button
                                        type="button"
                                        onClick={() => {
                                            void handleSignOut();
                                        }}
                                        disabled={
                                            isSigningOut
                                        }
                                        className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#fff0eb] px-4 text-sm font-semibold text-[#c94f3e] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <LogOut
                                            size={17}
                                        />

                                        {isSigningOut
                                            ? "Đang đăng xuất..."
                                            : "Đăng xuất"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <Link
                                href="/auth/login"
                                onClick={closeMenu}
                                className="flex min-h-12 items-center justify-center rounded-full border border-[#cfc5b5] px-4 py-3 text-center text-sm font-semibold text-[#294748] transition-colors hover:bg-[#efe7d8]"
                            >
                                Đăng nhập
                            </Link>
                        )}

                        <Link
                            href="/planner"
                            onClick={closeMenu}
                            className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#173a3b] px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#20494a]"
                        >
                            <Route size={17} />
                            Lập hành trình
                        </Link>
                    </div>
                </div>
            ) : null}
        </header>
    );
}