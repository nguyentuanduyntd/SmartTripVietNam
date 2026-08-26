import Link from "next/link";

import {
    ArrowLeft,
    Landmark,
    Sparkles,
    type LucideIcon,
} from "lucide-react";

import type {
    ReactNode,
} from "react";

import {
    CloudinaryVisual,
} from "@/src/components/home/CloudinaryVisual";

function joinClasses(
    ...classes: Array<string | false | null | undefined>
) {
    return classes.filter(Boolean).join(" ");
}

export function AuthBrand({
    variant = "default",
    className,
}: {
    variant?: "default" | "large-inverse";
    className?: string;
}) {
    const isLargeInverse = variant === "large-inverse";

    return (
        <Link
            href="/"
            className={joinClasses(
                "inline-flex w-fit items-center gap-3",
                isLargeInverse ? "text-white" : "text-[#173a3b]",
                className,
            )}
            aria-label="Quay về trang chủ"
        >
            <span
                className={joinClasses(
                    "grid place-items-center rounded-2xl bg-[#f25f4b] text-white",
                    isLargeInverse
                        ? "h-12 w-12 shadow-[0_14px_35px_rgba(242,95,75,0.28)]"
                        : "h-11 w-11",
                )}
            >
                <Landmark
                    size={isLargeInverse ? 24 : 22}
                    strokeWidth={isLargeInverse ? 1.8 : 2}
                />
            </span>

            <span
                className={joinClasses(
                    "font-display font-semibold",
                    isLargeInverse ? "text-3xl" : "text-2xl",
                )}
            >
                Rực Rỡ Miền Trung
            </span>
        </Link>
    );
}

export type AuthFeature = {
    icon: LucideIcon;
    label: ReactNode;
};

export function AuthSplitLayout({
    visualSource,
    visualAlt,
    eyebrow,
    title,
    description,
    features,
    children,
    formWidthClassName = "max-w-[520px]",
    mobileBrandClassName = "mb-8 flex items-center justify-between lg:hidden",
    backLinkClassName = "mb-7",
}: {
    visualSource: string;
    visualAlt: string;
    eyebrow: ReactNode;
    title: ReactNode;
    description: ReactNode;
    features: AuthFeature[];
    children: ReactNode;
    formWidthClassName?: string;
    mobileBrandClassName?: string;
    backLinkClassName?: string;
}) {
    return (
        <main className="min-h-dvh bg-[#f7efe1] text-[#173a3b]">
            <div className="grid min-h-dvh lg:grid-cols-[1.08fr_0.92fr]">
                <section className="relative hidden min-h-dvh overflow-hidden lg:block">
                    <CloudinaryVisual
                        source={visualSource}
                        alt={visualAlt}
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
                            <AuthBrand variant="large-inverse" />

                            <div className="max-w-2xl pb-8">
                                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#f7d38f] backdrop-blur">
                                    <Sparkles size={15} />
                                    {eyebrow}
                                </div>

                                <h1 className="mt-6 font-display text-6xl font-semibold leading-[0.96] tracking-[-0.045em] text-white xl:text-7xl">
                                    {title}
                                </h1>

                                <p className="mt-6 max-w-xl text-lg leading-8 text-white/72">
                                    {description}
                                </p>

                                <div className="mt-9 grid max-w-xl grid-cols-3 gap-3">
                                    {features.map(({ icon: Icon, label }, index) => (
                                        <div
                                            key={index}
                                            className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur"
                                        >
                                            <Icon size={21} className="text-[#f6ca73]" />
                                            <p className="mt-3 text-sm font-semibold text-white">
                                                {label}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </CloudinaryVisual>
                </section>

                <section className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-10 sm:px-8 lg:px-12">
                    <AuthBackground variant="split" />

                    <div className={joinClasses("relative w-full", formWidthClassName)}>
                        <div className={mobileBrandClassName}>
                            <AuthBrand />
                        </div>

                        <Link
                            href="/"
                            className={joinClasses(
                                "inline-flex items-center gap-2 text-sm font-semibold text-[#58706d] transition-colors hover:text-[#f25f4b]",
                                backLinkClassName,
                            )}
                        >
                            <ArrowLeft size={17} />
                            Về trang chủ
                        </Link>

                        {children}
                    </div>
                </section>
            </div>
        </main>
    );
}

type AuthBackgroundVariant =
    | "split"
    | "centered"
    | "update"
    | "register-result"
    | "pattern-only";

function AuthBackground({
    variant,
}: {
    variant: AuthBackgroundVariant;
}) {
    return (
        <>
            <div className="absolute inset-0 opacity-[0.045] [background-image:radial-gradient(#173a3b_0.7px,transparent_0.7px)] [background-size:8px_8px]" />

            {variant === "split" ? (
                <>
                    <div className="absolute -right-28 top-12 h-80 w-80 rounded-full bg-[#efbf61]/24 blur-3xl" />
                    <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-[#59a39e]/18 blur-3xl" />
                </>
            ) : null}

            {variant === "centered" ? (
                <>
                    <div className="absolute -right-28 top-10 h-96 w-96 rounded-full bg-[#efbf61]/25 blur-3xl" />
                    <div className="absolute -bottom-28 -left-20 h-96 w-96 rounded-full bg-[#59a39e]/18 blur-3xl" />
                </>
            ) : null}

            {variant === "update" ? (
                <>
                    <div className="absolute -right-20 top-10 h-96 w-96 rounded-full bg-[#efbf61]/25 blur-3xl" />
                    <div className="absolute -bottom-24 -left-20 h-96 w-96 rounded-full bg-[#59a39e]/18 blur-3xl" />
                </>
            ) : null}

            {variant === "register-result" ? (
                <>
                    <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-[#efbf61]/20 blur-3xl" />
                    <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-[#59a39e]/18 blur-3xl" />
                </>
            ) : null}
        </>
    );
}

export function AuthCenteredLayout({
    children,
    showBrand = false,
    backgroundVariant = "centered",
    maxWidthClassName = "max-w-[520px]",
}: {
    children: ReactNode;
    showBrand?: boolean;
    backgroundVariant?: Exclude<AuthBackgroundVariant, "split"> | null;
    maxWidthClassName?: string;
}) {
    return (
        <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#f7efe1] px-5 py-10 text-[#173a3b]">
            {backgroundVariant ? (
                <AuthBackground variant={backgroundVariant} />
            ) : null}

            <div className={joinClasses("relative w-full", maxWidthClassName)}>
                {showBrand ? <AuthBrand className="mb-8" /> : null}
                {children}
            </div>
        </main>
    );
}

export function AuthCard({
    children,
    variant = "form",
}: {
    children: ReactNode;
    variant?:
        | "split"
        | "form"
        | "form-plain"
        | "result"
        | "result-spacious";
}) {
    const variants = {
        split: "rounded-[32px] p-6 sm:p-9",
        form: "rounded-[34px] p-7 backdrop-blur sm:p-10",
        "form-plain": "rounded-[34px] p-7 sm:p-10",
        result: "rounded-[34px] p-7 text-center backdrop-blur sm:p-10",
        "result-spacious": "rounded-[34px] p-8 text-center sm:p-10",
    } as const;

    return (
        <div
            className={joinClasses(
                "border border-white/80 bg-[#fffaf1]/95 shadow-[0_28px_90px_rgba(30,56,52,0.13)]",
                variants[variant],
            )}
        >
            {children}
        </div>
    );
}

export function AuthHeader({
    eyebrow,
    title,
    description,
    as = "h1",
    titleTracking = true,
}: {
    eyebrow: ReactNode;
    title: ReactNode;
    description: ReactNode;
    as?: "h1" | "h2";
    titleTracking?: boolean;
}) {
    const Heading = as;

    return (
        <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#e55c49]">
                {eyebrow}
            </p>
            <Heading
                className={joinClasses(
                    "mt-3 font-display text-4xl font-semibold text-[#173a3b] sm:text-5xl",
                    titleTracking && "tracking-[-0.035em]",
                )}
            >
                {title}
            </Heading>
            <p className="mt-4 leading-7 text-[#687572]">{description}</p>
        </div>
    );
}