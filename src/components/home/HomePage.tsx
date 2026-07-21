"use client";
import {useState} from "react";
import type {CityId} from "@/src/constants/home-data";
import {HomeHeader} from "./HomeHeader";
import {HeroSection} from "./HeroSection";
import {CityEditorialSection,CuisineSection,ExperienceSection,FeaturedDestinationsSection,JourneySection,PlannerSection,} from "./HomeSections";
import {HomeFooter} from "./HomeFooter";

export function HomePage() {
    const [
        activeCityId,
        setActiveCityId,
    ] = useState<CityId>("hue");

    return (
        <main className="overflow-x-hidden bg-[#fffaf1] text-[#173a3b]">
            <HomeHeader />

            <HeroSection
                activeCityId={activeCityId}
                onCityChange={setActiveCityId}
            />

            <CityEditorialSection />

            <FeaturedDestinationsSection />

            <CuisineSection />

            <JourneySection />

            <ExperienceSection />

            <PlannerSection />

            <HomeFooter />
        </main>
    );
}