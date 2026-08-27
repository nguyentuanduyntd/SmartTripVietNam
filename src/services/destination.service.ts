import "server-only";

import {
  findLocationById,
} from "@/src/repositories/location.repository";

import {
  createDestination,
  deleteDestination,
  findCategoriesByDestinationIds,
  findDestinationBySlug,
  findDestinationById,
  findDestinations,
  findExistingCategoryIds,
  updateDestination,
  type DestinationFilters,
} from "@/src/repositories/destination.repository";

import type {
  CreateDestinationRequest,
  UpdateDestinationRequest,
} from "@/src/schemas/destination.schema";

import { slugify } from "@/src/utils/slugify";
import { deleteImage } from "./image.service";

import {
  buildCacheKey,
  CACHE_TTL_SECONDS,
  deleteCacheByPrefix,
  rememberCachedValue,
} from "@/src/lib/cache/redis-cache";

const DESTINATION_CACHE_PREFIX =
  "smarttrip:v1:destinations:";

const CUISINE_CACHE_PREFIX =
  "smarttrip:v1:cuisines:";

/**
 * Destination có quan hệ với cuisine.
 *
 * Khi destination thay đổi, cần xóa cả cache
 * destination và cuisine.
 */
async function invalidateDestinationCache() {
  await Promise.all([
    deleteCacheByPrefix(
      DESTINATION_CACHE_PREFIX,
    ),
    deleteCacheByPrefix(
      CUISINE_CACHE_PREFIX,
    ),
  ]);
}

export class DestinationNotFoundError extends Error {
  constructor() {
    super("Không tìm thấy destination");

    this.name =
      "DestinationNotFoundError";
  }
}

export class DestinationSlugConflictError extends Error {
  constructor(slug: string) {
    super(
      `Slug "${slug}" đã được sử dụng`,
    );

    this.name =
      "DestinationSlugConflictError";
  }
}

export class LocationNotFoundForDestinationError extends Error {
  constructor() {
    super(
      "Location được chọn không tồn tại",
    );

    this.name =
      "LocationNotFoundForDestinationError";
  }
}

export class InvalidCategoryIdsError extends Error {
  invalidIds: string[];

  constructor(invalidIds: string[]) {
    super(
      `Category ID không tồn tại: ${invalidIds.join(", ")}`,
    );

    this.name =
      "InvalidCategoryIdsError";

    this.invalidIds = invalidIds;
  }
}

async function ensureUniqueDestinationSlug(
  slug: string,
  ignoreId?: string,
) {
  const existing =
    await findDestinationBySlug(slug);

  if (
    existing &&
    existing.id !== ignoreId
  ) {
    throw new DestinationSlugConflictError(
      slug,
    );
  }
}

async function ensureCategoriesExist(
  categoryIds: string[],
) {
  if (categoryIds.length === 0) {
    return;
  }

  const existingIds = new Set(
    await findExistingCategoryIds(
      categoryIds,
    ),
  );

  const invalidIds =
    categoryIds.filter(
      (id) => !existingIds.has(id),
    );

  if (invalidIds.length > 0) {
    throw new InvalidCategoryIdsError(
      invalidIds,
    );
  }
}

async function attachCategories<
  T extends { id: string },
>(rows: T[]) {
  const categoriesMap =
    await findCategoriesByDestinationIds(
      rows.map((row) => row.id),
    );

  return rows.map((row) => ({
    ...row,
    categories:
      categoriesMap.get(row.id) ?? [],
  }));
}

async function deleteImageSafely(
  publicId: string | null | undefined,
) {
  if (!publicId) {
    return;
  }

  try {
    await deleteImage(publicId);
  } catch (error) {
    console.error(
      `Không thể xóa ảnh Cloudinary "${publicId}":`,
      error,
    );
  }
}

/**
 * Cache danh sách destination theo từng bộ filter
 * trong 5 phút.
 */
export async function listDestinations(
  filters: DestinationFilters,
) {
  const key =
    `${DESTINATION_CACHE_PREFIX}list:` +
    buildCacheKey(filters);

  return rememberCachedValue(
    key,
    CACHE_TTL_SECONDS.short,
    async () => {
      const { rows, total } =
        await findDestinations(filters);

      const data =
        await attachCategories(rows);

      return {
        data,
        total,
      };
    },
  );
}

/**
 * Cache chi tiết destination trong 15 phút.
 */
export async function getDestinationById(
  id: string,
) {
  return rememberCachedValue(
    `${DESTINATION_CACHE_PREFIX}detail:${id}`,
    CACHE_TTL_SECONDS.medium,
    async () => {
      const destination =
        await findDestinationById(id);

      if (!destination) {
        throw new DestinationNotFoundError();
      }

      const [withCategories] =
        await attachCategories([
          destination,
        ]);

      return withCategories;
    },
  );
}

export async function createDestinationService(
  input: CreateDestinationRequest,
) {
  const location =
    await findLocationById(
      input.locationId,
    );

  if (!location) {
    throw new LocationNotFoundForDestinationError();
  }

  const slug =
    input.slug?.trim() ||
    slugify(input.name);

  await ensureUniqueDestinationSlug(
    slug,
  );

  const categoryIds =
    input.categoryIds ?? [];

  await ensureCategoriesExist(
    categoryIds,
  );

  const destination =
    await createDestination(
      {
        locationId:
          input.locationId,
        name: input.name,
        nameEn:
          input.nameEn ?? null,
        slug,
        address:
          input.address ?? null,
        description:
          input.description ?? null,
        descriptionEn:
          input.descriptionEn ?? null,
        history:
          input.history ?? null,
        historyEn:
          input.historyEn ?? null,
        latitude:
          input.latitude ?? null,
        longitude:
          input.longitude ?? null,
        coverImageUrl:
          input.coverImageUrl ?? null,
        coverImagePublicId:
          input.coverImagePublicId ??
          null,
      },
      categoryIds,
    );

  const [withCategories] =
    await attachCategories([
      destination,
    ]);

  await invalidateDestinationCache();

  return withCategories;
}

export async function updateDestinationService(
  id: string,
  input: UpdateDestinationRequest,
) {
  const existing =
    await findDestinationById(id);

  if (!existing) {
    throw new DestinationNotFoundError();
  }

  if (input.locationId) {
    const location =
      await findLocationById(
        input.locationId,
      );

    if (!location) {
      throw new LocationNotFoundForDestinationError();
    }
  }

  if (
    input.slug &&
    input.slug !== existing.slug
  ) {
    await ensureUniqueDestinationSlug(
      input.slug,
      id,
    );
  }

  if (input.categoryIds) {
    await ensureCategoriesExist(
      input.categoryIds,
    );
  }

  const oldCoverPublicId =
    existing.coverImagePublicId;

  const coverWasChanged =
    input.coverImagePublicId !==
      undefined &&
    input.coverImagePublicId !==
      oldCoverPublicId;

  const {
    categoryIds,
    ...rest
  } = input;

  const updated =
    await updateDestination(
      id,
      rest,
      categoryIds,
    );

  if (!updated) {
    throw new DestinationNotFoundError();
  }

  /*
   * Chỉ xóa ảnh cũ sau khi database đã update
   * thành công.
   */
  if (
    coverWasChanged &&
    oldCoverPublicId
  ) {
    await deleteImageSafely(
      oldCoverPublicId,
    );
  }

  const [withCategories] =
    await attachCategories([
      updated,
    ]);

  await invalidateDestinationCache();

  return withCategories;
}

export async function deleteDestinationService(
  id: string,
) {
  const existing =
    await findDestinationById(id);

  if (!existing) {
    throw new DestinationNotFoundError();
  }

  const deleted =
    await deleteDestination(id);

  if (!deleted) {
    throw new DestinationNotFoundError();
  }

  await deleteImageSafely(
    existing.coverImagePublicId,
  );

  await invalidateDestinationCache();

  return deleted;
}