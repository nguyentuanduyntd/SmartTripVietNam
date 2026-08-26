"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Calculator,
  LoaderCircle,
  Pencil,
  Plus,
  ReceiptText,
  Trash2,
  X,
} from "lucide-react";

import {
  COST_CALCULATION_UNITS,
  COST_CALCULATION_UNIT_LABELS as CALCULATION_UNIT_LABEL,
  COST_CATEGORIES,
  COST_CATEGORY_LABELS as CATEGORY_LABEL,
  TRAVELER_SCOPES,
  TRAVELER_SCOPE_LABELS as TRAVELER_SCOPE_LABEL,
  type CostCalculationUnit,
  type CostCategory,
  type TravelerScope,
} from "@/src/constants/itinerary";

import {
  calculateCostAmount,
  calculateCostsTotal,
} from "@/src/lib/costs/cost-calculator";
import { formatCostFormula } from "@/src/lib/costs/cost-display";
import { formatVnd } from "@/src/lib/formatters";

import {
  tourCostsApi,
  type CreateTourCostInput,
  type TourCost,
} from "@/src/lib/api-client/tour-costs";

import { ApiRequestError } from "@/src/lib/api-client/http";

type TourCostsDialogTour = {
  id: string;
  name: string;
  durationDays: number;
  durationNights: number;
  estimatedPrice: string | null;
};

type TourCostsDialogProps = {
  open: boolean;
  tour: TourCostsDialogTour;
  onClose: () => void;

  /**
   * Dùng để ToursPage tải lại danh sách,
   * vì estimatedPrice của tour có thể vừa thay đổi.
   */
  onChanged?: () => void | Promise<void>;
};

type CostFormState = {
  title: string;
  category: CostCategory;
  calculationUnit: CostCalculationUnit;
  travelerScope: TravelerScope;

  unitPrice: string;
  quantity: string;
  nightCount: string;

  note: string;
};

const emptyForm: CostFormState = {
  title: "",
  category: "ticket",
  calculationUnit: "per_person",
  travelerScope: "all",

  unitPrice: "",
  quantity: "1",
  nightCount: "",

  note: "",
};

function formatMoney(
  value: string | number | null | undefined,
) {
  return formatVnd(value, "0 ₫");
}

function createFormFromCost(
  cost: TourCost,
): CostFormState {
  return {
    title: cost.title,
    category: cost.category,

    calculationUnit:
      cost.calculationUnit,

    travelerScope:
      cost.travelerScope,

    unitPrice:
      cost.unitPrice,

    quantity:
      cost.quantity,

    nightCount:
      cost.nightCount !== null
        ? String(cost.nightCount)
        : "",

    note:
      cost.note ?? "",
  };
}

export function TourCostsDialog({
  open,
  tour,
  onClose,
  onChanged,
}: TourCostsDialogProps) {
  const [costs, setCosts] = useState<
    TourCost[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [
    editingCost,
    setEditingCost,
  ] = useState<TourCost | null>(
    null,
  );

  const [form, setForm] =
    useState<CostFormState>({
      ...emptyForm,
    });

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(null);

  const [
    fieldErrors,
    setFieldErrors,
  ] = useState<
    Record<string, string[]> | undefined
  >();

  const loadCosts = useCallback(
    async () => {
      try {
        setLoading(true);

        const data =
          await tourCostsApi.list(
            tour.id,
          );

        setCosts(data);
        setErrorMessage(null);
      } catch (error) {
        setErrorMessage(
          error instanceof
            ApiRequestError
            ? error.message
            : "Không tải được chi tiết chi phí",
        );
      } finally {
        setLoading(false);
      }
    },
    [tour.id],
  );

  useEffect(() => {
    if (!open) return;

    const timeoutId = window.setTimeout(() => {
      void loadCosts();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadCosts, open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow =
      document.body.style.overflow;

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key === "Escape" &&
        !submitting
      ) {
        onClose();
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
  }, [
    onClose,
    open,
    submitting,
  ]);

  const calculationContext =
    useMemo(
      () => ({
        /**
         * Đây là context chuẩn để hiển thị
         * estimatedPrice của TOUR MẪU.
         *
         * Tour mẫu hiện đang công bố:
         * "giá tham khảo cho một người".
         */
        adultCount: 1,
        childCount: 0,
        roomCount: 1,

        defaultNightCount:
          tour.durationNights,
      }),
      [tour.durationNights],
    );

  const calculatedTotal =
    useMemo(
      () =>
        calculateCostsTotal(
          costs,
          calculationContext,
        ),
      [
        calculationContext,
        costs,
      ],
    );

  const previewAmount =
    useMemo(() => {
      if (!form.unitPrice.trim()) {
        return 0;
      }

      const parsedNightCount =
        form.nightCount.trim()
          ? Number.parseInt(
              form.nightCount,
              10,
            )
          : null;

      return calculateCostAmount(
        {
          calculationUnit:
            form.calculationUnit,

          travelerScope:
            form.travelerScope,

          unitPrice:
            form.unitPrice,

          quantity:
            form.quantity || "1",

          nightCount:
            Number.isNaN(
              parsedNightCount,
            )
              ? null
              : parsedNightCount,
        },
        calculationContext,
      );
    }, [
      calculationContext,
      form,
    ]);

  function resetForm() {
    setEditingCost(null);

    setForm({
      ...emptyForm,
    });

    setFieldErrors(undefined);
    setErrorMessage(null);
  }

  function startEditing(
    cost: TourCost,
  ) {
    setEditingCost(cost);

    setForm(
      createFormFromCost(cost),
    );

    setFieldErrors(undefined);
    setErrorMessage(null);
  }

  function handleCalculationUnitChange(
    value: CostCalculationUnit,
  ) {
    setForm((current) => ({
      ...current,

      calculationUnit: value,

      /**
       * Nếu chuyển khỏi per_room,
       * phải clear nightCount để backend
       * không từ chối dữ liệu.
       */
      nightCount:
        value === "per_room"
          ? current.nightCount
          : "",
    }));
  }

  async function notifyChanged() {
    if (!onChanged) return;

    await onChanged();
  }

  async function handleSubmit() {
    if (
      !form.title.trim() ||
      !form.unitPrice.trim()
    ) {
      setErrorMessage(
        "Vui lòng nhập tên khoản chi phí và đơn giá",
      );

      return;
    }

    setSubmitting(true);
    setFieldErrors(undefined);
    setErrorMessage(null);

    const parsedNightCount =
      form.nightCount.trim()
        ? Number.parseInt(
            form.nightCount,
            10,
          )
        : null;

    const input: CreateTourCostInput =
      {
        title:
          form.title.trim(),

        category:
          form.category,

        calculationUnit:
          form.calculationUnit,

        travelerScope:
          form.travelerScope,

        unitPrice:
          form.unitPrice.trim(),

        quantity:
          form.quantity.trim() ||
          "1",

        /**
         * Cost tạo trong dialog này trước mắt
         * áp dụng ở cấp toàn tour.
         *
         * Sau này nếu muốn gắn trực tiếp
         * activity/day/meal, API và DB đã
         * sẵn sàng hỗ trợ.
         */
        tourDayId: null,
        tourItemId: null,
        tourMealId: null,

        nightCount:
          form.calculationUnit ===
            "per_room" &&
          Number.isFinite(
            parsedNightCount,
          )
            ? parsedNightCount
            : null,

        note:
          form.note.trim()
            ? form.note.trim()
            : null,

        sortOrder:
          editingCost?.sortOrder ??
          costs.length,
      };

    try {
      if (editingCost) {
        await tourCostsApi.update(
          editingCost.id,
          input,
        );
      } else {
        await tourCostsApi.create(
          tour.id,
          input,
        );
      }

      resetForm();

      await loadCosts();
      await notifyChanged();
    } catch (error) {
      if (
        error instanceof
        ApiRequestError
      ) {
        setFieldErrors(
          error.fieldErrors,
        );

        setErrorMessage(
          error.message,
        );
      } else {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Không thể lưu khoản chi phí",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(
    cost: TourCost,
  ) {
    const confirmed =
      window.confirm(
        `Xóa khoản chi phí "${cost.title}"?`,
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(cost.id);
    setErrorMessage(null);

    try {
      await tourCostsApi.remove(
        cost.id,
      );

      if (
        editingCost?.id === cost.id
      ) {
        resetForm();
      }

      await loadCosts();
      await notifyChanged();
    } catch (error) {
      setErrorMessage(
        error instanceof
          ApiRequestError
          ? error.message
          : "Không thể xóa khoản chi phí",
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !submitting
        ) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-costs-dialog-title"
        className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-admin-line bg-admin-paper-card shadow-2xl"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-admin-line bg-admin-paper-card px-6 py-5">
          <div>
            <div className="mb-1 flex items-center gap-2 text-admin-muted">
              <ReceiptText
                size={17}
                strokeWidth={1.75}
              />

              <span className="text-xs font-semibold uppercase tracking-[0.12em]">
                Chi phí tour
              </span>
            </div>

            <h2
              id="tour-costs-dialog-title"
              className="font-display text-2xl font-semibold text-admin-ink"
            >
              {tour.name}
            </h2>

            <p className="mt-1 text-sm text-admin-muted">
              {tour.durationDays} ngày ·{" "}
              {tour.durationNights} đêm
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng"
            className="rounded-md p-1.5 text-admin-muted transition hover:bg-admin-paper hover:text-admin-ink disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr]">
          {/* LEFT - Breakdown */}
          <section>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-admin-line bg-admin-paper px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-admin-muted">
                  Dự toán hiện tại
                </p>

                <p className="mt-1 font-mono text-xl font-semibold text-admin-ink">
                  {formatMoney(
                    calculatedTotal,
                  )}
                </p>

                <p className="mt-1 text-xs text-admin-muted">
                  Cho 1 người lớn · 1 phòng
                </p>
              </div>

              <div className="rounded-lg border border-admin-line bg-admin-paper px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-admin-muted">
                  Số khoản chi
                </p>

                <p className="mt-1 font-mono text-xl font-semibold text-admin-ink">
                  {costs.length}
                </p>

                <p className="mt-1 text-xs text-admin-muted">
                  Có thể xem rõ từng khoản
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="mb-4 rounded-md border border-admin-seal bg-admin-seal-light px-3 py-2 text-sm text-admin-seal">
                {errorMessage}
              </div>
            )}

            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-admin-ink">
                  Chi tiết dự toán
                </h3>

                <p className="text-xs text-admin-muted">
                  Tổng tiền được tính từ các khoản bên dưới
                </p>
              </div>

              <button
                type="button"
                onClick={resetForm}
                disabled={
                  submitting ||
                  Boolean(deletingId)
                }
                className="inline-flex items-center gap-1.5 rounded-md border border-admin-gold px-2.5 py-1.5 text-xs font-medium text-admin-ink transition hover:bg-admin-gold disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={14} />
                Thêm khoản
              </button>
            </div>

            {loading ? (
              <div className="flex min-h-48 items-center justify-center rounded-lg border border-admin-line">
                <div className="flex items-center gap-2 text-sm text-admin-muted">
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                  />

                  Đang tải chi phí…
                </div>
              </div>
            ) : costs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-admin-line px-5 py-10 text-center">
                <Calculator
                  size={28}
                  className="mx-auto text-admin-muted"
                  strokeWidth={1.5}
                />

                <p className="mt-3 text-sm font-medium text-admin-ink">
                  Tour chưa có breakdown chi phí
                </p>

                <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-admin-muted">
                  Hãy thêm vé, lưu trú,
                  di chuyển, ăn uống…
                  để giá dự kiến được tính
                  từ dữ liệu cụ thể thay vì
                  một con số tổng không có
                  giải thích.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {costs.map((cost) => {
                  const amount =
                    calculateCostAmount(
                      cost,
                      calculationContext,
                    );

                  const isDeleting =
                    deletingId === cost.id;

                  return (
                    <div
                      key={cost.id}
                      className={`rounded-lg border px-4 py-3 transition ${
                        editingCost?.id ===
                        cost.id
                          ? "border-admin-gold bg-admin-paper"
                          : "border-admin-line bg-admin-paper-card"
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-admin-ink">
                              {cost.title}
                            </p>

                            <span className="rounded-full border border-admin-line px-2 py-0.5 text-[10px] font-medium text-admin-muted">
                              {
                                CATEGORY_LABEL[
                                  cost.category
                                ]
                              }
                            </span>
                          </div>

                          <p className="mt-1 font-mono text-xs text-admin-muted">
                            {formatCostFormula(
                              cost,
                              calculationContext,
                              {
                                groupLabel: "nhóm",
                                alwaysShowQuantity: true,
                              },
                            )}
                          </p>

                          {cost.note && (
                            <p className="mt-1 text-xs text-admin-muted">
                              {cost.note}
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 items-start gap-3">
                          <span className="pt-0.5 font-mono text-sm font-semibold text-admin-ink">
                            {formatMoney(
                              amount,
                            )}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              startEditing(
                                cost,
                              )
                            }
                            disabled={
                              submitting ||
                              Boolean(
                                deletingId,
                              )
                            }
                            aria-label={`Sửa ${cost.title}`}
                            className="text-admin-muted transition hover:text-admin-ink disabled:opacity-40"
                          >
                            <Pencil
                              size={15}
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void handleDelete(
                                cost,
                              )
                            }
                            disabled={
                              submitting ||
                              Boolean(
                                deletingId,
                              )
                            }
                            aria-label={`Xóa ${cost.title}`}
                            className="text-admin-muted transition hover:text-admin-seal disabled:opacity-40"
                          >
                            {isDeleting ? (
                              <LoaderCircle
                                size={15}
                                className="animate-spin"
                              />
                            ) : (
                              <Trash2
                                size={15}
                              />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="mt-3 flex items-center justify-between border-t border-admin-line px-1 pt-4">
                  <span className="text-sm font-semibold text-admin-ink">
                    Tổng dự toán
                  </span>

                  <span className="font-mono text-lg font-semibold text-admin-ink">
                    {formatMoney(
                      calculatedTotal,
                    )}
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* RIGHT - Form */}
          <section className="rounded-xl border border-admin-line bg-admin-paper p-5">
            <div className="mb-4">
              <h3 className="font-medium text-admin-ink">
                {editingCost
                  ? "Sửa khoản chi phí"
                  : "Thêm khoản chi phí"}
              </h3>

              <p className="mt-1 text-xs leading-5 text-admin-muted">
                Khai báo đơn giá và cách
                tính. Hệ thống sẽ tự tính
                lại tổng dự toán của tour.
              </p>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label
                  htmlFor="tour-cost-title"
                  className="mb-1.5 block text-sm font-medium text-admin-muted"
                >
                  Tên khoản chi
                </label>

                <input
                  id="tour-cost-title"
                  value={form.title}
                  disabled={submitting}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        title:
                          event.target
                            .value,
                      }),
                    )
                  }
                  className="w-full rounded-md border border-admin-line bg-admin-paper-card px-3 py-2 text-sm text-admin-ink outline-none focus:border-admin-gold disabled:opacity-60"
                  placeholder="Ví dụ: Vé Đại Nội Huế"
                />

                {fieldErrors?.title?.[0] && (
                  <p className="mt-1 text-xs text-admin-seal">
                    {
                      fieldErrors
                        .title[0]
                    }
                  </p>
                )}
              </div>

              {/* Category */}
              <div>
                <label
                  htmlFor="tour-cost-category"
                  className="mb-1.5 block text-sm font-medium text-admin-muted"
                >
                  Nhóm chi phí
                </label>

                <select
                  id="tour-cost-category"
                  value={form.category}
                  disabled={submitting}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        category:
                          event.target
                            .value as CostCategory,
                      }),
                    )
                  }
                  className="w-full rounded-md border border-admin-line bg-admin-paper-card px-3 py-2 text-sm text-admin-ink outline-none focus:border-admin-gold disabled:opacity-60"
                >
                  {COST_CATEGORIES.map(
                    (category) => (
                      <option
                        key={category}
                        value={category}
                      >
                        {
                          CATEGORY_LABEL[
                            category
                          ]
                        }
                      </option>
                    ),
                  )}
                </select>
              </div>

              {/* Calculation */}
              <div>
                <label
                  htmlFor="tour-cost-calculation"
                  className="mb-1.5 block text-sm font-medium text-admin-muted"
                >
                  Cách tính
                </label>

                <select
                  id="tour-cost-calculation"
                  value={
                    form.calculationUnit
                  }
                  disabled={submitting}
                  onChange={(event) =>
                    handleCalculationUnitChange(
                      event.target
                        .value as CostCalculationUnit,
                    )
                  }
                  className="w-full rounded-md border border-admin-line bg-admin-paper-card px-3 py-2 text-sm text-admin-ink outline-none focus:border-admin-gold disabled:opacity-60"
                >
                  {COST_CALCULATION_UNITS.map(
                    (unit) => (
                      <option
                        key={unit}
                        value={unit}
                      >
                        {
                          CALCULATION_UNIT_LABEL[
                            unit
                          ]
                        }
                      </option>
                    ),
                  )}
                </select>
              </div>

              {/* Traveler scope */}
              {form.calculationUnit ===
                "per_person" && (
                <div>
                  <label
                    htmlFor="tour-cost-traveler-scope"
                    className="mb-1.5 block text-sm font-medium text-admin-muted"
                  >
                    Áp dụng cho
                  </label>

                  <select
                    id="tour-cost-traveler-scope"
                    value={
                      form.travelerScope
                    }
                    disabled={submitting}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,

                          travelerScope:
                            event.target
                              .value as TravelerScope,
                        }),
                      )
                    }
                    className="w-full rounded-md border border-admin-line bg-admin-paper-card px-3 py-2 text-sm text-admin-ink outline-none focus:border-admin-gold disabled:opacity-60"
                  >
                    {TRAVELER_SCOPES.map(
                      (scope) => (
                        <option
                          key={scope}
                          value={scope}
                        >
                          {
                            TRAVELER_SCOPE_LABEL[
                              scope
                            ]
                          }
                        </option>
                      ),
                    )}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {/* Price */}
                <div>
                  <label
                    htmlFor="tour-cost-price"
                    className="mb-1.5 block text-sm font-medium text-admin-muted"
                  >
                    Đơn giá (VNĐ)
                  </label>

                  <input
                    id="tour-cost-price"
                    type="number"
                    min={0}
                    step={1}
                    value={
                      form.unitPrice
                    }
                    disabled={submitting}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          unitPrice:
                            event.target
                              .value,
                        }),
                      )
                    }
                    className="w-full rounded-md border border-admin-line bg-admin-paper-card px-3 py-2 font-mono text-sm text-admin-ink outline-none focus:border-admin-gold disabled:opacity-60"
                    placeholder="200000"
                  />

                  {fieldErrors
                    ?.unitPrice?.[0] && (
                    <p className="mt-1 text-xs text-admin-seal">
                      {
                        fieldErrors
                          .unitPrice[0]
                      }
                    </p>
                  )}
                </div>

                {/* Quantity */}
                <div>
                  <label
                    htmlFor="tour-cost-quantity"
                    className="mb-1.5 block text-sm font-medium text-admin-muted"
                  >
                    Số lượng
                  </label>

                  <input
                    id="tour-cost-quantity"
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={
                      form.quantity
                    }
                    disabled={submitting}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          quantity:
                            event.target
                              .value,
                        }),
                      )
                    }
                    className="w-full rounded-md border border-admin-line bg-admin-paper-card px-3 py-2 font-mono text-sm text-admin-ink outline-none focus:border-admin-gold disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Night */}
              {form.calculationUnit ===
                "per_room" && (
                <div>
                  <label
                    htmlFor="tour-cost-night-count"
                    className="mb-1.5 block text-sm font-medium text-admin-muted"
                  >
                    Số đêm
                  </label>

                  <input
                    id="tour-cost-night-count"
                    type="number"
                    min={1}
                    step={1}
                    value={
                      form.nightCount
                    }
                    disabled={submitting}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,

                          nightCount:
                            event.target
                              .value,
                        }),
                      )
                    }
                    className="w-full rounded-md border border-admin-line bg-admin-paper-card px-3 py-2 font-mono text-sm text-admin-ink outline-none focus:border-admin-gold disabled:opacity-60"
                    placeholder={
                      tour.durationNights >
                      0
                        ? `Để trống = ${tour.durationNights} đêm của tour`
                        : "Ví dụ: 1"
                    }
                  />

                  <p className="mt-1 text-xs text-admin-muted">
                    Để trống sẽ dùng số
                    đêm mặc định của tour.
                  </p>

                  {fieldErrors
                    ?.nightCount?.[0] && (
                    <p className="mt-1 text-xs text-admin-seal">
                      {
                        fieldErrors
                          .nightCount[0]
                      }
                    </p>
                  )}
                </div>
              )}

              {/* Note */}
              <div>
                <label
                  htmlFor="tour-cost-note"
                  className="mb-1.5 block text-sm font-medium text-admin-muted"
                >
                  Ghi chú / nguồn giá
                </label>

                <textarea
                  id="tour-cost-note"
                  rows={3}
                  value={form.note}
                  disabled={submitting}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        note:
                          event.target
                            .value,
                      }),
                    )
                  }
                  className="w-full resize-y rounded-md border border-admin-line bg-admin-paper-card px-3 py-2 text-sm text-admin-ink outline-none focus:border-admin-gold disabled:opacity-60"
                  placeholder="Ví dụ: Giá niêm yết tham khảo 08/2026"
                />
              </div>

              {/* Preview */}
              <div className="rounded-lg border border-admin-gold/60 bg-admin-paper-card px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-admin-muted">
                      Thành tiền dự kiến
                    </p>

                    <p className="mt-1 text-xs text-admin-muted">
                      Theo mức tham khảo
                      1 người · 1 phòng
                    </p>
                  </div>

                  <p className="font-mono text-lg font-semibold text-admin-ink">
                    {formatMoney(
                      previewAmount,
                    )}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                {editingCost && (
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={submitting}
                    className="rounded-md border border-admin-line px-3 py-2 text-sm font-medium text-admin-ink transition hover:bg-admin-paper-card disabled:opacity-50"
                  >
                    Hủy sửa
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    void handleSubmit()
                  }
                  disabled={
                    submitting ||
                    loading ||
                    Boolean(deletingId)
                  }
                  className="inline-flex items-center gap-1.5 rounded-md border border-admin-gold bg-admin-gold px-3 py-2 text-sm font-medium text-admin-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <LoaderCircle
                        size={15}
                        className="animate-spin"
                      />
                      Đang lưu…
                    </>
                  ) : editingCost ? (
                    <>
                      <Pencil
                        size={15}
                      />
                      Lưu thay đổi
                    </>
                  ) : (
                    <>
                      <Plus
                        size={15}
                      />
                      Thêm khoản
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
