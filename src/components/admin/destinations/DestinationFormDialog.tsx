"use client";

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ImagePlus, Trash2, X } from "lucide-react";

import type {
  Destination,
  DestinationInput,
} from "@/src/lib/api-client/destinations";
import type { Location } from "@/src/lib/api-client/locations";

export type DestinationFormSubmitData = {
  input: DestinationInput;
  coverFile: File | null;
  removeCover: boolean;
};

type DestinationFormDialogProps = {
  open: boolean;
  locations: Location[];
  initialValue: Destination | null;
  submitting: boolean;
  fieldErrors?: Record<string, string[]>;
  onSubmit: (
    data: DestinationFormSubmitData,
  ) => void | Promise<void>;
  onClose: () => void;
};

const emptyForm: DestinationInput = {
  locationId: "",
  name: "",
  address: "",
  description: "",
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

export function DestinationFormDialog({
  open,
  locations,
  initialValue,
  submitting,
  fieldErrors,
  onSubmit,
  onClose,
}: DestinationFormDialogProps) {
  const [form, setForm] = useState<DestinationInput>(emptyForm);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const objectUrlRef = useRef<string | null>(null);

  const revokeObjectUrl = useCallback(() => {
    if (!objectUrlRef.current) return;

    URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) {
      revokeObjectUrl();
      return;
    }

    revokeObjectUrl();

    if (initialValue) {
      setForm({
        locationId: initialValue.locationId,
        name: initialValue.name,
        address: initialValue.address ?? "",
        description: initialValue.description ?? "",
      });
      setPreviewUrl(initialValue.coverImageUrl);
    } else {
      setForm(emptyForm);
      setPreviewUrl(null);
    }

    setCoverFile(null);
    setRemoveCover(false);
    setImageError(null);
  }, [initialValue, open, revokeObjectUrl]);

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

  function handleCoverChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    // Cho phép chọn lại đúng file vừa chọn trước đó.
    event.target.value = "";

    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageError(
        "Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc AVIF",
      );
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
        aria-labelledby="destination-form-title"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-admin-line bg-admin-paper-card p-6 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2
            id="destination-form-title"
            className="font-display text-2xl font-semibold text-admin-ink"
          >
            {initialValue
              ? "Sửa địa danh"
              : "Thêm địa danh mới"}
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

            void onSubmit({
              input: form,
              coverFile,
              removeCover,
            });
          }}
        >
          <div>
            <label
              htmlFor="destination-name"
              className="mb-1.5 block text-sm font-medium text-admin-muted"
            >
              Tên địa danh
            </label>

            <input
              id="destination-name"
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
              placeholder="Chùa Thiên Mụ"
            />

            {fieldErrors?.name?.[0] && (
              <p className="mt-1 text-xs text-admin-seal">
                {fieldErrors.name[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="destination-location"
              className="mb-1.5 block text-sm font-medium text-admin-muted"
            >
              Khu vực
            </label>

            <select
              id="destination-location"
              value={form.locationId}
              required
              disabled={submitting}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  locationId: event.target.value,
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

            {fieldErrors?.locationId?.[0] && (
              <p className="mt-1 text-xs text-admin-seal">
                {fieldErrors.locationId[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="destination-address"
              className="mb-1.5 block text-sm font-medium text-admin-muted"
            >
              Địa chỉ
            </label>

            <input
              id="destination-address"
              value={form.address ?? ""}
              disabled={submitting}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  address: event.target.value,
                }))
              }
              className="w-full rounded-md border border-admin-line bg-admin-paper px-3 py-2 text-sm text-admin-ink outline-none focus:border-admin-gold disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="destination-description"
              className="mb-1.5 block text-sm font-medium text-admin-muted"
            >
              Mô tả
            </label>

            <textarea
              id="destination-description"
              rows={4}
              value={form.description ?? ""}
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
                  alt="Ảnh bìa địa danh"
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
                htmlFor="destination-cover"
                className={`flex h-40 flex-col items-center justify-center rounded-lg border border-dashed border-admin-line bg-admin-paper text-admin-muted transition ${
                  submitting
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer hover:border-admin-gold hover:text-admin-ink"
                }`}
              >
                <ImagePlus size={28} />

                <span className="mt-2 text-sm font-medium">
                  Chọn ảnh bìa
                </span>

                <span className="mt-1 text-xs">
                  JPEG, PNG, WebP, AVIF — tối đa 5MB
                </span>
              </label>
            )}

            <input
              id="destination-cover"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              disabled={submitting}
              onChange={handleCoverChange}
              className="hidden"
            />

            {previewUrl && (
              <label
                htmlFor="destination-cover"
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
              <p className="mt-1 text-xs text-admin-seal">
                {imageError}
              </p>
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
                  : "Tạo địa danh"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}