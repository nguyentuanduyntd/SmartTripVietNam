import type { Metadata } from "next";
import Link from "next/link";
import {
    ArrowLeft,
    Camera,
    Route,
} from "lucide-react";
import { redirect } from "next/navigation";

import { CommunityCreateForm } from "@/src/components/community/CommunityCreateForm";
import { HomeHeader } from "@/src/components/home/HomeHeader";
import { getCurrentUser } from "@/src/lib/auth/get-current-user";
import { findCommunityLocationList } from "@/src/repositories/community-form.repository";
import { findUserItineraryList } from "@/src/repositories/itinerary-list.repository";

export const metadata: Metadata = {
    title: "Chia sẻ trải nghiệm",
    description:
        "Đăng một trải nghiệm du lịch mới lên cộng đồng SmartTripVietNam.",
};

export const dynamic = "force-dynamic";

type CommunityNewPageProps = {
    searchParams: Promise<{
        itineraryId?: string | string[];
    }>;
};

export default async function CommunityNewPage({
    searchParams,
}: CommunityNewPageProps) {
    const user =
        await getCurrentUser();

    if (!user) {
        redirect(
            "/auth/login?next=%2Fcommunity%2Fnew",
        );
    }

    const [
        itineraries,
        locations,
        resolvedSearchParams,
    ] = await Promise.all([
        findUserItineraryList(user.id),
        findCommunityLocationList(),
        searchParams,
    ]);

    const rawItineraryId =
        resolvedSearchParams.itineraryId;

    const initialItineraryId =
        Array.isArray(
            rawItineraryId,
        )
            ? rawItineraryId[0] ??
              ""
            : rawItineraryId ??
              "";

    const validInitialItineraryId =
        itineraries.some(
            (itinerary) =>
                itinerary.id ===
                initialItineraryId,
        )
            ? initialItineraryId
            : "";

    return (
        <>
            <HomeHeader />

            <main className="min-h-screen bg-[#f4efe6] px-4 pb-20 pt-28 text-[#173a3b] sm:px-6 sm:pt-32 lg:px-8 lg:pt-36">
                <div className="mx-auto w-full max-w-6xl">
                    <Link
                        href="/community"
                        className="inline-flex items-center gap-2 text-sm font-bold text-[#60716d] transition hover:text-[#173a3b]"
                    >
                        <ArrowLeft
                            size={17}
                        />
                        Quay lại cộng đồng
                    </Link>

                    <section className="relative mt-6 overflow-hidden rounded-[34px] border border-white/80 bg-[#fffaf1] px-6 py-8 shadow-[0_24px_80px_rgba(23,58,59,0.10)] sm:px-9 lg:px-11 lg:py-10">
                        <div
                            className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#dcebe7] blur-3xl"
                            aria-hidden="true"
                        />

                        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                            <div className="max-w-3xl">
                                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#d85b48]">
                                    Community Story
                                </p>

                                <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
                                    Kể lại chuyến đi của bạn
                                </h1>

                                <p className="mt-4 max-w-2xl text-sm leading-7 text-[#667572]">
                                    Chọn một Planner để hệ thống tự lấy hành
                                    trình, hoặc tự viết một trải nghiệm độc lập.
                                    Bạn có thể đăng tối đa 10 ảnh.
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#edf7f4] text-[#34706b]">
                                    <Route size={20} />
                                </span>

                                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#fff0ed] text-[#d85b48]">
                                    <Camera size={20} />
                                </span>
                            </div>
                        </div>
                    </section>

                    <CommunityCreateForm
                        itineraries={itineraries}
                        locations={locations}
                        initialItineraryId={
                            validInitialItineraryId
                        }
                    />
                </div>
            </main>
        </>
    );
}