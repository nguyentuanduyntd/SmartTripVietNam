import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Landmark, type LucideIcon } from "lucide-react";

import { CloudinaryVisual } from "@/src/components/home/CloudinaryVisual";

export function AuthBrand({
  light = false,
  className = "",
}: {
  light?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/"
      aria-label="Quay về trang chủ"
      className={`inline-flex w-fit items-center gap-3 ${
        light ? "text-white" : "text-[#173a3b]"
      } ${className}`}
    >
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f25f4b] text-white shadow-[0_14px_35px_rgba(242,95,75,0.28)]">
        <Landmark size={22} strokeWidth={1.8} />
      </span>
      <span className="font-display text-2xl font-semibold">
        Rực Rỡ Miền Trung
      </span>
    </Link>
  );
}

export function AuthBackHomeLink({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 text-sm font-semibold text-[#58706d] transition-colors hover:text-[#f25f4b] ${className}`}
    >
      <ArrowLeft size={17} />
      Về trang chủ
    </Link>
  );
}

export function AuthCard({
  children,
  centered = false,
  compact = false,
  className = "",
}: {
  children: ReactNode;
  centered?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[34px] border border-white/80 bg-[#fffaf1]/95 shadow-[0_28px_90px_rgba(30,56,52,0.13)] backdrop-blur ${
        compact ? "p-6 sm:p-9" : "p-7 sm:p-10"
      } ${
        centered ? "text-center" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function AuthHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#e55c49]">
        {eyebrow}
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.035em] text-[#173a3b] sm:text-5xl">
        {title}
      </h1>
      <p className="mt-4 leading-7 text-[#687572]">{description}</p>
    </div>
  );
}

export function AuthCenteredShell({
  children,
  showBrand = false,
  maxWidthClassName = "max-w-[520px]",
}: {
  children: ReactNode;
  showBrand?: boolean;
  maxWidthClassName?: string;
}) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#f7efe1] px-5 py-10 text-[#173a3b]">
      <AuthBackground />
      <div className={`relative w-full ${maxWidthClassName}`}>
        {showBrand ? <AuthBrand className="mb-8" /> : null}
        {children}
      </div>
    </main>
  );
}

type AuthFeature = {
  icon: LucideIcon;
  label: ReactNode;
};

export function AuthVisualPanel({
  source,
  alt,
  badgeIcon: BadgeIcon,
  badge,
  title,
  accentTitle,
  description,
  features,
}: {
  source: string;
  alt: string;
  badgeIcon: LucideIcon;
  badge: ReactNode;
  title: ReactNode;
  accentTitle: ReactNode;
  description: ReactNode;
  features: AuthFeature[];
}) {
  return (
    <section className="relative hidden min-h-dvh overflow-hidden lg:block">
      <CloudinaryVisual
        source={source}
        alt={alt}
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
          <AuthBrand light />

          <div className="max-w-2xl pb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#f7d38f] backdrop-blur">
              <BadgeIcon size={15} />
              {badge}
            </div>

            <h1 className="mt-6 font-display text-6xl font-semibold leading-[0.96] tracking-[-0.045em] text-white xl:text-7xl">
              {title}
              <span className="block italic text-[#f6d796]">{accentTitle}</span>
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
  );
}

export function AuthSplitShell({
  visual,
  children,
  maxWidthClassName = "max-w-[520px]",
}: {
  visual: ReactNode;
  children: ReactNode;
  maxWidthClassName?: string;
}) {
  return (
    <main className="min-h-dvh bg-[#f7efe1] text-[#173a3b]">
      <div className="grid min-h-dvh lg:grid-cols-[1.08fr_0.92fr]">
        {visual}

        <section className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-10 sm:px-8 lg:px-12">
          <AuthBackground />
          <div className={`relative w-full ${maxWidthClassName}`}>
            <div className="mb-8 lg:hidden">
              <AuthBrand />
            </div>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

function AuthBackground() {
  return (
    <>
      <div className="absolute inset-0 opacity-[0.045] [background-image:radial-gradient(#173a3b_0.7px,transparent_0.7px)] [background-size:8px_8px]" />
      <div className="absolute -right-28 top-10 h-96 w-96 rounded-full bg-[#efbf61]/25 blur-3xl" />
      <div className="absolute -bottom-28 -left-20 h-96 w-96 rounded-full bg-[#59a39e]/18 blur-3xl" />
    </>
  );
}