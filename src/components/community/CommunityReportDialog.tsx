"use client";

import { CheckCircle2, Flag, Loader2, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

import { COMMUNITY_REPORT_REASONS, type CommunityReportReason } from "@/src/constants/tour_community";

type CommunityReportTarget =
  | {
      type: "post";
      id: string;
    }
  | {
      type: "comment";
      id: string;
    };

type CommunityReportDialogProps = {
  target: CommunityReportTarget;
  isAuthenticated: boolean;

  triggerVariant?: "button" | "text";

  loginReturnTo: string;
};

type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

type ReportResponseData = {
  id: string;
  postId: string | null;
  commentId: string | null;
  reason: CommunityReportReason;
  status: "pending" | "resolved" | "dismissed";
  createdAt: string;
};

async function readApiResponse<T>(response: Response): Promise<ApiEnvelope<T>> {
  try {
    return (await response.json()) as ApiEnvelope<T>;
  } catch {
    return {
      success: false,
      message: "Phản hồi từ máy chủ không đúng định dạng.",
    };
  }
}

export function CommunityReportDialog({
  target,
  isAuthenticated,
  triggerVariant = "button",
  loginReturnTo,
}: CommunityReportDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const tReport = useTranslations("Community.report");

  const [isOpen, setIsOpen] = useState(false);

  const [reason, setReason] = useState<CommunityReportReason | "">("");

  const [details, setDetails] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const targetLabel = target.type === "post" ? tReport("titlePost") : tReport("titleComment");

  function resetForm() {
    setReason("");
    setDetails("");
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(false);
  }

  function closeDialog() {
    if (isSubmitting) {
      return;
    }

    setIsOpen(false);
  }

  function openDialog() {
    if (!isAuthenticated) {
      window.location.href = `/auth/login?next=${encodeURIComponent(loginReturnTo)}`;

      return;
    }

    resetForm();
    setIsOpen(true);
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;

      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isSubmitting]);

  async function submitReport() {
    if (!reason) {
      setError(tReport("errorSelectReason"));
      return;
    }

    const normalizedDetails = details.trim();

    if (reason === "other" && !normalizedDetails) {
      setError(tReport("errorDescribeReason"));
      return;
    }

    if (normalizedDetails.length > 1000) {
      setError(tReport("errorTooLong"));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const body =
        target.type === "post"
          ? {
              postId: target.id,
              reason,
              details: normalizedDetails || undefined,
            }
          : {
              commentId: target.id,
              reason,
              details: normalizedDetails || undefined,
            };

      const response = await fetch("/api/community/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const payload = await readApiResponse<ReportResponseData>(response);

      if (response.status === 401) {
        window.location.href = `/auth/login?next=${encodeURIComponent(loginReturnTo)}`;

        return;
      }

      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? tReport("errorFallback"));
      }

      setSuccessMessage(payload.message ?? tReport("successFallback"));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : tReport("errorFallback"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const trigger =
    triggerVariant === "text" ? (
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex items-center gap-1 transition hover:text-[#c65344]"
      >
        <Flag size={12} />
        {tReport("trigger")}
      </button>
    ) : (
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#efcfc8] bg-[#fffaf1] px-4 py-2 text-sm font-extrabold text-[#a95749] transition hover:border-[#e5b8af] hover:bg-[#fff0ed]"
      >
        <Flag size={17} />
        {tReport("trigger")}
      </button>
    );

  return (
    <>
      {trigger}

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-end justify-center bg-[#173a3b]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  closeDialog();
                }
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                className="max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] border border-white/80 bg-[#fffaf1] shadow-[0_28px_90px_rgba(23,58,59,0.28)] sm:max-w-xl sm:rounded-[28px]"
              >
                <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#eadfd2] bg-[#fffaf1]/95 px-5 py-5 backdrop-blur sm:px-6">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#fff0ed] px-3 py-1.5 text-xs font-extrabold text-[#b85547]">
                      <Flag size={14} />
                      {tReport("badge")}
                    </div>

                    <h2 id={titleId} className="mt-3 font-display text-2xl font-semibold text-[#173a3b]">
                      {targetLabel}
                    </h2>

                    <p id={descriptionId} className="mt-2 text-sm leading-6 text-[#6a7975]">
                      {tReport("description")}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeDialog}
                    disabled={isSubmitting}
                    aria-label={tReport("closeDialog")}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#e1d7ca] bg-white text-[#65736f] transition hover:bg-[#f5eee5] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <X size={18} />
                  </button>
                </div>

                {successMessage ? (
                  <div className="px-5 py-7 sm:px-6">
                    <div className="rounded-[22px] border border-[#cfe3dd] bg-[#edf7f4] px-5 py-6 text-center">
                      <CheckCircle2 size={38} className="mx-auto text-[#34706b]" />

                      <h3 className="mt-4 text-lg font-extrabold text-[#245c57]">{tReport("successTitle")}</h3>

                      <p className="mt-2 text-sm leading-6 text-[#5f746f]">{successMessage}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                      }}
                      className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#173a3b] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#214b4c]"
                    >
                      {tReport("close")}
                    </button>
                  </div>
                ) : (
                  <div className="px-5 py-6 sm:px-6">
                    <fieldset>
                      <legend className="text-sm font-extrabold text-[#344d49]">{tReport("reasonLegend")}</legend>

                      <div className="mt-3 space-y-2.5">
                        {COMMUNITY_REPORT_REASONS.map((value) => {
                          const label = tReport(`reasons.${value}.label`);
                          const description = tReport(`reasons.${value}.description`);
                          const checked = reason === value;

                          return (
                            <label
                              key={value}
                              className={`flex cursor-pointer items-start gap-3 rounded-[18px] border px-4 py-3.5 transition ${
                                checked
                                  ? "border-[#d88b7e] bg-[#fff0ed]"
                                  : "border-[#e5dbce] bg-white hover:border-[#c8d7d3]"
                              }`}
                            >
                              <input
                                type="radio"
                                name="community-report-reason"
                                value={value}
                                checked={checked}
                                disabled={isSubmitting}
                                onChange={() => {
                                  setReason(value);
                                  setError(null);
                                }}
                                className="mt-1 h-4 w-4 accent-[#c65344]"
                              />

                              <span className="min-w-0">
                                <span className="block text-sm font-extrabold text-[#344d49]">{label}</span>

                                <span className="mt-1 block text-xs leading-5 text-[#75827e]">
                                  {description}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>

                    <div className="mt-5">
                      <div className="flex items-center justify-between gap-3">
                        <label htmlFor="community-report-details" className="text-sm font-extrabold text-[#344d49]">
                          {tReport("detailsLabel")}
                          {reason === "other" ? tReport("detailsRequired") : tReport("detailsOptional")}
                        </label>

                        <span
                          className={`text-xs font-bold ${details.length > 1000 ? "text-[#c65344]" : "text-[#87928e]"}`}
                        >
                          {details.length}
                          /1000
                        </span>
                      </div>

                      <textarea
                        id="community-report-details"
                        value={details}
                        disabled={isSubmitting}
                        maxLength={1100}
                        onChange={(event) => {
                          setDetails(event.target.value);
                          setError(null);
                        }}
                        rows={4}
                        placeholder={
                          reason === "other"
                            ? tReport("placeholderOther")
                            : tReport("placeholderDefault")
                        }
                        className="mt-2 w-full resize-y rounded-[18px] border border-[#ddd2c5] bg-white px-4 py-3 text-sm leading-6 text-[#3f5551] outline-none transition placeholder:text-[#9aa39f] focus:border-[#65928c] disabled:cursor-not-allowed disabled:bg-[#f5f0e8]"
                      />
                    </div>

                    {error ? (
                      <div
                        role="alert"
                        className="mt-4 rounded-[16px] border border-[#f0c9c1] bg-[#fff0ed] px-4 py-3 text-sm font-bold leading-6 text-[#ad5043]"
                      >
                        {error}
                      </div>
                    ) : null}

                    <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={closeDialog}
                        disabled={isSubmitting}
                        className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#dcd1c4] bg-white px-5 py-2.5 text-sm font-extrabold text-[#60716d] transition hover:bg-[#f5eee5] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {tReport("cancel")}
                      </button>

                      <button
                        type="button"
                        onClick={() => void submitReport()}
                        disabled={isSubmitting || !reason}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#c65344] px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_10px_28px_rgba(198,83,68,0.20)] transition hover:bg-[#b84d3f] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Flag size={16} />}

                        {isSubmitting ? tReport("submitting") : tReport("submit")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
