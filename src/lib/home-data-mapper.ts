import { Summary, type LucideIcon } from "lucide-react";
import { CITY_EDITORIAL, CUISINES, FEATURED_DESTINATIONS, HOME_CITIES,
    type CityId, type CuisineCardData, type DestinationCardData, type HomeCity
} from "../constants/home-data";
import type { CuisineApiItem, DestinationApiItem, HomeApiData, LocationApiItem } from "../types/home-api";
import { CityEditorialSection } from "../components/home/HomeSections";

export interface CityEditorialCardData {
    city: string;
    kicker: string;
    title: string;
    image: string;
    imageAlt: string;
    icon: LucideIcon;
    stat: string;
}

export interface HomeViewData {
    cities: HomeCity[];
    cityEditorial: CityEditorialCardData[];
    featuredDestinations: DestinationCardData[];
    cuisines: CuisineCardData[];
}

function getCityIdFromLocationSlug(
    slug: string,
) : CityId | null {
    
    const normalizedSlug = slug.trim().toLowerCase();
    const cityMap: Record<string,CityId> = {
        hue: "hue",
        "thua-thien-hue": "hue",
        "da-nang": "da-nang",
        "hoi-an": "hoi-an",
    };
    return cityMap[normalizedSlug] ?? null;
}

function getLocationByCityId(
    locations: LocationApiItem[],
    cityId: CityId,
): LocationApiItem | undefined {
    return locations.find((location) => getCityIdFromLocationSlug(location.slug,) === cityId,);
}

function getCityFallBackImage(
    cityId: CityId,
): string {
    return(HOME_CITIES.find((city)=> city.id === cityId,)?.image ?? HOME_CITIES[0].image);
}

function formatPrice(
    price: number | null,
): string {
    
    if(price === null){return "Giá tham khảo";}
    
    return `Khoảng ${new Intl.NumberFormat("vi-VN",).format(price)}đ`;
}

function createDynamicCities(
    locations: LocationApiItem[],
): HomeCity[]{
    
    return HOME_CITIES.map((staticCity) => {
        
        const location = getLocationByCityId(locations, staticCity.id,);

        if(!location){ return staticCity;}

        return {
            ...staticCity,
            name: location.name,
            description: location.description ?? staticCity.description,
            href: `/destinations?locationId=${location.id}`,
        };
    });
}

function createCityEditorial(
    locations: LocationApiItem[],
    destinations: DestinationApiItem[],
): CityEditorialCardData[]{
    return CITY_EDITORIAL.map(
        (staticItem, index) => {
            const staticCity = HOME_CITIES[index];
            const location = getLocationByCityId(locations, staticCity.id,);
            const destinationCount = location ? destinations.filter((destination) => destination.locationId === location.id,).length : 0;

            return {
                ...staticItem,
                city: location?.name ?? staticItem.city,
                title: location?.description ?? staticItem.title,
                stat: `${String(destinationCount).padStart(2, "0")} điểm đến`,
            };
        },
    );
}

function createDestinationCards(
    locations: LocationApiItem[],
    destinations: DestinationApiItem[],
): DestinationCardData[]{
    const locationById = new Map(locations.map((location) => [location.id, location]),);
    const mappedItems = destinations.map((destination) => {
        const location = locationById.get(destination.locationId);
        if(!location){return null;}
        const cityId = getCityIdFromLocationSlug(location.slug);
        if(!cityId){return null;}
        const firstCategory = destination.categories[0];

        return {
            name: destination.name,
            city: cityId,
            cityLabel: location.name,
            category: firstCategory?.name ?? "Điểm đến",
            description: destination.description ?? destination.address ?? `Khám phá ${destination.name} tại ${location.name}.`,
            image: destination.coverImageUrl ?? getCityFallBackImage(cityId),
            imageAlt: destination.name,
            href: `/destinations/${destination.slug}`,
        
        } satisfies DestinationCardData;
    }).filter((item): item is DestinationCardData => item !== null);

    if(mappedItems.length === 0){return FEATURED_DESTINATIONS;}

    //lấy tối đa 2 destination cho mỗi thành phố 
    const balancedItems = HOME_CITIES.flatMap((city) => mappedItems.filter((item) => item.city ===city.id).slice(0,2));
    const selectedItems = [...balancedItems];
    const selectedHrefs = new Set(selectedItems.map((item) => item.href),);
    
    for (const item of mappedItems){
        if(selectedItems.length >= 6){
            break;
        }
        if(!selectedHrefs.has(item.href)){
            selectedItems.push(item);
            selectedHrefs.add(item.href);
        }
    }
    return selectedItems.slice(0,6);
}

function createCuisineCards(
    locations: LocationApiItem[],
    destinations: DestinationApiItem[],
    cuisines: CuisineApiItem[],
): CuisineCardData[] {
    const locationById = new Map(locations.map((location) => [location.id,location,]),);

    const destinationById = new Map(destinations.map((destination) => [destination.id,destination,]),);

    const mappedItems = cuisines.map((cuisine) => {
        const relatedLocations = cuisine.destinations
            .map((summary) =>destinationById.get(summary.id),)
            .filter((destination): destination is DestinationApiItem => Boolean(destination),)
            .map((destination) => locationById.get(destination.locationId),)
            .filter((location): location is LocationApiItem => Boolean(location));
        
        const uniqueLocationNames = [
            ...new Set(relatedLocations.map((location) => location.name),),
        ];

        const firstLocation = relatedLocations[0];
        const firstCityId = firstLocation ? getCityIdFromLocationSlug(firstLocation.slug) : null;

        return {
            name: cuisine.name,
            city: uniqueLocationNames.length> 0 ? uniqueLocationNames.join(".",) : "Miền Trung",
            price: formatPrice(cuisine.avgPrice),
            description: cuisine.description ??  `Khám phá hương vị ${cuisine.name}.`,
            image: cuisine.coverImageUrl ?? getCityFallBackImage(firstCityId ?? "hue"),
            imageAlt: cuisine.name,
            href: `/cuisines/${cuisine.slug}`,
        } satisfies CuisineCardData;
    },);

    return mappedItems.length > 0 ? mappedItems.slice(0, 4) : CUISINES;
}

export function createHomeViewData(
    apiData: HomeApiData,
): HomeViewData{
    return {
        cities: createDynamicCities(apiData.locations),
        cityEditorial: createCityEditorial(apiData.locations, apiData.destinations),
        featuredDestinations: createDestinationCards(apiData.locations, apiData.destinations),
        cuisines: createCuisineCards(apiData.locations, apiData.destinations, apiData.cuisines),
    };
}

export function getFallbackHomeViewData(): HomeViewData {
    return {
        cities: HOME_CITIES,
        cityEditorial:CITY_EDITORIAL.map((item) => ({...item,})),
        featuredDestinations:FEATURED_DESTINATIONS,
        cuisines: CUISINES,
    };
}
