"use client";

import { useState, type FormEvent } from "react";

import { CoverImageField, useCoverImageField } from "@/src/components/ui/CoverImageField";
import { Dialog } from "@/src/components/ui/Dialog";
import { FormField, SelectInput, TextArea, TextInput } from "@/src/components/ui/FormField";
import type { Destination, DestinationInput } from "@/src/lib/api-client/destinations";
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
  onSubmit: (data: DestinationFormSubmitData) => void | Promise<void>;
  onClose: () => void;
};

const EMPTY_FORM: DestinationInput = {
  locationId: "",
  name: "",
  nameEn: "",
  address: "",
  description: "",
  descriptionEn: "",
  history: "",
  historyEn: "",
};

function createInitialForm(initialValue: Destination | null): DestinationInput {
  if (!initialValue) {
    return {
      ...EMPTY_FORM,
    };
  }

  return {
    locationId: initialValue.locationId,
    name: initialValue.name,
    nameEn: initialValue.nameEn ?? "",
    address: initialValue.address ?? "",
    description: initialValue.description ?? "",
    descriptionEn: initialValue.descriptionEn ?? "",
    history: initialValue.history ?? "",
    historyEn: initialValue.historyEn ?? "",
  };
}

export function DestinationFormDialog({
  open,
  locations,
  initialValue,
  submitting,
  fieldErrors,
  onSubmit,
  onClose,
}: DestinationFormDialogProps) {
  const [form, setForm] = useState<DestinationInput>(() => createInitialForm(initialValue));

  const coverImage = useCoverImageField(initialValue?.coverImageUrl);

  function updateField<Key extends keyof DestinationInput>(key: Key, value: DestinationInput[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    void onSubmit({
      input: form,
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
      : "Tạo địa danh";

  return (
    <Dialog
      open={open}
      title={initialValue ? "Sửa địa danh" : "Thêm địa danh mới"}
      size="lg"
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
            form="destination-form"
            disabled={submitting || Boolean(coverImage.imageError)}
            className="rounded-md border border-admin-gold bg-admin-gold px-3 py-1.5 text-sm font-medium text-admin-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitLabel}
          </button>
        </>
      }
    >
      <form id="destination-form" className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField htmlFor="destination-name" label="Tên địa danh (Tiếng Việt)" required error={fieldErrors?.name}>
            <TextInput
              id="destination-name"
              value={form.name}
              required
              disabled={submitting}
              invalid={Boolean(fieldErrors?.name?.length)}
              placeholder="Chùa Thiên Mụ"
              onChange={(event) => updateField("name", event.target.value)}
            />
          </FormField>

          <FormField htmlFor="destination-name-en" label="Tên địa danh (Tiếng Anh)" error={fieldErrors?.nameEn}>
            <TextInput
              id="destination-name-en"
              value={form.nameEn ?? ""}
              disabled={submitting}
              invalid={Boolean(fieldErrors?.nameEn?.length)}
              placeholder="Thien Mu Pagoda"
              onChange={(event) => updateField("nameEn", event.target.value)}
            />
          </FormField>
        </div>

        <FormField htmlFor="destination-location" label="Khu vực" required error={fieldErrors?.locationId}>
          <SelectInput
            id="destination-location"
            value={form.locationId}
            required
            disabled={submitting}
            invalid={Boolean(fieldErrors?.locationId?.length)}
            onChange={(event) => updateField("locationId", event.target.value)}
          >
            <option value="">— Chọn khu vực —</option>

            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </SelectInput>
        </FormField>

        <FormField htmlFor="destination-address" label="Địa chỉ" error={fieldErrors?.address}>
          <TextInput
            id="destination-address"
            value={form.address ?? ""}
            disabled={submitting}
            invalid={Boolean(fieldErrors?.address?.length)}
            onChange={(event) => updateField("address", event.target.value)}
          />
        </FormField>

        <FormField htmlFor="destination-description" label="Giới thiệu (Tiếng Việt)" error={fieldErrors?.description}>
          <TextArea
            id="destination-description"
            rows={4}
            value={form.description ?? ""}
            disabled={submitting}
            invalid={Boolean(fieldErrors?.description?.length)}
            onChange={(event) => updateField("description", event.target.value)}
          />
        </FormField>

        <FormField htmlFor="destination-description-en" label="Giới thiệu (Tiếng Anh)" error={fieldErrors?.descriptionEn}>
          <TextArea
            id="destination-description-en"
            rows={4}
            value={form.descriptionEn ?? ""}
            disabled={submitting}
            invalid={Boolean(fieldErrors?.descriptionEn?.length)}
            onChange={(event) => updateField("descriptionEn", event.target.value)}
          />
        </FormField>

        <FormField htmlFor="destination-history" label="Lịch sử (Tiếng Việt)" error={fieldErrors?.history}>
          <TextArea
            id="destination-history"
            rows={4}
            value={form.history ?? ""}
            disabled={submitting}
            invalid={Boolean(fieldErrors?.history?.length)}
            onChange={(event) => updateField("history", event.target.value)}
          />
        </FormField>

        <FormField htmlFor="destination-history-en" label="Lịch sử (Tiếng Anh)" error={fieldErrors?.historyEn}>
          <TextArea
            id="destination-history-en"
            rows={4}
            value={form.historyEn ?? ""}
            disabled={submitting}
            invalid={Boolean(fieldErrors?.historyEn?.length)}
            onChange={(event) => updateField("historyEn", event.target.value)}
          />
        </FormField>

        <CoverImageField
          inputId="destination-cover"
          imageAlt="Ảnh bìa địa danh"
          controller={coverImage}
          disabled={submitting}
        />
      </form>
    </Dialog>
  );
}
