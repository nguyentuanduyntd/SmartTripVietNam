"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchHomeApiData } from "../lib/home-api";
import { createHomeViewData, getFallbackHomeViewData } from "../lib/home-data-mapper";
import type { HomeApiData } from "../types/home-api";

export function useHomeData(){
    const [apiData, setApiData] = useState<HomeApiData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const loadData = useCallback(
        async(signal?: AbortSignal) => {
            setIsLoading(true);
            setError(null);
            try{
                const result = await fetchHomeApiData(signal);
                setApiData(result);
            } catch(caughtError){
                if(caughtError instanceof DOMException && caughtError.name === "AbortError"){
                    return;
                }
                const message = caughtError instanceof Error ? caughtError.message : "Không thể tải dữ liệu trang chủ";

                console.error("Lỗi tải dữ liệu Home: ", caughtError);
                setError(message);
            } finally{
                if(!signal?.aborted){
                    setIsLoading(false);
                }
            }
        },[],
    );

    useEffect(() => {
        const controller = new AbortController();
        
        void loadData(controller.signal);

        return () => {
            controller.abort();
        };
    },[loadData]);

    const viewData = useMemo(() => apiData ? createHomeViewData(apiData) : getFallbackHomeViewData(), [apiData],);

    return {
        ...viewData,
        isLoading,
        error,
        reload: () => loadData(),
    };
}