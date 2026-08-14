import type {
    Metadata,
} from "next";

import {
    getTranslations,
} from "next-intl/server";

import {
    Suspense,
} from "react";

import {
    DestinationsListPage,
} from "@/src/components/destinations/DestinationListPage";

export async function generateMetadata(): Promise<Metadata> {
    const t =
        await getTranslations(
            "Destinations.metadata",
        );

    return {
        title:
            t(
                "title",
            ),

        description:
            t(
                "description",
            ),
    };
}

export default function Page() {
    return (
        <Suspense
            fallback={
                null
            }
        >
            <DestinationsListPage />
        </Suspense>
    );
}