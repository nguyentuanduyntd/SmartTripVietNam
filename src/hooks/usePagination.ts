"use client";

import { useCallback, useMemo, useState } from "react";

type PageUpdater = number | ((currentPage: number) => number);

type UsePaginationOptions = {
  totalItems: number;
  pageSize?: number;
  initialPage?: number;
};

function toPositionInteger(value: number, fallback: number) {
  if (!Number.isInteger(value)) {
    return fallback;
  }
  return Math.max(1, Math.floor(value));
}

function clampPage(page: number, totalPages: number) {
  return Math.min(totalPages, toPositionInteger(page, 1));
}

export function usePagination({ totalItems, pageSize = 10, initialPage = 1 }: UsePaginationOptions) {
  const normalizedPageSize = toPositionInteger(pageSize, 10);

  const normalizedTotalItems = Number.isFinite(totalItems) ? Math.max(0, Math.floor(totalItems)) : 0;

  const totalPages = Math.max(1, Math.ceil(normalizedTotalItems / normalizedPageSize));

  const [storedPage, setPageState] = useState(() => clampPage(initialPage, totalPages));

  const page = clampPage(storedPage, totalPages);

  const setPage = useCallback(
    (updater: PageUpdater) => {
      setPageState((currentPage) => {
        const validCurrentPage = clampPage(currentPage, totalPages);
        const nextPage = typeof updater === "function" ? updater(validCurrentPage) : updater;
        return clampPage(nextPage, totalPages);
      });
    },
    [totalPages],
  );

  const goToPage = useCallback(
    (nextPage: number) => {
      setPage(nextPage);
    },
    [setPage],
  );

  const nextPage = useCallback(() => {
    setPage((currentPage) => currentPage + 1);
  }, [setPage]);

  const previousPage = useCallback(() => {
    setPage((currentPage) => currentPage - 1);
  }, [setPage]);

  const resetPage = useCallback(() => {
    setPage(initialPage);
  }, []);

  const range = useMemo(() => {
    if (normalizedTotalItems === 0) {
      return {
        startItem: 0,
        endItem: 0,
      };
    }
    const startItem = (page - 1) * normalizedPageSize + 1;

    return {
      startItem,
      endItem: Math.min(normalizedTotalItems, startItem + normalizedPageSize - 1),
    };
  }, [page, normalizedPageSize, normalizedTotalItems]);

  return {
    page,
    pageSize: normalizedPageSize,
    totalItems: normalizedTotalItems,
    totalPages,
    startItem: range.startItem,
    endItem: range.endItem,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    setPage,
    goToPage,
    nextPage,
    previousPage,
    resetPage,
  };
}
