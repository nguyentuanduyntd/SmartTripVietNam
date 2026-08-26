

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Pencil, Trash2 } from "lucide-react";

import {
  DestinationFormDialog,
  type DestinationFormSubmitData,
} from "@/src/components/admin/destinations/DestinationFormDialog";
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
import {
  destinationsApi,
  type Destination,
} from "@/src/lib/api-client/destinations";
import { ApiRequestError } from "@/src/lib/api-client/http";
import {
  locationsApi,
  type Location,
} from "@/src/lib/api-client/locations";

type SortKey = "name" | "updatedAt";

export function DestinationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
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

  const fetchDestinations = useCallback(
    () =>
      destinationsApi.list({
        page: 1,
        limit: 50,
        locationId: locationFilter || undefined,
      }),
    [locationFilter],
  );

  const {
    rows,
    total,
    loading,
    errorMessage,
    setErrorMessage,
    reload: reloadDestinations,
    beginReload,
  } = useAdminList({
    load: fetchDestinations,
    fallbackError: "Không tải được danh sách địa danh",
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
    if (key === "locationId") {
      beginReload();
    }

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

    try {
      await saveEntityWithCover({
        input,
        coverFile,
        removeCover,
        uploadFolder: "destination-cover",
        save: (payload) =>
          editingDestination
            ? destinationsApi.update(editingDestination.id, payload)
            : destinationsApi.create(payload),
      });

      closeForm();
      await reloadDestinations();
    } catch (error) {
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
      await reloadDestinations();
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
          <AdminCreateButton
            onClick={openCreateForm}
            disabled={submitting || deleting}
          >
            Thêm địa danh
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
          emptyLabel="Không tìm thấy địa danh phù hợp"
        />
      </AdminListPanel>

      {formOpen ? (
        <DestinationFormDialog
          open
          locations={locations}
          initialValue={editingDestination}
          submitting={submitting}
          fieldErrors={fieldErrors}
          onSubmit={handleSubmitForm}
          onClose={closeForm}
        />
      ) : null}

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
