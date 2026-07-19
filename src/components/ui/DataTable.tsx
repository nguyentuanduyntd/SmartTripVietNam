"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown, Filter } from "lucide-react";

export type SortDirection = "asc" | "desc" | null;

export type DataTableColumn<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  /** Có ô lọc riêng cho cột này không, và loại input. */
  filter?:
    | { type: "text"; placeholder?: string }
    | { type: "select"; options: { label: string; value: string }[] };
  render: (row: T) => React.ReactNode;
  widthClassName?: string;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  sortKey?: string | null;
  sortDirection?: SortDirection;
  onSortChange?: (key: string) => void;
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  emptyLabel?: string;
};

/**
 * Bảng dữ liệu dùng chung cho toàn bộ admin. Mỗi cột có thể bật:
 * - sortable: nút mũi tên lên/xuống cạnh tiêu đề
 * - filter: icon phễu mở popover lọc riêng cho cột đó (text hoặc select)
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  sortKey,
  sortDirection,
  onSortChange,
  filterValues = {},
  onFilterChange,
  emptyLabel = "Không có dữ liệu",
}: DataTableProps<T>) {
  const [openFilterKey, setOpenFilterKey] = useState<string | null>(null);

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr>
          {columns.map((col) => {
            const isSorted = sortKey === col.key;
            const isFilterOpen = openFilterKey === col.key;
            const hasActiveFilter = Boolean(filterValues[col.key]);

            return (
              <th
                key={col.key}
                className={`relative border-b border-admin-line px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-admin-muted ${col.widthClassName ?? ""}`}
              >
                <div className="flex items-center gap-1.5">
                  <span>{col.header}</span>

                  {col.sortable && (
                    <button
                      type="button"
                      onClick={() => onSortChange?.(col.key)}
                      aria-label={`Sắp xếp theo ${col.header}`}
                      className="rounded p-0.5 text-admin-muted hover:bg-admin-line/50 hover:text-admin-ink"
                    >
                      {!isSorted && <ArrowUpDown size={13} strokeWidth={1.75} />}
                      {isSorted && sortDirection === "asc" && (
                        <ArrowUp size={13} strokeWidth={2} className="text-admin-ink" />
                      )}
                      {isSorted && sortDirection === "desc" && (
                        <ArrowDown size={13} strokeWidth={2} className="text-admin-ink" />
                      )}
                    </button>
                  )}

                  {col.filter && (
                    <button
                      type="button"
                      onClick={() =>
                        setOpenFilterKey(isFilterOpen ? null : col.key)
                      }
                      aria-label={`Lọc theo ${col.header}`}
                      className={`rounded p-0.5 hover:bg-admin-line/50 ${
                        hasActiveFilter
                          ? "text-admin-gold"
                          : "text-admin-muted hover:text-admin-ink"
                      }`}
                    >
                      <Filter size={13} strokeWidth={1.75} />
                    </button>
                  )}
                </div>

                {col.filter && isFilterOpen && (
                  <div className="absolute left-0 top-full z-10 mt-1 w-52 rounded-md border border-admin-line bg-admin-paper-card p-2 normal-case tracking-normal shadow-lg">
                    {col.filter.type === "text" && (
                      <input
                        autoFocus
                        type="text"
                        value={filterValues[col.key] ?? ""}
                        placeholder={col.filter.placeholder ?? "Nhập để lọc…"}
                        onChange={(e) =>
                          onFilterChange?.(col.key, e.target.value)
                        }
                        className="w-full rounded border border-admin-line bg-admin-paper px-2 py-1 text-xs text-admin-ink outline-none focus:border-admin-gold"
                      />
                    )}
                    {col.filter.type === "select" && (
                      <select
                        value={filterValues[col.key] ?? ""}
                        onChange={(e) =>
                          onFilterChange?.(col.key, e.target.value)
                        }
                        className="w-full rounded border border-admin-line bg-admin-paper px-2 py-1 text-xs text-admin-ink outline-none focus:border-admin-gold"
                      >
                        <option value="">Tất cả</option>
                        {col.filter.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr>
            <td
              colSpan={columns.length}
              className="px-4 py-10 text-center text-sm text-admin-muted"
            >
              {emptyLabel}
            </td>
          </tr>
        )}
        {rows.map((row) => (
          <tr key={rowKey(row)}>
            {columns.map((col) => (
              <td
                key={col.key}
                className="border-b border-admin-line px-4 py-3 align-middle text-admin-ink last:border-b-0"
              >
                {col.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}