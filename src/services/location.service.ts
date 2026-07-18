import "server-only";
import { countDestinationByLocation,createLocation, deleteLocation, findAllLocations, findLocationById, findLocationBySlug, updateLocation } from "../repositories/location.repository";
import type { CreateLocationRequest, UpdateLocationRequest } from "../schemas/location.schema";
import { slugify } from "../utils/slugify";
import { en } from "zod/locales";

export class LocationNotFoundError extends Error {
    constructor(){
        super("Không tìm thấy location");
        this.name = "LocationNotFoundError";
    }
}

export class LocationSlugConflictError extends Error {
    constructor(slug: string){
        super(`Slug "${slug}" đã được sử dụng`);
        this.name = "LocationSlugConflictError";
    }
}

export class LocationInUseError extends Error {
    destinationCount: number;

    constructor(destinationCount: number){
        super( `Không thể xóa location vì vẫn còn ${destinationCount} destination liên kết`,);
        this.name = "LocationInUseError";
        this.destinationCount = destinationCount;
    }
}

async function ensureUniqueSlug(slug: string, ignoreId?: string){
    const existing = await findLocationBySlug(slug);

    if(existing && existing.id !== ignoreId){
        throw new LocationSlugConflictError(slug);
    }
}

export async function listLocation(){
    return findAllLocations();
}

export async function getLocationById(id: string){
    const location = await findLocationById(id);

    if(!location){throw new LocationNotFoundError();}
    return location;
}

export async function createLocationService(input: CreateLocationRequest){
    const slug = input.slug?.trim() || slugify(input.name);

    await ensureUniqueSlug(slug);

    return createLocation({
        name: input.name,
        nameEn: input.nameEn ?? null,
        slug,
        description: input.description ?? null,
        descriptionEn: input.descriptionEn ?? null,
    });
}

export async function updateLocationService(id: string, input: UpdateLocationRequest){
    const location = await findLocationById(id);

    if(!location){throw new LocationNotFoundError();}
    if(input.slug && input.slug !== location.slug){await ensureUniqueSlug(input.slug, id)};

    const updated =await updateLocation(id, input);

    if(!updated){throw new LocationNotFoundError();}
    return updated;
}

export async function deleteLocationService(id: string){
    const location = await findLocationById(id);
    if(!location){throw new LocationNotFoundError();}
    
    const destinationCount = await countDestinationByLocation(id);

    if(destinationCount > 0){throw new LocationInUseError(destinationCount)};

    const deleted = await deleteLocation(id);

    if(!deleted){throw new LocationNotFoundError();}

    return deleted;
}
