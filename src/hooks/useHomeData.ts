"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { fetchHomeApiData } from "@/src/lib/home-api";
import {
  createHomeViewData,
  getFallbackHomeViewData,
} from "@/src/lib/home-data-mapper";
import type { HomeApiData } from "@/src/types/home-api";

function isAbortError(error: unknown) {
  return (
    error instanceof DOMException &&
    error.name === "AbortError"
  );
}

export function useHomeData() {
  const [apiData, setApiData] =
    useState<HomeApiData | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [reloadToken, setReloadToken] = useState(0);

  const [resolvedToken, setResolvedToken] =
    useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetchHomeApiData(controller.signal)
      .then((result) => {
        if (!active) {
          return;
        }

        setApiData(result);
        setError(null);
        setResolvedToken(reloadToken);
      })
      .catch((caughtError: unknown) => {
        if (
          !active ||
          controller.signal.aborted ||
          isAbortError(caughtError)
        ) {
          return;
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Không thể tải dữ liệu trang chủ";

        console.error(
          "Lỗi tải dữ liệu Home:",
          caughtError,
        );

        setError(message);
        setResolvedToken(reloadToken);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadToken]);

  const reload = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  const viewData = useMemo(
    () =>
      apiData
        ? createHomeViewData(apiData)
        : getFallbackHomeViewData(),
    [apiData],
  );

  return {
    ...viewData,
    isLoading: resolvedToken !== reloadToken,
    error,
    reload,
  };
}