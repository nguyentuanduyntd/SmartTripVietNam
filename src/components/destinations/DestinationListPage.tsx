"use client";

import { useEffect, useRef, useState } from "react";

import { ChevronLeft, ChevronRight, Search as SearchIcon } from "lucide-react";

import { useLocale, useTranslations } from "next-intl";

import { useRouter, useSearchParams } from "next/navigation";

import { DestinationCard, locationNameFor } from "@/src/components/destinations/DestinationCard";

import { HomeFooter } from "@/src/components/home/HomeFooter";

import { HomeHeader } from "@/src/components/home/HomeHeader";

import { localizedText } from "@/src/i18n/localized-text";

import { destinationsApi, type Destination } from "@/src/lib/api-client/destinations";

import { locationsApi, type Location } from "@/src/lib/api-client/locations";

import { usePagination } from "@/src/hooks/usePagination";

const PAGE_SIZE = 10;

interface DestinationQueryUpdate {
  location?: string;
  q?: string;
  page?: number;
}

type ErrorKey = "loadList";

export function DestinationsListPage() {
  const router = useRouter();

  const searchParams = useSearchParams();

  const locale = useLocale();

  const t = useTranslations("Destinations.list");

  const activeLocationId = searchParams.get("location") ?? "";

  const searchInUrl = searchParams.get("q") ?? "";

  const pageInUrl = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  // Derived filter key — khi filter thay đổi, reset page về 1
  const filterKey = JSON.stringify([activeLocationId, searchInUrl]);

  const currentFilterKeyRef = useRef(filterKey);

  const [locations, setLocations] = useState<Location[]>([]);

  const [destinations, setDestinations] = useState<Destination[]>([]);

  const [total, setTotal] = useState(0);

  const {
    page,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    nextPage: goToNextPage,
    previousPage: goToPreviousPage,
    goToPage,
    resetPage,
  } = usePagination({
    totalItems: total,
    pageSize: PAGE_SIZE,
    initialPage: pageInUrl,
  });

  const [errorKey, setErrorKey] = useState<ErrorKey | null>(null);

  const [resolvedKey, setResolvedKey] = useState<string | null>(null);

  const requestKey = JSON.stringify([activeLocationId, searchInUrl, page]);

  const loading = resolvedKey !== requestKey;

  // Track filter changes — khi filter đổi, reset page về 1 trong URL
  useEffect(() => {
    if (currentFilterKeyRef.current === filterKey) {
      return;
    }

    currentFilterKeyRef.current = filterKey;

    resetPage();

    // Cập nhật URL: xóa page param khi filter thay đổi
    updateQuery({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  // Load locations once
  useEffect(() => {
    let active = true;

    locationsApi
      .list()
      .then((data) => {
        if (!active) return;
        setLocations(data);
      })
      .catch((error: unknown) => {
        console.error("Failed to load locations:", error);
      });

    return () => {
      active = false;
    };
  }, []);

  // Load destinations whenever page or filters change
  useEffect(() => {
    let active = true;

    destinationsApi
      .list({
        page,
        limit: PAGE_SIZE,
        locationId: activeLocationId || undefined,
        search: searchInUrl || undefined,
      })
      .then(({ data, meta }) => {
        if (!active) return;

        setDestinations(data);
        setTotal(meta.total);
        setErrorKey(null);
        setResolvedKey(requestKey);
      })
      .catch((error: unknown) => {
        if (!active) return;

        console.error("Failed to load destinations:", error);

        setDestinations([]);
        setTotal(0);
        setErrorKey("loadList");
        setResolvedKey(requestKey);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  function updateQuery(next: DestinationQueryUpdate) {
    const params = new URLSearchParams(searchParams.toString());

    const nextLocation = next.location !== undefined ? next.location : activeLocationId;
    const nextSearch = next.q !== undefined ? next.q : searchInUrl;
    const nextPage = next.page !== undefined ? next.page : page;

    if (nextLocation) {
      params.set("location", nextLocation);
    } else {
      params.delete("location");
    }

    if (nextSearch) {
      params.set("q", nextSearch);
    } else {
      params.delete("q");
    }

    if (nextPage > 1) {
      params.set("page", String(nextPage));
    } else {
      params.delete("page");
    }

    const query = params.toString();
    const nextUrl = `/destinations${query ? `?${query}` : ""}`;
    const currentQuery = searchParams.toString();
    const currentUrl = `/destinations${currentQuery ? `?${currentQuery}` : ""}`;

    if (nextUrl === currentUrl) return;

    setErrorKey(null);

    router.push(nextUrl, { scroll: true });
  }

  function handlePageChange(nextPage: number) {
    goToPage(nextPage);
    updateQuery({ page: nextPage });
  }

  const errorMessage = errorKey === "loadList" ? t("errors.loadList") : null;

  return (
    <main className="overflow-x-hidden bg-[#fffaf1] text-[#173a3b]">
      <HomeHeader />

      <section className="bg-[#f7f0e4] px-5 pb-16 pt-32 sm:px-8 lg:px-12 lg:pt-40">
        <div className="mx-auto max-w-[1440px]">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.22em] text-[#e55c49]">{t("eyebrow")}</p>

          <h1 className="font-display text-4xl font-semibold leading-[1.03] tracking-[-0.035em] text-[#173a3b] sm:text-5xl lg:text-6xl">
            {t("title")}
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-8 text-[#60706d] sm:text-lg">{t("description")}</p>

          <div className="mt-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("filterAria")}>
              <button
                type="button"
                role="tab"
                aria-selected={activeLocationId === ""}
                onClick={() => updateQuery({ location: "", page: 1 })}
                className={`rounded-full px-4 py-2.5 text-sm font-bold transition-all ${activeLocationId === ""
                    ? "bg-[#173a3b] text-white shadow-lg"
                    : "border border-[#d3c8b7] bg-white/55 text-[#50605e] hover:bg-white"
                  }`}
              >
                {t("all")}
              </button>

              {locations.map((location) => (
                <button
                  key={location.id}
                  type="button"
                  role="tab"
                  aria-selected={activeLocationId === location.id}
                  onClick={() => updateQuery({ location: location.id, page: 1 })}
                  className={`rounded-full px-4 py-2.5 text-sm font-bold transition-all ${activeLocationId === location.id
                      ? "bg-[#173a3b] text-white shadow-lg"
                      : "border border-[#d3c8b7] bg-white/55 text-[#50605e] hover:bg-white"
                    }`}
                >
                  {localizedText(locale, {
                    vi: location.name,
                    en: location.nameEn,
                  })}
                </button>
              ))}
            </div>

            <SearchBox
              key={searchInUrl}
              defaultValue={searchInUrl}
              placeholder={t("searchPlaceholder")}
              ariaLabel={t("searchAria")}
              onSubmit={(value) => updateQuery({ q: value, page: 1 })}
            />
          </div>
        </div>
      </section>

      <section className="bg-[#fffaf1] px-5 py-16 sm:px-8 lg:px-12 lg:py-20" aria-busy={loading}>
        <div className="mx-auto max-w-[1440px]">
          {errorMessage ? (
            <div
              role="alert"
              className="mb-8 rounded-2xl border border-[#e9c3bb] bg-[#fff8f4] px-5 py-4 text-sm text-[#8f3f34]"
            >
              {errorMessage}
            </div>
          ) : null}

          {loading ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: PAGE_SIZE }).map((_, index) => (
                <div
                  key={`destination-skeleton-${index}`}
                  className="h-[420px] animate-pulse rounded-[30px] bg-[#ede6d7]"
                />
              ))}
            </div>
          ) : destinations.length === 0 ? (
            <div className="rounded-[30px] border border-dashed border-[#d3c8b7] px-8 py-20 text-center">
              <p className="font-display text-2xl font-semibold text-[#173a3b]">{t("emptyTitle")}</p>

              <p className="mt-3 text-[#667370]">{t("emptyDescription")}</p>
            </div>
          ) : (
            <>
              <div className="mb-6 flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-[#60706d]">
                  {t("resultCount", { count: total })}
                </p>

                <p className="text-xs font-semibold text-[#8a9491]">
                  {t("pageInfo", { page, totalPages })}
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {destinations.map((destination) => (
                  <DestinationCard
                    key={destination.id}
                    destination={destination}
                    locationName={locationNameFor(destination, locations, locale)}
                  />
                ))}
              </div>

              {totalPages > 1 ? (
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  hasNextPage={hasNextPage}
                  hasPreviousPage={hasPreviousPage}
                  onPageChange={handlePageChange}
                  onNext={() => handlePageChange(page + 1)}
                  onPrevious={() => handlePageChange(page - 1)}
                  prevLabel={t("pagination.prev")}
                  nextLabel={t("pagination.next")}
                  pageLabel={t("pagination.pageLabel")}
                />
              ) : null}
            </>
          )}
        </div>
      </section>

      <HomeFooter />
    </main>
  );
}

// ---------------------------------------------------------------------------
// Pagination component
// ---------------------------------------------------------------------------

interface PaginationProps {
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  prevLabel: string;
  nextLabel: string;
  pageLabel: string;
}

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  if (current > 3) {
    pages.push("ellipsis");
  }

  const rangeStart = Math.max(2, current - 1);
  const rangeEnd = Math.min(total - 1, current + 1);

  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("ellipsis");
  }

  pages.push(total);

  return pages;
}

function Pagination({
  page,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
  onNext,
  onPrevious,
  prevLabel,
  nextLabel,
  pageLabel,
}: PaginationProps) {
  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <nav
      aria-label={pageLabel}
      className="mt-12 flex items-center justify-center gap-1.5"
    >
      {/* Prev */}
      <button
        type="button"
        onClick={onPrevious}
        disabled={!hasPreviousPage}
        aria-label={prevLabel}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d3c8b7] bg-white text-[#50605e] transition hover:border-[#9aada8] hover:bg-[#edf7f4] hover:text-[#173a3b] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft size={18} />
      </button>

      {/* Page numbers */}
      {pageNumbers.map((item, index) => {
        if (item === "ellipsis") {
          return (
            <span
              key={`ellipsis-${index}`}
              className="grid h-10 w-10 place-items-center text-sm font-semibold text-[#8a9491]"
              aria-hidden="true"
            >
              …
            </span>
          );
        }

        const isActive = item === page;

        return (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition ${isActive
                ? "bg-[#173a3b] text-white shadow-[0_8px_20px_rgba(23,58,59,0.2)]"
                : "border border-[#d3c8b7] bg-white text-[#50605e] hover:border-[#9aada8] hover:bg-[#edf7f4] hover:text-[#173a3b]"
              }`}
          >
            {item}
          </button>
        );
      })}

      <button
        type="button"
        onClick={onNext}
        disabled={!hasNextPage}
        aria-label={nextLabel}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d3c8b7] bg-white text-[#50605e] transition hover:border-[#9aada8] hover:bg-[#edf7f4] hover:text-[#173a3b] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}

interface SearchBoxProps {
  defaultValue: string;

  placeholder: string;

  ariaLabel: string;

  onSubmit: (value: string) => void;
}

function SearchBox({ defaultValue, placeholder, ariaLabel, onSubmit }: SearchBoxProps) {
  const [value, setValue] = useState(defaultValue);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();

        onSubmit(value.trim());
      }}
      className="flex w-full max-w-sm items-center gap-2 rounded-full border border-[#d3c8b7] bg-white/70 px-4 py-2.5"
    >
      <SearchIcon size={18} className="shrink-0 text-[#8a8575]" />

      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="w-full bg-transparent text-sm text-[#173a3b] outline-none placeholder:text-[#8a8575]"
      />
    </form>
  );
}

