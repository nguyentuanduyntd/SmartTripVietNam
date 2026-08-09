"use client";

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ImagePlus, Trash2, X } from "lucide-react";

import type { Tour, TourInput, TourStatus } from "@/src/lib/api-client/tours";
import type { Location } from "@/src/lib/api-client/locations";

export type TourFormSubmitData = {
  input: TourInput;
  coverFile: File | null;
  removeCover: boolean;
};

type TourFormDialogProps = {
  open: boolean;
  locations: Location[];
  initialValue: Tour | null;
  submitting: boolean;
  fieldErrors?: Record<string, string[]>;
  onSubmit: (data: TourFormSubmitData) => void | Promise<void>;
  onClose: () => void;
};

const STATUS_OPTIONS: { value: TourStatus; label: string }[] = [
  { value: "draft", label: "Nháp" },
  { value: "published", label: "Đã xuất bản" },
  { value: "hidden", label: "Đã ẩn" },
];

type TourFormState = {
  name: string;
  nameEn: string;
  slug: string;
  description: string;
  durationDays: string;
  durationNights: string;
  estimatedPrice: string;
  startLocationId: string;
  meetingPoint: string;
  status: TourStatus;
};

const emptyForm: TourFormState = {
  name: "",
  nameEn: "",
  slug: "",
  description: "",
  durationDays: "1",
  durationNights: "0",
  estimatedPrice: "",
  startLocationId: "",
  meetingPoint: "",
  status: "draft",
};

function createInitialForm(initialValue: Tour | null): TourFormState {
  if (!initialValue) {
    return { ...emptyForm };
  }

  return {
    name: initialValue.name,
    nameEn: initialValue.nameEn ?? "",
    slug: initialValue.slug,
    description: initialValue.description ?? "",
    durationDays: String(initialValue.durationDays),
    durationNights: String(initialValue.durationNights),
    estimatedPrice: initialValue.estimatedPrice ?? "",
    startLocationId: initialValue.startLocationId,
    meetingPoint: initialValue.meetingPoint ?? "",
    status: initialValue.status,
  };
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

export function TourFormDialog({
  open,
  locations,
  initialValue,
  submitting,
  fieldErrors,
  onSubmit,
  onClose,
}: TourFormDialogProps) {
  const [form, setForm] = useState<TourFormState>(() =>
    createInitialForm(initialValue),
  );
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    () => initialValue?.coverImageUrl ?? null,
  );
  const [removeCover, setRemoveCover] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const objectUrlRef = useRef<string | null>(null);

  const revokeObjectUrl = useCallback(() => {
    if (!objectUrlRef.current) return;

    URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  useEffect(() => {
    return () => {
      revokeObjectUrl();
    };
  }, [revokeObjectUrl]);

  function handleCoverChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    // Cho phép chọn lại đúng file vừa chọn trước đó.
    event.target.value = "";

    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageError("Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc AVIF");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setImageError("Kích thước ảnh không được vượt quá 5MB");
      return;
    }

    revokeObjectUrl();

    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;

    setCoverFile(file);
    setPreviewUrl(objectUrl);
    setRemoveCover(false);
    setImageError(null);
  }

  function handleRemoveCover() {
    revokeObjectUrl();

    setCoverFile(null);
    setPreviewUrl(null);
    setImageError(null);
    setRemoveCover(Boolean(initialValue?.coverImageUrl));
  }

  function handleFormSubmit() {
    const durationDays = Number.parseInt(
      form.durationDays,
      10,
    );

    const durationNights = Number.parseInt(
      form.durationNights,
      10,
    );

    const input: TourInput = {
      name: form.name,

      nameEn:
        form.nameEn.trim()
          ? form.nameEn.trim()
          : null,

      slug:
        form.slug.trim()
          ? form.slug.trim()
          : undefined,

      description:
        form.description.trim()
          ? form.description
          : null,

      durationDays:
        Number.isNaN(durationDays)
          ? 0
          : durationDays,

      durationNights:
        Number.isNaN(durationNights)
          ? 0
          : durationNights,

      /**
       * Không gửi estimatedPrice từ form này.
       *
       * Giá tour được quản lý tại mục "Chi phí"
       * và được backend tự tính từ tour_costs.
       *
       * Tour legacy vẫn giữ giá cũ nếu chưa
       * có breakdown.
       */
      startLocationId:
        form.startLocationId,

      meetingPoint:
        form.meetingPoint.trim()
          ? form.meetingPoint
          : null,

      status: form.status,
    };

    void onSubmit({
      input,
      coverFile,
      removeCover,
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-form-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-admin-line bg-admin-paper-card p-6 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2
            id="tour-form-title"
            className="font-display text-2xl font-semibold text-admin-ink"
          >
            {initialValue ? "Sửa tour" : "Thêm tour mới"}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-md p-1 text-admin-muted transition hover:bg-admin-paper hover:text-admin-ink"
          >
            <X size={20} />
          </button>
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleFormSubmit();
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label
                htmlFor="tour-name"
                className="mb-1.5 block text-sm font-medium text-admin-muted"
              >
                Tên tour
              </label>

              <input
                id="tour-name"
                value={form.name}
                required
                disabled={submitting}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-admin-line bg-admin-paper px-3 py-2 text-sm text-admin-ink outline-none focus:border-admin-gold disabled:opacity-60"
                placeholder="Tinh hoa cố đô Huế 2N1Đ"
              />

              {fieldErrors?.name?.[0] && (
                <p className="mt-1 text-xs text-admin-seal">
                  {fieldErrors.name[0]}
                </p>
              )}
            </div>

            <div className="col-span-2">
              <label
                htmlFor="tour-slug"
                className="mb-1.5 block text-sm font-medium text-admin-muted"
              >
                Slug{" "}
                <span className="font-normal normal-case text-admin-muted/70">
                  (để trống để tự sinh từ tên)
                </span>
              </label>

              <input
                id="tour-slug"
                value={form.slug}
                disabled={submitting}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    slug: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-admin-line bg-admin-paper px-3 py-2 font-mono text-sm text-admin-ink outline-none focus:border-admin-gold disabled:opacity-60"
                placeholder="tinh-hoa-co-do-hue-2n1d"
              />

              {fieldErrors?.slug?.[0] && (
                <p className="mt-1 text-xs text-admin-seal">
                  {fieldErrors.slug[0]}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="tour-duration-days"
                className="mb-1.5 block text-sm font-medium text-admin-muted"
              >
                Số ngày
              </label>

              <input
                id="tour-duration-days"
                type="number"
                min={1}
                value={form.durationDays}
                required
                disabled={submitting}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    durationDays: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-admin-line bg-admin-paper px-3 py-2 text-sm text-admin-ink outline-none focus:border-admin-gold disabled:opacity-60"
              />

              {fieldErrors?.durationDays?.[0] && (
                <p className="mt-1 text-xs text-admin-seal">
                  {fieldErrors.durationDays[0]}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="tour-duration-nights"
                className="mb-1.5 block text-sm font-medium text-admin-muted"
              >
                Số đêm
              </label>

              <input
                id="tour-duration-nights"
                type="number"
                min={0}
                value={form.durationNights}
                required
                disabled={submitting}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    durationNights: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-admin-line bg-admin-paper px-3 py-2 text-sm text-admin-ink outline-none focus:border-admin-gold disabled:opacity-60"
              />

              {fieldErrors?.durationNights?.[0] && (
                <p className="mt-1 text-xs text-admin-seal">
                  {fieldErrors.durationNights[0]}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="tour-start-location"
                className="mb-1.5 block text-sm font-medium text-admin-muted"
              >
                Điểm khởi hành
              </label>

              <select
                id="tour-start-location"
                value={form.startLocationId}
                required
                disabled={submitting}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    startLocationId: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-admin-line bg-admin-paper px-3 py-2 text-sm text-admin-ink outline-none focus:border-admin-gold disabled:opacity-60"
              >
                <option value="">— Chọn khu vực —</option>

                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>

              {fieldErrors?.startLocationId?.[0] && (
                <p className="mt-1 text-xs text-admin-seal">
                  {fieldErrors.startLocationId[0]}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="tour-status"
                className="mb-1.5 block text-sm font-medium text-admin-muted"
              >
                Trạng thái
              </label>

              <select
                id="tour-status"
                value={form.status}
                disabled={submitting}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as TourStatus,
                  }))
                }
                className="w-full rounded-md border border-admin-line bg-admin-paper px-3 py-2 text-sm text-admin-ink outline-none focus:border-admin-gold disabled:opacity-60"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="mb-1.5 block text-sm font-medium text-admin-muted">
                Giá tham khảo
              </span>

              <div className="rounded-md border border-admin-line bg-admin-paper px-3 py-2">
                {form.estimatedPrice ? (
                  <p className="font-mono text-sm font-semibold text-admin-ink">
                    {new Intl.NumberFormat(
                      "vi-VN",
                      {
                        style: "currency",
                        currency: "VND",
                        maximumFractionDigits: 0,
                      },
                    ).format(
                      Number(
                        form.estimatedPrice,
                      ),
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-admin-muted">
                    Chưa có dự toán
                  </p>
                )}

                <p className="mt-1 text-xs leading-5 text-admin-muted">
                  Giá được tính tự động từ các
                  khoản trong mục{" "}
                  <strong className="font-semibold text-admin-ink">
                    Chi phí
                  </strong>
                  . Không nhập tổng giá trực tiếp
                  tại đây.
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="tour-meeting-point"
                className="mb-1.5 block text-sm font-medium text-admin-muted"
              >
                Điểm hẹn
              </label>

              <input
                id="tour-meeting-point"
                value={form.meetingPoint}
                disabled={submitting}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    meetingPoint: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-admin-line bg-admin-paper px-3 py-2 text-sm text-admin-ink outline-none focus:border-admin-gold disabled:opacity-60"
                placeholder="Bến xe phía Nam, TP. Huế"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="tour-description"
              className="mb-1.5 block text-sm font-medium text-admin-muted"
            >
              Mô tả
            </label>

            <textarea
              id="tour-description"
              rows={4}
              value={form.description}
              disabled={submitting}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className="w-full resize-y rounded-md border border-admin-line bg-admin-paper px-3 py-2 text-sm text-admin-ink outline-none focus:border-admin-gold disabled:opacity-60"
            />
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-admin-muted">
              Ảnh bìa
            </span>

            {previewUrl ? (
              <div className="relative overflow-hidden rounded-lg border border-admin-line bg-admin-paper">
                {/* Hỗ trợ cả URL Cloudinary và blob URL dùng để preview. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Ảnh bìa tour"
                  className="h-48 w-full object-cover"
                />

                <button
                  type="button"
                  onClick={handleRemoveCover}
                  disabled={submitting}
                  className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-md bg-black/70 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Xóa ảnh
                </button>
              </div>
            ) : (
              <label
                htmlFor="tour-cover"
                className={`flex h-40 flex-col items-center justify-center rounded-lg border border-dashed border-admin-line bg-admin-paper text-admin-muted transition ${
                  submitting
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer hover:border-admin-gold hover:text-admin-ink"
                }`}
              >
                <ImagePlus size={28} />

                <span className="mt-2 text-sm font-medium">Chọn ảnh bìa</span>

                <span className="mt-1 text-xs">
                  JPEG, PNG, WebP, AVIF — tối đa 5MB
                </span>
              </label>
            )}

            <input
              id="tour-cover"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              disabled={submitting}
              onChange={handleCoverChange}
              className="hidden"
            />

            {previewUrl && (
              <label
                htmlFor="tour-cover"
                className={`mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-admin-gold ${
                  submitting
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer hover:underline"
                }`}
              >
                <ImagePlus size={15} />
                Chọn ảnh khác
              </label>
            )}

            {coverFile && (
              <p className="mt-1 break-all text-xs text-admin-muted">
                Đã chọn: {coverFile.name}
              </p>
            )}

            {imageError && (
              <p className="mt-1 text-xs text-admin-seal">{imageError}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-admin-line px-3 py-1.5 text-sm font-medium text-admin-ink transition hover:bg-admin-paper"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={submitting || Boolean(imageError)}
              className="rounded-md border border-admin-gold bg-admin-gold px-3 py-1.5 text-sm font-medium text-admin-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? coverFile
                  ? "Đang upload ảnh…"
                  : "Đang lưu…"
                : initialValue
                  ? "Lưu thay đổi"
                  : "Tạo tour"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}