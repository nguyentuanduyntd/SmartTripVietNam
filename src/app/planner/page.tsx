import type { Metadata } from "next";
import Link from "next/link";
import {ArrowRight,BedDouble,CalendarDays,Clock3,MapPin,Plus,Route,UsersRound,} from "lucide-react";
import { redirect } from "next/navigation";
import { HomeHeader } from "@/src/components/home/HomeHeader";
import { getCurrentUser } from "@/src/lib/auth/get-current-user";
import { findUserItineraryList } from "@/src/repositories/itinerary-list.repository";
import { DeleteItineraryButton } from "@/src/components/planner/DeleteItineraryButton";

export const metadata: Metadata = {
    title: "Lịch trình của tôi",
    description:
        "Xem và quản lý các hành trình du lịch đã tạo.",
};

/*
 * Trang này chứa dữ liệu riêng theo tài khoản,
 * không để Next.js cache chung giữa nhiều user.
 */
export const dynamic = "force-dynamic";

const STATUS_LABELS = {
    draft: "Bản nháp",
    planned: "Đã lên kế hoạch",
    completed: "Đã hoàn thành",
    archived: "Đã lưu trữ",
} as const;

const STATUS_STYLES = {
    draft:
        "border-[#dfd1bd] bg-[#fff8eb] text-[#8a6a39]",

    planned:
        "border-[#b9d9d2] bg-[#edf7f4] text-[#28635f]",

    completed:
        "border-[#bdd9c5] bg-[#eef8f0] text-[#2e6a3d]",

    archived:
        "border-[#d5d5d5] bg-[#f3f3f3] text-[#686868]",
} as const;

function formatDate(
    value: string | null,
) {
    if (!value) {
        return "Chưa thiết lập";
    }

    const [year, month, day] = value
        .split("-")
        .map(Number);

    if (!year || !month || !day) {
        return "Chưa thiết lập";
    }

    return new Intl.DateTimeFormat(
        "vi-VN",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            timeZone: "UTC",
        },
    ).format(
        new Date(
            Date.UTC(
                year,
                month - 1,
                day,
            ),
        ),
    );
}

function formatUpdatedAt(value: Date) {
    return new Intl.DateTimeFormat(
        "vi-VN",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZone:
                "Asia/Ho_Chi_Minh",
        },
    ).format(value);
}

export default async function MyItinerariesPage() {
    const user =
        await getCurrentUser();

    if (!user) {
        redirect(
            "/auth/login?next=%2Fplanner",
        );
    }

    const itineraries =
        await findUserItineraryList(
            user.id,
        );

    return (
        <>
            <HomeHeader />

            <main className="min-h-screen bg-[#f4efe6] px-4 pb-16 pt-32 text-[#173a3b] sm:px-6 sm:pt-36 lg:px-8">
                <div className="mx-auto w-full max-w-7xl">
                    <section className="overflow-hidden rounded-[32px] border border-white/75 bg-[#fffaf1] shadow-[0_24px_80px_rgba(23,58,59,0.10)]">
                        <div className="relative overflow-hidden px-6 py-9 sm:px-9 lg:px-12 lg:py-11">
                            <div
                                className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#dcebe7] blur-2xl"
                                aria-hidden="true"
                            />

                            <div
                                className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-[#f8d6cb] blur-3xl"
                                aria-hidden="true"
                            />

                            <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
                                <div className="max-w-3xl">
                                    <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#d85b48]">
                                        Không
                                        gian cá
                                        nhân
                                    </p>

                                    <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
                                        Lịch
                                        trình
                                        của tôi
                                    </h1>

                                    <p className="mt-4 max-w-2xl text-sm leading-7 text-[#667572] sm:text-base">
                                        Tất cả
                                        hành
                                        trình
                                        bạn tạo
                                        từ tour
                                        mẫu sẽ
                                        tự động
                                        xuất
                                        hiện tại
                                        đây.
                                        Chọn
                                        một
                                        hành
                                        trình
                                        để xem
                                        chi
                                        tiết và
                                        tiếp
                                        tục
                                        hoàn
                                        thiện
                                        chuyến
                                        đi.
                                    </p>
                                </div>

                                <Link
                                    href="/#hanh-trinh"
                                    className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 self-start rounded-full bg-[#173a3b] px-6 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(23,58,59,0.2)] transition hover:-translate-y-0.5 hover:bg-[#20494a] lg:self-auto"
                                >
                                    <Plus
                                        size={
                                            18
                                        }
                                    />
                                    Tạo hành
                                    trình mới
                                </Link>
                            </div>
                        </div>
                    </section>

                    <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#d85b48]">
                                Danh sách
                                đã lưu
                            </p>

                            <h2 className="mt-1 font-display text-3xl font-semibold">
                                {itineraries.length ===
                                0
                                    ? "Chưa có lịch trình"
                                    : `${itineraries.length} lịch trình`}
                            </h2>
                        </div>

                        {itineraries.length >
                        0 ? (
                            <p className="text-sm text-[#71807d]">
                                Sắp xếp
                                theo lần
                                cập nhật
                                gần nhất
                            </p>
                        ) : null}
                    </div>

                    {itineraries.length ===
                    0 ? (
                        <section className="mt-6 rounded-[30px] border border-dashed border-[#cdbfae] bg-[#fffaf1] px-6 py-16 text-center shadow-[0_16px_50px_rgba(23,58,59,0.06)]">
                            <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[#e5f0ec] text-[#2f7773]">
                                <Route
                                    size={
                                        30
                                    }
                                />
                            </span>

                            <h2 className="mt-5 font-display text-3xl font-semibold">
                                Bắt đầu
                                hành
                                trình
                                đầu tiên
                            </h2>

                            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#6e7b78] sm:text-base">
                                Chọn một
                                tour mẫu,
                                điền ngày
                                khởi hành
                                và số
                                người.
                                Sau khi
                                tạo
                                thành
                                công,
                                lịch
                                trình sẽ
                                được lưu
                                vào tài
                                khoản
                                này.
                            </p>

                            <Link
                                href="/#hanh-trinh"
                                className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#173a3b] px-7 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#20494a]"
                            >
                                Khám phá
                                tour mẫu

                                <ArrowRight
                                    size={
                                        18
                                    }
                                />
                            </Link>
                        </section>
                    ) : (
                        <section className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {itineraries.map(
                                (
                                    itinerary,
                                ) => {
                                    const status =
                                        itinerary.status as keyof typeof STATUS_LABELS;

                                    const travelerCount =
                                        itinerary.adultCount +
                                        itinerary.childCount;

                                    return (
                                        <article
                                            key={
                                                itinerary.id
                                            }
                                            className="group relative overflow-hidden rounded-[28px] border border-white/80 bg-[#fffaf1] shadow-[0_18px_54px_rgba(23,58,59,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(23,58,59,0.14)]"
                                        >
                                            <DeleteItineraryButton
                                                itineraryId={
                                                    itinerary.id
                                                }
                                                title={
                                                    itinerary.title
                                                }
                                            />

                                            <Link
                                                href={`/planner/${itinerary.id}`}
                                                className="block focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#2f8f8b]/20"
                                            >
                                            <div className="relative h-52 overflow-hidden bg-[#dcebe7]">
                                                {itinerary.coverImageUrl ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={
                                                            itinerary.coverImageUrl
                                                        }
                                                        alt={
                                                            itinerary.title
                                                        }
                                                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                                                    />
                                                ) : (
                                                    <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_top_right,#f7d6ca,transparent_42%),linear-gradient(135deg,#dcebe7,#f7f0e4)]">
                                                        <Route
                                                            size={
                                                                42
                                                            }
                                                            className="text-[#557b76]"
                                                        />
                                                    </div>
                                                )}

                                                <span
                                                    className={`absolute left-4 top-4 inline-flex rounded-full border px-3 py-1.5 text-xs font-bold shadow-sm ${STATUS_STYLES[status]}`}
                                                >
                                                    {
                                                        STATUS_LABELS[
                                                            status
                                                        ]
                                                    }
                                                </span>
                                            </div>

                                            <div className="p-5 sm:p-6">
                                                <h3 className="line-clamp-2 font-display text-2xl font-semibold leading-tight transition-colors group-hover:text-[#d85b48]">
                                                    {
                                                        itinerary.title
                                                    }
                                                </h3>

                                                {itinerary.description ? (
                                                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#6b7976]">
                                                        {
                                                            itinerary.description
                                                        }
                                                    </p>
                                                ) : null}

                                                <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-[#5f706c]">
                                                    <span className="flex items-center gap-2">
                                                        <CalendarDays
                                                            size={
                                                                16
                                                            }
                                                            className="shrink-0 text-[#2f7773]"
                                                        />

                                                        {formatDate(
                                                            itinerary.startDate,
                                                        )}
                                                    </span>

                                                    <span className="flex items-center gap-2">
                                                        <UsersRound
                                                            size={
                                                                16
                                                            }
                                                            className="shrink-0 text-[#2f7773]"
                                                        />

                                                        {
                                                            travelerCount
                                                        }{" "}
                                                        người
                                                    </span>

                                                    <span className="flex items-center gap-2">
                                                        <BedDouble
                                                            size={
                                                                16
                                                            }
                                                            className="shrink-0 text-[#2f7773]"
                                                        />

                                                        {
                                                            itinerary.roomCount
                                                        }{" "}
                                                        phòng
                                                    </span>

                                                    <span className="flex min-w-0 items-center gap-2">
                                                        <MapPin
                                                            size={
                                                                16
                                                            }
                                                            className="shrink-0 text-[#2f7773]"
                                                        />

                                                        <span className="truncate">
                                                            {itinerary.startLocationName ??
                                                                "Chưa có điểm đi"}
                                                        </span>
                                                    </span>
                                                </div>

                                                <div className="mt-5 flex items-center justify-between gap-4 border-t border-[#e5dbcd] pt-4">
                                                    <span className="flex min-w-0 items-center gap-1.5 text-xs text-[#7a8784]">
                                                        <Clock3
                                                            size={
                                                                14
                                                            }
                                                            className="shrink-0"
                                                        />

                                                        <span className="truncate">
                                                            Cập
                                                            nhật{" "}
                                                            {formatUpdatedAt(
                                                                itinerary.updatedAt,
                                                            )}
                                                        </span>
                                                    </span>

                                                    <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-[#173a3b]">
                                                        Xem
                                                        chi
                                                        tiết

                                                        <ArrowRight
                                                            size={
                                                                16
                                                            }
                                                            className="transition-transform group-hover:translate-x-1"
                                                        />
                                                    </span>
                                                </div>
                                            </div>
                                            </Link>
                                        </article>
                                    );
                                },
                            )}
                        </section>
                    )}
                </div>
            </main>
        </>
    );
}