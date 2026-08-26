"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, ReceiptText, Trash2 } from "lucide-react";

import {
  AdminCreateButton,
  AdminListPanel,
} from "@/src/components/admin/shared/AdminListPanel";
import { saveEntityWithCover } from "@/src/components/admin/shared/saveEntityWithCover";
import { useAdminList } from "@/src/components/admin/shared/useAdminList";
import {
  TourFormDialog,
  type TourFormSubmitData,
} from "@/src/components/admin/tours/TourFormDialog";
import { TourCostsDialog } from "./TourCostsDialog";
import { AdminTopbar } from "@/src/components/layout/AdminTopbar";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import {
  DataTable,
  type DataTableColumn,
  type SortDirection,
} from "@/src/components/ui/DataTable";
import { ApiRequestError } from "@/src/lib/api-client/http";
import { locationsApi, type Location } from "@/src/lib/api-client/locations";
import {
  toursApi,
  type Tour,
  type TourListParams,
  type TourStatus,
} from "@/src/lib/api-client/tours";

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
  const [locations, setLocations] = useState<Location[]>([]);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const [formOpen, setFormOpen] = useState(false);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>();

  const [deleteTarget, setDeleteTarget] = useState<Tour | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [costsTarget, setCostsTarget] = useState<Tour | null>(null);

  const nameFilter = filterValues.name;
  const locationFilter = filterValues.startLocationId;
  const statusFilter = filterValues.status as TourStatus | undefined;

  const sortByParam: TourListParams["sortBy"] =
    sortKey && sortDirection ? sortKey : undefined;

  const fetchTours = useCallback(
    () =>
      toursApi.list({
        page: 1,
        limit: 50,
        search: nameFilter || undefined,
        startLocationId: locationFilter || undefined,
        status: statusFilter || undefined,
        sortBy: sortByParam,
        sortOrder: sortByParam ? (sortDirection ?? undefined) : undefined,
      }),
    [nameFilter, locationFilter, statusFilter, sortByParam, sortDirection],
  );

  const {
    rows,
    total,
    loading,
    errorMessage,
    setErrorMessage,
    reload: reloadTours,
    beginReload,
  } = useAdminList({
    load: fetchTours,
    fallbackError: "Không tải được danh sách tour",
  });

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

    beginReload();

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
    beginReload();

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

  function openCostsDialog(tour: Tour) {
    setCostsTarget(tour);
    setErrorMessage(null);
  }

  function closeCostsDialog() {
    setCostsTarget(null);
    setErrorMessage(null);
  }

  async function handleCostsChanged() {
    await reloadTours();
  }

  async function handleSubmitForm({
    input,
    coverFile,
    removeCover,
  }: TourFormSubmitData) {
    setSubmitting(true);
    setFieldErrors(undefined);
    setErrorMessage(null);

    try {
      await saveEntityWithCover({
        input,
        coverFile,
        removeCover,
        uploadFolder: "tour-cover",
        save: (payload) =>
          editingTour
            ? toursApi.update(editingTour.id, payload)
            : toursApi.create(payload),
      });

      closeForm();
      await reloadTours();
    } catch (error) {
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
      await reloadTours();
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
        <button
          type="button"
          onClick={() =>
            openCostsDialog(row)
          }
          className="font-mono text-[12px] underline decoration-admin-line underline-offset-4 transition hover:text-admin-gold hover:decoration-admin-gold"
          title="Xem chi tiết dự toán"
        >
          {formatPrice(
            row.estimatedPrice,
          )}
        </button>
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
      widthClassName: "w-28",
      render: (row) => (
        <div className="flex justify-end gap-3 text-admin-muted">
          {/* Chi phí */}
          <button
            type="button"
            onClick={() =>
              openCostsDialog(row)
            }
            disabled={
              submitting ||
              deleting
            }
            aria-label={`Quản lý chi phí ${row.name}`}
            title="Quản lý chi phí"
            className="transition hover:text-admin-gold disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ReceiptText
              size={16}
              strokeWidth={1.75}
            />
          </button>

          {/* Sửa */}
          <button
            type="button"
            onClick={() =>
              openEditForm(row)
            }
            disabled={
              submitting ||
              deleting
            }
            aria-label={`Sửa ${row.name}`}
            title="Sửa tour"
            className="transition hover:text-admin-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Pencil
              size={16}
              strokeWidth={1.75}
            />
          </button>

          {/* Xóa */}
          <button
            type="button"
            onClick={() =>
              setDeleteTarget(row)
            }
            disabled={
              submitting ||
              deleting
            }
            aria-label={`Xóa ${row.name}`}
            title="Xóa tour"
            className="transition hover:text-admin-seal disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2
              size={16}
              strokeWidth={1.75}
            />
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
          <AdminCreateButton
            onClick={openCreateForm}
            disabled={submitting || deleting}
          >
            Thêm tour
          </AdminCreateButton>
        }
      />

      <AdminListPanel loading={loading} errorMessage={errorMessage}>
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
      </AdminListPanel>

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

      {costsTarget ? (
        <TourCostsDialog
          open
          tour={costsTarget}
          onClose={closeCostsDialog}
          onChanged={
            handleCostsChanged
          }
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