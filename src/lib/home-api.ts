import type { ApiErrorResponse, ApiSuccessResponse, CuisineApiItem,
    DestinationApiItem, HomeApiData, LocationApiItem,} from "../types/home-api";

async function getApiData<T>(
    url: string,
    signal?: AbortSignal,
): Promise<T>{
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            Accept: "application/json",
        },
        signal,
    });
    const payload = (await response.json().catch(() => null)) as | ApiSuccessResponse<T> | ApiErrorResponse | null;

    if(!response.ok || !payload || payload.success !== true){
        
        const message = payload && "message" in payload && payload.message ? payload.message : `Không thể tải dữ liệu từ ${url}`;
        
        throw new Error(message);
    }
    return payload.data;
}

export async function fetchHomeApiData(
    signal?: AbortSignal,
): Promise<HomeApiData>{
    
    const [locations, destinations, cuisines] = await Promise.all([
        getApiData<LocationApiItem[]>("/api/locations", signal,),
        getApiData<DestinationApiItem[]>("/api/destinations?page=1&limit=100",signal,),
        getApiData<CuisineApiItem[]>("/api/cuisines?page=1&limit=100",signal,),
    ]);

    return {
        locations,
        destinations,
        cuisines,
    };
}