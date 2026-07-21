import "server-only";
import {createCuisine,deleteCuisine,findCuisineById,findCuisineBySlug,findCuisines,findDestinationsByCuisineIds,
  findExistingDestinationIds,updateCuisine,type CuisineFilters,} from "@/src/repositories/cuisine.repository";
import type {CreateCuisineRequest,UpdateCuisineRequest,} from "@/src/schemas/cuisine.schema";
import { slugify } from "@/src/utils/slugify";
import { deleteImage } from "./image.service";

export class CuisineNotFoundError extends Error{
    constructor() {
        super("Không tìm thấy món ăn");
        this.name = "CuisineNotFoundError";
    }
}

export class CuisineSlugConflictError extends Error {
  constructor(slug: string) {
    super(`Slug "${slug}" đã được sử dụng`);
    this.name = "CuisineSlugConflictError";
  }
}

export class InvalidDestinationIdsError extends Error {
  invalidIds: string[];

  constructor(invalidIds: string[]) {
    super(`Destination ID không tồn tại: ${invalidIds.join(", ")}`);
    this.name = "InvalidDestinationIdsError";
    this.invalidIds = invalidIds;
  }
}

async function ensureUniqueCuisineSlug(slug: string, ignoreId?: string) {
  const existing = await findCuisineBySlug(slug);

  if (existing && existing.id !== ignoreId) {
    throw new CuisineSlugConflictError(slug);
  }
}

async function ensureDestinationsExist(destinationIds: string[]) {
  if (destinationIds.length === 0) {
    return;
  }

  const existingIds = new Set(await findExistingDestinationIds(destinationIds));
  const invalidIds = destinationIds.filter((id) => !existingIds.has(id));

  if (invalidIds.length > 0) {
    throw new InvalidDestinationIdsError(invalidIds);
  }
}

async function attachDestinations<T extends { id: string }>(rows: T[]) {
  const destinationsMap = await findDestinationsByCuisineIds(
    rows.map((row) => row.id),
  );

  return rows.map((row) => ({
    ...row,
    destinations: destinationsMap.get(row.id) ?? [],
  }));
}

async function deleteImageSafely(publicId: string | null | undefined) {
  if (!publicId) return;

  try {
    await deleteImage(publicId);
  } catch (error) {
    console.error(`Không thể xóa ảnh Cloudinary "${publicId}":`, error);
  }
}

export async function listCuisines(filters: CuisineFilters) {
  const { rows, total } = await findCuisines(filters);
  const data = await attachDestinations(rows);

  return { data, total };
}

export async function getCuisineById(id: string) {
  const cuisine = await findCuisineById(id);

  if (!cuisine) {
    throw new CuisineNotFoundError();
  }

  const [withDestinations] = await attachDestinations([cuisine]);

  return withDestinations;
}

export async function createCuisineService(input: CreateCuisineRequest) {
  const slug = input.slug?.trim() || slugify(input.name);
  await ensureUniqueCuisineSlug(slug);

  const destinationIds = input.destinationIds ?? [];
  await ensureDestinationsExist(destinationIds);

  const cuisine = await createCuisine(
    {
      name: input.name,
      nameEn: input.nameEn ?? null,
      slug,
      description: input.description ?? null,
      descriptionEn: input.descriptionEn ?? null,
      avgPrice: input.avgPrice ?? null,
      coverImageUrl: input.coverImageUrl ?? null,
      coverImagePublicId: input.coverImagePublicId ?? null,
    },
    destinationIds,
  );

  const [withDestinations] = await attachDestinations([cuisine]);

  return withDestinations;
}

export async function updateCuisineService(
  id: string,
  input: UpdateCuisineRequest,
) {
  const existing = await findCuisineById(id);

  if (!existing) {
    throw new CuisineNotFoundError();
  }

  if (input.slug && input.slug !== existing.slug) {
    await ensureUniqueCuisineSlug(input.slug, id);
  }

  if (input.destinationIds) {
    await ensureDestinationsExist(input.destinationIds);
  }

  const oldCoverPublicId = existing.coverImagePublicId;

  const coverWasChanged =
    input.coverImagePublicId !== undefined &&
    input.coverImagePublicId !== oldCoverPublicId;

  const { destinationIds, ...rest } = input;

  const updated = await updateCuisine(id, rest, destinationIds);

  if (!updated) {
    throw new CuisineNotFoundError();
  }

  /*
   * Database đã cập nhật thành công mới xóa ảnh cũ.
   * Nếu xóa Cloudinary thất bại thì vẫn giữ kết quả update DB.
   */
  if (coverWasChanged && oldCoverPublicId) {
    await deleteImageSafely(oldCoverPublicId);
  }

  const [withDestinations] = await attachDestinations([updated]);

  return withDestinations;
}

export async function deleteCuisineService(id: string) {
  const existing = await findCuisineById(id);

  if (!existing) {
    throw new CuisineNotFoundError();
  }

  const deleted = await deleteCuisine(id);

  if (!deleted) {
    throw new CuisineNotFoundError();
  }

  await deleteImageSafely(existing.coverImagePublicId);

  return deleted;
}