import { redirect } from "next/navigation";

import { CommunityModerationPage } from "@/src/components/admin/community/CommunityModerationPage";
import { getCurrentUser } from "@/src/lib/auth/get-current-user";

export default async function Page() {
    const currentUser =
        await getCurrentUser();

    if (!currentUser) {
        redirect(
            `/auth/login?next=${encodeURIComponent(
                "/admin/community",
            )}`,
        );
    }

    if (
        currentUser.role !==
        "admin"
    ) {
        redirect("/");
    }

    return (
        <CommunityModerationPage />
    );
}