import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {getPublishedTourBySlug,getRelatedPublishedTours, TourServiceError,} from "@/src/lib/tours/public-tour";
import {TourDetailPage} from "@/src/components/tours/TourDetailPage";

type PageProps = {
    params: Promise<{ slug: string }>;
};

async function loadPublishedTour(slug: string) {
    try {
        return await getPublishedTourBySlug(slug);
    } catch (error) {
        if (error instanceof TourServiceError && error.status === 404) {
            notFound();
        }

        throw error;
    }
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { slug } = await params;

    try {
        const tour = await getPublishedTourBySlug(slug);
        const description =
            tour.description ??
            `Khám phá lịch trình ${tour.name} trong ${tour.durationDays} ngày ${tour.durationNights} đêm.`;

        return {
            title: tour.name,
            description,
            alternates: {
                canonical: `/tours/${tour.slug}`,
            },
            openGraph: {
                title: tour.name,
                description,
                type: "article",
            },
        };
    } catch {
        return {
            title: "Không tìm thấy hành trình",
            robots: {
                index: false,
                follow: false,
            },
        };
    }
}

export default async function Page({ params }: PageProps) {
    const { slug } = await params;
    const tour = await loadPublishedTour(slug);

    const relatedTours = await getRelatedPublishedTours(
        tour.id,
        tour.startLocationId,
    ).catch((error) => {
        console.error("Không tải được tour liên quan:", error);
        return [];
    });

    return <TourDetailPage tour={tour} relatedTours={relatedTours} />;
}
