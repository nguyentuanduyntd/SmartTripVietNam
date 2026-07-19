"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { AdminTopbar } from "@/src/components/layout/AdminTopbar";
import { DataTable, type DataTableColumn, type SortDirection } from "@/src/components/ui/DataTable";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { DestinationFormDialog } from "@/src/components/admin/destinations/DestinationFormDialog";
import {
  destinationsApi,
  type Destination,
  type DestinationInput,
} from "@/src/lib/api-client/destinations";
import { locationsApi, type Location } from "@/src/lib/api-client/locations";
import { ApiRequestError } from "@/src/lib/api-client/http";

type SortKey = "name" | "updatedAt";

export function DestinationsPage() {
  const [rows, setRows] = useState<Destination[]>([]);
  const [total, setTotal] = useState(0);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const [formOpen, setFormOpen] = useState(false);
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>();

  const [deleteTarget, setDeleteTarget] = useState<Destination | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Chỉ locationId lọc theo server (API hỗ trợ sẵn); tên lọc client-side
  // trên trang hiện tại để phản hồi tức thì khi gõ.
  async function loadDestinations() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const { data, meta } = await destinationsApi.list({
        page: 1,
        limit: 50,
        locationId: filterValues.locationId || undefined,
      });
      setRows(data);
      setTotal(meta.total);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiRequestError ? error.message : "Không tải được danh sách địa danh",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching on mount/filter change
    loadDestinations();
    locationsApi.list().then(setLocations).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterValues.locationId]);

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((row) => row.categories.forEach((c) => map.set(c.id, c.name)));
    return Array.from(map, ([value, label]) => ({ value, label }));
  }, [rows]);

  const visibleRows = useMemo(() => {
    let result = rows;

    if (filterValues.name) {
      const keyword = filterValues.name.toLowerCase();
      result = result.filter((r) => r.name.toLowerCase().includes(keyword));
    }
    if (filterValues.categoryId) {
      result = result.filter((r) =>
        r.categories.some((c) => c.id === filterValues.categoryId),
      );
    }

    if (sortKey && sortDirection) {
      result = [...result].sort((a, b) => {
        const valueA = sortKey === "name" ? a.name : a.updatedAt;
        const valueB = sortKey === "name" ? b.name : b.updatedAt;
        const compare = valueA.localeCompare(valueB);
        return sortDirection === "asc" ? compare : -compare;
      });
    }

    return result;
  }, [rows, filterValues, sortKey, sortDirection]);

  function handleSortChange(key: string) {
    if (sortKey !== key) {
      setSortKey(key as SortKey);
      setSortDirection("asc");
      return;
    }
    setSortDirection((prev) =>
      prev === "asc" ? "desc" : prev === "desc" ? null : "asc",
    );
    if (sortDirection === "desc") setSortKey(null);
  }

  function handleFilterChange(key: string, value: string) {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }

  function openCreateForm() {
    setEditingDestination(null);
    setFieldErrors(undefined);
    setFormOpen(true);
  }

  function openEditForm(destination: Destination) {
    setEditingDestination(destination);
    setFieldErrors(undefined);
    setFormOpen(true);
  }

  async function handleSubmitForm(input: DestinationInput) {
    setSubmitting(true);
    setFieldErrors(undefined);
    try {
      if (editingDestination) {
        await destinationsApi.update(editingDestination.id, input);
      } else {
        await destinationsApi.create(input);
      }
      setFormOpen(false);
      await loadDestinations();
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setFieldErrors(error.fieldErrors);
        setErrorMessage(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Bước xác nhận bắt buộc trước khi xóa — không xóa trực tiếp từ icon.
  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await destinationsApi.remove(deleteTarget.id);
      setDeleteTarget(null);
      await loadDestinations();
    } catch (error) {
      setErrorMessage(
        error instanceof ApiRequestError ? error.message : "Không xóa được địa danh",
      );
    } finally {
      setDeleting(false);
    }
  }

  const columns: DataTableColumn<Destination>[] = [
    {
      key: "name",
      header: "Tên",
      sortable: true,
      filter: { type: "text", placeholder: "Tìm theo tên…" },
      render: (row) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="font-mono text-[11px] text-admin-muted">{row.slug}</div>
        </div>
      ),
    },
    {
      key: "locationId",
      header: "Khu vực",
      filter: {
        type: "select",
        options: locations.map((l) => ({ value: l.id, label: l.name })),
      },
      render: (row) => locations.find((l) => l.id === row.locationId)?.name ?? "—",
    },
    {
      key: "categoryId",
      header: "Danh mục",
      filter: { type: "select", options: categoryOptions },
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.categories.length === 0 && (
            <span className="text-admin-muted">—</span>
          )}
          {row.categories.map((c) => (
            <span
              key={c.id}
              className="rounded-full bg-admin-moss-light px-2 py-0.5 text-[11px] text-admin-moss"
            >
              {c.name}
            </span>
          ))}
        </div>
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
      render: (row) => (
        <div className="flex justify-end gap-3 text-admin-muted">
          <button
            type="button"
            onClick={() => openEditForm(row)}
            aria-label={`Sửa ${row.name}`}
            className="hover:text-admin-ink"
          >
            <Pencil size={16} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            aria-label={`Xóa ${row.name}`}
            className="hover:text-admin-seal"
          >
            <Trash2 size={16} strokeWidth={1.75} />
          </button>
        </div>
      ),
      widthClassName: "w-20",
    },
  ];

  return (
    <div>
      <AdminTopbar
        title="Địa danh"
        subtitle={`Huế · Đà Nẵng · Hội An — ${total} địa danh đang quản lý`}
        action={
          <button
            type="button"
            onClick={openCreateForm}
            className="flex items-center gap-1.5 rounded-md border border-admin-gold bg-admin-gold px-3 py-2 text-sm font-medium text-admin-ink hover:opacity-90"
          >
            <Plus size={16} strokeWidth={2} />
            Thêm địa danh
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
            rows={visibleRows}
            rowKey={(row) => row.id}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            filterValues={filterValues}
            onFilterChange={handleFilterChange}
            emptyLabel="Không tìm thấy địa danh phù hợp"
          />
        )}
      </div>

      <DestinationFormDialog
        open={formOpen}
        locations={locations}
        initialValue={editingDestination}
        submitting={submitting}
        fieldErrors={fieldErrors}
        onSubmit={handleSubmitForm}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa địa danh này?"
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