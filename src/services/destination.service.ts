import "server-only";
import { findLocationById } from "@/src/repositories/location.repository";
import {createDestination,deleteDestination,findCategoriesByDestinationIds,findDestinationBySlug,
  findDestinationById,findDestinations,findExistingCategoryIds,updateDestination,type DestinationFilters,} from "@/src/repositories/destination.repository";
import type {CreateDestinationRequest,UpdateDestinationRequest,} from "@/src/schemas/destination.schema";
import { slugify } from "@/src/utils/slugify";
import { deleteImage } from "./image.service";

export class DestinationNotFoundError extends Error {
  constructor() {
    super("Không tìm thấy destination");
    this.name = "DestinationNotFoundError";
  }
}

export class DestinationSlugConflictError extends Error {
  constructor(slug: string) {
    super(`Slug "${slug}" đã được sử dụng`);
    this.name = "DestinationSlugConflictError";
  }
}

export class LocationNotFoundForDestinationError extends Error {
  constructor() {
    super("Location được chọn không tồn tại");
    this.name = "LocationNotFoundForDestinationError";
  }
}

export class InvalidCategoryIdsError extends Error {
  invalidIds: string[];

  constructor(invalidIds: string[]) {
    super(`Category ID không tồn tại: ${invalidIds.join(", ")}`);
    this.name = "InvalidCategoryIdsError";
    this.invalidIds = invalidIds;
  }
}

async function ensureUniqueDestinationSlug(slug: string, ignoreId?: string) {
  const existing = await findDestinationBySlug(slug);

  if (existing && existing.id !== ignoreId) {
    throw new DestinationSlugConflictError(slug);
  }
}

async function ensureCategoriesExist(categoryIds: string[]) {
  if (categoryIds.length === 0) {
    return;
  }

  const existingIds = new Set(await findExistingCategoryIds(categoryIds));
  const invalidIds = categoryIds.filter((id) => !existingIds.has(id));

  if (invalidIds.length > 0) {
    throw new InvalidCategoryIdsError(invalidIds);
  }
}

async function attachCategories<T extends { id: string }>(rows: T[]) {
  const categoriesMap = await findCategoriesByDestinationIds(
    rows.map((row) => row.id),
  );

  return rows.map((row) => ({
    ...row,
    categories: categoriesMap.get(row.id) ?? [],
  }));
}

async function deleteImageSafely(
  publicId: string | null | undefined,
) {
  if (!publicId) return;

  try {
    await deleteImage(publicId);
  } catch (error) {
    console.error(
      `Không thể xóa ảnh Cloudinary "${publicId}":`,
      error,
    );
  }
}

export async function listDestinations(filters: DestinationFilters) {
  const { rows, total } = await findDestinations(filters);
  const data = await attachCategories(rows);

  return { data, total };
}

export async function getDestinationById(id: string) {
  const destination = await findDestinationById(id);

  if (!destination) {
    throw new DestinationNotFoundError();
  }

  const [withCategories] = await attachCategories([destination]);

  return withCategories;
}

export async function createDestinationService(
  input: CreateDestinationRequest,
) {
  const location = await findLocationById(input.locationId);
  if (!location) {
    throw new LocationNotFoundForDestinationError();
  }

  const slug = input.slug?.trim() || slugify(input.name);
  await ensureUniqueDestinationSlug(slug);

  const categoryIds = input.categoryIds ?? [];
  await ensureCategoriesExist(categoryIds);

  const destination = await createDestination(
    {
      locationId: input.locationId,
      name: input.name,
      nameEn: input.nameEn ?? null,
      slug,
      address: input.address ?? null,
      description: input.description ?? null,
      descriptionEn: input.descriptionEn ?? null,
      history: input.history ?? null,
      historyEn: input.historyEn ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      coverImageUrl: input.coverImageUrl ?? null,
      coverImagePublicId: input.coverImagePublicId ?? null,
    },
    categoryIds,
  );

  const [withCategories] = await attachCategories([destination]);

  return withCategories;
}

export async function updateDestinationService(
  id: string,
  input: UpdateDestinationRequest,
) {
  const existing = await findDestinationById(id);

  if (!existing) {
    throw new DestinationNotFoundError();
  }

  if (input.locationId) {
    const location = await findLocationById(input.locationId);

    if (!location) {
      throw new LocationNotFoundForDestinationError();
    }
  }

  if (input.slug && input.slug !== existing.slug) {
    await ensureUniqueDestinationSlug(input.slug, id);
  }

  if (input.categoryIds) {
    await ensureCategoriesExist(input.categoryIds);
  }

  const oldCoverPublicId = existing.coverImagePublicId;

  const coverWasChanged =
    input.coverImagePublicId !== undefined &&
    input.coverImagePublicId !== oldCoverPublicId;

  const { categoryIds, ...rest } = input;

  const updated = await updateDestination(
    id,
    rest,
    categoryIds,
  );

  if (!updated) {
    throw new DestinationNotFoundError();
  }

  /*
   * Database đã cập nhật thành công mới xóa ảnh cũ.
   * Nếu xóa Cloudinary thất bại thì vẫn giữ kết quả update DB.
   */
  if (coverWasChanged && oldCoverPublicId) {
    await deleteImageSafely(oldCoverPublicId);
  }

  const [withCategories] = await attachCategories([updated]);

  return withCategories;
}

export async function deleteDestinationService(id: string) {
  const existing = await findDestinationById(id);

  if (!existing) {
    throw new DestinationNotFoundError();
  }

  const deleted = await deleteDestination(id);

  if (!deleted) {
    throw new DestinationNotFoundError();
  }

  await deleteImageSafely(existing.coverImagePublicId);

  return deleted;
}