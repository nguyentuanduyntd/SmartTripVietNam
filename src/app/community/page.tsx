import type { Metadata } from "next";
import Link from "next/link";
import {
    Camera,
    MessageCircleMore,
    Plus,
    Sparkles,
    UsersRound,
} from "lucide-react";

import { CommunityFeed } from "@/src/components/community/CommunityFeed";
import { HomeHeader } from "@/src/components/home/HomeHeader";
import { getCurrentUser } from "@/src/lib/auth/get-current-user";
import { findCommunityLocationList } from "@/src/repositories/community-form.repository";

export const metadata: Metadata = {
    title: "Cộng đồng du lịch",
    description:
        "Chia sẻ trải nghiệm, hình ảnh và hành trình du lịch cùng cộng đồng SmartTripVietNam.",
};

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
    const [currentUser, locations] =
        await Promise.all([
            getCurrentUser(),
            findCommunityLocationList(),
        ]);

    return (
        <>
            <HomeHeader />

            <main className="min-h-screen bg-[#f4efe6] px-4 pb-20 pt-28 text-[#173a3b] sm:px-6 sm:pt-32 lg:px-8 lg:pt-36">
                <div className="mx-auto w-full max-w-7xl">
                    <section className="relative overflow-hidden rounded-[34px] border border-white/80 bg-[#fffaf1] px-6 py-9 shadow-[0_24px_80px_rgba(23,58,59,0.10)] sm:px-9 lg:px-12 lg:py-12">
                        <div
                            className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#dcebe7] blur-3xl"
                            aria-hidden="true"
                        />
                        <div
                            className="pointer-events-none absolute -bottom-28 left-[28%] h-64 w-64 rounded-full bg-[#f7d7cd] blur-3xl"
                            aria-hidden="true"
                        />

                        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
                            <div className="max-w-3xl">
                                <div className="inline-flex items-center gap-2 rounded-full bg-[#fff0ed] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.17em] text-[#d85b48]">
                                    <UsersRound size={15} />
                                    Cộng đồng SmartTrip
                                </div>

                                <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-5xl lg:text-6xl">
                                    Đi rồi kể, đọc rồi muốn đi
                                </h1>

                                <p className="mt-5 max-w-2xl text-sm leading-7 text-[#667572] sm:text-base">
                                    Chia sẻ chuyến đi thật của bạn, lưu lại những
                                    hành trình hay và trao đổi kinh nghiệm với
                                    những người yêu miền Trung.
                                </p>

                                <div className="mt-6 flex flex-wrap gap-3 text-xs font-bold text-[#5f716d]">
                                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
                                        <Camera
                                            size={15}
                                            className="text-[#d85b48]"
                                        />
                                        Tối đa 10 ảnh
                                    </span>
                                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
                                        <MessageCircleMore
                                            size={15}
                                            className="text-[#34706b]"
                                        />
                                        Bình luận & trả lời
                                    </span>
                                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
                                        <Sparkles
                                            size={15}
                                            className="text-[#c48b28]"
                                        />
                                        Chia sẻ từ Planner
                                    </span>
                                </div>
                            </div>

                            <Link
                                href="/community/new"
                                className="inline-flex min-h-13 shrink-0 items-center justify-center gap-2 self-start rounded-full bg-[#173a3b] px-6 py-3 text-sm font-extrabold text-white shadow-[0_14px_34px_rgba(23,58,59,0.18)] transition hover:-translate-y-0.5 hover:bg-[#214b4c] lg:self-auto"
                            >
                                <Plus size={18} />
                                Chia sẻ trải nghiệm
                            </Link>
                        </div>
                    </section>

                    <CommunityFeed
                        locations={locations}
                        isAuthenticated={Boolean(
                            currentUser,
                        )}
                    />
                </div>
            </main>
        </>
    );
}