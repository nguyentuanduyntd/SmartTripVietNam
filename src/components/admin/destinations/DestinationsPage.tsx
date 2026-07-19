"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

import {
  DestinationFormDialog,
  type DestinationFormSubmitData,
} from "@/src/components/admin/destinations/DestinationFormDialog";
import { AdminTopbar } from "@/src/components/layout/AdminTopbar";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import {
  DataTable,
  type DataTableColumn,
  type SortDirection,
} from "@/src/components/ui/DataTable";
import {
  destinationsApi,
  type Destination,
  type DestinationInput,
} from "@/src/lib/api-client/destinations";
import { ApiRequestError } from "@/src/lib/api-client/http";
import {
  locationsApi,
  type Location,
} from "@/src/lib/api-client/locations";
import {
  uploadsApi,
  type UploadedImage,
} from "@/src/lib/api-client/uploads";

type SortKey = "name" | "updatedAt";

export function DestinationsPage() {
  const [rows, setRows] = useState<Destination[]>([]);
  const [total, setTotal] = useState(0);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] =
    useState<SortDirection>(null);
  const [filterValues, setFilterValues] = useState<
    Record<string, string>
  >({});

  const [formOpen, setFormOpen] = useState(false);
  const [editingDestination, setEditingDestination] =
    useState<Destination | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string[]>
  >();

  const [deleteTarget, setDeleteTarget] =
    useState<Destination | null>(null);
  const [deleting, setDeleting] = useState(false);

  const locationFilter = filterValues.locationId;

  const loadDestinations = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const { data, meta } = await destinationsApi.list({
        page: 1,
        limit: 50,
        locationId: locationFilter || undefined,
      });

      setRows(data);
      setTotal(meta.total);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiRequestError
          ? error.message
          : "Không tải được danh sách địa danh",
      );
    } finally {
      setLoading(false);
    }
  }, [locationFilter]);

  useEffect(() => {
    void loadDestinations();
  }, [loadDestinations]);

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

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();

    rows.forEach((row) => {
      row.categories.forEach((category) => {
        map.set(category.id, category.name);
      });
    });

    return Array.from(map, ([value, label]) => ({
      value,
      label,
    }));
  }, [rows]);

  const visibleRows = useMemo(() => {
    let result = rows;

    if (filterValues.name) {
      const keyword = filterValues.name.trim().toLowerCase();

      result = result.filter((row) =>
        row.name.toLowerCase().includes(keyword),
      );
    }

    if (filterValues.categoryId) {
      result = result.filter((row) =>
        row.categories.some(
          (category) =>
            category.id === filterValues.categoryId,
        ),
      );
    }

    if (sortKey && sortDirection) {
      result = [...result].sort((a, b) => {
        const valueA = sortKey === "name" ? a.name : a.updatedAt;
        const valueB = sortKey === "name" ? b.name : b.updatedAt;
        const comparison = valueA.localeCompare(valueB);

        return sortDirection === "asc"
          ? comparison
          : -comparison;
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
    setFilterValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function openCreateForm() {
    setEditingDestination(null);
    setFieldErrors(undefined);
    setErrorMessage(null);
    setFormOpen(true);
  }

  function openEditForm(destination: Destination) {
    setEditingDestination(destination);
    setFieldErrors(undefined);
    setErrorMessage(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingDestination(null);
    setFieldErrors(undefined);
    setErrorMessage(null);
  }

  async function handleSubmitForm({
    input,
    coverFile,
    removeCover,
  }: DestinationFormSubmitData) {
    setSubmitting(true);
    setFieldErrors(undefined);
    setErrorMessage(null);

    let uploadedImage: UploadedImage | null = null;
    let destinationSaved = false;

    try {
      const payload: DestinationInput = {
        ...input,
      };

      if (coverFile) {
        uploadedImage = await uploadsApi.upload(
          coverFile,
          "destination-cover",
        );

        payload.coverImageUrl = uploadedImage.url;
        payload.coverImagePublicId = uploadedImage.publicId;
      } else if (removeCover) {
        payload.coverImageUrl = null;
        payload.coverImagePublicId = null;
      }

      if (editingDestination) {
        await destinationsApi.update(
          editingDestination.id,
          payload,
        );
      } else {
        await destinationsApi.create(payload);
      }

      destinationSaved = true;
      closeForm();
      await loadDestinations();
    } catch (error) {
      // Upload thành công nhưng lưu database thất bại:
      // xóa ảnh vừa upload để tránh ảnh rác trên Cloudinary.
      if (uploadedImage && !destinationSaved) {
        await uploadsApi
          .remove(uploadedImage.publicId)
          .catch((cleanupError) => {
            console.error(
              "Không thể rollback ảnh Cloudinary:",
              cleanupError,
            );
          });
      }

      if (error instanceof ApiRequestError) {
        setFieldErrors(error.fieldErrors);
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Không thể lưu địa danh, vui lòng thử lại",
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
      await destinationsApi.remove(deleteTarget.id);
      setDeleteTarget(null);
      await loadDestinations();
    } catch (error) {
      setErrorMessage(
        error instanceof ApiRequestError
          ? error.message
          : "Không xóa được địa danh",
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
      key: "locationId",
      header: "Khu vực",
      filter: {
        type: "select",
        options: locations.map((location) => ({
          value: location.id,
          label: location.name,
        })),
      },
      render: (row) =>
        locations.find(
          (location) => location.id === row.locationId,
        )?.name ?? "—",
    },
    {
      key: "categoryId",
      header: "Danh mục",
      filter: {
        type: "select",
        options: categoryOptions,
      },
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.categories.length === 0 && (
            <span className="text-admin-muted">—</span>
          )}

          {row.categories.map((category) => (
            <span
              key={category.id}
              className="rounded-full bg-admin-moss-light px-2 py-0.5 text-[11px] text-admin-moss"
            >
              {category.name}
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
        title="Địa danh"
        subtitle={`Huế · Đà Nẵng · Hội An — ${total} địa danh đang quản lý`}
        action={
          <button
            type="button"
            onClick={openCreateForm}
            disabled={submitting || deleting}
            className="flex items-center gap-1.5 rounded-md border border-admin-gold bg-admin-gold px-3 py-2 text-sm font-medium text-admin-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
        onClose={closeForm}
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