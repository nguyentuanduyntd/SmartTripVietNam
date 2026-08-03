import Link from "next/link";
import type { ReactNode } from "react";
import {
    ArrowLeft,
    Bike,
    BusFront,
    CalendarDays,
    CarFront,
    Check,
    Clock3,
    Coffee,
    Footprints,
    MapPin,
    Plane,
    Route,
    ShipWheel,
    Sparkles,
    TrainFront,
    Utensils,
    WalletCards,
} from "lucide-react";

import { CloudinaryVisual } from "@/src/components/home/CloudinaryVisual";
import { HomeFooter } from "@/src/components/home/HomeFooter";
import { HomeHeader } from "@/src/components/home/HomeHeader";
import type {
    PublicTourDetail,
    RelatedPublishedTour,
} from "@/src/lib/tours/public-tour";
import { TourActions } from "./TourActions";

const FALLBACK_IMAGE = "smart-trip-vietnam/home/hero/hue";

type TourDetailPageProps = {
    tour: PublicTourDetail;
    relatedTours: RelatedPublishedTour[];
};

type TourDay = PublicTourDetail["days"][number];
type TourItem = TourDay["items"][number];
type TourMeal = TourDay["meals"][number];

type TimelineEntry =
    | {
          kind: "activity";
          time: string | null;
          order: number;
          data: TourItem;
      }
    | {
          kind: "meal";
          time: string | null;
          order: number;
          data: TourMeal;
      };

const transportLabels: Record<string, string> = {
    walking: "Đi bộ",
    bicycle: "Xe đạp",
    motobike: "Xe máy",
    car: "Ô tô",
    bus: "Xe buýt",
    train: "Tàu hỏa",
    airplane: "Máy bay",
    boat: "Thuyền",
    other: "Phương tiện khác",
};

const mealLabels: Record<string, string> = {
    breakfast: "Bữa sáng",
    lunch: "Bữa trưa",
    dinner: "Bữa tối",
    snack: "Bữa nhẹ",
};

function formatDuration(days: number, nights: number) {
    return nights > 0
        ? `${days} ngày ${nights} đêm`
        : `${days} ngày`;
}

function formatPrice(price: string | null) {
    if (!price) {
        return "Đang cập nhật";
    }

    const value = Number(price);

    if (!Number.isFinite(value)) {
        return "Đang cập nhật";
    }

    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(value);
}

function formatTime(value: string | null) {
    return value ? value.slice(0, 5) : null;
}

function getTransportIcon(method: string | null): ReactNode {
    switch (method) {
        case "walking":
            return <Footprints size={15} />;

        case "bicycle":
        case "motobike":
            return <Bike size={15} />;

        case "car":
            return <CarFront size={15} />;

        case "bus":
            return <BusFront size={15} />;

        case "train":
            return <TrainFront size={15} />;

        case "airplane":
            return <Plane size={15} />;

        case "boat":
            return <ShipWheel size={15} />;

        default:
            return <Route size={15} />;
    }
}

function buildTimeline(day: TourDay): TimelineEntry[] {
    return [
        ...day.items.map(
            (item): TimelineEntry => ({
                kind: "activity",
                time: item.startTime,
                order: item.sortOrder * 2,
                data: item,
            }),
        ),

        ...day.meals.map(
            (meal): TimelineEntry => ({
                kind: "meal",
                time: meal.startTime,
                order: meal.sortOrder * 2 + 1,
                data: meal,
            }),
        ),
    ].sort((first, second) => {
        const firstTime = first.time ?? "99:99:99";
        const secondTime = second.time ?? "99:99:99";

        return (
            firstTime.localeCompare(secondTime) ||
            first.order - second.order
        );
    });
}

function OverviewCard({
    icon,
    label,
    value,
}: {
    icon: ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-[24px] border border-[#ded3c3] bg-[#f7f0e4] p-5">
            <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#fffaf1] text-[#f25f4b]">
                    {icon}
                </span>

                <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#8a8575]">
                        {label}
                    </p>

                    <p className="mt-1 truncate font-bold text-[#173a3b]">
                        {value}
                    </p>
                </div>
            </div>
        </div>
    );
}

function ActivityEntry({ item }: { item: TourItem }) {
    const startTime = formatTime(item.startTime);
    const endTime = formatTime(item.endTime);
    const hasImage = Boolean(item.destination?.coverImageUrl);

    return (
        <article className="overflow-hidden rounded-[24px] border border-[#ddd2c2] bg-white/75 shadow-[0_16px_50px_rgba(39,55,52,0.06)]">
            <div
                className={
                    hasImage
                        ? "grid md:grid-cols-[minmax(0,1fr)_190px]"
                        : ""
                }
            >
                <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#d85b48]">
                        <Clock3 size={15} />

                        <span>
                            {startTime ?? "Linh hoạt"}
                            {endTime ? ` – ${endTime}` : ""}
                        </span>
                    </div>

                    <h4 className="mt-3 font-display text-2xl font-semibold leading-tight text-[#173a3b]">
                        {item.title}
                    </h4>

                    {item.destination ? (
                        <Link
                            href={`/destinations/${item.destination.id}`}
                            className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[#2f7773] transition hover:text-[#f25f4b]"
                        >
                            <MapPin size={15} />
                            {item.destination.name}
                        </Link>
                    ) : null}

                    {item.description ? (
                        <p className="mt-4 whitespace-pre-line text-sm leading-7 text-[#64706d]">
                            {item.description}
                        </p>
                    ) : null}

                    {item.transportMethod ||
                    item.estimatedTravelMinutes ? (
                        <div className="mt-5 flex flex-wrap gap-2">
                            {item.transportMethod ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e1efeb] px-3 py-1.5 text-xs font-bold text-[#2f7773]">
                                    {getTransportIcon(
                                        item.transportMethod,
                                    )}

                                    {transportLabels[
                                        item.transportMethod
                                    ] ?? "Di chuyển"}
                                </span>
                            ) : null}

                            {item.estimatedTravelMinutes ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f2e8d8] px-3 py-1.5 text-xs font-bold text-[#9a6a22]">
                                    <Clock3 size={14} />
                                    Khoảng{" "}
                                    {item.estimatedTravelMinutes} phút
                                </span>
                            ) : null}
                        </div>
                    ) : null}

                    {item.transportNote ? (
                        <p className="mt-3 text-xs leading-6 text-[#7e8986]">
                            {item.transportNote}
                        </p>
                    ) : null}
                </div>

                {item.destination?.coverImageUrl ? (
                    <CloudinaryVisual
                        source={item.destination.coverImageUrl}
                        alt={item.destination.name}
                        imageOptions={{
                            width: 520,
                            height: 520,
                        }}
                        className="min-h-44 md:min-h-full"
                    />
                ) : null}
            </div>
        </article>
    );
}

function MealEntry({ meal }: { meal: TourMeal }) {
    return (
        <article className="rounded-[24px] border border-[#e5d2a8] bg-[#fff7e7] p-5 sm:p-6">
            <div className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-[#c98a22]">
                    {meal.mealType === "breakfast" ? (
                        <Coffee size={20} />
                    ) : (
                        <Utensils size={20} />
                    )}
                </span>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h4 className="font-display text-xl font-semibold text-[#61491f]">
                            {mealLabels[meal.mealType] ?? "Bữa ăn"}
                        </h4>

                        {meal.startTime ? (
                            <span className="text-xs font-bold text-[#a27329]">
                                {formatTime(meal.startTime)}
                            </span>
                        ) : null}

                        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8e6b2f]">
                            {meal.isIncluded
                                ? "Đã gồm"
                                : "Tự túc"}
                        </span>
                    </div>

                    {meal.venueName ? (
                        <p className="mt-2 text-sm font-semibold text-[#735b31]">
                            {meal.venueName}
                        </p>
                    ) : null}

                    {meal.cuisines.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {meal.cuisines.map(({ cuisine }) => (
                                <span
                                    key={cuisine.id}
                                    className="rounded-full border border-[#e5d2a8] bg-white/70 px-3 py-1 text-xs font-semibold text-[#735b31]"
                                >
                                    {cuisine.name}
                                </span>
                            ))}
                        </div>
                    ) : null}

                    {meal.note ? (
                        <p className="mt-3 text-sm leading-6 text-[#806d4a]">
                            {meal.note}
                        </p>
                    ) : null}
                </div>
            </div>
        </article>
    );
}

function RelatedTourCard({
    tour,
}: {
    tour: RelatedPublishedTour;
}) {
    return (
        <Link
            href={`/tours/${tour.slug}`}
            className="group overflow-hidden rounded-[28px] border border-[#ddd2c2] bg-[#fffaf3] transition hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(31,52,49,0.12)]"
        >
            <CloudinaryVisual
                source={tour.coverImageUrl ?? FALLBACK_IMAGE}
                alt={tour.name}
                imageOptions={{
                    width: 900,
                    height: 620,
                }}
                className="h-52 transition-transform duration-500 group-hover:scale-[1.03]"
            />

            <div className="p-6">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#d85b48]">
                    {formatDuration(
                        tour.durationDays,
                        tour.durationNights,
                    )}
                </p>

                <h3 className="mt-3 font-display text-2xl font-semibold leading-tight text-[#173a3b]">
                    {tour.name}
                </h3>

                <div className="mt-5 flex items-center justify-between gap-4 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-[#687471]">
                        <MapPin size={15} />
                        {tour.startLocation.name}
                    </span>

                    <span className="font-bold text-[#173a3b]">
                        {formatPrice(tour.estimatedPrice)}
                    </span>
                </div>
            </div>
        </Link>
    );
}

export function TourDetailPage({
    tour,
    relatedTours,
}: TourDetailPageProps) {
    const duration = formatDuration(
        tour.durationDays,
        tour.durationNights,
    );

    return (
        <main className="overflow-x-hidden bg-[#fffaf1] text-[#173a3b]">
            <HomeHeader />

            <section className="relative min-h-[650px] overflow-hidden">
                <CloudinaryVisual
                    source={tour.coverImageUrl ?? FALLBACK_IMAGE}
                    alt={tour.name}
                    priority
                    imageOptions={{
                        width: 1900,
                        height: 1250,
                    }}
                    className="absolute inset-0"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#102f30] via-[#102f30]/55 to-[#102f30]/10" />

                <div className="relative mx-auto flex min-h-[650px] max-w-[1440px] items-end px-5 pb-14 pt-36 sm:px-8 lg:px-12 lg:pb-20">
                    <div className="max-w-4xl text-white">
                        <Link
                            href="/#hanh-trinh"
                            className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/15 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-black/30"
                        >
                            <ArrowLeft size={16} />
                            Tất cả hành trình
                        </Link>

                        <div className="mt-7 flex flex-wrap gap-2">
                            <span className="rounded-full border border-white/25 bg-white/12 px-3.5 py-1.5 text-xs font-bold backdrop-blur">
                                {duration}
                            </span>

                            <span className="rounded-full border border-white/25 bg-white/12 px-3.5 py-1.5 text-xs font-bold backdrop-blur">
                                Khởi hành từ{" "}
                                {tour.startLocation.name}
                            </span>
                        </div>

                        <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.02] sm:text-5xl lg:text-7xl">
                            {tour.name}
                        </h1>

                        {tour.description ? (
                            <p className="mt-6 max-w-3xl text-base leading-8 text-white/78 sm:text-lg">
                                {tour.description}
                            </p>
                        ) : null}
                    </div>
                </div>
            </section>

            <section className="px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
                <div className="mx-auto max-w-[1440px]">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <OverviewCard
                            icon={<CalendarDays size={21} />}
                            label="Thời lượng"
                            value={duration}
                        />

                        <OverviewCard
                            icon={<MapPin size={21} />}
                            label="Điểm khởi hành"
                            value={tour.startLocation.name}
                        />

                        <OverviewCard
                            icon={<Route size={21} />}
                            label="Điểm tập trung"
                            value={
                                tour.meetingPoint ??
                                "Sẽ thông báo"
                            }
                        />

                        <OverviewCard
                            icon={<WalletCards size={21} />}
                            label="Chi phí dự kiến"
                            value={formatPrice(
                                tour.estimatedPrice,
                            )}
                        />
                    </div>

                    <div className="mt-12 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_370px] xl:gap-14">
                        <div className="lg:order-1">
                            <div className="flex items-end justify-between gap-6">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d85b48]">
                                        Lịch trình theo ngày
                                    </p>

                                    <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
                                        Đi đâu, làm gì trong chuyến
                                        đi?
                                    </h2>
                                </div>

                                <span className="hidden rounded-full bg-[#e0eee9] px-4 py-2 text-xs font-bold text-[#2f7773] sm:inline-flex">
                                    {tour.days.length} ngày có lịch
                                    trình
                                </span>
                            </div>

                            {tour.days.length > 0 ? (
                                <div className="mt-9 space-y-9">
                                    {tour.days.map((day) => {
                                        const entries =
                                            buildTimeline(day);

                                        return (
                                            <section
                                                key={day.id}
                                                className="rounded-[30px] border border-[#ded3c3] bg-[#f4ecdf] p-5 sm:p-7"
                                            >
                                                <div className="flex items-start gap-4">
                                                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[20px] bg-[#173a3b] text-sm font-bold text-white">
                                                        N
                                                        {
                                                            day.dayNumber
                                                        }
                                                    </span>

                                                    <div>
                                                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#d85b48]">
                                                            Ngày{" "}
                                                            {
                                                                day.dayNumber
                                                            }
                                                        </p>

                                                        <h3 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">
                                                            {
                                                                day.title
                                                            }
                                                        </h3>

                                                        {day.description ? (
                                                            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#697572]">
                                                                {
                                                                    day.description
                                                                }
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                </div>

                                                {entries.length >
                                                0 ? (
                                                    <div className="relative mt-7 space-y-4 before:absolute before:bottom-5 before:left-[20px] before:top-5 before:w-px before:bg-[#d7c9b7] sm:before:left-[24px]">
                                                        {entries.map(
                                                            (
                                                                entry,
                                                            ) => (
                                                                <div
                                                                    key={`${entry.kind}-${entry.data.id}`}
                                                                    className="relative grid grid-cols-[42px_minmax(0,1fr)] gap-3 sm:grid-cols-[50px_minmax(0,1fr)] sm:gap-4"
                                                                >
                                                                    <span className="relative z-10 mt-5 grid h-10 w-10 place-items-center rounded-full border-4 border-[#f4ecdf] bg-[#fffaf1] text-[#f25f4b] sm:h-12 sm:w-12">
                                                                        {entry.kind ===
                                                                        "meal" ? (
                                                                            <Utensils
                                                                                size={
                                                                                    17
                                                                                }
                                                                            />
                                                                        ) : (
                                                                            <MapPin
                                                                                size={
                                                                                    17
                                                                                }
                                                                            />
                                                                        )}
                                                                    </span>

                                                                    {entry.kind ===
                                                                    "activity" ? (
                                                                        <ActivityEntry
                                                                            item={
                                                                                entry.data
                                                                            }
                                                                        />
                                                                    ) : (
                                                                        <MealEntry
                                                                            meal={
                                                                                entry.data
                                                                            }
                                                                        />
                                                                    )}
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="mt-7 rounded-[22px] bg-white/55 px-5 py-4 text-sm text-[#71807c]">
                                                        Ngày này chưa
                                                        có hoạt động
                                                        chi tiết.
                                                    </p>
                                                )}
                                            </section>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="mt-9 rounded-[28px] border border-dashed border-[#cfc1af] bg-[#f7f0e4] px-6 py-12 text-center">
                                    <Route
                                        className="mx-auto text-[#d85b48]"
                                        size={32}
                                    />

                                    <p className="mt-4 font-semibold">
                                        Lịch trình chi tiết đang
                                        được cập nhật.
                                    </p>
                                </div>
                            )}

                            <section className="mt-10 rounded-[30px] bg-[#173a3b] p-7 text-white sm:p-9">
                                <div className="flex items-start gap-4">
                                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-[#ffb69f]">
                                        <Sparkles size={22} />
                                    </span>

                                    <div>
                                        <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                                            Lưu ý trước chuyến đi
                                        </h2>

                                        <div className="mt-5 grid gap-3 text-sm leading-6 text-white/72 sm:grid-cols-2">
                                            {[
                                                "Giờ mở cửa và giá vé có thể thay đổi theo thời điểm.",
                                                "Nên chuẩn bị giày dễ đi và trang phục phù hợp điểm tâm linh.",
                                                "Lịch trình có thể điều chỉnh theo thời tiết và thể trạng.",
                                                "Chi phí hiển thị là mức tham khảo, chưa phải báo giá đặt dịch vụ.",
                                            ].map((note) => (
                                                <p
                                                    key={note}
                                                    className="flex gap-2.5"
                                                >
                                                    <Check
                                                        size={16}
                                                        className="mt-1 shrink-0 text-[#7fd0c4]"
                                                    />

                                                    {note}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        <aside className="order-first lg:order-2 lg:sticky lg:top-28">
                            <div className="rounded-[30px] border border-[#d9cebe] bg-[#f7f0e4] p-6 shadow-[0_24px_70px_rgba(31,52,49,0.10)] sm:p-7">
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a8575]">
                                    Chi phí dự kiến
                                </p>

                                <p className="mt-2 font-display text-4xl font-semibold text-[#173a3b]">
                                    {formatPrice(
                                        tour.estimatedPrice,
                                    )}
                                </p>

                                <p className="mt-1 text-xs text-[#8a8575]">
                                    Mức tham khảo cho một người
                                </p>

                                <dl className="mt-6 grid gap-4 border-y border-[#ddd2c2] py-5 text-sm">
                                    <div className="flex items-center justify-between gap-4">
                                        <dt className="text-[#77827f]">
                                            Thời lượng
                                        </dt>

                                        <dd className="font-bold">
                                            {duration}
                                        </dd>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <dt className="text-[#77827f]">
                                            Khởi hành
                                        </dt>

                                        <dd className="font-bold">
                                            {
                                                tour.startLocation
                                                    .name
                                            }
                                        </dd>
                                    </div>

                                    <div className="flex items-start justify-between gap-4">
                                        <dt className="text-[#77827f]">
                                            Tập trung
                                        </dt>

                                        <dd className="max-w-[190px] text-right font-bold">
                                            {tour.meetingPoint ??
                                                "Sẽ thông báo"}
                                        </dd>
                                    </div>
                                </dl>

                                <div className="mt-6">
                                    <TourActions
                                        tourId={tour.id}
                                        name={tour.name}
                                    />
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </section>

            {relatedTours.length > 0 ? (
                <section className="border-t border-[#e4dacb] bg-[#f2eadf] px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
                    <div className="mx-auto max-w-[1440px]">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d85b48]">
                            Có thể bạn quan tâm
                        </p>

                        <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
                            Hành trình tương tự
                        </h2>

                        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {relatedTours.map(
                                (relatedTour) => (
                                    <RelatedTourCard
                                        key={relatedTour.id}
                                        tour={relatedTour}
                                    />
                                ),
                            )}
                        </div>
                    </div>
                </section>
            ) : null}

            <HomeFooter />
        </main>
    );
}