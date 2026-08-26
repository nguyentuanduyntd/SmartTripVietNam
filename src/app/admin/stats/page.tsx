import { redirect } from "next/navigation";

import { AdminStatsPage } from "@/src/components/admin/stats/AdminStatsPage";
import { getCurrentUser } from "@/src/lib/auth/get-current-user";

export const dynamic = "force-dynamic";

export default async function AdminStatsRoute() {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        redirect(`/auth/login?next=${encodeURIComponent("/admin/stats")}`);
    }

    if (currentUser.role !== "admin") {
        redirect("/");
    }

    return <AdminStatsPage />;
}
