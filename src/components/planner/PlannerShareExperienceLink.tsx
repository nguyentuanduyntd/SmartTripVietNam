import Link from "next/link";

import {
    Share2,
} from "lucide-react";

type PlannerShareExperienceLinkProps = {
    itineraryId: string;
};

export function PlannerShareExperienceLink({
    itineraryId,
}: PlannerShareExperienceLinkProps) {
    return (
        <Link
            href={`/community/new?itineraryId=${encodeURIComponent(
                itineraryId,
            )}`}
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#d85b48] px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_12px_30px_rgba(216,91,72,0.20)] transition hover:-translate-y-0.5 hover:bg-[#c84e3d]"
        >
            <Share2
                size={17}
            />

            Chia sẻ trải nghiệm
        </Link>
    );
}