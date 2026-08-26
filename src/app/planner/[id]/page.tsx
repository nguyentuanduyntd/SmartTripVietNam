import type { Metadata } from "next";
import Link from "next/link";
import {ArrowLeft,BedDouble,CalendarDays,CheckCircle2,Clock3,Route,UsersRound,Utensils,WalletCards,} from "lucide-react";
import {notFound,redirect,} from "next/navigation";
import { itineraryIdParamsSchema } from "@/src/db/schema/itinerary.schema";
import {
    COST_CATEGORY_DISPLAY_ORDER,
    COST_CATEGORY_LABELS,
} from "@/src/constants/itinerary";
import { getCurrentUser } from "@/src/lib/auth/get-current-user";
import {
    formatTime,
    formatVietnameseDate,
    formatVnd,
} from "@/src/lib/formatters";
import { CostBreakdownDialog } from "@/src/components/planner/CostBreakdownDialog";
import {PlannerGoogleMapsPlace} from "@/src/components/planner/PlannerGoogleMapsPlace";
import {getUserItineraryPlannerDetailService,ItineraryServiceError,} from "@/src/services/itinerary.service";
import { PlannerShareExperienceLink } from "@/src/components/planner/PlannerShareExperienceLink";

type PlannerPageProps = {
    params: Promise<{
        id: string;
    }>;
};

const STATUS_LABELS = {
    draft: "Bản nháp",
    planned: "Đã lên kế hoạch",
    completed: "Đã hoàn thành",
    archived: "Đã lưu trữ",
} as const;

const STATUS_STYLES = {
    draft: "border-[#dfd1bd] bg-[#fff8eb] text-[#8a6a39]",
    planned:
        "border-[#b9d9d2] bg-[#edf7f4] text-[#28635f]",
    completed:
        "border-[#bdd9c5] bg-[#eef8f0] text-[#2e6a3d]",
    archived:
        "border-[#d5d5d5] bg-[#f3f3f3] text-[#686868]",
} as const;

const COST_OVERVIEW_ITEMS = COST_CATEGORY_DISPLAY_ORDER.map((key) => ({
    key,
    label: COST_CATEGORY_LABELS[key],
}));

function formatCurrency(value: number) {
    return formatVnd(value, "0 ₫");
}

function formatDate(value: string | null) {
    return formatVietnameseDate(value, "Chưa thiết lập");
}

export async function generateMetadata({
    params,
}: PlannerPageProps): Promise<Metadata> {
    const { id } = await params;

    const parsedParams =
        itineraryIdParamsSchema.safeParse({
            id,
        });

    if (!parsedParams.success) {
        return {
            title: "Hành trình không tồn tại",
        };
    }

    const user = await getCurrentUser();

    if (!user) {
        return {
            title: "Hành trình của tôi",
        };
    }

    try {
        const itinerary =
            await getUserItineraryPlannerDetailService(
                parsedParams.data.id,
                user.id,
            );

        return {
            title: itinerary.title,
            description:
                itinerary.description ??
                "Xem và chỉnh sửa hành trình cá nhân.",
        };
    } catch {
        return {
            title: "Hành trình của tôi",
        };
    }
}

export default async function PlannerPage({
    params,
}: PlannerPageProps) {
    const { id } = await params;

    const parsedParams =
        itineraryIdParamsSchema.safeParse({
            id,
        });

    if (!parsedParams.success) {
        notFound();
    }

    const user = await getCurrentUser();

    if (!user) {
        redirect(
            `/auth/login?next=${encodeURIComponent(
                `/planner/${parsedParams.data.id}`,
            )}`,
        );
    }

    let itinerary;

    try {
        itinerary =
            await getUserItineraryPlannerDetailService(
                parsedParams.data.id,
                user.id,
            );
    } catch (error) {
        if (
            error instanceof
                ItineraryServiceError &&
            error.status === 404
        ) {
            notFound();
        }

        throw error;
    }

    const status =
        itinerary.status as keyof typeof STATUS_LABELS;

    return (
        <main className="min-h-screen bg-[#edf1ed] text-[#173a3b]">
            <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <header className="rounded-[28px] border border-white/80 bg-[#fffaf1] px-5 py-5 shadow-[0_18px_60px_rgba(23,58,59,0.10)] sm:px-7">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <Link
                                href="/"
                                className="inline-flex items-center gap-2 text-sm font-semibold text-[#55716e] transition hover:text-[#173a3b]"
                            >
                                <ArrowLeft
                                    size={17}
                                />
                                Quay về trang chủ
                            </Link>

                            <div className="mt-5 flex flex-wrap items-center gap-3">
                                <span
                                    className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-bold ${STATUS_STYLES[status]}`}
                                >
                                    {
                                        STATUS_LABELS[
                                            status
                                        ]
                                    }
                                </span>

                                <span className="inline-flex items-center gap-1.5 text-sm text-[#71807d]">
                                    <CalendarDays
                                        size={16}
                                    />
                                    Khởi hành{" "}
                                    {formatDate(
                                        itinerary.startDate,
                                    )}
                                </span>
                            </div>

                            <h1 className="mt-4 max-w-4xl font-display text-4xl font-semibold leading-tight text-[#173a3b] sm:text-5xl">
                                {itinerary.title}
                            </h1>

                            {itinerary.description ? (
                                <p className="mt-4 max-w-3xl text-sm leading-7 text-[#64736f] sm:text-base">
                                    {
                                        itinerary.description
                                    }
                                </p>
                            ) : null}
                            <PlannerShareExperienceLink itineraryId={itinerary.id}/>
                        </div>

                        <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
                            <div className="rounded-2xl border border-[#ded5c7] bg-white px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7d8986]">
                                    Số ngày
                                </p>
                                <p className="mt-1 text-xl font-bold">
                                    {
                                        itinerary.days
                                            .length
                                    }
                                </p>
                            </div>

                            <div className="rounded-2xl border border-[#ded5c7] bg-white px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7d8986]">
                                    Hành khách
                                </p>
                                <p className="mt-1 text-xl font-bold">
                                    {
                                        itinerary
                                            .costSummary
                                            .travelerCount
                                    }
                                </p>
                            </div>

                            <div className="rounded-2xl border border-[#ded5c7] bg-white px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7d8986]">
                                    Số phòng
                                </p>
                                <p className="mt-1 text-xl font-bold">
                                    {
                                        itinerary.roomCount
                                    }
                                </p>
                            </div>

                            <CostBreakdownDialog
                                costs={itinerary.costs}
                                stays={itinerary.stays}
                                summary={itinerary.costSummary}
                            />
                        </div>
                    </div>
                </header>

                <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <section className="space-y-5">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#d85b48]">
                                    Lịch trình
                                </p>

                                <h2 className="mt-1 font-display text-3xl font-semibold">
                                    Hành trình từng
                                    ngày
                                </h2>
                            </div>
                        </div>

                        {itinerary.days.length ===
                        0 ? (
                            <div className="rounded-[26px] border border-dashed border-[#cfc3b2] bg-[#fffaf1] px-6 py-12 text-center">
                                <Route
                                    size={34}
                                    className="mx-auto text-[#7b918c]"
                                />

                                <h3 className="mt-4 text-lg font-bold">
                                    Chưa có ngày nào
                                </h3>

                                <p className="mt-2 text-sm text-[#6e7b78]">
                                    Hãy thêm ngày và
                                    hoạt động để hoàn
                                    thiện hành trình.
                                </p>
                            </div>
                        ) : (
                            itinerary.days.map(
                                (day) => (
                                    <article
                                        key={day.id}
                                        className="overflow-hidden rounded-[26px] border border-white/80 bg-[#fffaf1] shadow-[0_16px_46px_rgba(23,58,59,0.08)]"
                                    >
                                        <header className="flex flex-col gap-3 border-b border-[#e1d7c8] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                                            <div>
                                                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#d85b48]">
                                                    Ngày{" "}
                                                    {
                                                        day.dayNumber
                                                    }
                                                </p>

                                                <h3 className="mt-1 text-xl font-bold">
                                                    {
                                                        day.title
                                                    }
                                                </h3>
                                            </div>

                                            <span className="inline-flex items-center gap-2 rounded-full border border-[#d9cdbc] bg-white px-3 py-2 text-sm font-semibold text-[#5e706c]">
                                                <CalendarDays
                                                    size={
                                                        16
                                                    }
                                                />
                                                {formatDate(
                                                    day.date,
                                                )}
                                            </span>
                                        </header>

                                        <div className="space-y-5 px-5 py-5 sm:px-6">
                                            {day.description ? (
                                                <p className="text-sm leading-7 text-[#687672]">
                                                    {
                                                        day.description
                                                    }
                                                </p>
                                            ) : null}

                                            <div>
                                                <div className="mb-3 flex items-center gap-2 text-sm font-bold">
                                                    <Route
                                                        size={
                                                            17
                                                        }
                                                    />
                                                    Hoạt
                                                    động
                                                </div>

                                                {day.items
                                                    .length ===
                                                0 ? (
                                                    <p className="rounded-2xl bg-white px-4 py-4 text-sm text-[#75817e]">
                                                        Chưa
                                                        có
                                                        hoạt
                                                        động.
                                                    </p>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {day.items.map(
                                                            (
                                                                item,
                                                            ) => {
                                                                const startTime =
                                                                    formatTime(
                                                                        item.startTime,
                                                                    );

                                                                const endTime =
                                                                    formatTime(
                                                                        item.endTime,
                                                                    );

                                                                return (
                                                                    <div
                                                                        key={
                                                                            item.id
                                                                        }
                                                                        className="rounded-2xl border border-[#e0d7ca] bg-white px-4 py-4"
                                                                    >
                                                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                                            <div>
                                                                                <h4 className="font-bold">
                                                                                    {
                                                                                        item.title
                                                                                    }
                                                                                </h4>

                                                                                <PlannerGoogleMapsPlace
                                                                                    destinationId={item.destinationId}
                                                                                    label={item.destinationName ?? item.title}
                                                                                    query={item.destinationName ?? item.title}
                                                                                />
                                                                            </div>

                                                                            {startTime ||
                                                                            endTime ? (
                                                                                <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[#4f6c68]">
                                                                                    <Clock3
                                                                                        size={
                                                                                            15
                                                                                        }
                                                                                    />
                                                                                    {startTime ??
                                                                                        "--:--"}
                                                                                    {" – "}
                                                                                    {endTime ??
                                                                                        "--:--"}
                                                                                </span>
                                                                            ) : null}
                                                                        </div>

                                                                        {item.description ? (
                                                                            <p className="mt-3 text-sm leading-6 text-[#687672]">
                                                                                {
                                                                                    item.description
                                                                                }
                                                                            </p>
                                                                        ) : null}
                                                                    </div>
                                                                );
                                                            },
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <div className="mb-3 flex items-center gap-2 text-sm font-bold">
                                                    <Utensils
                                                        size={
                                                            17
                                                        }
                                                    />
                                                    Bữa ăn
                                                </div>

                                                {day.meals
                                                    .length ===
                                                0 ? (
                                                    <p className="rounded-2xl bg-white px-4 py-4 text-sm text-[#75817e]">
                                                        Chưa
                                                        có
                                                        bữa
                                                        ăn.
                                                    </p>
                                                ) : (
                                                    <div className="grid gap-3 sm:grid-cols-2">
                                                        {day.meals.map(
                                                            (
                                                                meal,
                                                            ) => (
                                                                <div
                                                                    key={
                                                                        meal.id
                                                                    }
                                                                    className="rounded-2xl border border-[#e0d7ca] bg-white px-4 py-4"
                                                                >
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <p className="font-bold capitalize">
                                                                            {
                                                                                meal.mealType
                                                                            }
                                                                        </p>

                                                                        {meal.startTime ? (
                                                                            <span className="text-sm font-semibold text-[#55716d]">
                                                                                {formatTime(
                                                                                    meal.startTime,
                                                                                )}
                                                                            </span>
                                                                        ) : null}
                                                                    </div>

                                                                    <PlannerGoogleMapsPlace
                                                                        label = {
                                                                            meal.venueName ??
                                                                            meal.cuisines[0] ?.cuisineName ?? "Địa điểm bữa ăn"
                                                                        }
                                                                        query = {
                                                                            meal.venueName ?? meal.cuisines[0] ?.cuisineName ?? day.title
                                                                        }
                                                                    />

                                                                    {meal
                                                                        .cuisines
                                                                        .length >
                                                                    0 ? (
                                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                                            {meal.cuisines.map(
                                                                                (
                                                                                    cuisine,
                                                                                ) => (
                                                                                    <span
                                                                                        key={
                                                                                            cuisine.id
                                                                                        }
                                                                                        className="rounded-full bg-[#edf5f1] px-2.5 py-1 text-xs font-semibold text-[#466763]"
                                                                                    >
                                                                                        {
                                                                                            cuisine.cuisineName
                                                                                        }
                                                                                    </span>
                                                                                ),
                                                                            )}
                                                                        </div>
                                                                    ) : null}
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                ),
                            )
                        )}
                    </section>

                    <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
                        <section className="rounded-[26px] border border-white/80 bg-[#fffaf1] p-5 shadow-[0_16px_46px_rgba(23,58,59,0.08)]">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <WalletCards
                                        size={19}
                                    />

                                    <h2 className="font-bold">
                                        Tổng quan chi phí
                                    </h2>
                                </div>

                                <span className="rounded-full bg-[#edf7f4] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#55716e]">
                                    Dự kiến
                                </span>
                            </div>

                            <p className="mt-4 font-display text-4xl font-semibold text-[#d85b48]">
                                {formatCurrency(
                                    itinerary
                                        .costSummary
                                        .total,
                                )}
                            </p>

                            <p className="mt-1 text-xs leading-5 text-[#7a8784]">
                                Tổng chi phí tham khảo cho{" "}
                                {
                                    itinerary
                                        .costSummary
                                        .travelerCount
                                }{" "}
                                hành khách và{" "}
                                {
                                    itinerary
                                        .costSummary
                                        .roomCount
                                }{" "}
                                phòng.
                            </p>

                            <div className="mt-5 border-t border-[#e1d7c8] pt-4">
                                {COST_OVERVIEW_ITEMS.some(
                                    (item) =>
                                        itinerary
                                            .costSummary
                                            .byCategory[
                                            item.key
                                        ] > 0,
                                ) ? (
                                    <div className="space-y-3">
                                        {COST_OVERVIEW_ITEMS.map(
                                            (item) => {
                                                const amount =
                                                    itinerary
                                                        .costSummary
                                                        .byCategory[
                                                        item.key
                                                    ];

                                                if (
                                                    amount <= 0
                                                ) {
                                                    return null;
                                                }

                                                return (
                                                    <div
                                                        key={
                                                            item.key
                                                        }
                                                        className="flex items-center justify-between gap-4 text-sm"
                                                    >
                                                        <span className="text-[#71807d]">
                                                            {
                                                                item.label
                                                            }
                                                        </span>

                                                        <strong className="font-mono text-[#173a3b]">
                                                            {formatCurrency(
                                                                amount,
                                                            )}
                                                        </strong>
                                                    </div>
                                                );
                                            },
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm leading-6 text-[#75817e]">
                                        Chưa có chi phí chi
                                        tiết cho hành trình
                                        này.
                                    </p>
                                )}
                            </div>

                            {itinerary.costSummary.total >
                            0 ? (
                                <div className="mt-4 flex items-center justify-between gap-4 border-t border-[#e1d7c8] pt-4">
                                    <span className="text-sm font-bold text-[#173a3b]">
                                        Tổng cộng
                                    </span>

                                    <strong className="font-mono text-base text-[#d85b48]">
                                        {formatCurrency(
                                            itinerary
                                                .costSummary
                                                .total,
                                        )}
                                    </strong>
                                </div>
                            ) : null}
                        </section>

                        <section className="rounded-[26px] border border-white/80 bg-[#fffaf1] p-5 shadow-[0_16px_46px_rgba(23,58,59,0.08)]">
                            <div className="flex items-center gap-2">
                                <UsersRound
                                    size={19}
                                />

                                <h2 className="font-bold">
                                    Người tham gia
                                </h2>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                <div className="rounded-2xl bg-white px-3 py-3">
                                    <p className="text-[#75817e]">
                                        Người lớn
                                    </p>
                                    <p className="mt-1 text-xl font-bold">
                                        {
                                            itinerary.adultCount
                                        }
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-white px-3 py-3">
                                    <p className="text-[#75817e]">
                                        Trẻ em
                                    </p>
                                    <p className="mt-1 text-xl font-bold">
                                        {
                                            itinerary.childCount
                                        }
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-[26px] border border-white/80 bg-[#fffaf1] p-5 shadow-[0_16px_46px_rgba(23,58,59,0.08)]">
                            <div className="flex items-center gap-2">
                                <BedDouble
                                    size={19}
                                />

                                <h2 className="font-bold">
                                    Lưu trú
                                </h2>
                            </div>

                            {itinerary.stays.length ===
                            0 ? (
                                <p className="mt-4 text-sm leading-6 text-[#75817e]">
                                    Chưa thêm nơi lưu
                                    trú.
                                </p>
                            ) : (
                                <div className="mt-4 space-y-3">
                                    {itinerary.stays.map(
                                        (stay) => (
                                            <div
                                                key={
                                                    stay.id
                                                }
                                                className="rounded-2xl border border-[#e0d7ca] bg-white px-4 py-4"
                                            >
                                                <PlannerGoogleMapsPlace
                                                    label={stay.name}
                                                    query={stay.address ? `${stay.name}, ${stay.address}`
                                                        : stay.name}
                                                    subtitle={stay.address}
                                                />

                                                <p className="mt-2 text-sm text-[#6f7b78]">
                                                    {formatDate(
                                                        stay.checkInDate,
                                                    )}{" "}
                                                    –{" "}
                                                    {formatDate(
                                                        stay.checkOutDate,
                                                    )}
                                                </p>

                                                <p className="mt-2 text-sm font-semibold text-[#d85b48]">
                                                    {formatCurrency(
                                                        stay.calculatedAmount,
                                                    )}
                                                </p>
                                            </div>
                                        ),
                                    )}
                                </div>
                            )}
                        </section>

                        <div className="rounded-[26px] border border-[#c9dfd8] bg-[#edf7f4] p-5 text-sm leading-6 text-[#4f6f69]">
                            <div className="flex items-start gap-3">
                                <CheckCircle2
                                    size={19}
                                    className="mt-0.5 shrink-0"
                                />

                                <p>
                                    Hành trình đã được
                                    tạo thành công. Các
                                    nút chỉnh sửa, thêm
                                    ngày và lưu thay đổi
                                    sẽ được nối vào trang
                                    này ở batch tiếp theo.
                                </p>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </main>
    );
}
