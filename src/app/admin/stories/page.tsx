import { redirect } from "next/navigation";

import { AdminStoriesPage } from "@/src/components/admin/stories/AdminStoriesPage";
import { getCurrentUser } from "@/src/lib/auth/get-current-user";

export const dynamic = "force-dynamic";

export default async function AdminStoriesRoute() {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        redirect(`/auth/login?next=${encodeURIComponent("/admin/stories")}`);
    }

    if (currentUser.role !== "admin") {
        redirect("/");
    }

    return <AdminStoriesPage />;
}
