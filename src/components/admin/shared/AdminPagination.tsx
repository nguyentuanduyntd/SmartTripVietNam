"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type AdminPaginationProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  startItem: number;
  endItem: number;
  loading?: boolean;
  onPreviousPage: () => void;
  onNextPage: () => void;
};

export function AdminPagination({
  page,
  totalPages,
  totalItems,
  startItem,
  endItem,
  loading = false,
  onPreviousPage,
  onNextPage,
}: AdminPaginationProps) {
  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-lg border border-admin-line bg-admin-paper-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-admin-muted">
        Hiển thị {startItem}–{endItem} trong tổng số {totalItems}
      </p>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onPreviousPage}
          disabled={loading || page <= 1}
          aria-label="Trang trước"
          className="grid h-9 w-9 place-items-center rounded-md border border-admin-line text-admin-ink transition hover:bg-admin-paper disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={16} />
        </button>

        <span className="min-w-20 text-center font-mono text-xs text-admin-muted">
          {page} / {totalPages}
        </span>

        <button
          type="button"
          onClick={onNextPage}
          disabled={loading || page >= totalPages}
          aria-label="Trang sau"
          className="grid h-9 w-9 place-items-center rounded-md border border-admin-line text-admin-ink transition hover:bg-admin-paper disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
