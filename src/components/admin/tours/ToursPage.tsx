"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

import {
  TourFormDialog,
  type TourFormSubmitData,
} from "@/src/components/admin/tours/TourFormDialog";
import { AdminTopbar } from "@/src/components/layout/AdminTopbar";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import {
  DataTable,
  type DataTableColumn,
  type SortDirection,
} from "@/src/components/ui/DataTable";
import {
  toursApi,
  type Tour,
  type TourInput,
  type TourListParams,
  type TourStatus,
} from "@/src/lib/api-client/tours";
import { ApiRequestError } from "@/src/lib/api-client/http";
import { locationsApi, type Location } from "@/src/lib/api-client/locations";
import { uploadsApi, type UploadedImage } from "@/src/lib/api-client/uploads";

type SortKey = "name" | "durationDays" | "estimatedPrice" | "updatedAt";

const STATUS_LABEL: Record<TourStatus, string> = {
  draft: "Nháp",
  published: "Đã xuất bản",
  hidden: "Đã ẩn",
};

const STATUS_BADGE_CLASS: Record<TourStatus, string> = {
  draft:
    "border border-dashed border-admin-muted text-admin-muted bg-transparent",
  published: "border border-admin-seal text-admin-seal bg-admin-seal-light",
  hidden: "border border-admin-muted text-admin-muted bg-admin-line/40",
};

function StatusBadge({ status }: { status: TourStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE_CLASS[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function formatPrice(value: string | null) {
  if (!value) return "—";

  const numeric = Number(value);

  if (Number.isNaN(numeric)) return "—";

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(numeric);
}

export function ToursPage() {
  const [rows, setRows] = useState<Tour[]>([]);
  const [total, setTotal] = useState(0);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const [formOpen, setFormOpen] = useState(false);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>();

  const [deleteTarget, setDeleteTarget] = useState<Tour | null>(null);
  const [deleting, setDeleting] = useState(false);

  const nameFilter = filterValues.name;
  const locationFilter = filterValues.startLocationId;
  const statusFilter = filterValues.status as TourStatus | undefined;

  const sortByParam: TourListParams["sortBy"] =
    sortKey && sortDirection ? sortKey : undefined;

  const loadTours = useCallback(async () => {
    try {
      const { data, meta } = await toursApi.list({
        page: 1,
        limit: 50,
        search: nameFilter || undefined,
        startLocationId: locationFilter || undefined,
        status: statusFilter || undefined,
        sortBy: sortByParam,
        sortOrder: sortByParam ? (sortDirection ?? undefined) : undefined,
      });

      setRows(data);
      setTotal(meta.total);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiRequestError
          ? error.message
          : "Không tải được danh sách tour",
      );
    } finally {
      setLoading(false);
    }
  }, [nameFilter, locationFilter, statusFilter, sortByParam, sortDirection]);

  useEffect(() => {
    let active = true;

    toursApi
      .list({
        page: 1,
        limit: 50,
        search: nameFilter || undefined,
        startLocationId: locationFilter || undefined,
        status: statusFilter || undefined,
        sortBy: sortByParam,
        sortOrder: sortByParam ? (sortDirection ?? undefined) : undefined,
      })
      .then(({ data, meta }) => {
        if (!active) return;

        setRows(data);
        setTotal(meta.total);
        setErrorMessage(null);
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (!active) return;

        setErrorMessage(
          error instanceof ApiRequestError
            ? error.message
            : "Không tải được danh sách tour",
        );
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [nameFilter, locationFilter, statusFilter, sortByParam, sortDirection]);

  useEffect(() => {
    let active = true;

    locationsApi
      .list()
      .then((data) => {
        if (active) setLocations(data);
      })
      .catch((error) => {
        console.error("Không tải được danh sách khu vực:", error);
      });

    return () => {
      active = false;
    };
  }, []);

  function handleSortChange(key: string) {
    const nextKey = key as SortKey;

    setLoading(true);
    setErrorMessage(null);

    if (sortKey !== nextKey) {
      setSortKey(nextKey);
      setSortDirection("asc");
      return;
    }

    if (sortDirection === "asc") {
      setSortDirection("desc");
      return;
    }

    if (sortDirection === "desc") {
      setSortKey(null);
      setSortDirection(null);
      return;
    }

    setSortDirection("asc");
  }

  function handleFilterChange(key: string, value: string) {
    setLoading(true);
    setErrorMessage(null);

    setFilterValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function openCreateForm() {
    setEditingTour(null);
    setFieldErrors(undefined);
    setErrorMessage(null);
    setFormOpen(true);
  }

  function openEditForm(tour: Tour) {
    setEditingTour(tour);
    setFieldErrors(undefined);
    setErrorMessage(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingTour(null);
    setFieldErrors(undefined);
    setErrorMessage(null);
  }

  async function handleSubmitForm({
    input,
    coverFile,
    removeCover,
  }: TourFormSubmitData) {
    setSubmitting(true);
    setFieldErrors(undefined);
    setErrorMessage(null);

    let uploadedImage: UploadedImage | null = null;
    let tourSaved = false;

    try {
      const payload: TourInput = { ...input };

      if (coverFile) {
        uploadedImage = await uploadsApi.upload(coverFile, "tour-cover");

        payload.coverImageUrl = uploadedImage.url;
        payload.coverImagePublicId = uploadedImage.publicId;
      } else if (removeCover) {
        payload.coverImageUrl = null;
        payload.coverImagePublicId = null;
      }

      if (editingTour) {
        await toursApi.update(editingTour.id, payload);
      } else {
        await toursApi.create(payload);
      }

      tourSaved = true;
      closeForm();
      setLoading(true);
      await loadTours();
    } catch (error) {
      // Upload thành công nhưng lưu database thất bại:
      // xóa ảnh vừa upload để tránh ảnh rác trên Cloudinary.
      if (uploadedImage && !tourSaved) {
        await uploadsApi.remove(uploadedImage.publicId).catch((cleanupError) => {
          console.error("Không thể rollback ảnh Cloudinary:", cleanupError);
        });
      }

      if (error instanceof ApiRequestError) {
        setFieldErrors(error.fieldErrors);
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Không thể lưu tour, vui lòng thử lại",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    setErrorMessage(null);

    try {
      await toursApi.remove(deleteTarget.id);
      setDeleteTarget(null);
      await loadTours();
    } catch (error) {
      setErrorMessage(
        error instanceof ApiRequestError
          ? error.message
          : "Không xóa được tour",
      );
    } finally {
      setDeleting(false);
    }
  }

  const columns: DataTableColumn<Tour>[] = [
    {
      key: "name",
      header: "Tên tour",
      sortable: true,
      filter: {
        type: "text",
        placeholder: "Tìm theo tên…",
      },
      render: (row) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="font-mono text-[11px] text-admin-muted">
            {row.slug}
          </div>
        </div>
      ),
    },
    {
      key: "startLocationId",
      header: "Khởi hành",
      filter: {
        type: "select",
        options: locations.map((location) => ({
          value: location.id,
          label: location.name,
        })),
      },
      render: (row) => row.startLocation?.name ?? "—",
    },
    {
      key: "durationDays",
      header: "Thời lượng",
      sortable: true,
      render: (row) => (
        <span className="font-mono text-[12px]">
          {row.durationDays}N{row.durationNights}Đ
        </span>
      ),
    },
    {
      key: "estimatedPrice",
      header: "Giá tham khảo",
      sortable: true,
      render: (row) => (
        <span className="font-mono text-[12px]">
          {formatPrice(row.estimatedPrice)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      filter: {
        type: "select",
        options: (
          Object.entries(STATUS_LABEL) as [TourStatus, string][]
        ).map(([value, label]) => ({ value, label })),
      },
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "updatedAt",
      header: "Cập nhật",
      sortable: true,
      render: (row) => (
        <span className="font-mono text-[12px] text-admin-muted">
          {new Date(row.updatedAt).toLocaleDateString("vi-VN")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      widthClassName: "w-20",
      render: (row) => (
        <div className="flex justify-end gap-3 text-admin-muted">
          <button
            type="button"
            onClick={() => openEditForm(row)}
            disabled={submitting || deleting}
            aria-label={`Sửa ${row.name}`}
            className="transition hover:text-admin-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Pencil size={16} strokeWidth={1.75} />
          </button>

          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            disabled={submitting || deleting}
            aria-label={`Xóa ${row.name}`}
            className="transition hover:text-admin-seal disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 size={16} strokeWidth={1.75} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <AdminTopbar
        title="Tour mẫu"
        subtitle={`Huế · Đà Nẵng · Hội An — ${total} tour đang quản lý`}
        action={
          <button
            type="button"
            onClick={openCreateForm}
            disabled={submitting || deleting}
            className="flex items-center gap-1.5 rounded-md border border-admin-gold bg-admin-gold px-3 py-2 text-sm font-medium text-admin-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={16} strokeWidth={2} />
            Thêm tour
          </button>
        }
      />

      {errorMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-admin-seal bg-admin-seal-light px-3 py-2 text-sm text-admin-seal">
          <Search size={14} />
          {errorMessage}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-admin-line bg-admin-paper-card">
        {loading ? (
          <div className="px-4 py-10 text-center text-sm text-admin-muted">
            Đang tải…
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            filterValues={filterValues}
            onFilterChange={handleFilterChange}
            emptyLabel="Không tìm thấy tour phù hợp"
          />
        )}
      </div>

      {formOpen ? (
        <TourFormDialog
          open
          locations={locations}
          initialValue={editingTour}
          submitting={submitting}
          fieldErrors={fieldErrors}
          onSubmit={handleSubmitForm}
          onClose={closeForm}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa tour này?"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" cùng toàn bộ lịch trình (ngày, hoạt động, bữa ăn) sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.`
            : ""
        }
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}