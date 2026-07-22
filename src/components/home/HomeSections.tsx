"use client";
import Link from "next/link";
import {ArrowRight,Bot,ChevronRight,Clock3,Heart,MapPin,MessageCircle,Route,Sparkles,Star,} from "lucide-react";
import {useMemo,useState,} from "react";
import {BRAND_FEATURES,CITY_EDITORIAL,CUISINES,EXPERIENCE_ITEMS,FEATURED_DESTINATIONS,HOME_CITIES,JOURNEYS,STORIES,type CityId, type CuisineCardData, type DestinationCardData} from "@/src/constants/home-data";
import {CloudinaryVisual,} from "./CloudinaryVisual";
import type { CityEditorialCardData } from "@/src/lib/home-data-mapper";
const CITY_FILTERS: Array<{
    id: "all" | CityId;
    label: string;
}> = [
    {
        id: "all",
        label: "Tất cả",
    },
    {
        id: "hue",
        label: "Huế",
    },
    {
        id: "da-nang",
        label: "Đà Nẵng",
    },
    {
        id: "hoi-an",
        label: "Hội An",
    },
];

function SectionHeading({
    eyebrow,
    title,
    description,
    align = "left",
}: {
    eyebrow: string;
    title: string;
    description?: string;
    align?: "left" | "center";
}) {
    return (
        <div
            className={
                align === "center"
                    ? "mx-auto max-w-3xl text-center"
                    : "max-w-3xl"
            }
        >
            <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.22em] text-[#e55c49]">
                {eyebrow}
            </p>

            <h2 className="font-display text-4xl font-semibold leading-[1.03] tracking-[-0.035em] text-[#173a3b] sm:text-5xl lg:text-6xl">
                {title}
            </h2>

            {description ? (
                <p className="mt-5 text-base leading-8 text-[#60706d] sm:text-lg">
                    {description}
                </p>
            ) : null}
        </div>
    );
}

interface CityEditorialSectionProps {
    items?: readonly CityEditorialCardData[];
}

export function CityEditorialSection({
    items = CITY_EDITORIAL,
}: CityEditorialSectionProps) {
    return (
        <section
            id="kham-pha"
            className="relative overflow-hidden bg-[#173a3b] px-5 py-24 text-white sm:px-8 lg:px-12 lg:py-32"
        >
            <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.45)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.45)_1px,transparent_1px)] [background-size:48px_48px]" />

            <div className="relative mx-auto max-w-[1440px]">
                <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
                    <div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#f5ba54]">
                            Ba sắc thái miền Trung
                        </p>

                        <h2 className="mt-4 font-display text-5xl font-semibold leading-[0.98] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
                            Mỗi thành phố,

                            <span className="block italic text-[#f7dca5]">
                                một nhịp cảm xúc.
                            </span>
                        </h2>
                    </div>

                    <p className="max-w-2xl text-lg leading-8 text-white/68 lg:justify-self-end">
                        Không cần đi thật nhanh. Hãy chọn một
                        thành phố, ở lại đủ lâu và để những
                        điều nhỏ bé dẫn bạn vào câu chuyện của
                        miền Trung.
                    </p>
                </div>

                <div className="mt-14 grid gap-5 lg:grid-cols-3">
                    {items.map(
                        (item, index) => {
                            const Icon = item.icon;

                            return (
                                <article
                                    key={item.city}
                                    className={`group relative min-h-[480px] overflow-hidden rounded-[34px] border border-white/15 ${
                                        index === 1
                                            ? "lg:translate-y-10"
                                            : ""
                                    }`}
                                >
                                    <CloudinaryVisual
                                        source={item.image}
                                        alt={item.imageAlt}
                                        imageOptions={{
                                            width: 900,
                                            height: 1100,
                                        }}
                                        className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
                                    />

                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0e2f30] via-[#123d3c]/28 to-transparent" />

                                    <div className="absolute inset-x-0 bottom-0 p-7 sm:p-8">
                                        <div className="mb-5 flex items-center justify-between">
                                            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/25 bg-white/12 backdrop-blur">
                                                <Icon
                                                    size={23}
                                                    strokeWidth={1.7}
                                                />
                                            </span>

                                            <span className="rounded-full border border-white/20 bg-[#0e2f30]/45 px-3 py-1.5 text-xs font-bold text-white/76 backdrop-blur">
                                                {item.stat}
                                            </span>
                                        </div>

                                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f4c56e]">
                                            {item.kicker}
                                        </p>

                                        <h3 className="mt-2 font-display text-4xl font-semibold">
                                            {item.city}
                                        </h3>

                                        <p className="mt-3 leading-7 text-white/72">
                                            {item.title}
                                        </p>
                                    </div>
                                </article>
                            );
                        },
                    )}
                </div>
            </div>
        </section>
    );
}

interface FeaturedDestinationsSectionProps {
    items?: readonly DestinationCardData[];
}

export function FeaturedDestinationsSection({
    items = FEATURED_DESTINATIONS,
}: FeaturedDestinationsSectionProps) {
    const [filter, setFilter] = useState<"all" | CityId>("all");

    const visibleItems = useMemo(
        () =>
            filter === "all"
                ? items
                : items.filter((item) => item.city === filter),
        [filter, items],
    );

    return (
        <section
            id="diem-den"
            className="bg-[#f7f0e4] px-5 py-24 sm:px-8 lg:px-12 lg:py-32"
        >
            <div className="mx-auto max-w-[1440px]">
                <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                    <SectionHeading
                        eyebrow="Điểm đến nổi bật"
                        title="Những nơi khiến hành trình ở lại trong ký ức."
                        description="Từ kinh thành, bãi biển đến phố cổ, mỗi điểm dừng đều mang một lớp văn hóa và nhịp sống riêng."
                    />

                    <div className="flex flex-wrap gap-2">
                        {CITY_FILTERS.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() =>
                                    setFilter(item.id)
                                }
                                className={`rounded-full px-4 py-2.5 text-sm font-bold transition-all ${
                                    filter === item.id
                                        ? "bg-[#173a3b] text-white shadow-lg"
                                        : "border border-[#d3c8b7] bg-white/55 text-[#50605e] hover:bg-white"
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {visibleItems.map(
                        (item, index) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`group overflow-hidden rounded-[30px] border border-[#ded3c3] bg-[#fffaf1] shadow-[0_16px_55px_rgba(35,55,50,0.06)] transition-all hover:-translate-y-2 hover:shadow-[0_24px_65px_rgba(35,55,50,0.13)] ${
                                    index === 0 &&
                                    filter === "all"
                                        ? "md:col-span-2 xl:col-span-1"
                                        : ""
                                }`}
                            >
                                <div className="relative h-72 overflow-hidden">
                                    <CloudinaryVisual
                                        source={item.image}
                                        alt={
                                            item.imageAlt
                                        }
                                        imageOptions={{
                                            width: 900,
                                            height: 650,
                                        }}
                                        className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
                                    />

                                    <div className="absolute inset-0 bg-gradient-to-t from-black/38 via-transparent to-transparent" />

                                    <div className="absolute left-5 top-5 rounded-full bg-[#fffaf0]/90 px-3 py-1.5 text-xs font-extrabold text-[#315f5f] backdrop-blur">
                                        {item.category}
                                    </div>
                                </div>

                                <div className="p-6 sm:p-7">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-[#d55b48]">
                                        <MapPin
                                            size={16}
                                        />

                                        {item.cityLabel}
                                    </div>

                                    <div className="mt-3 flex items-start justify-between gap-4">
                                        <div>
                                            <h3 className="font-display text-3xl font-semibold text-[#173a3b]">
                                                {
                                                    item.name
                                                }
                                            </h3>

                                            <p className="mt-3 leading-7 text-[#667370]">
                                                {
                                                    item.description
                                                }
                                            </p>
                                        </div>

                                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#d7cbbb] text-[#173a3b] transition-colors group-hover:border-[#f25f4b] group-hover:bg-[#f25f4b] group-hover:text-white">
                                            <ArrowRight
                                                size={18}
                                            />
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ),
                    )}
                </div>

                <div className="mt-10 flex justify-center">
                    <Link
                        href="/destinations"
                        className="inline-flex items-center gap-2 rounded-full border border-[#bfb2a1] px-6 py-3 font-bold text-[#315f5f] transition-colors hover:bg-[#173a3b] hover:text-white"
                    >
                        Xem tất cả địa danh

                        <ChevronRight size={18} />
                    </Link>
                </div>
            </div>
        </section>
    );
}

interface CuisineSectionProps {
    items?: readonly CuisineCardData[];
}

export function CuisineSection({
    items = CUISINES,
}: CuisineSectionProps) {
    return (
        <section
            id="am-thuc"
            className="relative overflow-hidden bg-[#fffaf1] px-5 py-24 sm:px-8 lg:px-12 lg:py-32"
        >
            <div className="absolute -right-20 top-10 h-72 w-72 rounded-full bg-[#e7b54f]/20 blur-3xl" />

            <div className="absolute -left-16 bottom-0 h-72 w-72 rounded-full bg-[#4d9e99]/14 blur-3xl" />

            <div className="relative mx-auto max-w-[1440px]">
                <div className="grid gap-7 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
                    <SectionHeading
                        eyebrow="Hương vị miền Trung"
                        title="Một vùng đất có thể nhớ bằng hương thơm."
                        description="Ẩm thực nơi đây đậm nhưng không vội, bình dị mà nhiều lớp vị. Hãy bắt đầu bằng những món ăn quen tên nhưng luôn có điều mới để khám phá."
                    />

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:justify-self-end">
                        {EXPERIENCE_ITEMS.map(
                            (item) => {
                                const Icon =
                                    item.icon;

                                return (
                                    <div
                                        key={
                                            item.label
                                        }
                                        className="rounded-2xl border border-[#e0d5c5] bg-white/70 p-4 text-center"
                                    >
                                        <Icon
                                            className="mx-auto text-[#e25d49]"
                                            size={21}
                                        />

                                        <p className="mt-2 text-xs font-bold text-[#315f5f]">
                                            {
                                                item.label
                                            }
                                        </p>
                                    </div>
                                );
                            },
                        )}
                    </div>
                </div>

                <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    {items.map(
                        (item, index) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`group relative overflow-hidden rounded-[28px] ${
                                    index % 2 === 1
                                        ? "xl:translate-y-8"
                                        : ""
                                }`}
                            >
                                <div className="relative h-[430px] overflow-hidden">
                                    <CloudinaryVisual
                                        source={item.image}
                                        alt={
                                            item.imageAlt
                                        }
                                        imageOptions={{
                                            width: 700,
                                            height: 950,
                                        }}
                                        className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
                                    />

                                    <div className="absolute inset-0 bg-gradient-to-t from-[#102f30] via-[#102f30]/12 to-transparent" />

                                    <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <span className="rounded-full border border-white/25 bg-white/12 px-3 py-1.5 text-xs font-bold backdrop-blur">
                                                {
                                                    item.city
                                                }
                                            </span>

                                            <span className="text-sm font-bold text-[#f7cf82]">
                                                {
                                                    item.price
                                                }
                                            </span>
                                        </div>

                                        <h3 className="font-display text-3xl font-semibold">
                                            {item.name}
                                        </h3>

                                        <p className="mt-2 line-clamp-2 leading-6 text-white/72">
                                            {
                                                item.description
                                            }
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ),
                    )}
                </div>

                <div className="mt-16 flex justify-center xl:mt-24">
                    <Link
                        href="/cuisines"
                        className="group inline-flex items-center gap-3 rounded-full bg-[#f25f4b] px-7 py-4 font-bold text-white shadow-[0_18px_45px_rgba(242,95,75,0.22)]"
                    >
                        Khám phá bản đồ ẩm thực

                        <ArrowRight
                            size={19}
                            className="transition-transform group-hover:translate-x-1"
                        />
                    </Link>
                </div>
            </div>
        </section>
    );
}

export function JourneySection() {
    const toneClasses = {
        coral: "bg-[#f25f4b] text-white",
        teal: "bg-[#2f8f8b] text-white",
        gold: "bg-[#e2aa3b] text-[#173a3b]",
    } as const;

    return (
        <section
            id="hanh-trinh"
            className="bg-[#efe6d7] px-5 py-24 sm:px-8 lg:px-12 lg:py-32"
        >
            <div className="mx-auto max-w-[1440px]">
                <SectionHeading
                    eyebrow="Hành trình gợi ý"
                    title="Đi theo một lộ trình vừa đủ để còn muốn quay lại."
                    description="Các lịch trình mẫu được thiết kế theo nhịp trải nghiệm, không nhồi quá nhiều điểm và luôn có khoảng trống để bạn tận hưởng thành phố."
                    align="center"
                />

                <div className="mt-14 grid gap-6 lg:grid-cols-3">
                    {JOURNEYS.map(
                        (item, index) => (
                            <article
                                key={item.title}
                                className={`overflow-hidden rounded-[32px] bg-[#fffaf1] shadow-[0_18px_65px_rgba(32,54,51,0.08)] ${
                                    index === 1
                                        ? "lg:-translate-y-5"
                                        : ""
                                }`}
                            >
                                <div className="relative h-64 overflow-hidden">
                                    <CloudinaryVisual
                                        source={item.image}
                                        alt={
                                            item.imageAlt
                                        }
                                        imageOptions={{
                                            width: 900,
                                            height: 650,
                                        }}
                                        className="absolute inset-0"
                                    />

                                    <div className="absolute inset-0 bg-gradient-to-t from-black/34 to-transparent" />

                                    <span
                                        className={`absolute left-5 top-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-extrabold ${
                                            toneClasses[
                                                item.tone
                                            ]
                                        }`}
                                    >
                                        <Clock3
                                            size={15}
                                        />

                                        {item.duration}
                                    </span>
                                </div>

                                <div className="p-7">
                                    <h3 className="font-display text-3xl font-semibold text-[#173a3b]">
                                        {item.title}
                                    </h3>

                                    <p className="mt-3 leading-7 text-[#687572]">
                                        {
                                            item.description
                                        }
                                    </p>

                                    <div className="mt-6 space-y-3 border-l border-[#d7ccbc] pl-5">
                                        {item.stops.map(
                                            (
                                                stop,
                                                stopIndex,
                                            ) => (
                                                <div
                                                    key={
                                                        stop
                                                    }
                                                    className="relative flex items-center justify-between text-sm font-semibold text-[#315f5f]"
                                                >
                                                    <span className="absolute -left-[25px] grid h-5 w-5 place-items-center rounded-full bg-[#fffaf1] text-[10px] ring-1 ring-[#cdbfad]">
                                                        {stopIndex +
                                                            1}
                                                    </span>

                                                    {stop}

                                                    <span className="h-px w-8 bg-[#d5c9b8]" />
                                                </div>
                                            ),
                                        )}
                                    </div>

                                    <Link
                                        href="/planner"
                                        className="mt-7 inline-flex items-center gap-2 font-bold text-[#e25d49]"
                                    >
                                        Xem hành trình

                                        <ArrowRight
                                            size={18}
                                        />
                                    </Link>
                                </div>
                            </article>
                        ),
                    )}
                </div>
            </div>
        </section>
    );
}

export function ExperienceSection() {
    return (
        <section
            id="trai-nghiem"
            className="bg-[#fffaf1] px-5 py-24 sm:px-8 lg:px-12 lg:py-32"
        >
            <div className="mx-auto max-w-[1440px]">
                <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
                    <SectionHeading
                        eyebrow="Câu chuyện trải nghiệm"
                        title="Những chuyến đi được kể lại bằng cảm xúc thật."
                        description="Lưu lại khoảnh khắc, chia sẻ một quán nhỏ vừa tìm thấy hay kể về một buổi sáng mà bạn không muốn quên."
                    />

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:justify-self-end">
                        {BRAND_FEATURES.map(
                            (feature) => {
                                const Icon =
                                    feature.icon;

                                return (
                                    <div
                                        key={
                                            feature.label
                                        }
                                        className="rounded-2xl bg-[#f2eadc] p-4 text-center text-[#315f5f]"
                                    >
                                        <Icon
                                            className="mx-auto"
                                            size={20}
                                        />

                                        <p className="mt-2 text-xs font-bold leading-5">
                                            {
                                                feature.label
                                            }
                                        </p>
                                    </div>
                                );
                            },
                        )}
                    </div>
                </div>

                <div className="mt-12 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                    {STORIES.map(
                        (story, index) => (
                            <article
                                key={story.title}
                                className={`group relative overflow-hidden rounded-[34px] ${
                                    index === 0
                                        ? "min-h-[610px] lg:row-span-2"
                                        : "min-h-[292px]"
                                }`}
                            >
                                <CloudinaryVisual
                                    source={story.image}
                                    alt={
                                        story.imageAlt
                                    }
                                    imageOptions={{
                                        width:
                                            index === 0
                                                ? 1100
                                                : 850,
                                        height:
                                            index === 0
                                                ? 1200
                                                : 600,
                                    }}
                                    className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
                                />

                                <div className="absolute inset-0 bg-gradient-to-t from-[#0d3030]/86 via-[#0d3030]/10 to-transparent" />

                                <div className="absolute inset-x-0 bottom-0 p-7 text-white sm:p-9">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-[#f5cf84]">
                                        <MapPin
                                            size={16}
                                        />

                                        {
                                            story.location
                                        }
                                    </div>

                                    <h3
                                        className={`mt-3 font-display font-semibold ${
                                            index === 0
                                                ? "text-4xl sm:text-5xl"
                                                : "text-3xl"
                                        }`}
                                    >
                                        {story.title}
                                    </h3>

                                    <div className="mt-5 flex items-center justify-between gap-4 text-sm text-white/72">
                                        <span>
                                            Chia sẻ bởi{" "}
                                            {
                                                story.author
                                            }
                                        </span>

                                        <div className="flex items-center gap-4">
                                            <span className="inline-flex items-center gap-1.5">
                                                <Heart
                                                    size={
                                                        16
                                                    }
                                                />

                                                128
                                            </span>

                                            <span className="inline-flex items-center gap-1.5">
                                                <MessageCircle
                                                    size={
                                                        16
                                                    }
                                                />

                                                24
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        ),
                    )}
                </div>

                <div className="mt-10 flex justify-center">
                    <Link
                        href="/stories"
                        className="inline-flex items-center gap-2 rounded-full border border-[#bfb2a1] px-6 py-3 font-bold text-[#315f5f] hover:bg-[#173a3b] hover:text-white"
                    >
                        Xem cộng đồng chia sẻ

                        <ChevronRight size={18} />
                    </Link>
                </div>
            </div>
        </section>
    );
}

export function PlannerSection() {
    return (
        <section className="bg-[#fffaf1] px-5 pb-24 sm:px-8 lg:px-12 lg:pb-32">
            <div className="relative mx-auto max-w-[1440px] overflow-hidden rounded-[42px] bg-[#173a3b] px-6 py-16 text-white sm:px-10 lg:px-16 lg:py-20">
                <div className="absolute -right-20 -top-24 h-96 w-96 rounded-full bg-[#f3bd59]/24 blur-3xl" />

                <div className="absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-[#49a39e]/25 blur-3xl" />

                <div className="relative grid gap-10 lg:grid-cols-[1fr_0.8fr] lg:items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/8 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.2em] text-[#f5cb79]">
                            <Sparkles size={16} />

                            Trợ lý hành trình AI
                        </div>

                        <h2 className="mt-6 max-w-3xl font-display text-5xl font-semibold leading-[0.98] tracking-[-0.04em] sm:text-6xl">
                            Kể chúng tôi nghe chuyến đi
                            bạn đang mơ tới.
                        </h2>

                        <p className="mt-5 max-w-2xl text-lg leading-8 text-white/68">
                            Chọn số ngày, ngân sách và
                            điều bạn yêu thích. Trợ lý sẽ
                            kết hợp dữ liệu địa phương để
                            tạo một lịch trình riêng cho
                            bạn.
                        </p>

                        <Link
                            href="/planner"
                            className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-[#f25f4b] px-7 py-4 font-bold text-white shadow-[0_18px_45px_rgba(242,95,75,0.24)]"
                        >
                            <Route size={20} />

                            Tạo hành trình của tôi

                            <ArrowRight size={19} />
                        </Link>
                    </div>

                    <div className="rounded-[30px] border border-white/14 bg-white/8 p-4 backdrop-blur sm:p-5">
                        <div className="rounded-[24px] bg-[#fffaf1] p-5 text-[#173a3b] sm:p-6">
                            <div className="flex items-center gap-3 border-b border-[#ddd1bf] pb-4">
                                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#dff0ec] text-[#2f8f8b]">
                                    <Bot size={23} />
                                </span>

                                <div>
                                    <p className="font-bold">
                                        Trợ lý Rực Rỡ
                                    </p>

                                    <p className="text-xs text-[#74807d]">
                                        Sẵn sàng lên lịch
                                        trình
                                    </p>
                                </div>

                                <span className="ml-auto h-2.5 w-2.5 rounded-full bg-[#43a26f] ring-4 ring-[#43a26f]/15" />
                            </div>

                            <div className="mt-5 rounded-2xl bg-[#f1eadf] p-4 text-sm leading-7 text-[#52615e]">
                                “Tôi có 4 ngày, thích di
                                sản, đồ ăn địa phương và
                                muốn dành một buổi chiều ở
                                biển.”
                            </div>

                            <div className="mt-4 rounded-2xl border border-[#dcd1c0] p-4">
                                <div className="flex items-center justify-between text-sm font-bold">
                                    <span>
                                        Gợi ý phù hợp
                                    </span>

                                    <span className="inline-flex items-center gap-1 text-[#e3a83b]">
                                        <Star
                                            size={15}
                                            fill="currentColor"
                                        />

                                        4.9
                                    </span>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[#315f5f]">
                                    {HOME_CITIES.map(
                                        (city) => (
                                            <span
                                                key={
                                                    city.id
                                                }
                                                className="rounded-full bg-[#e5efeb] px-3 py-1.5"
                                            >
                                                {
                                                    city.name
                                                }
                                            </span>
                                        ),
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}