import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { HomeHeader } from "@/src/components/home/HomeHeader";
import { NotificationsPage } from "@/src/components/notifications/NotificationsPage";
import { getCurrentUser } from "@/src/lib/auth/get-current-user";

export const metadata: Metadata = {
    title: "Thông báo",
};

export const dynamic = "force-dynamic";

export default async function NotificationsRoute() {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        redirect(`/auth/login?next=${encodeURIComponent("/notifications")}`);
    }

    return (
        <>
            <HomeHeader />
            <main className="min-h-screen bg-[#f4efe6] px-4 pb-16 pt-32 text-[#173a3b] sm:px-6 sm:pt-36 lg:px-8">
                <NotificationsPage />
            </main>
        </>
    );
}
