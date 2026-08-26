"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import {
  CuisineFormDialog,
  type CuisineFormSubmitData,
} from "@/src/components/admin/cuisines/CuisineFormDialog";
import {
  AdminCreateButton,
  AdminListPanel,
} from "@/src/components/admin/shared/AdminListPanel";
import { saveEntityWithCover } from "@/src/components/admin/shared/saveEntityWithCover";
import { useAdminList } from "@/src/components/admin/shared/useAdminList";
import { AdminTopbar } from "@/src/components/layout/AdminTopbar";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import {
  DataTable,
  type DataTableColumn,
  type SortDirection,
} from "@/src/components/ui/DataTable";
import { cuisinesApi, type Cuisine } from "@/src/lib/api-client/cuisines";
import {
  destinationsApi,
  type Destination,
} from "@/src/lib/api-client/destinations";
import { ApiRequestError } from "@/src/lib/api-client/http";

type SortKey = "name" | "updatedAt";

function formatPrice(value: number | null) {
  if (value === null) return "—";

  return `${value.toLocaleString("vi-VN")} đ`;
}

export function CuisinesPage() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filterValues, setFilterValues] = useState<Record<string, string>>(
    {},
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editingCuisine, setEditingCuisine] = useState<Cuisine | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>();

  const [deleteTarget, setDeleteTarget] = useState<Cuisine | null>(null);
  const [deleting, setDeleting] = useState(false);

  const destinationFilter = filterValues.destinationId;

  const fetchCuisines = useCallback(
    () =>
      cuisinesApi.list({
        page: 1,
        limit: 50,
        destinationId: destinationFilter || undefined,
      }),
    [destinationFilter],
  );

  const {
    rows,
    total,
    loading,
    errorMessage,
    setErrorMessage,
    reload: reloadCuisines,
    beginReload,
  } = useAdminList({
    load: fetchCuisines,
    fallbackError: "Không tải được danh sách món ăn",
  });

  useEffect(() => {
    let active = true;

    destinationsApi
      .list({ limit: 100 })
      .then(({ data }) => {
        if (active) setDestinations(data);
      })
      .catch((error) => {
        console.error("Không tải được danh sách địa danh:", error);
      });

    return () => {
      active = false;
    };
  }, []);

  const visibleRows = useMemo(() => {
    let result = rows;

    if (filterValues.name) {
      const keyword = filterValues.name.trim().toLowerCase();

      result = result.filter((row) =>
        row.name.toLowerCase().includes(keyword),
      );
    }

    if (sortKey && sortDirection) {
      result = [...result].sort((a, b) => {
        const valueA = sortKey === "name" ? a.name : a.updatedAt;
        const valueB = sortKey === "name" ? b.name : b.updatedAt;
        const comparison = valueA.localeCompare(valueB);

        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [filterValues, rows, sortDirection, sortKey]);

  function handleSortChange(key: string) {
    const nextKey = key as SortKey;

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
    if (key === "destinationId") {
      beginReload();
    }

    setFilterValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function openCreateForm() {
    setEditingCuisine(null);
    setFieldErrors(undefined);
    setErrorMessage(null);
    setFormOpen(true);
  }

  function openEditForm(cuisine: Cuisine) {
    setEditingCuisine(cuisine);
    setFieldErrors(undefined);
    setErrorMessage(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingCuisine(null);
    setFieldErrors(undefined);
    setErrorMessage(null);
  }

  async function handleSubmitForm({
    input,
    coverFile,
    removeCover,
  }: CuisineFormSubmitData) {
    setSubmitting(true);
    setFieldErrors(undefined);
    setErrorMessage(null);

    try {
      await saveEntityWithCover({
        input,
        coverFile,
        removeCover,
        uploadFolder: "cuisine-cover",
        save: (payload) =>
          editingCuisine
            ? cuisinesApi.update(editingCuisine.id, payload)
            : cuisinesApi.create(payload),
      });

      closeForm();
      await reloadCuisines();
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setFieldErrors(error.fieldErrors);
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Không thể lưu món ăn, vui lòng thử lại",
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
      await cuisinesApi.remove(deleteTarget.id);
      setDeleteTarget(null);
      await reloadCuisines();
    } catch (error) {
      setErrorMessage(
        error instanceof ApiRequestError
          ? error.message
          : "Không xóa được món ăn",
      );
    } finally {
      setDeleting(false);
    }
  }

  const columns: DataTableColumn<Cuisine>[] = [
    {
      key: "name",
      header: "Tên",
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
      key: "destinationId",
      header: "Địa danh",
      filter: {
        type: "select",
        options: destinations.map((destination) => ({
          value: destination.id,
          label: destination.name,
        })),
      },
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.destinations.length === 0 && (
            <span className="text-admin-muted">—</span>
          )}

          {row.destinations.map((destination) => (
            <span
              key={destination.id}
              className="rounded-full bg-admin-moss-light px-2 py-0.5 text-[11px] text-admin-moss"
            >
              {destination.name}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "avgPrice",
      header: "Giá tham khảo",
      render: (row) => (
        <span className="font-mono text-[12px] text-admin-muted">
          {formatPrice(row.avgPrice)}
        </span>
      ),
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
        title="Ẩm thực"
        subtitle={`Huế · Đà Nẵng · Hội An — ${total} món ăn đang quản lý`}
        action={
          <AdminCreateButton
            onClick={openCreateForm}
            disabled={submitting || deleting}
          >
            Thêm món ăn
          </AdminCreateButton>
        }
      />

      <AdminListPanel loading={loading} errorMessage={errorMessage}>
        <DataTable
          columns={columns}
          rows={visibleRows}
          rowKey={(row) => row.id}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          filterValues={filterValues}
          onFilterChange={handleFilterChange}
          emptyLabel="Không tìm thấy món ăn phù hợp"
        />
      </AdminListPanel>

      {formOpen ? (
        <CuisineFormDialog
          open
          destinations={destinations}
          initialValue={editingCuisine}
          submitting={submitting}
          fieldErrors={fieldErrors}
          onSubmit={handleSubmitForm}
          onClose={closeForm}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa món ăn này?"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" sẽ bị xóa vĩnh viễn khỏi hệ thống, bao gồm cả embedding phục vụ AI. Hành động này không thể hoàn tác.`
            : ""
        }
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
