import "server-only";

import type { TourStatus } from "@/src/constants/tour_community";
import {createTourCost,createTourDay,createTourGraph,createTourItem,createTourMeal,
  deleteTour,deleteTourCost,deleteTourDay,deleteTourItem,deleteTourMeal,
  findExistingCuisineIds,findExistingDestinationIds,findMaxTourDayNumber,findTourById,
  findTourBySlug,findTourCostById,findTourCosts,findTourDayById,findTourDayByNumber,
  findTourDetailById,findTourDetailBySlug,findTourItemById,findTourItemBySortOrder,findTourItemDetailById,
  findTourMealById,findTourMealBySortOrder,findTourMealDetailById,findTours,
  recalculateTourEstimatedPrice,startLocationExists,tourDayBelongsToTour,tourItemBelongsToTour,
  tourMealBelongsToTour,updateTour,updateTourCost,updateTourDay,updateTourItem,updateTourMeal,
  type TourFilters,type UpdateTourCostRecord,type UpdateTourRecord,
} from "@/src/repositories/tour.repository";
import type {
  CreateTourCostRequest,CreateTourDayRequest,CreateTourItemRequest,CreateTourMealRequest,
  CreateTourRequest,UpdateTourCostRequest,UpdateTourDayRequest,UpdateTourItemRequest,UpdateTourMealRequest,
  UpdateTourRequest,
} from "@/src/schemas/tour.schema";
import { slugify } from "@/src/utils/slugify";

export class TourServiceError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 404 | 409,
    public readonly errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "TourServiceError";
  }
}

type TourViewer = {
  isAdmin: boolean;
};

function notFound(message: string): never {
  throw new TourServiceError(message, 404);
}

function badRequest(
  message: string,
  errors?: Record<string, string[]>,
): never {
  throw new TourServiceError(message, 400, errors);
}

function conflict(
  message: string,
  errors?: Record<string, string[]>,
): never {
  throw new TourServiceError(message, 409, errors);
}

function uniqueIds(ids: Array<string | null | undefined>) {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

function normalizeTime(value: string) {
  return value.length === 5 ? `${value}:00` : value;
}

function ensureValidTimeRange(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
) {
  if (!startTime || !endTime) {
    return;
  }

  if (normalizeTime(startTime) >= normalizeTime(endTime)) {
    badRequest("Thời gian kết thúc phải lớn hơn thời gian bắt đầu", {
      endTime: ["Thời gian kết thúc phải lớn hơn thời gian bắt đầu"],
    });
  }
}

async function ensureTourSlugIsUnique(
  slug: string,
  ignoredTourId?: string,
) {
  const existing = await findTourBySlug(slug);

  if (existing && existing.id !== ignoredTourId) {
    conflict(`Slug "${slug}" đã được sử dụng`, {
      slug: [`Slug "${slug}" đã được sử dụng`],
    });
  }
}

async function ensureStartLocationExists(locationId: string) {
  const exists = await startLocationExists(locationId);

  if (!exists) {
    badRequest("Start location được chọn không tồn tại", {
      startLocationId: [locationId],
    });
  }
}

async function ensureDestinationIdsExist(destinationIds: string[]) {
  const ids = uniqueIds(destinationIds);

  if (ids.length === 0) {
    return;
  }

  const existingIds = new Set(
    await findExistingDestinationIds(ids),
  );

  const invalidIds = ids.filter((id) => !existingIds.has(id));

  if (invalidIds.length > 0) {
    badRequest("Có destination không tồn tại", {
      destinationIds: invalidIds,
    });
  }
}

async function ensureCuisineIdsExist(cuisineIds: string[]) {
  const ids = uniqueIds(cuisineIds);

  if (ids.length === 0) {
    return;
  }

  const existingIds = new Set(await findExistingCuisineIds(ids));
  const invalidIds = ids.filter((id) => !existingIds.has(id));

  if (invalidIds.length > 0) {
    badRequest("Có cuisine không tồn tại", {
      cuisineIds: invalidIds,
    });
  }
}

type TourCostTarget = {
  tourDayId?: string | null;
  tourItemId?: string | null;
  tourMealId?: string | null;
};

async function ensureTourCostTargetIsValid(
  tourId: string,
  target: TourCostTarget,
) {
  const targetIds = [
    target.tourDayId,
    target.tourItemId,
    target.tourMealId,
  ].filter(
    (value): value is string =>
      value !== null &&
      value !== undefined,
  );
  if (targetIds.length > 1) {
    badRequest(
      "Một khoản chi phí chỉ được liên kết với tối đa một ngày, hoạt động hoặc bữa ăn",
      {
        target: [
          "Chỉ được chọn một trong ngày, hoạt động hoặc bữa ăn",
        ],
      },
    );
  }
  const validations: Promise<boolean>[] = [];
  const validationFields: string[] = [];

  if (target.tourDayId) {
    validations.push(
      tourDayBelongsToTour(
        target.tourDayId,
        tourId,
      ),
    );

    validationFields.push("tourDayId");
  }

  if (target.tourItemId) {
    validations.push(
      tourItemBelongsToTour(
        target.tourItemId,
        tourId,
      ),
    );

    validationFields.push("tourItemId");
  }

  if (target.tourMealId) {
    validations.push(
      tourMealBelongsToTour(
        target.tourMealId,
        tourId,
      ),
    );

    validationFields.push("tourMealId");
  }

  if (validations.length === 0) {
    return;
  }

  const results = await Promise.all(
    validations,
  );

  const invalidIndex =
    results.findIndex(
      (result) => !result,
    );

  if (invalidIndex === -1) {
    return;
  }

  const invalidField =
    validationFields[invalidIndex];

  badRequest(
    "Dữ liệu liên kết của khoản chi phí không thuộc tour này",
    {
      [invalidField]: [
        "Dữ liệu được chọn không tồn tại hoặc không thuộc tour hiện tại",
      ],
    },
  );
}

type TourCostCalculationRule = {
  calculationUnit:
    | "per_person"
    | "per_group"
    | "per_room"
    | "fixed";

  nightCount?: number | null;
};

function ensureTourCostCalculationRule(
  cost: TourCostCalculationRule,
) {
  /**
   * nightCount chỉ có ý nghĩa đối với:
   *
   * price / room / night
   */
  if (
    cost.calculationUnit !==
      "per_room" &&
    cost.nightCount !== null &&
    cost.nightCount !== undefined
  ) {
    badRequest(
      "Số đêm chỉ được sử dụng với chi phí tính theo phòng",
      {
        nightCount: [
          "Hãy xóa số đêm hoặc chuyển cách tính thành theo phòng",
        ],
      },
    );
  }
}


type PublishableTour = {
  description?: string | null;
  coverImageUrl?: string | null;
  durationDays: number;
  days: Array<{
    dayNumber: number;
    items: Array<unknown>;
  }>;
};

function ensureTourReadyToPublish(tour: PublishableTour) {
  const errors: Record<string, string[]> = {};

  if (!tour.description?.trim()) {
    errors.description = [
      "Tour phải có mô tả trước khi xuất bản",
    ];
  }

  if (!tour.coverImageUrl?.trim()) {
    errors.coverImageUrl = [
      "Tour phải có ảnh bìa trước khi xuất bản",
    ];
  }

  const daysByNumber = new Map(
    tour.days.map((day) => [day.dayNumber, day]),
  );

  const missingDayNumbers: number[] = [];
  const emptyDayNumbers: number[] = [];

  for (
    let dayNumber = 1;
    dayNumber <= tour.durationDays;
    dayNumber += 1
  ) {
    const day = daysByNumber.get(dayNumber);

    if (!day) {
      missingDayNumbers.push(dayNumber);
      continue;
    }

    if (day.items.length === 0) {
      emptyDayNumbers.push(dayNumber);
    }
  }

  if (missingDayNumbers.length > 0) {
    errors.days = [
      `Thiếu lịch trình ngày: ${missingDayNumbers.join(", ")}`,
    ];
  }

  if (emptyDayNumbers.length > 0) {
    errors.items = [
      `Các ngày chưa có hoạt động: ${emptyDayNumbers.join(", ")}`,
    ];
  }

  if (Object.keys(errors).length > 0) {
    badRequest(
      "Tour chưa đủ điều kiện để xuất bản",
      errors,
    );
  }
}

function canViewTour(
  status: TourStatus,
  viewer: TourViewer,
) {
  return viewer.isAdmin || status === "published";
}

/* -------------------------------------------------------------------------- */
/* Main tour                                                                  */
/* -------------------------------------------------------------------------- */

export async function listToursService(
  filters: TourFilters,
  viewer: TourViewer,
) {
  const effectiveFilters: TourFilters = viewer.isAdmin
    ? filters
    : {
        ...filters,
        status: "published",
      };

  const { rows, total } = await findTours(effectiveFilters);

  return {
    data: rows,
    total,
  };
}

export async function getTourByIdService(
  id: string,
  viewer: TourViewer,
) {
  const tour = await findTourDetailById(id);

  if (!tour || !canViewTour(tour.status, viewer)) {
    notFound("Không tìm thấy tour");
  }

  return tour;
}

export async function getTourBySlugService(
  slug: string,
  viewer: TourViewer,
) {
  const tour = await findTourDetailBySlug(slug);

  if (!tour || !canViewTour(tour.status, viewer)) {
    notFound("Không tìm thấy tour");
  }

  return tour;
}

export async function createTourService(
  input: CreateTourRequest,
  createdBy: string,
) {
  const slug = input.slug?.trim() || slugify(input.name);

  if (input.status === "published") {
    ensureTourReadyToPublish(input);
  }

  await Promise.all([
    ensureTourSlugIsUnique(slug),
    ensureStartLocationExists(input.startLocationId),
  ]);

  const destinationIds = uniqueIds(
    input.days.flatMap((day) =>
      day.items.map((item) => item.destinationId),
    ),
  );

  const cuisineIds = uniqueIds(
    input.days.flatMap((day) =>
      day.meals.flatMap((meal) =>
        meal.cuisines.map((item) => item.cuisineId),
      ),
    ),
  );

  await Promise.all([
    ensureDestinationIdsExist(destinationIds),
    ensureCuisineIdsExist(cuisineIds),
  ]);

  await createTourGraph({
    tour: {
      name: input.name,
      nameEn: input.nameEn ?? null,
      slug,
      description: input.description ?? null,
      descriptionEn: input.descriptionEn ?? null,
      coverImageUrl: input.coverImageUrl ?? null,
      coverImagePublicId:
        input.coverImagePublicId ?? null,
      durationDays: input.durationDays,
      durationNights: input.durationNights,
      estimatedPrice: input.estimatedPrice ?? null,
      startLocationId: input.startLocationId,
      meetingPoint: input.meetingPoint ?? null,
      status: input.status,
      publishedAt:
        input.status === "published"
          ? new Date()
          : null,
      createdBy,
    },

    days: input.days.map((day) => ({
      day: {
        dayNumber: day.dayNumber,
        title: day.title,
        titleEn: day.titleEn ?? null,
        description: day.description ?? null,
        descriptionEn: day.descriptionEn ?? null,
      },

      items: day.items.map((item) => ({
        destinationId: item.destinationId ?? null,
        title: item.title,
        titleEn: item.titleEn ?? null,
        description: item.description ?? null,
        descriptionEn: item.descriptionEn ?? null,
        startTime: item.startTime ?? null,
        endTime: item.endTime ?? null,
        sortOrder: item.sortOrder,
        transportMethod:
          item.transportMethod ?? null,
        transportNote:
          item.transportNote ?? null,
        transportNoteEn:
          item.transportNoteEn ?? null,
        estimatedTravelMinutes:
          item.estimatedTravelMinutes ?? null,
      })),

      meals: day.meals.map((meal) => ({
        meal: {
          mealType: meal.mealType,
          startTime: meal.startTime ?? null,
          venueName: meal.venueName ?? null,
          venueNameEn: meal.venueNameEn ?? null,
          note: meal.note ?? null,
          noteEn: meal.noteEn ?? null,
          isIncluded: meal.isIncluded,
          sortOrder: meal.sortOrder,
        },

        cuisines: meal.cuisines.map((item) => ({
          cuisineId: item.cuisineId,
          sortOrder: item.sortOrder,
          note: item.note ?? null,
        })),
      })),
    })),
  });

  const createdTour = await findTourDetailBySlug(slug);

  if (!createdTour) {
    throw new Error(
      "Tour đã tạo nhưng không thể đọc lại dữ liệu",
    );
  }

  return createdTour;
}

export async function updateTourService(
  id: string,
  input: UpdateTourRequest,
) {
  const existing = await findTourById(id);

  if (!existing) {
    notFound("Không tìm thấy tour");
  }

  const existingCosts = await findTourCosts(id);

  const hasDetailedCosts = existingCosts.length > 0;

  if(hasDetailedCosts && input.estimatedPrice !== undefined) {
    badRequest(
      "Giá dự kiến của tour được tính tự động từ chi tiết chi phí",
      {
        estimatedPrice: [
          "Tour đã có breakdown chi phí. Hãy chỉnh giá trong mục Chi phí thay vì nhập tổng giá trực tiếp.",
        ],
      },
    );
  }

  if (input.slug && input.slug !== existing.slug) {
    await ensureTourSlugIsUnique(input.slug, id);
  }

  if (input.startLocationId) {
    await ensureStartLocationExists(
      input.startLocationId,
    );
  }

  const nextDurationDays =
    input.durationDays ?? existing.durationDays;

  const nextDurationNights =
    input.durationNights ?? existing.durationNights;

  if (nextDurationNights > nextDurationDays) {
    badRequest(
      "Số đêm không được lớn hơn số ngày",
      {
        durationNights: [
          "Số đêm không được lớn hơn số ngày",
        ],
      },
    );
  }

  if (input.durationDays !== undefined) {
    const maxDayNumber =
      await findMaxTourDayNumber(id);

    if (
      maxDayNumber !== null &&
      maxDayNumber > input.durationDays
    ) {
      badRequest(
        `Tour đang có lịch trình đến ngày ${maxDayNumber}, không thể giảm thời lượng xuống ${input.durationDays} ngày`,
        {
          durationDays: [
            `Phải lớn hơn hoặc bằng ${maxDayNumber}`,
          ],
        },
      );
    }
  }

  const nextStatus =
    input.status ?? existing.status;

  if (nextStatus === "published") {
    const currentDetail =
      await findTourDetailById(id);

    if (!currentDetail) {
      notFound("Không tìm thấy tour");
    }

    ensureTourReadyToPublish({
      description:
        input.description !== undefined
          ? input.description
          : currentDetail.description,

      coverImageUrl:
        input.coverImageUrl !== undefined
          ? input.coverImageUrl
          : currentDetail.coverImageUrl,

      durationDays: nextDurationDays,
      days: currentDetail.days,
    });
  }

  const updateData: UpdateTourRecord = {};

  if (input.name !== undefined) {
    updateData.name = input.name;
  }

  if (input.nameEn !== undefined) {
    updateData.nameEn = input.nameEn;
  }

  if (input.slug !== undefined) {
    updateData.slug = input.slug;
  }

  if (input.description !== undefined) {
    updateData.description = input.description;
  }

  if (input.descriptionEn !== undefined) {
    updateData.descriptionEn =
      input.descriptionEn;
  }

  if (input.coverImageUrl !== undefined) {
    updateData.coverImageUrl =
      input.coverImageUrl;
  }

  if (
    input.coverImagePublicId !== undefined
  ) {
    updateData.coverImagePublicId =
      input.coverImagePublicId;
  }

  if (input.durationDays !== undefined) {
    updateData.durationDays =
      input.durationDays;
  }

  if (input.durationNights !== undefined) {
    updateData.durationNights =
      input.durationNights;
  }

  if (!hasDetailedCosts && input.estimatedPrice !== undefined) {
    updateData.estimatedPrice = input.estimatedPrice;
  }

  if (
    input.startLocationId !== undefined
  ) {
    updateData.startLocationId =
      input.startLocationId;
  }

  if (input.meetingPoint !== undefined) {
    updateData.meetingPoint =
      input.meetingPoint;
  }

  if (input.status !== undefined) {
    updateData.status = input.status;
  }

  if (nextStatus === "published") {
    updateData.publishedAt =
      existing.publishedAt ?? new Date();
  } else if (existing.publishedAt !== null) {
    updateData.publishedAt = null;
  }

  const updated = await updateTour(id,updateData);

  if (!updated) {
    notFound("Không tìm thấy tour");
  }

  if (
    hasDetailedCosts &&
    input.durationNights !== undefined &&
    input.durationNights !==
      existing.durationNights
  ) {
    await recalculateTourEstimatedPrice(
      id,
    );
  }

  const detail = await findTourDetailById(id);

  if (!detail) {
    throw new Error(
      "Tour đã cập nhật nhưng không thể đọc lại dữ liệu",
    );
  }

  return detail;
}

export async function deleteTourService(id: string) {
  const existing = await findTourById(id);

  if (!existing) {
    notFound("Không tìm thấy tour");
  }

  const deleted = await deleteTour(id);

  if (!deleted) {
    notFound("Không tìm thấy tour");
  }

  return deleted;
}

export async function listTourCostsService(
  tourId: string,
  viewer: TourViewer,
) {
  const tour = await findTourById(
    tourId,
  );

  if (
    !tour ||
    !canViewTour(
      tour.status,
      viewer,
    )
  ) {
    notFound("Không tìm thấy tour");
  }

  return findTourCosts(tourId);
}

export async function getTourCostByIdService(
  id: string,
  viewer: TourViewer,
) {
  const cost =
    await findTourCostById(id);

  if (!cost) {
    notFound(
      "Không tìm thấy khoản chi phí",
    );
  }

  const tour = await findTourById(
    cost.tourId,
  );

  if (
    !tour ||
    !canViewTour(
      tour.status,
      viewer,
    )
  ) {
    notFound(
      "Không tìm thấy khoản chi phí",
    );
  }

  return cost;
}

export async function createTourCostService(
  tourId: string,
  input: CreateTourCostRequest,
) {
  const tour = await findTourById(
    tourId,
  );

  if (!tour) {
    notFound("Không tìm thấy tour");
  }

  ensureTourCostCalculationRule({
    calculationUnit:
      input.calculationUnit,

    nightCount:
      input.nightCount ?? null,
  });

  await ensureTourCostTargetIsValid(
    tourId,
    {
      tourDayId:
        input.tourDayId ?? null,

      tourItemId:
        input.tourItemId ?? null,

      tourMealId:
        input.tourMealId ?? null,
    },
  );

  const created =
    await createTourCost(
      tourId,
      {
        tourDayId:
          input.tourDayId ?? null,

        tourItemId:
          input.tourItemId ?? null,

        tourMealId:
          input.tourMealId ?? null,

        title: input.title,

        category:
          input.category,

        calculationUnit:
          input.calculationUnit,

        travelerScope:
          input.travelerScope,

        unitPrice:
          input.unitPrice,

        quantity:
          input.quantity,

        nightCount:
          input.nightCount ?? undefined,

        note:
          input.note ?? null,

        sortOrder:
          input.sortOrder,
      },
    );

  if (!created) {
    throw new Error(
      "Không thể tạo khoản chi phí",
    );
  }

  /**
   * Sau khi breakdown thay đổi,
   * giá tổng của tour phải được đồng bộ lại.
   */
  await recalculateTourEstimatedPrice(
    tourId,
  );

  return created;
}

export async function updateTourCostService(
  id: string,
  input: UpdateTourCostRequest,
) {
  const existing =
    await findTourCostById(id);

  if (!existing) {
    notFound(
      "Không tìm thấy khoản chi phí",
    );
  }

  /**
   * PATCH phải merge với dữ liệu hiện tại
   * trước khi validate.
   *
   * Ví dụ:
   *
   * existing:
   * tourDayId = A
   *
   * payload:
   * tourItemId = B
   *
   * Nếu không merge thì payload tưởng hợp lệ,
   * nhưng dữ liệu cuối cùng sẽ có 2 target.
   */
  const nextTourDayId =
    input.tourDayId !== undefined
      ? input.tourDayId
      : existing.tourDayId;

  const nextTourItemId =
    input.tourItemId !== undefined
      ? input.tourItemId
      : existing.tourItemId;

  const nextTourMealId =
    input.tourMealId !== undefined
      ? input.tourMealId
      : existing.tourMealId;

  const nextCalculationUnit =
    input.calculationUnit ??
    existing.calculationUnit;

  const nextNightCount =
    input.nightCount !== undefined
      ? input.nightCount
      : existing.nightCount;

  ensureTourCostCalculationRule({
    calculationUnit:
      nextCalculationUnit,

    nightCount:
      nextNightCount,
  });

  await ensureTourCostTargetIsValid(
    existing.tourId,
    {
      tourDayId:
        nextTourDayId,

      tourItemId:
        nextTourItemId,

      tourMealId:
        nextTourMealId,
    },
  );

  const updateData:
    UpdateTourCostRecord = {};

  if (
    input.tourDayId !== undefined
  ) {
    updateData.tourDayId =
      input.tourDayId;
  }

  if (
    input.tourItemId !== undefined
  ) {
    updateData.tourItemId =
      input.tourItemId;
  }

  if (
    input.tourMealId !== undefined
  ) {
    updateData.tourMealId =
      input.tourMealId;
  }

  if (input.title !== undefined) {
    updateData.title =
      input.title;
  }

  if (
    input.category !== undefined
  ) {
    updateData.category =
      input.category;
  }

  if (
    input.calculationUnit !==
    undefined
  ) {
    updateData.calculationUnit =
      input.calculationUnit;
  }

  if (
    input.travelerScope !==
    undefined
  ) {
    updateData.travelerScope =
      input.travelerScope;
  }

  if (
    input.unitPrice !== undefined
  ) {
    updateData.unitPrice =
      input.unitPrice;
  }

  if (
    input.quantity !== undefined
  ) {
    updateData.quantity =
      input.quantity;
  }

  if (
    input.nightCount !== undefined
  ) {
    updateData.nightCount =
      input.nightCount;
  }

  if (input.note !== undefined) {
    updateData.note =
      input.note;
  }

  if (
    input.sortOrder !== undefined
  ) {
    updateData.sortOrder =
      input.sortOrder;
  }

  const updated =
    await updateTourCost(
      id,
      updateData,
    );

  if (!updated) {
    notFound(
      "Không tìm thấy khoản chi phí",
    );
  }

  await recalculateTourEstimatedPrice(
    existing.tourId,
  );

  return updated;
}

export async function deleteTourCostService(
  id: string,
) {
  const existing =
    await findTourCostById(id);

  if (!existing) {
    notFound(
      "Không tìm thấy khoản chi phí",
    );
  }

  const deleted =
    await deleteTourCost(id);

  if (!deleted) {
    notFound(
      "Không tìm thấy khoản chi phí",
    );
  }

  await recalculateTourEstimatedPrice(
    existing.tourId,
  );

  return deleted;
}

/* -------------------------------------------------------------------------- */
/* Tour day                                                                   */
/* -------------------------------------------------------------------------- */

export async function createTourDayService(
  tourId: string,
  input: CreateTourDayRequest,
) {
  const tour = await findTourById(tourId);

  if (!tour) {
    notFound("Không tìm thấy tour");
  }

  if (input.dayNumber > tour.durationDays) {
    badRequest(
      `Ngày ${input.dayNumber} vượt quá thời lượng ${tour.durationDays} ngày của tour`,
      {
        dayNumber: [
          `Ngày phải nhỏ hơn hoặc bằng ${tour.durationDays}`,
        ],
      },
    );
  }

  const duplicate = await findTourDayByNumber(
    tourId,
    input.dayNumber,
  );

  if (duplicate) {
    conflict(`Ngày ${input.dayNumber} đã tồn tại trong tour`, {
      dayNumber: [
        `Ngày ${input.dayNumber} đã tồn tại trong tour`,
      ],
    });
  }

  return createTourDay(tourId, {
    dayNumber: input.dayNumber,
    title: input.title,
    titleEn: input.titleEn ?? null,
    description: input.description ?? null,
    descriptionEn: input.descriptionEn ?? null,
  });
}

export async function getTourDayByIdService(
  id: string,
  viewer: TourViewer,
) {
  const day = await findTourDayById(id);

  if (!day) {
    notFound("Không tìm thấy ngày trong tour");
  }

  const tour = await findTourById(day.tourId);

  if (!tour || !canViewTour(tour.status, viewer)) {
    notFound("Không tìm thấy ngày trong tour");
  }

  return day;
}

export async function updateTourDayService(
  id: string,
  input: UpdateTourDayRequest,
) {
  const existing = await findTourDayById(id);

  if (!existing) {
    notFound("Không tìm thấy ngày trong tour");
  }

  if (input.dayNumber !== undefined) {
    const tour = await findTourById(existing.tourId);

    if (!tour) {
      notFound("Không tìm thấy tour");
    }

    if (input.dayNumber > tour.durationDays) {
      badRequest(
        `Ngày ${input.dayNumber} vượt quá thời lượng ${tour.durationDays} ngày của tour`,
        {
          dayNumber: [
            `Ngày phải nhỏ hơn hoặc bằng ${tour.durationDays}`,
          ],
        },
      );
    }

    const duplicate = await findTourDayByNumber(
      existing.tourId,
      input.dayNumber,
    );

    if (duplicate && duplicate.id !== id) {
      conflict(
        `Ngày ${input.dayNumber} đã tồn tại trong tour`,
        {
          dayNumber: [
            `Ngày ${input.dayNumber} đã tồn tại trong tour`,
          ],
        },
      );
    }
  }

  const updated = await updateTourDay(id, input);

  if (!updated) {
    notFound("Không tìm thấy ngày trong tour");
  }

  return updated;
}

export async function deleteTourDayService(id: string) {
  const existing = await findTourDayById(id);

  if (!existing) {
    notFound("Không tìm thấy ngày trong tour");
  }

  const deleted = await deleteTourDay(id);

  if (!deleted) {
    notFound("Không tìm thấy ngày trong tour");
  }

  return deleted;
}

/* -------------------------------------------------------------------------- */
/* Tour item                                                                  */
/* -------------------------------------------------------------------------- */

export async function createTourItemService(
  tourDayId: string,
  input: CreateTourItemRequest,
) {
  const day = await findTourDayById(tourDayId);

  if (!day) {
    notFound("Không tìm thấy ngày trong tour");
  }

  ensureValidTimeRange(input.startTime, input.endTime);

  if (input.destinationId) {
    await ensureDestinationIdsExist([input.destinationId]);
  }

  const duplicate = await findTourItemBySortOrder(
    tourDayId,
    input.sortOrder,
  );

  if (duplicate) {
    conflict(
      `Thứ tự hoạt động ${input.sortOrder} đã tồn tại trong ngày`,
      {
        sortOrder: [
          `Thứ tự ${input.sortOrder} đã tồn tại`,
        ],
      },
    );
  }

  const item = await createTourItem(tourDayId, {
    destinationId: input.destinationId ?? null,
    title: input.title,
    titleEn: input.titleEn ?? null,
    description: input.description ?? null,
    descriptionEn: input.descriptionEn ?? null,
    startTime: input.startTime ?? null,
    endTime: input.endTime ?? null,
    sortOrder: input.sortOrder,
    transportMethod: input.transportMethod ?? null,
    transportNote: input.transportNote ?? null,
    transportNoteEn: input.transportNoteEn ?? null,
    estimatedTravelMinutes:
      input.estimatedTravelMinutes ?? null,
  });

  const detail = await findTourItemDetailById(item.id);

  if (!detail) {
    throw new Error(
      "Hoạt động đã tạo nhưng không thể đọc lại dữ liệu",
    );
  }

  return detail;
}

export async function updateTourItemService(
  id: string,
  input: UpdateTourItemRequest,
) {
  const existing = await findTourItemById(id);

  if (!existing) {
    notFound("Không tìm thấy hoạt động trong tour");
  }

  const nextStartTime =
    input.startTime !== undefined
      ? input.startTime
      : existing.startTime;

  const nextEndTime =
    input.endTime !== undefined
      ? input.endTime
      : existing.endTime;

  ensureValidTimeRange(nextStartTime, nextEndTime);

  if (input.destinationId) {
    await ensureDestinationIdsExist([input.destinationId]);
  }

  if (input.sortOrder !== undefined) {
    const duplicate = await findTourItemBySortOrder(
      existing.tourDayId,
      input.sortOrder,
    );

    if (duplicate && duplicate.id !== id) {
      conflict(
        `Thứ tự hoạt động ${input.sortOrder} đã tồn tại trong ngày`,
        {
          sortOrder: [
            `Thứ tự ${input.sortOrder} đã tồn tại`,
          ],
        },
      );
    }
  }

  const updated = await updateTourItem(id, input);

  if (!updated) {
    notFound("Không tìm thấy hoạt động trong tour");
  }

  const detail = await findTourItemDetailById(id);

  if (!detail) {
    throw new Error(
      "Hoạt động đã cập nhật nhưng không thể đọc lại dữ liệu",
    );
  }

  return detail;
}

export async function deleteTourItemService(id: string) {
  const existing = await findTourItemById(id);

  if (!existing) {
    notFound("Không tìm thấy hoạt động trong tour");
  }

  const deleted = await deleteTourItem(id);

  if (!deleted) {
    notFound("Không tìm thấy hoạt động trong tour");
  }

  return deleted;
}

/* -------------------------------------------------------------------------- */
/* Tour meal                                                                  */
/* -------------------------------------------------------------------------- */

export async function createTourMealService(
  tourDayId: string,
  input: CreateTourMealRequest,
) {
  const day = await findTourDayById(tourDayId);

  if (!day) {
    notFound("Không tìm thấy ngày trong tour");
  }

  const duplicate = await findTourMealBySortOrder(
    tourDayId,
    input.sortOrder,
  );

  if (duplicate) {
    conflict(
      `Thứ tự bữa ăn ${input.sortOrder} đã tồn tại trong ngày`,
      {
        sortOrder: [
          `Thứ tự ${input.sortOrder} đã tồn tại`,
        ],
      },
    );
  }

  await ensureCuisineIdsExist(
    input.cuisines.map((item) => item.cuisineId),
  );

  const meal = await createTourMeal(
    tourDayId,
    {
      mealType: input.mealType,
      startTime: input.startTime ?? null,
      venueName: input.venueName ?? null,
      venueNameEn: input.venueNameEn ?? null,
      note: input.note ?? null,
      noteEn: input.noteEn ?? null,
      isIncluded: input.isIncluded,
      sortOrder: input.sortOrder,
    },
    input.cuisines.map((item) => ({
      cuisineId: item.cuisineId,
      sortOrder: item.sortOrder,
      note: item.note ?? null,
    })),
  );

  const detail = await findTourMealDetailById(meal.id);

  if (!detail) {
    throw new Error(
      "Bữa ăn đã tạo nhưng không thể đọc lại dữ liệu",
    );
  }

  return detail;
}

export async function updateTourMealService(
  id: string,
  input: UpdateTourMealRequest,
) {
  const existing = await findTourMealById(id);

  if (!existing) {
    notFound("Không tìm thấy bữa ăn trong tour");
  }

  if (input.sortOrder !== undefined) {
    const duplicate = await findTourMealBySortOrder(
      existing.tourDayId,
      input.sortOrder,
    );

    if (duplicate && duplicate.id !== id) {
      conflict(
        `Thứ tự bữa ăn ${input.sortOrder} đã tồn tại trong ngày`,
        {
          sortOrder: [
            `Thứ tự ${input.sortOrder} đã tồn tại`,
          ],
        },
      );
    }
  }

  if (input.cuisines !== undefined) {
    await ensureCuisineIdsExist(
      input.cuisines.map((item) => item.cuisineId),
    );
  }

  const {
    cuisines: cuisineInput,
    ...mealInput
  } = input;

  const updated = await updateTourMeal(
    id,
    mealInput,
    cuisineInput?.map((item) => ({
      cuisineId: item.cuisineId,
      sortOrder: item.sortOrder,
      note: item.note ?? null,
    })),
  );

  if (!updated) {
    notFound("Không tìm thấy bữa ăn trong tour");
  }

  const detail = await findTourMealDetailById(id);

  if (!detail) {
    throw new Error(
      "Bữa ăn đã cập nhật nhưng không thể đọc lại dữ liệu",
    );
  }

  return detail;
}

export async function deleteTourMealService(id: string) {
  const existing = await findTourMealById(id);

  if (!existing) {
    notFound("Không tìm thấy bữa ăn trong tour");
  }

  const deleted = await deleteTourMeal(id);

  if (!deleted) {
    notFound("Không tìm thấy bữa ăn trong tour");
  }

  return deleted;
}