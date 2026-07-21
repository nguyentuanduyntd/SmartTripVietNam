"use client";
import Link from "next/link";
import {Landmark,Menu,Route,X,} from "lucide-react";
import { useState } from "react";
import {NAV_ITEMS,} from "@/src/constants/home-data";

export function HomeHeader() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8 lg:pt-6">
            <div className="mx-auto flex max-w-[1440px] items-center justify-between rounded-[24px] border border-white/60 bg-[#fffaf0]/88 px-4 py-3 shadow-[0_20px_70px_rgba(35,45,43,0.10)] backdrop-blur-xl sm:px-6 lg:px-8">
                <Link
                    href="/"
                    className="group flex items-center gap-3 text-[#173a3b]"
                    aria-label="Rực Rỡ Miền Trung - Trang chủ"
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

                <div className="hidden items-center gap-3 lg:flex">
                    <Link
                        href="/login"
                        className="rounded-full px-4 py-2.5 text-sm font-semibold text-[#294748] transition-colors hover:bg-[#efe7d8]"
                    >
                        Đăng nhập
                    </Link>

                    <Link
                        href="/planner"
                        className="inline-flex items-center gap-2 rounded-full bg-[#173a3b] px-5 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
                    >
                        <Route size={17} />
                        Lập hành trình
                    </Link>
                </div>

                <button
                    type="button"
                    className="grid h-11 w-11 place-items-center rounded-full border border-[#d9d0c1] text-[#173a3b] lg:hidden"
                    onClick={() =>
                        setIsOpen((value) => !value)
                    }
                    aria-expanded={isOpen}
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

            {isOpen ? (
                <div className="mx-auto mt-2 max-w-[1440px] rounded-[24px] border border-white/70 bg-[#fffaf3]/96 p-4 shadow-2xl backdrop-blur-xl lg:hidden">
                    <nav
                        className="grid gap-1"
                        aria-label="Điều hướng trên điện thoại"
                    >
                        {NAV_ITEMS.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() =>
                                    setIsOpen(false)
                                }
                                className="rounded-2xl px-4 py-3 font-medium text-[#294748] hover:bg-[#efe7d8]"
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[#ded5c6] pt-4">
                        <Link
                            href="/login"
                            className="rounded-full border border-[#cfc5b5] px-4 py-3 text-center text-sm font-semibold text-[#294748]"
                        >
                            Đăng nhập
                        </Link>

                        <Link
                            href="/planner"
                            className="rounded-full bg-[#173a3b] px-4 py-3 text-center text-sm font-semibold text-white"
                        >
                            Lập hành trình
                        </Link>
                    </div>
                </div>
            ) : null}
        </header>
    );
}