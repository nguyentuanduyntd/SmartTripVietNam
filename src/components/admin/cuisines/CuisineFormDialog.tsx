"use client";
import {type ChangeEvent,useCallback,useEffect,useRef,useState,} from "react";
import { ImagePlus, Trash2, X } from "lucide-react";
import type { Cuisine, CuisineInput } from "@/src/lib/api-client/cuisines";
import type { Destination } from "@/src/lib/api-client/destinations";

export type CuisineFormSubmitData = {
  input: CuisineInput;
  coverFile: File | null;
  removeCover: boolean;
};

type CuisineFormDialogProps = {
  open: boolean;
  destinations: Destination[];
  initialValue: Cuisine | null;
  submitting: boolean;
  fieldErrors?: Record<string, string[]>;
  onSubmit: (data: CuisineFormSubmitData) => void | Promise<void>;
  onClose: () => void;
};

type CuisineFormState = {
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  avgPrice: string;
  destinationIds: string[];
};

const emptyForm: CuisineFormState = {
  name: "",
  nameEn: "",
  description: "",
  descriptionEn: "",
  avgPrice: "",
  destinationIds: [],
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

export function CuisineFormDialog({
  open,
  destinations,
  initialValue,
  submitting,
  fieldErrors,
  onSubmit,
  onClose,
}: CuisineFormDialogProps) {
  const [form, setForm] = useState<CuisineFormState>(emptyForm);
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
        name: initialValue.name,
        nameEn: initialValue.nameEn ?? "",
        description: initialValue.description ?? "",
        descriptionEn: initialValue.descriptionEn ?? "",
        avgPrice:
          initialValue.avgPrice !== null
            ? String(initialValue.avgPrice)
            : "",
        destinationIds: initialValue.destinations.map((d) => d.id),
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

  function toggleDestination(id: string) {
    setForm((current) => ({
      ...current,
      destinationIds: current.destinationIds.includes(id)
        ? current.destinationIds.filter((value) => value !== id)
        : [...current.destinationIds, id],
    }));
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
        aria-labelledby="cuisine-form-title"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-admin-line bg-admin-paper-card p-6 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2
            id="cuisine-form-title"
            className="font-display text-2xl font-semibold text-admin-ink"
          >
            {initialValue ? "Sửa món ăn" : "Thêm món ăn mới"}
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

            const trimmedPrice = form.avgPrice.trim();

            void onSubmit({
              input: {
                name: form.name,
                nameEn: form.nameEn || null,
                description: form.description || null,
                descriptionEn: form.descriptionEn || null,
                avgPrice: trimmedPrice ? Number(trimmedPrice) : null,
                destinationIds: form.destinationIds,
              },
              coverFile,
              removeCover,
            });
          }}
        >
          <div>
            <label
              htmlFor="cuisine-name"
              className="mb-1.5 block text-sm font-medium text-admin-muted"
            >
              Tên món ăn
            </label>

            <input
              id="cuisine-name"
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
              placeholder="Bún bò Huế"
            />

            {fieldErrors?.name?.[0] && (
              <p className="mt-1 text-xs text-admin-seal">
                {fieldErrors.name[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="cuisine-name-en"
              className="mb-1.5 block text-sm font-medium text-admin-muted"
            >
              Tên tiếng Anh
            </label>

            <input
              id="cuisine-name-en"
              value={form.nameEn}
              disabled={submitting}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  nameEn: event.target.value,
                }))
              }
              className="w-full rounded-md border border-admin-line bg-admin-paper px-3 py-2 text-sm text-admin-ink outline-none focus:border-admin-gold disabled:opacity-60"
              placeholder="Hue-style Beef Noodle Soup"
            />
          </div>

          <div>
            <label
              htmlFor="cuisine-avg-price"
              className="mb-1.5 block text-sm font-medium text-admin-muted"
            >
              Giá tham khảo (VNĐ)
            </label>

            <input
              id="cuisine-avg-price"
              type="number"
              min={0}
              step={1000}
              value={form.avgPrice}
              disabled={submitting}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  avgPrice: event.target.value,
                }))
              }
              className="w-full rounded-md border border-admin-line bg-admin-paper px-3 py-2 text-sm text-admin-ink outline-none focus:border-admin-gold disabled:opacity-60"
              placeholder="35000"
            />

            {fieldErrors?.avgPrice?.[0] && (
              <p className="mt-1 text-xs text-admin-seal">
                {fieldErrors.avgPrice[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="cuisine-description"
              className="mb-1.5 block text-sm font-medium text-admin-muted"
            >
              Mô tả
            </label>

            <textarea
              id="cuisine-description"
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
              Địa danh liên quan
            </span>

            <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-md border border-admin-line bg-admin-paper p-2.5">
              {destinations.length === 0 && (
                <span className="text-xs text-admin-muted">
                  Chưa có địa danh nào
                </span>
              )}

              {destinations.map((destination) => {
                const checked = form.destinationIds.includes(
                  destination.id,
                );

                return (
                  <button
                    key={destination.id}
                    type="button"
                    disabled={submitting}
                    onClick={() => toggleDestination(destination.id)}
                    aria-pressed={checked}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      checked
                        ? "border-admin-gold bg-admin-gold/15 text-admin-ink"
                        : "border-admin-line text-admin-muted hover:border-admin-gold hover:text-admin-ink"
                    }`}
                  >
                    {destination.name}
                  </button>
                );
              })}
            </div>

            {fieldErrors?.destinationIds?.[0] && (
              <p className="mt-1 text-xs text-admin-seal">
                {fieldErrors.destinationIds[0]}
              </p>
            )}
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
                  alt="Ảnh bìa món ăn"
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
                htmlFor="cuisine-cover"
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
              id="cuisine-cover"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              disabled={submitting}
              onChange={handleCoverChange}
              className="hidden"
            />

            {previewUrl && (
              <label
                htmlFor="cuisine-cover"
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
                  : "Tạo món ăn"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
