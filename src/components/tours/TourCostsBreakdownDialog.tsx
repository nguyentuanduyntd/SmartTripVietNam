"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ChevronRight,
  ReceiptText,
  WalletCards,
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
  calculateCostAmount,
  calculateCostsTotal,
} from "@/src/lib/costs/cost-calculator";
import { formatCostFormula } from "@/src/lib/costs/cost-display";
import { formatVnd } from "@/src/lib/formatters";

type TourCost = {
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

  sortOrder: number;
};

type TourCostBreakdownDialogProps = {
  costs: TourCost[];

  durationNights: number;

  /**
   * Giá legacy của tour.
   *
   * Nếu tour cũ chưa có breakdown,
   * component vẫn có thể giải thích
   * rằng đây là mức giá tham khảo cũ.
   */
  estimatedPrice: string | null;
};

function formatCurrency(
  value:
    | string
    | number
    | null
    | undefined,
) {
  return formatVnd(value, "Đang cập nhật");
}

export function TourCostBreakdownDialog({
  costs,
  durationNights,
  estimatedPrice,
}: TourCostBreakdownDialogProps) {
  const [open, setOpen] =
    useState(false);

  const calculationContext =
    useMemo(
      () => ({
        /**
         * Tour public hiện công bố
         * mức tham khảo:
         *
         * 1 người lớn
         * 1 phòng
         */
        adultCount: 1,
        childCount: 0,
        roomCount: 1,

        defaultNightCount:
          durationNights,
      }),
      [durationNights],
    );

  const calculatedTotal =
    useMemo(
      () =>
        costs.length > 0
          ? calculateCostsTotal(
              costs,
              calculationContext,
            )
          : Number(
              estimatedPrice,
            ) || 0,
      [
        calculationContext,
        costs,
        estimatedPrice,
      ],
    );

  const costsByCategory =
    useMemo(() => {
      const result =
        new Map<
          CostCategory,
          TourCost[]
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
        }
      }

      return result;
    }, [costs]);

  const categoryTotals =
    useMemo(() => {
      const result =
        {} as Record<
          CostCategory,
          number
        >;

      for (const category of
        CATEGORY_ORDER) {
        const categoryCosts =
          costsByCategory.get(
            category,
          ) ?? [];

        result[category] =
          categoryCosts.reduce(
            (
              total,
              cost,
            ) =>
              total +
              calculateCostAmount(
                cost,
                calculationContext,
              ),
            0,
          );
      }

      return result;
    }, [
      calculationContext,
      costsByCategory,
    ]);

  const visibleCategories =
    CATEGORY_ORDER.filter(
      (category) =>
        (
          costsByCategory.get(
            category,
          ) ?? []
        ).length > 0,
    );

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
        event.key === "Escape"
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

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={() =>
          setOpen(true)
        }
        className="group w-full rounded-[24px] border border-[#ded3c3] bg-[#f7f0e4] p-5 text-left transition hover:border-[#f25f4b]/45 hover:shadow-[0_14px_40px_rgba(39,55,52,0.08)]"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#fffaf1] text-[#f25f4b]">
            <WalletCards
              size={21}
            />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-[#8a8575]">
                Chi phí dự kiến
              </p>

              <ChevronRight
                size={15}
                className="text-[#9a9b91] transition group-hover:translate-x-0.5 group-hover:text-[#f25f4b]"
              />
            </div>

            <p className="mt-1 truncate font-bold text-[#173a3b]">
              {formatCurrency(
                calculatedTotal,
              )}
            </p>

            <p className="mt-1 text-[10px] font-semibold text-[#9b9483]">
              Xem chi tiết
            </p>
          </div>
        </div>
      </button>

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
            aria-labelledby="tour-cost-breakdown-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/80 bg-[#fffaf1] shadow-[0_28px_100px_rgba(16,47,48,0.28)]"
            onMouseDown={(
              event,
            ) =>
              event.stopPropagation()
            }
          >
            <header className="flex items-start justify-between gap-4 border-b border-[#e2d8c9] px-5 py-5 sm:px-6">
              <div>
                <div className="flex items-center gap-2 text-[#d85b48]">
                  <ReceiptText
                    size={18}
                  />

                  <p className="text-xs font-extrabold uppercase tracking-[0.16em]">
                    Chi phí tour
                  </p>
                </div>

                <h2
                  id="tour-cost-breakdown-title"
                  className="mt-2 font-display text-2xl font-semibold text-[#173a3b]"
                >
                  Chi tiết dự toán
                </h2>

                <p className="mt-1 text-sm leading-6 text-[#71807d]">
                  Mức tham khảo
                  được tính cho 1
                  người lớn và 1
                  phòng.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setOpen(false)
                }
                className="rounded-full border border-[#ded5c7] bg-white p-2 text-[#657572] transition hover:border-[#d85b48]/40 hover:text-[#d85b48]"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </header>

            <div className="max-h-[calc(90vh-180px)] overflow-y-auto px-5 py-5 sm:px-6">
              {costs.length ===
              0 ? (
                <div className="rounded-2xl border border-dashed border-[#d7cabb] bg-white px-5 py-9 text-center">
                  <WalletCards
                    size={30}
                    className="mx-auto text-[#8b9995]"
                    strokeWidth={
                      1.5
                    }
                  />

                  <p className="mt-3 font-bold text-[#173a3b]">
                    Tour chưa có
                    breakdown chi
                    phí
                  </p>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#71807d]">
                    Giá hiện tại là
                    mức tham khảo cũ.
                    Chi tiết từng
                    khoản đang được
                    cập nhật.
                  </p>

                  {estimatedPrice ? (
                    <p className="mt-5 font-display text-3xl font-semibold text-[#d85b48]">
                      {formatCurrency(
                        estimatedPrice,
                      )}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-5">
                  {visibleCategories.map(
                    (
                      category,
                    ) => {
                      const categoryCosts =
                        costsByCategory.get(
                          category,
                        ) ?? [];

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
                                categoryTotals[
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
                              ) => {
                                const amount =
                                  calculateCostAmount(
                                    cost,
                                    calculationContext,
                                  );

                                return (
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
                                          {formatCostFormula(
                                            cost,
                                            calculationContext,
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
                                          amount,
                                        )}
                                      </strong>
                                    </div>
                                  </div>
                                );
                              },
                            )}
                          </div>
                        </section>
                      );
                    },
                  )}
                </div>
              )}
            </div>

            <footer className="border-t border-[#e2d8c9] bg-white/60 px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-[#173a3b]">
                    Tổng dự toán
                  </p>

                  <p className="mt-0.5 text-xs text-[#7d8986]">
                    Mức tham khảo
                    cho một người
                  </p>
                </div>

                <p className="font-display text-2xl font-semibold text-[#d85b48]">
                  {formatCurrency(
                    calculatedTotal,
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
