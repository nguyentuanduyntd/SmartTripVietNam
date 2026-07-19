"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Destination, DestinationInput } from "@/src/lib/api-client/destinations";
import type { Location } from "@/src/lib/api-client/locations";

type DestinationFormDialogProps = {
  open: boolean;
  locations: Location[];
  initialValue: Destination | null; // null = tạo mới, có giá trị = sửa
  submitting: boolean;
  fieldErrors?: Record<string, string[]>;
  onSubmit: (input: DestinationInput) => void;
  onClose: () => void;
};

const emptyForm: DestinationInput = {
  locationId: "",
  name: "",
  address: "",
  description: "",
};

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

  useEffect(() => {
    if (initialValue) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync form state when the target record changes
      setForm({
        locationId: initialValue.locationId,
        name: initialValue.name,
        address: initialValue.address ?? "",
        description: initialValue.description ?? "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [initialValue, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-admin-ink/40 px-4">
      <div className="w-full max-w-md rounded-lg border border-admin-line bg-admin-paper-card p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-medium text-admin-ink">
            {initialValue ? "Sửa địa danh" : "Thêm địa danh mới"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded p-1 text-admin-muted hover:bg-admin-line/50 hover:text-admin-ink"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form);
          }}
          className="space-y-3.5"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-admin-muted">
              Tên địa danh
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-md border border-admin-line bg-admin-paper px-3 py-2 text-sm text-admin-ink outline-none focus:border-admin-gold"
              placeholder="Chùa Thiên Mụ"
            />
            {fieldErrors?.name && (
              <p className="mt-1 text-xs text-admin-seal">{fieldErrors.name[0]}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-admin-muted">
              Khu vực
            </label>
            <select
              required
              value={form.locationId}
              onChange={(e) =>
                setForm((f) => ({ ...f, locationId: e.target.value }))
              }
              className="w-full rounded-md border border-admin-line bg-admin-paper px-3 py-2 text-sm text-admin-ink outline-none focus:border-admin-gold"
            >
              <option value="">— Chọn khu vực —</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
            {fieldErrors?.locationId && (
              <p className="mt-1 text-xs text-admin-seal">
                {fieldErrors.locationId[0]}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-admin-muted">
              Địa chỉ
            </label>
            <input
              value={form.address ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value }))
              }
              className="w-full rounded-md border border-admin-line bg-admin-paper px-3 py-2 text-sm text-admin-ink outline-none focus:border-admin-gold"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-admin-muted">
              Mô tả
            </label>
            <textarea
              rows={3}
              value={form.description ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              className="w-full rounded-md border border-admin-line bg-admin-paper px-3 py-2 text-sm text-admin-ink outline-none focus:border-admin-gold"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-admin-line px-3 py-1.5 text-sm font-medium text-admin-ink hover:bg-admin-paper"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md border border-admin-gold bg-admin-gold px-3 py-1.5 text-sm font-medium text-admin-ink hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Đang lưu…" : initialValue ? "Lưu thay đổi" : "Tạo địa danh"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}