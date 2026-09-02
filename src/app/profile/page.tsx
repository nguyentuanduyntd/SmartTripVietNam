import type { Metadata } from "next";
import {
    Settings2,
    Sparkles,
} from "lucide-react";
import { redirect } from "next/navigation";

import { HomeFooter } from "@/src/components/home/HomeFooter";
import { HomeHeader } from "@/src/components/home/HomeHeader";
import { ProfileSettings } from "@/src/components/profile/ProfileSettings";
import { getCurrentUser } from "@/src/lib/auth/get-current-user";
import { findProfileById } from "@/src/repositories/profile.repository";

export const metadata: Metadata = {
    title: "Tài khoản của tôi",
    description:
        "Cập nhật thông tin cá nhân và ảnh đại diện.",
};

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
    const currentUser =
        await getCurrentUser();

    if (!currentUser) {
        redirect(
            "/auth/login?next=%2Fprofile",
        );
    }

    const profile =
        await findProfileById(
            currentUser.id,
        );

    const email =
        currentUser.email ??
        "Chưa cập nhật email";
    const fallbackName =
        currentUser.email
            ?.split("@")[0]
            ?.trim() ||
        "Thành viên SmartTrip";
    const initialFullName =
        profile?.fullName?.trim() ||
        fallbackName;

    return (
        <>
            <HomeHeader />

            <main className="min-h-screen bg-[#f4efe6] px-4 pb-20 pt-32 text-[#173a3b] sm:px-6 sm:pt-36 lg:px-8 lg:pb-28">
                <div className="mx-auto w-full max-w-6xl">
                    <section className="relative mb-7 overflow-hidden rounded-[32px] border border-white/70 bg-[#173a3b] px-6 py-8 text-white shadow-[0_24px_80px_rgba(23,58,59,0.14)] sm:px-9 sm:py-10 lg:px-12">
                        <div
                            className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-[#f3bd59]/20 blur-3xl"
                            aria-hidden="true"
                        />
                        <div
                            className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-[#51a39c]/20 blur-3xl"
                            aria-hidden="true"
                        />

                        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                            <div className="max-w-3xl">
                                <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.2em] text-[#f5d99c]">
                                    <Sparkles
                                        size={14}
                                    />
                                    Không gian cá nhân
                                </p>
                                <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
                                    Tài khoản của tôi
                                </h1>
                                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68 sm:text-base">
                                    Quản lý tên hiển thị và ảnh đại diện để mọi người nhận ra bạn trong cộng đồng SmartTrip.
                                </p>
                            </div>

                            <span className="hidden h-16 w-16 shrink-0 place-items-center rounded-[22px] border border-white/12 bg-white/10 text-[#f3bd59] sm:grid">
                                <Settings2
                                    size={28}
                                />
                            </span>
                        </div>
                    </section>

                    <ProfileSettings
                        initialFullName={
                            initialFullName
                        }
                        email={email}
                        initialAvatarUrl={
                            profile?.avatarUrl ??
                            null
                        }
                        role={
                            currentUser.role
                        }
                    />
                </div>
            </main>

            <HomeFooter />
        </>
    );
}
