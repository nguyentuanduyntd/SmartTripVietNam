"use client";
import {useState} from "react";
import type {CityId} from "@/src/constants/home-data";
import { useHomeData } from "@/src/hooks/useHomeData";
import {HomeHeader} from "./HomeHeader";
import {HeroSection} from "./HeroSection";
import {CityEditorialSection,CuisineSection,ExperienceSection,FeaturedDestinationsSection,JourneySection,PlannerSection,} from "./HomeSections";
import {HomeFooter} from "./HomeFooter";

export function HomePage() {
    const [
        activeCityId,
        setActiveCityId,
    ] = useState<CityId>("hue");

    const {
        cities,
        cityEditorial,
        featuredDestinations,
        cuisines,
        error,
        reload,
    } = useHomeData();

    return (
        <main className="overflow-x-hidden bg-[#fffaf1] text-[#173a3b]">
            <HomeHeader />

            <HeroSection
                cities={cities}
                activeCityId={activeCityId}
                onCityChange={setActiveCityId}
            />

            <CityEditorialSection
                items={cityEditorial}
            />

            <FeaturedDestinationsSection
                items={featuredDestinations}
            />

            <CuisineSection
                items={cuisines}
            />

            <JourneySection />

            <ExperienceSection />

            <PlannerSection />

            <HomeFooter />

            {error ? (
                <div
                    role="alert"
                    className="fixed bottom-5 left-1/2 z-[100] flex w-[calc(100%-32px)] max-w-xl -translate-x-1/2 items-center justify-between gap-4 rounded-2xl border border-[#e9c3bb] bg-[#fff8f4] px-5 py-4 text-sm text-[#8f3f34] shadow-2xl"
                >
                    <span>
                        Không tải được dữ liệu mới.
                        Trang đang hiển thị dữ liệu
                        mẫu.
                    </span>

                    <button
                        type="button"
                        onClick={() => {
                            void reload();
                        }}
                        className="shrink-0 rounded-full bg-[#f25f4b] px-4 py-2 font-bold text-white"
                    >
                        Thử lại
                    </button>
                </div>
            ) : null}
        </main>
    );
}