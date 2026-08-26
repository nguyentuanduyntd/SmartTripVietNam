"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiRequestError } from "@/src/lib/api-client/http";

type PaginatedList<T> = {
  data: T[];
  meta: {
    total: number;
  };
};

type UseAdminListOptions<T> = {
  load: () => Promise<PaginatedList<T>>;
  fallbackError: string;
};

export function useAdminList<T>({
  load,
  fallbackError,
}: UseAdminListOptions<T>) {
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const applyResult = useCallback(
    (requestId: number, { data, meta }: PaginatedList<T>) => {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setRows(data);
      setTotal(meta.total);
      setErrorMessage(null);
    },
    [],
  );

  const applyError = useCallback(
    (requestId: number, error: unknown) => {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setErrorMessage(
        error instanceof ApiRequestError ? error.message : fallbackError,
      );
    },
    [fallbackError],
  );

  const finishRequest = useCallback((requestId: number) => {
    if (requestId === requestIdRef.current) {
      setLoading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);

    try {
      applyResult(requestId, await load());
    } catch (error) {
      applyError(requestId, error);
    } finally {
      finishRequest(requestId);
    }
  }, [applyError, applyResult, finishRequest, load]);

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    load()
      .then((result) => applyResult(requestId, result))
      .catch((error: unknown) => applyError(requestId, error))
      .finally(() => finishRequest(requestId));

    return () => {
      requestIdRef.current += 1;
    };
  }, [applyError, applyResult, finishRequest, load]);

  const beginReload = useCallback(() => {
    setLoading(true);
    setErrorMessage(null);
  }, []);

  return {
    rows,
    total,
    loading,
    errorMessage,
    setErrorMessage,
    reload,
    beginReload,
  };
}