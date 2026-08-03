import { HomeHeader } from "@/src/components/home/HomeHeader";

export default function Loading() {
    return (
        <main className="min-h-screen bg-[#fffaf1] text-[#173a3b]">
            <HomeHeader />

            <div className="h-[68vh] min-h-[560px] animate-pulse bg-[#d9d1c5]" />

            <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12">
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div
                            key={index}
                            className="h-28 animate-pulse rounded-[24px] bg-[#ede5d8]"
                        />
                    ))}
                </div>

                <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="space-y-6">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <div
                                key={index}
                                className="h-72 animate-pulse rounded-[30px] bg-[#ede5d8]"
                            />
                        ))}
                    </div>

                    <div className="h-96 animate-pulse rounded-[30px] bg-[#ede5d8]" />
                </div>
            </div>
        </main>
    );
}