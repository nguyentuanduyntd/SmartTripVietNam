"use client";

import Link from "next/link";
import {
    useTranslations,
} from "next-intl";

import {
    Landmark,
    Mail,
    MapPin,
} from "lucide-react";

import {
    FaFacebookF,
    FaInstagram,
    FaYoutube,
} from "react-icons/fa";

export function HomeFooter() {
    const t =
        useTranslations(
            "Footer",
        );

    const tHeader =
        useTranslations(
            "Header",
        );

    const socialLinks = [
        {
            label: "Instagram",
            href: "#",
            icon: FaInstagram,
        },
        {
            label: "Facebook",
            href: "#",
            icon: FaFacebookF,
        },
        {
            label: "YouTube",
            href: "#",
            icon: FaYoutube,
        },
    ];

    const navigationLinks =
        [
            {
                href: "/#kham-pha",
                label: t(
                    "navigation.explore",
                ),
            },
            {
                href: "/#diem-den",
                label: t(
                    "navigation.destinations",
                ),
            },
            {
                href: "/#am-thuc",
                label: t(
                    "navigation.cuisine",
                ),
            },
            {
                href: "/#hanh-trinh",
                label: t(
                    "navigation.journeys",
                ),
            },
        ];

    return (
        <footer className="bg-[#102f30] px-5 pb-8 pt-16 text-white sm:px-8 lg:px-12 lg:pt-20">
            <div className="mx-auto max-w-[1440px]">
                <div className="grid gap-12 border-b border-white/12 pb-14 md:grid-cols-2 lg:grid-cols-[1.2fr_0.8fr_0.8fr_1fr]">
                    <div>
                        <Link
                            href="/"
                            aria-label={tHeader(
                                "brandHomeAria",
                            )}
                            className="inline-flex items-center gap-3"
                        >
                            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f25f4b]">
                                <Landmark
                                    size={
                                        24
                                    }
                                />
                            </span>

                            <span className="font-display text-3xl font-semibold">
                                {tHeader(
                                    "brand",
                                )}
                            </span>
                        </Link>

                        <p className="mt-5 max-w-sm leading-7 text-white/60">
                            {t(
                                "description",
                            )}
                        </p>

                        <div className="mt-6 flex gap-3">
                            {socialLinks.map(
                                ({
                                    label,
                                    href,
                                    icon: Icon,
                                }) => (
                                    <a
                                        key={
                                            label
                                        }
                                        href={
                                            href
                                        }
                                        aria-label={
                                            label
                                        }
                                        className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-[#f25f4b] hover:bg-[#f25f4b] hover:text-white"
                                    >
                                        <Icon
                                            size={
                                                18
                                            }
                                        />
                                    </a>
                                ),
                            )}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#f4c66f]">
                            {t(
                                "exploreTitle",
                            )}
                        </h3>

                        <div className="mt-5 grid gap-3">
                            {navigationLinks.map(
                                (
                                    item,
                                ) => (
                                    <Link
                                        key={
                                            item.href
                                        }
                                        href={
                                            item.href
                                        }
                                        className="text-white/65 transition-colors hover:text-white"
                                    >
                                        {
                                            item.label
                                        }
                                    </Link>
                                ),
                            )}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#f4c66f]">
                            {t(
                                "supportTitle",
                            )}
                        </h3>

                        <div className="mt-5 grid gap-3 text-white/65">
                            <Link
                                href="/planner"
                                className="hover:text-white"
                            >
                                {t(
                                    "support.planner",
                                )}
                            </Link>

                            <Link
                                href="/stories"
                                className="hover:text-white"
                            >
                                {t(
                                    "support.community",
                                )}
                            </Link>

                            <Link
                                href="/auth/login"
                                className="hover:text-white"
                            >
                                {t(
                                    "support.signIn",
                                )}
                            </Link>

                            <Link
                                href="/admin"
                                className="hover:text-white"
                            >
                                {t(
                                    "support.admin",
                                )}
                            </Link>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#f4c66f]">
                            {t(
                                "contactTitle",
                            )}
                        </h3>

                        <div className="mt-5 grid gap-4 text-sm leading-6 text-white/65">
                            <p className="flex items-start gap-3">
                                <MapPin
                                    className="mt-1 shrink-0"
                                    size={
                                        17
                                    }
                                />

                                {t(
                                    "location",
                                )}
                            </p>

                            <a
                                href="mailto:hello@rucromientrung.vn"
                                className="flex items-center gap-3 hover:text-white"
                            >
                                <Mail
                                    size={
                                        17
                                    }
                                />

                                hello@rucromientrung.vn
                            </a>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 pt-7 text-sm text-white/42 sm:flex-row sm:items-center sm:justify-between">
                    <p>
                        © 2026{" "}
                        {tHeader(
                            "brand",
                        )}
                        . SmartTripVietNam.
                    </p>

                    <p>
                        {t(
                            "builtWithLove",
                        )}
                    </p>
                </div>
            </div>
        </footer>
    );
}