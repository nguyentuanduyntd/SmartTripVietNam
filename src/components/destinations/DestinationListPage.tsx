"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
import { HomeFooter } from "@/src/components/home/HomeFooter";
import { HomeHeader } from "@/src/components/home/HomeHeader";
import { DestinationCard, locationNameFor } from "@/src/components/destinations/DestinationCard";
import {destinationsApi,type Destination,} from "@/src/lib/api-client/destinations";
import { ApiRequestError } from "@/src/lib/api-client/http";
import { locationsApi, type Location } from "@/src/lib/api-client/locations";

const PAGE_SIZE = 24;

export function DestinationsListPage(){
    const router = useRouter();
    const searchParams = useSearchParams();
    const activeLocationId = searchParams.get("location") ?? "";
    const searchInUrl = searchParams.get("q") ?? "";
    
    const [locations, setLocations] = useState<Location[]>([]);
    const [destinations, setDestinations] = useState<Destination[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [errorMessage, setErrorMessagge] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        locationsApi.list().then((data) => {
            if (active) setLocations(data);
        }).catch((error) => {
            console.error("Không tải được danh sách khu vực: ", error);
        });

        return () => {
            active = false;
        };
    }, []);

    const loadDestinations = useCallback(async () => {
        setLoading(true);
        setErrorMessagge(null);
        setPage(1);

        try{
            const {data, meta} = await destinationsApi.list({
                page: 1,
                limit: PAGE_SIZE,
                locationId: activeLocationId || undefined,
                search: searchInUrl || undefined,
            });
            setDestinations(data);
            setTotal(meta.total);

        } catch (error) {
            setErrorMessagge(error instanceof ApiRequestError ? error.message : "Khong tải được danh sách địa danh");

        } finally {
            setLoading(false);
        }
    }, [activeLocationId, searchInUrl]);

    async function loadMore(){
        const nextPage = page + 1;
        setLoadingMore(true);

        try{
            const { data} = await destinationsApi.list({
                page: nextPage,
                limit: PAGE_SIZE,
                locationId: activeLocationId || undefined,
                search: searchInUrl || undefined,
            });

            setDestinations((current) => [...current, ...data]);
            setPage(nextPage);
        } catch (error){   
            setErrorMessagge(error instanceof ApiRequestError ? error.message : "Không tải thêm được địa danh.");
        } finally{
            setLoadingMore(false);
        }
    }

    useEffect(() => {
        void loadDestinations();
    }, [loadDestinations]);

    function updateQuery(next: {location?: string; q?: string}){
        const params = new URLSearchParams(searchParams.toString());
        const nextLocation = next.location !== undefined ? next.location : activeLocationId;
        const nextSearch = next.q !== undefined ? next.q : searchInUrl;

        if(nextLocation){
            params.set("location", nextLocation);
        } else {
            params.delete("location");
        }

        if(nextSearch){
            params.set("q", nextSearch);
        } else {
            params.delete("q");
        }

        const query = params.toString();
        router.push(`/destinations${query ? `?${query}` : ""}`, {scroll: false});
    }

    return (
        <main className="overflow-x-hidden bg-[#fffaf1] text-[#173a3b]">
            <HomeHeader />

            <section className="bg-[#f7f0e4] px-5 pb-16 pt-32 sm:px-8 lg:px-12 lg:pt-40">
                <div className="mx-auto max-w-[1440px]">
                    <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.22em] text-[#e55c49]">
                        Điểm đến
                    </p>

                    <h1 className="font-display text-4xl font-semibold leading-[1.03] tracking-[-0.035em] text-[#173a3b] sm:text-5xl lg:text-6xl">
                        Khám phá địa danh Huế · Đà Nẵng · Hội An
                    </h1>

                    <p className="mt-5 max-w-2xl text-base leading-8 text-[#60706d] sm:text-lg">
                        Toàn bộ địa danh trong hệ thống, lọc theo khu vực để
                        tìm đúng nơi bạn muốn đến.
                    </p>

                    <div className="mt-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div
                            className="flex flex-wrap gap-2"
                            role="tablist"
                            aria-label="Lọc theo khu vực"
                        >
                            <button
                                type="button"
                                role="tab"
                                aria-selected={activeLocationId === ""}
                                onClick={() => updateQuery({ location: "" })}
                                className={`rounded-full px-4 py-2.5 text-sm font-bold transition-all ${
                                    activeLocationId === ""
                                        ? "bg-[#173a3b] text-white shadow-lg"
                                        : "border border-[#d3c8b7] bg-white/55 text-[#50605e] hover:bg-white"
                                }`}
                            >
                                Tất cả
                            </button>

                            {locations.map((location) => (
                                <button
                                    key={location.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={
                                        activeLocationId === location.id
                                    }
                                    onClick={() =>
                                        updateQuery({ location: location.id })
                                    }
                                    className={`rounded-full px-4 py-2.5 text-sm font-bold transition-all ${
                                        activeLocationId === location.id
                                            ? "bg-[#173a3b] text-white shadow-lg"
                                            : "border border-[#d3c8b7] bg-white/55 text-[#50605e] hover:bg-white"
                                    }`}
                                >
                                    {location.name}
                                </button>
                            ))}
                        </div>

                        <SearchBox
                            key={searchInUrl}
                            defaultValue={searchInUrl}
                            onSubmit={(value) => updateQuery({ q: value })}
                        />
                    </div>
                </div>
            </section>

            <section className="bg-[#fffaf1] px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
                <div className="mx-auto max-w-[1440px]">
                    {errorMessage ? (
                        <div className="mb-8 rounded-2xl border border-[#e9c3bb] bg-[#fff8f4] px-5 py-4 text-sm text-[#8f3f34]">
                            {errorMessage}
                        </div>
                    ) : null}

                    {loading ? (
                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <div
                                    key={`destination-skeleton-${index}`}
                                    className="h-[420px] animate-pulse rounded-[30px] bg-[#ede6d7]"
                                />
                            ))}
                        </div>
                    ) : destinations.length === 0 ? (
                        <div className="rounded-[30px] border border-dashed border-[#d3c8b7] px-8 py-20 text-center">
                            <p className="font-display text-2xl font-semibold text-[#173a3b]">
                                Không tìm thấy địa danh phù hợp
                            </p>
                            <p className="mt-3 text-[#667370]">
                                Thử chọn khu vực khác hoặc xóa từ khóa tìm
                                kiếm.
                            </p>
                        </div>
                    ) : (
                        <>
                            <p className="mb-6 text-sm font-semibold text-[#60706d]">
                                {total} địa danh
                            </p>

                            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                                {destinations.map((destination) => (
                                    <DestinationCard
                                        key={destination.id}
                                        destination={destination}
                                        locationName={locationNameFor(
                                            destination,
                                            locations,
                                        )}
                                    />
                                ))}
                            </div>

                            {destinations.length < total ? (
                                <div className="mt-10 flex justify-center">
                                    <button
                                        type="button"
                                        onClick={() => void loadMore()}
                                        disabled={loadingMore}
                                        className="inline-flex items-center gap-2 rounded-full border border-[#bfb2a1] px-6 py-3 font-bold text-[#315f5f] transition-colors hover:bg-[#173a3b] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {loadingMore
                                            ? "Đang tải…"
                                            : `Xem thêm (${destinations.length}/${total})`}
                                    </button>
                                </div>
                            ) : null}
                        </>
                    )}
                </div>
            </section>

            <HomeFooter />
        </main>
    );
}

interface SearchBoxProps {
    defaultValue: string,
    onSubmit: (value: string) => void;
}

function SearchBox({defaultValue, onSubmit}: SearchBoxProps){
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
                type="text"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="Tìm địa danh…"
                className="w-full bg-transparent text-sm text-[#173a3b] outline-none placeholder:text-[#8a8575]"
            />
        </form>
    );
}