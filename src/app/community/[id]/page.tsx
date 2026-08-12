import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { CommunityPostDetail } from "@/src/components/community/CommunityPostDetail";
import { HomeHeader } from "@/src/components/home/HomeHeader";
import { getCurrentUser } from "@/src/lib/auth/get-current-user";

export const metadata: Metadata = {
    title: "Trải nghiệm cộng đồng",
    description:
        "Xem bài chia sẻ trải nghiệm du lịch trong cộng đồng SmartTripVietNam.",
};

export const dynamic = "force-dynamic";

type CommunityPostPageProps = {
    params: Promise<{
        id: string;
    }>;
};

export default async function CommunityPostPage({
    params,
}: CommunityPostPageProps) {
    const [
        resolvedParams,
        currentUser,
    ] = await Promise.all([
        params,
        getCurrentUser(),
    ]);

    return (
        <>
            <HomeHeader />

            <main className="min-h-screen bg-[#f4efe6] px-4 pb-20 pt-28 text-[#173a3b] sm:px-6 sm:pt-32 lg:px-8 lg:pt-36">
                <div className="mx-auto w-full max-w-6xl">
                    <Link
                        href="/community"
                        className="inline-flex items-center gap-2 text-sm font-bold text-[#60716d] transition hover:text-[#173a3b]"
                    >
                        <ArrowLeft size={17} />
                        Quay lại cộng đồng
                    </Link>

                    <CommunityPostDetail
                        postId={resolvedParams.id}
                        currentUserId={
                            currentUser?.id ??
                            null
                        }
                    />
                </div>
            </main>
        </>
    );
}