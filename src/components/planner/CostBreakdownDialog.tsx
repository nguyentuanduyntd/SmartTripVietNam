"use client";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    ChevronRight,
    ReceiptText,
    X,
} from "lucide-react";

import type {
    CostCalculationUnit,
    CostCategory,
    TravelerScope,
} from "@/src/constants/itinerary";
import {
    COST_CATEGORY_DISPLAY_ORDER as CATEGORY_ORDER,
    COST_CATEGORY_LABELS as CATEGORY_LABELS,
} from "@/src/constants/itinerary";
import {
    formatCostFormula as getCostFormula,
    formatStayFormula as getStayFormula,
} from "@/src/lib/costs/cost-display";
import { formatVnd } from "@/src/lib/formatters";

type CostBreakdownCost = {
    id: string;

    title: string;

    category: CostCategory;

    calculationUnit:
        CostCalculationUnit;

    travelerScope:
        TravelerScope;

    unitPrice: string;

    quantity: string;

    nightCount: number | null;

    note: string | null;

    calculatedAmount: number;
};

type CostBreakdownStay = {
    id: string;

    name: string;

    roomCount: number;

    pricePerRoomNight: string;

    nightCount: number;

    note: string | null;

    calculatedAmount: number;
};

type CostBreakdownSummary = {
    travelerCount: number;

    adultCount: number;
    childCount: number;

    roomCount: number;

    dayCount: number;

    defaultNightCount: number;

    detailedCostsTotal: number;

    staysTotal: number;

    total: number;

    byCategory: Record<
        CostCategory,
        number
    >;
};

type CostBreakdownDialogProps = {
    costs: CostBreakdownCost[];

    stays: CostBreakdownStay[];

    summary: CostBreakdownSummary;
};

function formatCurrency(
    value: string | number,
) {
    return formatVnd(value, "0 ₫");
}

export function CostBreakdownDialog({
    costs,
    stays,
    summary,
}: CostBreakdownDialogProps) {
    const [open, setOpen] =
        useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }

        const previousOverflow =
            document.body.style
                .overflow;

        function handleKeyDown(
            event: KeyboardEvent,
        ) {
            if (
                event.key ===
                "Escape"
            ) {
                setOpen(false);
            }
        }

        document.body.style.overflow =
            "hidden";

        document.addEventListener(
            "keydown",
            handleKeyDown,
        );

        return () => {
            document.body.style.overflow =
                previousOverflow;

            document.removeEventListener(
                "keydown",
                handleKeyDown,
            );
        };
    }, [open]);

    const costsByCategory =
        useMemo(() => {
            const result =
                new Map<
                    CostCategory,
                    CostBreakdownCost[]
                >();

            for (const category of
                CATEGORY_ORDER) {
                result.set(
                    category,
                    [],
                );
            }

            for (const cost of costs) {
                const current =
                    result.get(
                        cost.category,
                    );

                if (current) {
                    current.push(cost);
                } else {
                    result.set(
                        cost.category,
                        [cost],
                    );
                }
            }

            return result;
        }, [costs]);

    const visibleCategories =
        useMemo(
            () =>
                CATEGORY_ORDER.filter(
                    (category) => {
                        const categoryCosts =
                            costsByCategory.get(
                                category,
                            ) ?? [];

                        if (
                            categoryCosts.length >
                            0
                        ) {
                            return true;
                        }

                        if (
                            category ===
                                "accommodation" &&
                            stays.length > 0
                        ) {
                            return true;
                        }

                        return false;
                    },
                ),
            [
                costsByCategory,
                stays.length,
            ],
        );

    const hasBreakdown =
        costs.length > 0 ||
        stays.length > 0;

    return (
        <>
            {/* Trigger */}
            <button
                type="button"
                onClick={() =>
                    setOpen(true)
                }
                className="group rounded-2xl border border-[#ded5c7] bg-white px-4 py-3 text-left transition hover:border-[#d85b48]/50 hover:shadow-[0_8px_24px_rgba(23,58,59,0.08)] focus:outline-none focus:ring-2 focus:ring-[#d85b48]/30"
                aria-label="Xem chi tiết dự toán"
            >
                <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7d8986]">
                        Dự toán
                    </p>

                    <ChevronRight
                        size={15}
                        className="text-[#a3aaa7] transition group-hover:translate-x-0.5 group-hover:text-[#d85b48]"
                    />
                </div>

                <p className="mt-1 text-lg font-bold text-[#d85b48]">
                    {formatCurrency(
                        summary.total,
                    )}
                </p>

                <p className="mt-1 text-[11px] font-medium text-[#87928f]">
                    Xem chi tiết
                </p>
            </button>

            {/* Dialog */}
            {open ? (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-[#102f30]/55 px-4 py-6 backdrop-blur-[2px]"
                    role="presentation"
                    onMouseDown={(
                        event,
                    ) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            setOpen(false);
                        }
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="cost-breakdown-title"
                        className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/80 bg-[#fffaf1] shadow-[0_28px_100px_rgba(16,47,48,0.28)]"
                        onMouseDown={(
                            event,
                        ) =>
                            event.stopPropagation()
                        }
                    >
                        {/* Header */}
                        <header className="flex items-start justify-between gap-4 border-b border-[#e2d8c9] px-5 py-5 sm:px-6">
                            <div>
                                <div className="flex items-center gap-2 text-[#d85b48]">
                                    <ReceiptText
                                        size={18}
                                    />

                                    <p className="text-xs font-extrabold uppercase tracking-[0.16em]">
                                        Dự toán hành
                                        trình
                                    </p>
                                </div>

                                <h2
                                    id="cost-breakdown-title"
                                    className="mt-2 font-display text-2xl font-semibold text-[#173a3b]"
                                >
                                    Chi tiết chi
                                    phí
                                </h2>

                                <p className="mt-1 text-sm leading-6 text-[#71807d]">
                                    Mỗi khoản bên
                                    dưới cho biết
                                    đơn giá và cách
                                    hệ thống tính ra
                                    thành tiền.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setOpen(
                                        false,
                                    )
                                }
                                className="rounded-full border border-[#ded5c7] bg-white p-2 text-[#657572] transition hover:border-[#d85b48]/40 hover:text-[#d85b48]"
                                aria-label="Đóng chi tiết dự toán"
                            >
                                <X
                                    size={18}
                                />
                            </button>
                        </header>

                        <div className="max-h-[calc(90vh-180px)] overflow-y-auto px-5 py-5 sm:px-6">
                            {/* Context */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="rounded-2xl bg-white px-3 py-3 text-center">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#83908d]">
                                        Hành khách
                                    </p>

                                    <p className="mt-1 font-bold text-[#173a3b]">
                                        {
                                            summary.travelerCount
                                        }
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-white px-3 py-3 text-center">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#83908d]">
                                        Phòng
                                    </p>

                                    <p className="mt-1 font-bold text-[#173a3b]">
                                        {
                                            summary.roomCount
                                        }
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-white px-3 py-3 text-center">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#83908d]">
                                        Số ngày
                                    </p>

                                    <p className="mt-1 font-bold text-[#173a3b]">
                                        {
                                            summary.dayCount
                                        }
                                    </p>
                                </div>
                            </div>

                            {!hasBreakdown ? (
                                <div className="mt-5 rounded-2xl border border-dashed border-[#d7cabb] bg-white px-5 py-9 text-center">
                                    <ReceiptText
                                        size={30}
                                        className="mx-auto text-[#8b9995]"
                                        strokeWidth={
                                            1.5
                                        }
                                    />

                                    <p className="mt-3 font-bold text-[#173a3b]">
                                        Chưa có chi
                                        phí chi tiết
                                    </p>

                                    <p className="mt-1 text-sm leading-6 text-[#71807d]">
                                        Hành trình
                                        hiện chưa có
                                        khoản chi phí
                                        để phân tích.
                                    </p>
                                </div>
                            ) : (
                                <div className="mt-5 space-y-5">
                                    {visibleCategories.map(
                                        (
                                            category,
                                        ) => {
                                            const categoryCosts =
                                                costsByCategory.get(
                                                    category,
                                                ) ??
                                                [];

                                            return (
                                                <section
                                                    key={
                                                        category
                                                    }
                                                >
                                                    <div className="mb-2 flex items-center justify-between gap-3">
                                                        <h3 className="font-bold text-[#173a3b]">
                                                            {
                                                                CATEGORY_LABELS[
                                                                    category
                                                                ]
                                                            }
                                                        </h3>

                                                        <span className="font-mono text-sm font-bold text-[#d85b48]">
                                                            {formatCurrency(
                                                                summary
                                                                    .byCategory[
                                                                    category
                                                                ],
                                                            )}
                                                        </span>
                                                    </div>

                                                    <div className="overflow-hidden rounded-2xl border border-[#e1d7ca] bg-white">
                                                        {categoryCosts.map(
                                                            (
                                                                cost,
                                                                index,
                                                            ) => (
                                                                <div
                                                                    key={
                                                                        cost.id
                                                                    }
                                                                    className={`px-4 py-4 ${
                                                                        index >
                                                                        0
                                                                            ? "border-t border-[#eee5d9]"
                                                                            : ""
                                                                    }`}
                                                                >
                                                                    <div className="flex items-start justify-between gap-4">
                                                                        <div className="min-w-0">
                                                                            <p className="font-semibold text-[#173a3b]">
                                                                                {
                                                                                    cost.title
                                                                                }
                                                                            </p>

                                                                            <p className="mt-1 font-mono text-xs leading-5 text-[#71807d]">
                                                                                {getCostFormula(
                                                                                    cost,
                                                                                    summary,
                                                                                )}
                                                                            </p>

                                                                            {cost.note ? (
                                                                                <p className="mt-1.5 text-xs leading-5 text-[#8a9592]">
                                                                                    {
                                                                                        cost.note
                                                                                    }
                                                                                </p>
                                                                            ) : null}
                                                                        </div>

                                                                        <strong className="shrink-0 font-mono text-sm text-[#173a3b]">
                                                                            {formatCurrency(
                                                                                cost.calculatedAmount,
                                                                            )}
                                                                        </strong>
                                                                    </div>
                                                                </div>
                                                            ),
                                                        )}

                                                        {category ===
                                                            "accommodation" &&
                                                            stays.map(
                                                                (
                                                                    stay,
                                                                    index,
                                                                ) => (
                                                                    <div
                                                                        key={
                                                                            stay.id
                                                                        }
                                                                        className={`px-4 py-4 ${
                                                                            categoryCosts.length >
                                                                                0 ||
                                                                            index >
                                                                                0
                                                                                ? "border-t border-[#eee5d9]"
                                                                                : ""
                                                                        }`}
                                                                    >
                                                                        <div className="flex items-start justify-between gap-4">
                                                                            <div className="min-w-0">
                                                                                <p className="font-semibold text-[#173a3b]">
                                                                                    {
                                                                                        stay.name
                                                                                    }
                                                                                </p>

                                                                                <p className="mt-1 font-mono text-xs leading-5 text-[#71807d]">
                                                                                    {getStayFormula(
                                                                                        stay,
                                                                                    )}
                                                                                </p>

                                                                                {stay.note ? (
                                                                                    <p className="mt-1.5 text-xs leading-5 text-[#8a9592]">
                                                                                        {
                                                                                            stay.note
                                                                                        }
                                                                                    </p>
                                                                                ) : null}
                                                                            </div>

                                                                            <strong className="shrink-0 font-mono text-sm text-[#173a3b]">
                                                                                {formatCurrency(
                                                                                    stay.calculatedAmount,
                                                                                )}
                                                                            </strong>
                                                                        </div>
                                                                    </div>
                                                                ),
                                                            )}
                                                    </div>
                                                </section>
                                            );
                                        },
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <footer className="border-t border-[#e2d8c9] bg-white/60 px-5 py-4 sm:px-6">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-bold text-[#173a3b]">
                                        Tổng dự toán
                                    </p>

                                    <p className="mt-0.5 text-xs text-[#7d8986]">
                                        Chi phí tham
                                        khảo cho hành
                                        trình hiện
                                        tại
                                    </p>
                                </div>

                                <p className="font-display text-2xl font-semibold text-[#d85b48]">
                                    {formatCurrency(
                                        summary.total,
                                    )}
                                </p>
                            </div>
                        </footer>
                    </section>
                </div>
            ) : null}
        </>
    );
}