"use client";
import Link from "next/link";
import {ArrowDown,ArrowRight,MapPin,Sparkles,} from "lucide-react";
import {HOME_CITIES,type CityId, type HomeCity } from "@/src/constants/home-data";
import {CloudinaryVisual,} from "./CloudinaryVisual";

interface HeroSectionProps {
    cities?: readonly HomeCity[];
    activeCityId: CityId;
    onCityChange: (cityId: CityId) => void;
}

export function HeroSection({
    cities = HOME_CITIES,
    activeCityId,
    onCityChange,
}: HeroSectionProps) {
    const cityList =
        cities && cities.length > 0 ? cities : HOME_CITIES;

    const activeCity =
        cityList.find((city) => city.id === activeCityId) ??
        cityList[0] ??
        HOME_CITIES[0];

    if (!activeCity) {
        return null;
    }

    return (
        <section className="relative min-h-[860px] overflow-hidden bg-[#f7efe1] pt-24 lg:min-h-[900px] lg:pt-0">
            <div className="absolute inset-0 opacity-[0.055] [background-image:radial-gradient(#173a3b_0.7px,transparent_0.7px)] [background-size:8px_8px]" />

            <div className="absolute -left-32 top-44 h-72 w-72 rounded-full bg-[#f3c56b]/25 blur-3xl" />

            <div className="absolute -right-20 bottom-20 h-80 w-80 rounded-full bg-[#60aaa3]/20 blur-3xl" />

            <div className="relative mx-auto grid min-h-[860px] max-w-[1536px] items-center gap-10 px-5 pb-16 pt-20 sm:px-8 lg:min-h-[900px] lg:grid-cols-[0.9fr_1.1fr] lg:px-12 lg:pb-8 lg:pt-28 xl:px-16">
                <div className="relative z-10 max-w-[680px]">
                    <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#dacdb8] bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#315f5f] shadow-sm backdrop-blur">
                        <Sparkles
                            size={15}
                            className="text-[#e4a433]"
                        />

                        Huế · Đà Nẵng · Hội An
                    </div>

                    <p
                        className="mb-4 text-sm font-bold uppercase tracking-[0.2em]"
                        style={{
                            color: activeCity.accent,
                        }}
                    >
                        {activeCity.eyebrow}
                    </p>

                    <h1 className="font-display max-w-[660px] text-[56px] font-medium leading-[0.94] tracking-[-0.055em] text-[#173a3b] sm:text-[72px] lg:text-[76px] xl:text-[88px]">
                        Ba thành phố,

                        <span className="block italic">
                            một miền thương nhớ
                        </span>
                    </h1>

                    <p className="mt-7 max-w-[590px] text-[17px] leading-8 text-[#4d5f5c] sm:text-lg">
                        {activeCity.description}
                    </p>

                    <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Link
                            href={activeCity.href}
                            className="group inline-flex min-h-14 items-center justify-center gap-8 rounded-2xl bg-[#f25f4b] px-7 text-base font-bold text-white shadow-[0_18px_45px_rgba(242,95,75,0.24)] transition-all hover:-translate-y-1 hover:bg-[#df4e3b]"
                        >
                            Bắt đầu hành trình

                            <ArrowRight
                                className="transition-transform group-hover:translate-x-1"
                                size={20}
                            />
                        </Link>

                        <Link
                            href="#diem-den"
                            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-[#bcb09f] bg-white/45 px-6 font-semibold text-[#284b4b] transition-colors hover:bg-white/80"
                        >
                            <MapPin size={19} />
                            Xem điểm đến
                        </Link>
                    </div>

                    <div className="mt-10 grid max-w-[650px] grid-cols-1 gap-3 sm:grid-cols-3">
                        {cityList.map((city) => {
                            const Icon = city.icon;
                            const isActive =
                                city.id === activeCityId;

                            return (
                                <button
                                    key={city.id}
                                    type="button"
                                    onClick={() =>
                                        onCityChange(city.id)
                                    }
                                    className={`group flex items-center gap-3 rounded-2xl border px-4 py-4 text-left transition-all ${
                                        isActive
                                            ? "-translate-y-1 border-transparent bg-white shadow-[0_18px_40px_rgba(33,64,62,0.13)]"
                                            : "border-[#d8cdbb] bg-white/35 hover:border-[#bfb19e] hover:bg-white/65"
                                    }`}
                                    aria-pressed={isActive}
                                >
                                    <span
                                        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
                                        style={{
                                            backgroundColor:
                                                isActive
                                                    ? city.softAccent
                                                    : "rgba(255,255,255,0.55)",
                                            color: city.accent,
                                        }}
                                    >
                                        <Icon
                                            size={21}
                                            strokeWidth={1.8}
                                        />
                                    </span>

                                    <span>
                                        <span className="block font-display text-[24px] font-semibold leading-none text-[#173a3b]">
                                            {city.name}
                                        </span>

                                        <span
                                            className={`mt-2 block h-0.5 origin-left rounded-full transition-all ${
                                                isActive
                                                    ? "w-10"
                                                    : "w-5 group-hover:w-8"
                                            }`}
                                            style={{
                                                backgroundColor:
                                                    city.accent,
                                            }}
                                        />
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="relative min-h-[500px] lg:min-h-[720px]">
                    <div className="absolute left-[3%] top-[7%] h-[88%] w-[90%] rounded-[48%_52%_38%_62%/44%_38%_62%_56%] bg-[#e8b65c]/30 blur-2xl" />

                    <div className="absolute right-0 top-8 h-[90%] w-[92%] overflow-hidden rounded-[42px_120px_42px_120px] border-[10px] border-white/70 bg-[#e0d5c4] shadow-[0_35px_90px_rgba(25,52,50,0.22)] sm:right-4 lg:right-0 xl:w-[94%]">
                        <CloudinaryVisual
                            key={activeCity.id}
                            source={activeCity.image}
                            alt={activeCity.imageAlt}
                            priority
                            imageOptions={{
                                width: 1400,
                                height: 1500,
                                crop: "fill",
                                gravity: "auto",
                            }}
                            className="home-hero-image h-full w-full animate-[homeFade_.65s_ease-out]"
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0e3334]/45 via-transparent to-[#fff8ed]/5" />

                            <div className="absolute bottom-7 left-7 right-7 flex items-end justify-between gap-4 rounded-3xl border border-white/40 bg-[#153f3e]/55 p-5 text-white backdrop-blur-md sm:left-9 sm:right-9 sm:p-6">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">
                                        Đang khám phá
                                    </p>

                                    <p className="mt-1 font-display text-3xl font-semibold sm:text-4xl">
                                        {activeCity.name}
                                    </p>
                                </div>

                                <div className="hidden max-w-[270px] text-right text-sm leading-6 text-white/80 sm:block">
                                    {activeCity.headline}
                                </div>
                            </div>
                        </CloudinaryVisual>
                    </div>

                    <div className="absolute left-0 top-[24%] hidden rounded-2xl border border-white/70 bg-[#fffaf0]/90 px-4 py-3 text-sm font-semibold text-[#315f5f] shadow-xl backdrop-blur lg:block">
                        <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#f25f4b]" />

                        Miền Trung theo cách thật riêng
                    </div>
                </div>
            </div>

            <Link
                href="#kham-pha"
                aria-label="Cuộn xuống phần khám phá"
                className="absolute bottom-5 left-1/2 z-10 grid h-12 w-12 -translate-x-1/2 place-items-center rounded-full border border-[#9f9a8f] bg-[#fffaf0]/70 text-[#315f5f] backdrop-blur transition-transform hover:translate-y-1"
            >
                <ArrowDown size={20} />
            </Link>
        </section>
    );
}