"use client";

import {
    CalendarDays,
    Copy,
    Loader2,
    UsersRound,
    X,
} from "lucide-react";

import {
    useState,
} from "react";

import {
    useRouter,
} from "next/navigation";

import {
    readCommunityApi,
} from "@/src/components/community/community-types";

type UseCommunityItineraryDialogProps = {
    postId: string;
    defaultTitle: string;
    defaultAdultCount: number;
    defaultChildCount: number;
    defaultRoomCount: number;
};

export function UseCommunityItineraryDialog({
    postId,
    defaultTitle,
    defaultAdultCount,
    defaultChildCount,
    defaultRoomCount,
}: UseCommunityItineraryDialogProps) {
    const router =
        useRouter();

    const [
        isOpen,
        setIsOpen,
    ] = useState(false);

    const [
        startDate,
        setStartDate,
    ] = useState("");

    const [
        title,
        setTitle,
    ] =
        useState(
            defaultTitle,
        );

    const [
        adultCount,
        setAdultCount,
    ] = useState(
        Math.max(
            defaultAdultCount,
            1,
        ),
    );

    const [
        childCount,
        setChildCount,
    ] = useState(
        Math.max(
            defaultChildCount,
            0,
        ),
    );

    const [
        roomCount,
        setRoomCount,
    ] = useState(
        Math.max(
            defaultRoomCount,
            1,
        ),
    );

    const [
        isSubmitting,
        setIsSubmitting,
    ] = useState(false);

    const [
        error,
        setError,
    ] =
        useState<
            string | null
        >(null);

    function close() {
        if (
            isSubmitting
        ) {
            return;
        }

        setIsOpen(
            false,
        );

        setError(
            null,
        );
    }

    async function submit() {
        if (
            !startDate
        ) {
            setError(
                "Vui lòng chọn ngày khởi hành mới.",
            );
            return;
        }

        if (
            !title.trim()
        ) {
            setError(
                "Vui lòng nhập tên hành trình.",
            );
            return;
        }

        setIsSubmitting(
            true,
        );

        setError(
            null,
        );

        try {
            const response =
                await fetch(
                    `/api/community/posts/${postId}/use-itinerary`,
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify(
                                {
                                    startDate,

                                    title:
                                        title.trim(),

                                    adultCount,

                                    childCount,

                                    roomCount,
                                },
                            ),
                    },
                );

            const payload =
                await readCommunityApi<{
                    id: string;
                    title: string;
                    source: string;
                    copied: {
                        days: number;
                        items: number;
                        meals: number;
                        cuisines: number;
                        stays: number;
                        costs: number;
                    };
                }>(
                    response,
                );

            if (
                response.status ===
                401
            ) {
                window.location.href =
                    `/auth/login?next=${encodeURIComponent(
                        `/community/${postId}`,
                    )}`;
                return;
            }

            if (
                !response.ok ||
                !payload.success ||
                !payload.data?.id
            ) {
                const fieldError =
                    payload.errors
                        ? Object.values(
                              payload.errors,
                          )
                              .flat()
                              .find(
                                  Boolean,
                              )
                        : null;

                throw new Error(
                    fieldError ??
                        payload.message ??
                        "Không thể tạo lịch trình.",
                );
            }

            router.push(
                `/planner/${payload.data.id}`,
            );

            router.refresh();
        } catch (
            submitError
        ) {
            console.error(
                "[USE COMMUNITY ITINERARY ERROR]",
                submitError,
            );

            setError(
                submitError instanceof
                    Error
                    ? submitError.message
                    : "Không thể tạo lịch trình.",
            );
        } finally {
            setIsSubmitting(
                false,
            );
        }
    }

    return (
        <>
            <button
                type="button"
                onClick={() =>
                    setIsOpen(
                        true,
                    )
                }
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#173a3b] px-4 py-2 text-sm font-extrabold text-white shadow-[0_10px_28px_rgba(23,58,59,0.15)] transition hover:-translate-y-0.5 hover:bg-[#214b4c]"
            >
                <Copy
                    size={17}
                />

                Dùng lịch trình này
            </button>

            {isOpen ? (
                <div className="fixed inset-0 z-[1100] grid place-items-center bg-[#102b2c]/55 p-4 backdrop-blur-sm">
                    <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[30px] bg-[#fffaf1] p-6 shadow-2xl sm:p-8">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-extrabold uppercase tracking-[0.17em] text-[#d85b48]">
                                    Community → Planner
                                </p>

                                <h2 className="mt-2 font-display text-3xl font-semibold">
                                    Dùng lịch trình này
                                </h2>

                                <p className="mt-2 text-sm leading-6 text-[#6d7a76]">
                                    Hệ thống sẽ tạo một bản sao riêng trong
                                    Planner của bạn. Bài gốc và Planner của
                                    người chia sẻ không bị thay đổi.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={
                                    close
                                }
                                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#ddd2c4] bg-white text-[#667570]"
                                aria-label="Đóng"
                            >
                                <X
                                    size={17}
                                />
                            </button>
                        </div>

                        <label className="mt-6 block">
                            <span className="mb-2 block text-sm font-extrabold">
                                Tên hành trình
                            </span>

                            <input
                                type="text"
                                maxLength={
                                    200
                                }
                                value={
                                    title
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setTitle(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                className="h-12 w-full rounded-2xl border border-[#d9cebf] bg-white px-4 text-sm outline-none focus:border-[#4d8a84] focus:ring-4 focus:ring-[#4d8a84]/10"
                            />
                        </label>

                        <label className="mt-4 block">
                            <span className="mb-2 flex items-center gap-2 text-sm font-extrabold">
                                <CalendarDays
                                    size={16}
                                    className="text-[#d85b48]"
                                />

                                Ngày khởi hành mới
                            </span>

                            <input
                                type="date"
                                value={
                                    startDate
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setStartDate(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                className="h-12 w-full rounded-2xl border border-[#d9cebf] bg-white px-4 text-sm outline-none focus:border-[#4d8a84] focus:ring-4 focus:ring-[#4d8a84]/10"
                            />
                        </label>

                        <div className="mt-5">
                            <p className="mb-3 flex items-center gap-2 text-sm font-extrabold">
                                <UsersRound
                                    size={16}
                                />
                                Người tham gia
                            </p>

                            <div className="grid gap-3 sm:grid-cols-3">
                                <label>
                                    <span className="mb-2 block text-xs font-bold text-[#6d7b77]">
                                        Người lớn
                                    </span>

                                    <input
                                        type="number"
                                        min={
                                            1
                                        }
                                        max={
                                            30
                                        }
                                        value={
                                            adultCount
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setAdultCount(
                                                Math.max(
                                                    1,
                                                    Number(
                                                        event
                                                            .target
                                                            .value,
                                                    ) ||
                                                        1,
                                                ),
                                            )
                                        }
                                        className="h-11 w-full rounded-xl border border-[#d9cebf] bg-white px-3 text-sm outline-none focus:border-[#4d8a84]"
                                    />
                                </label>

                                <label>
                                    <span className="mb-2 block text-xs font-bold text-[#6d7b77]">
                                        Trẻ em
                                    </span>

                                    <input
                                        type="number"
                                        min={
                                            0
                                        }
                                        max={
                                            30
                                        }
                                        value={
                                            childCount
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setChildCount(
                                                Math.max(
                                                    0,
                                                    Number(
                                                        event
                                                            .target
                                                            .value,
                                                    ) ||
                                                        0,
                                                ),
                                            )
                                        }
                                        className="h-11 w-full rounded-xl border border-[#d9cebf] bg-white px-3 text-sm outline-none focus:border-[#4d8a84]"
                                    />
                                </label>

                                <label>
                                    <span className="mb-2 block text-xs font-bold text-[#6d7b77]">
                                        Số phòng
                                    </span>

                                    <input
                                        type="number"
                                        min={
                                            1
                                        }
                                        max={
                                            20
                                        }
                                        value={
                                            roomCount
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setRoomCount(
                                                Math.max(
                                                    1,
                                                    Number(
                                                        event
                                                            .target
                                                            .value,
                                                    ) ||
                                                        1,
                                                ),
                                            )
                                        }
                                        className="h-11 w-full rounded-xl border border-[#d9cebf] bg-white px-3 text-sm outline-none focus:border-[#4d8a84]"
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="mt-5 rounded-2xl bg-[#edf7f4] px-4 py-3 text-xs leading-5 text-[#5a746e]">
                            Ngày lưu trú sẽ được tính lại theo ngày khởi hành
                            mới. Chi phí, hoạt động và bữa ăn được sao chép từ
                            snapshot Community để bạn tiếp tục chỉnh sửa.
                        </div>

                        {error ? (
                            <div className="mt-4 rounded-2xl border border-[#f1cec7] bg-[#fff0ed] px-4 py-3 text-sm leading-6 text-[#b84d3f]">
                                {
                                    error
                                }
                            </div>
                        ) : null}

                        <button
                            type="button"
                            disabled={
                                isSubmitting
                            }
                            onClick={() =>
                                void submit()
                            }
                            className="mt-6 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-[#173a3b] px-6 text-sm font-extrabold text-white shadow-[0_14px_34px_rgba(23,58,59,0.18)] transition hover:bg-[#214b4c] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSubmitting ? (
                                <Loader2
                                    size={18}
                                    className="animate-spin"
                                />
                            ) : (
                                <Copy
                                    size={18}
                                />
                            )}

                            {isSubmitting
                                ? "Đang tạo lịch trình..."
                                : "Tạo lịch trình của tôi"}
                        </button>
                    </div>
                </div>
            ) : null}
        </>
    );
}