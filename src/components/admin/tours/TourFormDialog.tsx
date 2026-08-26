"use client";

import { useState, type FormEvent } from "react";

import {
  CoverImageField,
  useCoverImageField,
} from "@/src/components/ui/CoverImageField";
import { Dialog } from "@/src/components/ui/Dialog";
import {
  FormField,
  SelectInput,
  TextArea,
  TextInput,
} from "@/src/components/ui/FormField";
import type { Location } from "@/src/lib/api-client/locations";
import type { Tour, TourInput, TourStatus } from "@/src/lib/api-client/tours";

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

const STATUS_OPTIONS: { value: TourStatus; label: string }[] = [
  { value: "draft", label: "Nháp" },
  { value: "published", label: "Đã xuất bản" },
  { value: "hidden", label: "Đã ẩn" },
];

const EMPTY_FORM: TourFormState = {
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
    return { ...EMPTY_FORM };
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

function toTourInput(form: TourFormState): TourInput {
  const durationDays = Number.parseInt(form.durationDays, 10);
  const durationNights = Number.parseInt(form.durationNights, 10);

  return {
    name: form.name,
    nameEn: form.nameEn.trim() ? form.nameEn.trim() : null,
    slug: form.slug.trim() ? form.slug.trim() : undefined,
    description: form.description.trim() ? form.description : null,
    durationDays: Number.isNaN(durationDays) ? 0 : durationDays,
    durationNights: Number.isNaN(durationNights) ? 0 : durationNights,

    /**
     * Không gửi estimatedPrice từ form này. Giá tour được backend tự tính
     * từ các khoản trong mục "Chi phí".
     */
    startLocationId: form.startLocationId,
    meetingPoint: form.meetingPoint.trim() ? form.meetingPoint : null,
    status: form.status,
  };
}

function formatEstimatedPrice(value: string) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

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
  const coverImage = useCoverImageField(initialValue?.coverImageUrl);

  function updateField<Key extends keyof TourFormState>(
    key: Key,
    value: TourFormState[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    void onSubmit({
      input: toTourInput(form),
      coverFile: coverImage.coverFile,
      removeCover: coverImage.removeCover,
    });
  }

  const submitLabel = submitting
    ? coverImage.coverFile
      ? "Đang upload ảnh…"
      : "Đang lưu…"
    : initialValue
      ? "Lưu thay đổi"
      : "Tạo tour";

  return (
    <Dialog
      open={open}
      title={initialValue ? "Sửa tour" : "Thêm tour mới"}
      size="xl"
      onClose={onClose}
      closeDisabled={submitting}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-admin-line px-3 py-1.5 text-sm font-medium text-admin-ink transition hover:bg-admin-paper disabled:cursor-not-allowed disabled:opacity-50"
          >
            Hủy
          </button>

          <button
            type="submit"
            form="tour-form"
            disabled={submitting || Boolean(coverImage.imageError)}
            className="rounded-md border border-admin-gold bg-admin-gold px-3 py-1.5 text-sm font-medium text-admin-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitLabel}
          </button>
        </>
      }
    >
      <form id="tour-form" className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            htmlFor="tour-name"
            label="Tên tour"
            required
            error={fieldErrors?.name}
            className="sm:col-span-2"
          >
            <TextInput
              id="tour-name"
              value={form.name}
              required
              disabled={submitting}
              invalid={Boolean(fieldErrors?.name?.length)}
              placeholder="Tinh hoa cố đô Huế 2N1Đ"
              onChange={(event) => updateField("name", event.target.value)}
            />
          </FormField>

          <FormField
            htmlFor="tour-slug"
            label="Slug"
            hint="Để trống để tự sinh từ tên."
            error={fieldErrors?.slug}
            className="sm:col-span-2"
          >
            <TextInput
              id="tour-slug"
              value={form.slug}
              disabled={submitting}
              invalid={Boolean(fieldErrors?.slug?.length)}
              className="font-mono"
              placeholder="tinh-hoa-co-do-hue-2n1d"
              onChange={(event) => updateField("slug", event.target.value)}
            />
          </FormField>

          <FormField
            htmlFor="tour-duration-days"
            label="Số ngày"
            required
            error={fieldErrors?.durationDays}
          >
            <TextInput
              id="tour-duration-days"
              type="number"
              min={1}
              value={form.durationDays}
              required
              disabled={submitting}
              invalid={Boolean(fieldErrors?.durationDays?.length)}
              onChange={(event) =>
                updateField("durationDays", event.target.value)
              }
            />
          </FormField>

          <FormField
            htmlFor="tour-duration-nights"
            label="Số đêm"
            required
            error={fieldErrors?.durationNights}
          >
            <TextInput
              id="tour-duration-nights"
              type="number"
              min={0}
              value={form.durationNights}
              required
              disabled={submitting}
              invalid={Boolean(fieldErrors?.durationNights?.length)}
              onChange={(event) =>
                updateField("durationNights", event.target.value)
              }
            />
          </FormField>

          <FormField
            htmlFor="tour-start-location"
            label="Điểm khởi hành"
            required
            error={fieldErrors?.startLocationId}
          >
            <SelectInput
              id="tour-start-location"
              value={form.startLocationId}
              required
              disabled={submitting}
              invalid={Boolean(fieldErrors?.startLocationId?.length)}
              onChange={(event) =>
                updateField("startLocationId", event.target.value)
              }
            >
              <option value="">— Chọn khu vực —</option>

              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </SelectInput>
          </FormField>

          <FormField htmlFor="tour-status" label="Trạng thái">
            <SelectInput
              id="tour-status"
              value={form.status}
              disabled={submitting}
              onChange={(event) =>
                updateField("status", event.target.value as TourStatus)
              }
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
          </FormField>

          <FormField label="Giá tham khảo">
            <div className="rounded-md border border-admin-line bg-admin-paper px-3 py-2">
              {form.estimatedPrice ? (
                <p className="font-mono text-sm font-semibold text-admin-ink">
                  {formatEstimatedPrice(form.estimatedPrice)}
                </p>
              ) : (
                <p className="text-sm text-admin-muted">Chưa có dự toán</p>
              )}

              <p className="mt-1 text-xs leading-5 text-admin-muted">
                Giá được tính tự động từ các khoản trong mục{" "}
                <strong className="font-semibold text-admin-ink">
                  Chi phí
                </strong>
                . Không nhập tổng giá trực tiếp tại đây.
              </p>
            </div>
          </FormField>

          <FormField htmlFor="tour-meeting-point" label="Điểm hẹn">
            <TextInput
              id="tour-meeting-point"
              value={form.meetingPoint}
              disabled={submitting}
              placeholder="Bến xe phía Nam, TP. Huế"
              onChange={(event) =>
                updateField("meetingPoint", event.target.value)
              }
            />
          </FormField>
        </div>

        <FormField
          htmlFor="tour-description"
          label="Mô tả"
          error={fieldErrors?.description}
        >
          <TextArea
            id="tour-description"
            rows={4}
            value={form.description}
            disabled={submitting}
            invalid={Boolean(fieldErrors?.description?.length)}
            onChange={(event) =>
              updateField("description", event.target.value)
            }
          />
        </FormField>

        <CoverImageField
          inputId="tour-cover"
          imageAlt="Ảnh bìa tour"
          controller={coverImage}
          disabled={submitting}
        />
      </form>
    </Dialog>
  );
}