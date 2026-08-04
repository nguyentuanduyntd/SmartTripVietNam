"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
    BedDouble,
    CalendarDays,
    LoaderCircle,
    Route,
    UserRound,
    UsersRound,
    X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";

import {
    itinerarySetupFormSchema,
    type ItinerarySetupForm,
} from "@/src/db/schema/itinerary.schema";

type UseTourDialogProps = {
    sourceTourId: string;
    tourName: string;
};

const FORM_FIELDS = [
    "title",
    "startDate",
    "adultCount",
    "childCount",
    "roomCount",
] as const satisfies readonly (keyof ItinerarySetupForm)[];

function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
    );
}

function getApiMessage(
    payload: unknown,
    fallback: string,
) {
    if (
        isRecord(payload) &&
        typeof payload.message === "string"
    ) {
        return payload.message;
    }

    return fallback;
}

function getRedirectPath(payload: unknown) {
    if (
        !isRecord(payload) ||
        payload.success !== true ||
        !isRecord(payload.data) ||
        typeof payload.data.redirectTo !== "string"
    ) {
        return null;
    }

    const redirectTo = payload.data.redirectTo;

    if (
        !redirectTo.startsWith("/") ||
        redirectTo.startsWith("//")
    ) {
        return null;
    }

    return redirectTo;
}

function getLocalDateInputValue(date: Date) {
    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1,
    ).padStart(2, "0");

    const day = String(
        date.getDate(),
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getDefaultStartDate() {
    const date = new Date();

    date.setDate(date.getDate() + 7);

    return getLocalDateInputValue(date);
}

function getTodayDate() {
    return getLocalDateInputValue(new Date());
}

function getDefaultValues(
    tourName: string,
): ItinerarySetupForm {
    return {
        title: tourName,
        startDate: getDefaultStartDate(),
        adultCount: 2,
        childCount: 0,
        roomCount: 1,
    };
}

export function UseTourDialog({
    sourceTourId,
    tourName,
}: UseTourDialogProps) {
    const router = useRouter();

    const titleId = useId();
    const descriptionId = useId();

    const [isOpen, setIsOpen] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        setError,
        clearErrors,
        formState: {
            errors,
            isSubmitting,
        },
    } = useForm<ItinerarySetupForm>({
        resolver: zodResolver(
            itinerarySetupFormSchema,
        ),
        defaultValues: getDefaultValues(tourName),
        mode: "onSubmit",
        reValidateMode: "onChange",
    });

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const previousOverflow =
            document.body.style.overflow;

        document.body.style.overflow = "hidden";

        function handleKeyDown(
            event: KeyboardEvent,
        ) {
            if (
                event.key === "Escape" &&
                !isSubmitting
            ) {
                setIsOpen(false);
            }
        }

        window.addEventListener(
            "keydown",
            handleKeyDown,
        );

        return () => {
            document.body.style.overflow =
                previousOverflow;

            window.removeEventListener(
                "keydown",
                handleKeyDown,
            );
        };
    }, [isOpen, isSubmitting]);

    function openDialog() {
        reset(getDefaultValues(tourName));
        clearErrors();
        setIsOpen(true);
    }

    function closeDialog() {
        if (isSubmitting) {
            return;
        }

        setIsOpen(false);
    }

    function applyServerFieldErrors(
        payload: unknown,
    ) {
        if (
            !isRecord(payload) ||
            !isRecord(payload.errors)
        ) {
            return;
        }

        for (const field of FORM_FIELDS) {
            const messages = payload.errors[field];

            if (
                Array.isArray(messages) &&
                typeof messages[0] === "string"
            ) {
                setError(field, {
                    type: "server",
                    message: messages[0],
                });
            }
        }
    }

    async function submitForm(
        values: ItinerarySetupForm,
    ) {
        clearErrors();

        try {
            const response = await fetch(
                "/api/itineraries/from-tour",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify({
                        sourceTourId,
                        ...values,
                    }),
                },
            );

            const payload: unknown =
                await response
                    .json()
                    .catch(() => null);

            if (response.status === 401) {
                const returnPath = [
                    window.location.pathname,
                    window.location.search,
                    window.location.hash,
                ].join("");

                window.location.assign(
                    `/auth/login?next=${encodeURIComponent(
                        returnPath,
                    )}`,
                );

                return;
            }

            if (!response.ok) {
                applyServerFieldErrors(payload);

                setError("root.server", {
                    type: "server",
                    message: getApiMessage(
                        payload,
                        "Không thể tạo hành trình. Vui lòng thử lại.",
                    ),
                });

                return;
            }

            const redirectTo =
                getRedirectPath(payload);

            if (!redirectTo) {
                setError("root.server", {
                    type: "server",
                    message:
                        "Hành trình đã được tạo nhưng máy chủ không trả về đường dẫn hợp lệ.",
                });

                return;
            }

            setIsOpen(false);

            router.push(redirectTo);
            router.refresh();
        } catch (error) {
            console.error(
                "Không thể tạo hành trình:",
                error,
            );

            setError("root.server", {
                type: "server",
                message:
                    "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối và thử lại.",
            });
        }
    }

    const dialog =
        isOpen &&
        typeof document !== "undefined"
            ? createPortal(
                  <div
                      role="presentation"
                      className="fixed inset-0 z-[9999] flex items-end justify-center overflow-y-auto bg-[#102f30]/65 p-0 backdrop-blur-sm sm:items-center sm:p-6"
                      onMouseDown={(event) => {
                          if (
                              event.target ===
                              event.currentTarget
                          ) {
                              closeDialog();
                          }
                      }}
                  >
                      <section
                          role="dialog"
                          aria-modal="true"
                          aria-labelledby={titleId}
                          aria-describedby={
                              descriptionId
                          }
                          aria-busy={isSubmitting}
                          className="flex max-h-[calc(100dvh-12px)] w-full flex-col overflow-hidden rounded-t-[30px] border border-white/70 bg-[#fffaf1] shadow-[0_30px_100px_rgba(10,35,36,0.35)] sm:max-h-[calc(100dvh-48px)] sm:max-w-2xl sm:rounded-[30px]"
                          onMouseDown={(event) => {
                              event.stopPropagation();
                          }}
                      >
                          <header className="flex shrink-0 items-start justify-between gap-5 border-b border-[#e2d8c9] bg-[#fffaf1] px-5 py-5 sm:px-7 sm:py-6">
                              <div className="min-w-0">
                                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#d85b48]">
                                      Tạo bản hành trình
                                      riêng
                                  </p>

                                  <h2
                                      id={titleId}
                                      className="mt-2 font-display text-2xl font-semibold text-[#173a3b] sm:text-3xl"
                                  >
                                      Thiết lập chuyến đi
                                  </h2>

                                  <p
                                      id={descriptionId}
                                      className="mt-2 max-w-xl text-sm leading-6 text-[#687572]"
                                  >
                                      Hệ thống sẽ sao chép
                                      tour mẫu thành một bản
                                      riêng trong tài khoản.
                                      Các chỉnh sửa sau đó
                                      không ảnh hưởng tới tour
                                      gốc.
                                  </p>
                              </div>

                              <button
                                  type="button"
                                  onClick={closeDialog}
                                  disabled={isSubmitting}
                                  aria-label="Đóng hộp thiết lập"
                                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#ddd2c2] bg-white text-[#60706d] transition hover:border-[#c9bba7] hover:bg-[#f3eadc] hover:text-[#173a3b] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2f8f8b]/15 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                  <X size={19} />
                              </button>
                          </header>

                          <form
                              onSubmit={handleSubmit(
                                  submitForm,
                              )}
                              className="flex min-h-0 flex-1 flex-col"
                              noValidate
                          >
                              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7 sm:py-6">
                                  <div>
                                      <label
                                          htmlFor="itinerary-title"
                                          className="mb-2 block text-sm font-bold text-[#294748]"
                                      >
                                          Tên hành trình
                                      </label>

                                      <div className="relative">
                                          <Route
                                              size={18}
                                              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#82908d]"
                                          />

                                          <input
                                              id="itinerary-title"
                                              type="text"
                                              autoFocus
                                              autoComplete="off"
                                              disabled={
                                                  isSubmitting
                                              }
                                              {...register(
                                                  "title",
                                              )}
                                              className="h-14 w-full rounded-2xl border border-[#d8cdbc] bg-white/80 pl-12 pr-4 text-[#173a3b] outline-none transition placeholder:text-[#a2aaa7] focus:border-[#2f8f8b] focus:bg-white focus:ring-4 focus:ring-[#2f8f8b]/10 disabled:cursor-not-allowed disabled:opacity-60"
                                          />
                                      </div>

                                      {errors.title ? (
                                          <p className="mt-2 text-sm text-[#b54c3d]">
                                              {
                                                  errors
                                                      .title
                                                      .message
                                              }
                                          </p>
                                      ) : null}
                                  </div>

                                  <div className="mt-5">
                                      <label
                                          htmlFor="itinerary-start-date"
                                          className="mb-2 block text-sm font-bold text-[#294748]"
                                      >
                                          Ngày khởi hành
                                      </label>

                                      <div className="relative">
                                          <CalendarDays
                                              size={18}
                                              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#82908d]"
                                          />

                                          <input
                                              id="itinerary-start-date"
                                              type="date"
                                              min={getTodayDate()}
                                              disabled={
                                                  isSubmitting
                                              }
                                              {...register(
                                                  "startDate",
                                              )}
                                              className="h-14 w-full rounded-2xl border border-[#d8cdbc] bg-white/80 pl-12 pr-4 text-[#173a3b] outline-none transition focus:border-[#2f8f8b] focus:bg-white focus:ring-4 focus:ring-[#2f8f8b]/10 disabled:cursor-not-allowed disabled:opacity-60"
                                          />
                                      </div>

                                      {errors.startDate ? (
                                          <p className="mt-2 text-sm text-[#b54c3d]">
                                              {
                                                  errors
                                                      .startDate
                                                      .message
                                              }
                                          </p>
                                      ) : null}
                                  </div>

                                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                                      <div>
                                          <label
                                              htmlFor="adult-count"
                                              className="mb-2 block text-sm font-bold text-[#294748]"
                                          >
                                              Người lớn
                                          </label>

                                          <div className="relative">
                                              <UserRound
                                                  size={18}
                                                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#82908d]"
                                              />

                                              <input
                                                  id="adult-count"
                                                  type="number"
                                                  min={1}
                                                  max={50}
                                                  step={1}
                                                  inputMode="numeric"
                                                  disabled={
                                                      isSubmitting
                                                  }
                                                  {...register(
                                                      "adultCount",
                                                      {
                                                          valueAsNumber:
                                                              true,
                                                      },
                                                  )}
                                                  className="h-14 w-full rounded-2xl border border-[#d8cdbc] bg-white/80 pl-12 pr-4 text-[#173a3b] outline-none transition focus:border-[#2f8f8b] focus:bg-white focus:ring-4 focus:ring-[#2f8f8b]/10 disabled:cursor-not-allowed disabled:opacity-60"
                                              />
                                          </div>

                                          {errors.adultCount ? (
                                              <p className="mt-2 text-sm text-[#b54c3d]">
                                                  {
                                                      errors
                                                          .adultCount
                                                          .message
                                                  }
                                              </p>
                                          ) : null}
                                      </div>

                                      <div>
                                          <label
                                              htmlFor="child-count"
                                              className="mb-2 block text-sm font-bold text-[#294748]"
                                          >
                                              Trẻ em
                                          </label>

                                          <div className="relative">
                                              <UsersRound
                                                  size={18}
                                                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#82908d]"
                                              />

                                              <input
                                                  id="child-count"
                                                  type="number"
                                                  min={0}
                                                  max={50}
                                                  step={1}
                                                  inputMode="numeric"
                                                  disabled={
                                                      isSubmitting
                                                  }
                                                  {...register(
                                                      "childCount",
                                                      {
                                                          valueAsNumber:
                                                              true,
                                                      },
                                                  )}
                                                  className="h-14 w-full rounded-2xl border border-[#d8cdbc] bg-white/80 pl-12 pr-4 text-[#173a3b] outline-none transition focus:border-[#2f8f8b] focus:bg-white focus:ring-4 focus:ring-[#2f8f8b]/10 disabled:cursor-not-allowed disabled:opacity-60"
                                              />
                                          </div>

                                          {errors.childCount ? (
                                              <p className="mt-2 text-sm text-[#b54c3d]">
                                                  {
                                                      errors
                                                          .childCount
                                                          .message
                                                  }
                                              </p>
                                          ) : null}
                                      </div>

                                      <div>
                                          <label
                                              htmlFor="room-count"
                                              className="mb-2 block text-sm font-bold text-[#294748]"
                                          >
                                              Số phòng
                                          </label>

                                          <div className="relative">
                                              <BedDouble
                                                  size={18}
                                                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#82908d]"
                                              />

                                              <input
                                                  id="room-count"
                                                  type="number"
                                                  min={1}
                                                  max={30}
                                                  step={1}
                                                  inputMode="numeric"
                                                  disabled={
                                                      isSubmitting
                                                  }
                                                  {...register(
                                                      "roomCount",
                                                      {
                                                          valueAsNumber:
                                                              true,
                                                      },
                                                  )}
                                                  className="h-14 w-full rounded-2xl border border-[#d8cdbc] bg-white/80 pl-12 pr-4 text-[#173a3b] outline-none transition focus:border-[#2f8f8b] focus:bg-white focus:ring-4 focus:ring-[#2f8f8b]/10 disabled:cursor-not-allowed disabled:opacity-60"
                                              />
                                          </div>

                                          {errors.roomCount ? (
                                              <p className="mt-2 text-sm text-[#b54c3d]">
                                                  {
                                                      errors
                                                          .roomCount
                                                          .message
                                                  }
                                              </p>
                                          ) : null}
                                      </div>
                                  </div>

                                  {errors.root?.server ? (
                                      <div
                                          role="alert"
                                          className="mt-5 rounded-2xl border border-[#efc5bd] bg-[#fff0eb] px-4 py-3 text-sm leading-6 text-[#a44436]"
                                      >
                                          {
                                              errors
                                                  .root
                                                  .server
                                                  .message
                                          }
                                      </div>
                                  ) : null}

                                  <div className="mt-7 rounded-2xl border border-[#d9e5df] bg-[#edf5f1] px-4 py-3 text-sm leading-6 text-[#54706c]">
                                      Chi phí tour hiện
                                      tại sẽ được sao chép
                                      thành khoản tham khảo
                                      theo đầu người. Bạn có
                                      thể chia nhỏ thành vé,
                                      ăn uống, di chuyển và
                                      khách sạn trong trang
                                      chỉnh sửa.
                                  </div>
                              </div>

                              <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-[#e2d8c9] bg-[#fffaf1] px-5 py-4 sm:flex-row sm:justify-end sm:px-7 sm:py-5">
                                  <button
                                      type="button"
                                      onClick={closeDialog}
                                      disabled={
                                          isSubmitting
                                      }
                                      className="inline-flex h-[52px] items-center justify-center rounded-full border border-[#d8cdbc] bg-white px-6 text-sm font-bold text-[#294748] transition hover:border-[#c8baa6] hover:bg-[#f3eadc] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2f8f8b]/15 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                      Hủy
                                  </button>

                                  <button
                                      type="submit"
                                      disabled={
                                          isSubmitting
                                      }
                                      className="inline-flex h-[52px] items-center justify-center gap-2 rounded-full bg-[#173a3b] px-7 text-sm font-bold text-white shadow-[0_14px_34px_rgba(23,58,59,0.2)] transition hover:-translate-y-0.5 hover:bg-[#21494a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2f8f8b]/20 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                                  >
                                      {isSubmitting ? (
                                          <>
                                              <LoaderCircle
                                                  size={18}
                                                  className="animate-spin"
                                              />
                                              Đang tạo...
                                          </>
                                      ) : (
                                          <>
                                              <Route
                                                  size={18}
                                              />
                                              Tạo hành
                                              trình
                                          </>
                                      )}
                                  </button>
                              </footer>
                          </form>
                      </section>
                  </div>,
                  document.body,
              )
            : null;

    return (
        <>
            <button
                type="button"
                onClick={openDialog}
                className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#173a3b] px-5 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#20494a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2f8f8b]/20"
            >
                <Route size={18} />
                Dùng hành trình này
            </button>

            {dialog}
        </>
    );
}