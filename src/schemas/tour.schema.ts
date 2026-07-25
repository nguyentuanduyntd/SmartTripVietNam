import {z} from "zod";
import { MEAL_TYPES, TOUR_STATUSES, TRANSPORT_METHODS } from "../constants/tour_community";
import { locationSlugSchema } from "./location.schema";

const MAX_PRICE = 999_999_999_999;

const uuidSchema = (fieldName: string) => z.string().uuid(`${fieldName} không đúng định dạng UUID`);

const requiredNameSchema = z.string().trim().min(2, "Tên phải có ít nhất 2 ký tự").max(200, "Tên không được vượt quá 200 ký tự");

const optionalTextSchema = z.string().trim().max(500, "Nội dung không được vượt quá 500 ký tự").nullable().optional();

const optionalLongTextSchema = z.string().trim().max(10_000, "Nội dung không được vượt quá 10000 ký tự").nullable().optional();

const optionalImageUrlSchema = z.url().nullable().optional();

const optionalImagePublicIdSchema = z.string().trim().max(300).nullable().optional();

const optionalTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/, "Thời gian phải có định dạng HH:mm hoặc HH:mm:ss").nullable().optional();

const estimatedPriceSchema = z.union([
    z.string().trim().regex(/^\d{1,12}$/, "Giá tour phải là chuỗi số từ 1 đến 12 chữ số"),
    z.number().int("Giá tour phải là số nguyên").min(0, "Giá tour không được âm").max(MAX_PRICE, "Giá tour vượt quá giới hạn").transform(String),
]).nullable().optional();

function normalizeTime(value: string){
    return value.length === 5 ? `${value}:00` : value;
}

function isValidTimeRange(startTime: string | null | undefined,endTime: string | null | undefined){
    if(!startTime || !endTime)
    {
        return true;
    }
    return normalizeTime(startTime) < normalizeTime(endTime);
} 

function hasDuplicateValues(values: Array<string | number>){
    return new Set(values).size !== values.length;
}

export const tourMealCuisineInputSchema = z.object({
    cuisineId: uuidSchema("Cuisine ID"),
    sortOrder: z.number().int().min(0, "Thứ tự món ăn không được âm"),
    note: optionalTextSchema,
}).strict();

const tourItemFields ={
    destinationId: uuidSchema("Destination ID").nullable().optional(),
    title: requiredNameSchema,
    titleEn: requiredNameSchema.nullable().optional(),
    description: optionalLongTextSchema,
    descriptionEn: optionalLongTextSchema,
    startTime: optionalTimeSchema,
    endTime: optionalTimeSchema,
    sortOrder: z.number().int().min(0, "Thứ tự hoạt động không được âm"),
    transportMethod: z.enum(TRANSPORT_METHODS).nullable().optional(),
    transportNote: optionalTextSchema,
    transportNoteEn: optionalTextSchema,
    estimatedTravelMinutes: z.number().int().min(0, "Thời gian di chuyển không được âm").nullable().optional(),
};

export const createTourItemRequestSchema = z.object(tourItemFields).strict()
    .superRefine((data, context) => {
        if (!isValidTimeRange(data.startTime, data.endTime)) {
        context.addIssue({
            code: "custom",
            path: ["endTime"],
            message: "Thời gian kết thúc phải lớn hơn thời gian bắt đầu",
        });
    }
});

export const updateTourItemRequestSchema = z.object({
    destinationId: tourItemFields.destinationId,
    title: tourItemFields.title.optional(),
    titleEn: tourItemFields.titleEn,
    description: tourItemFields.description,
    descriptionEn: tourItemFields.descriptionEn,
    startTime: tourItemFields.startTime,
    endTime: tourItemFields.endTime,
    sortOrder: tourItemFields.sortOrder.optional(),
    transportMethod: tourItemFields.transportMethod,
    transportNote: tourItemFields.transportNote,
    transportNoteEn: tourItemFields.transportNoteEn,
    estimatedTravelMinutes: tourItemFields.estimatedTravelMinutes,
}).strict().refine((data) => Object.values(data).some((value) => value !== undefined),{
    message: "Cần cung cấp ít nhất một trường để cập nhật",
    },
).superRefine((data, context) => {
    if(!isValidTimeRange(data.startTime, data.endTime)){
        context.addIssue({
            code: "custom",
            path: ["endTime"],
            message: "Thời gian kết thúc phải lớn hơn thời gian bắt đầu",
        });
    }
});

const tourMealFields = {
  mealType: z.enum(MEAL_TYPES),
  startTime: optionalTimeSchema,
  venueName: optionalTextSchema,
  venueNameEn: optionalTextSchema,
  note: optionalLongTextSchema,
  noteEn: optionalLongTextSchema,
  isIncluded: z.boolean().default(true),
  sortOrder: z.number().int().min(0, "Thứ tự bữa ăn không được âm"),
};

export const createTourMealRequestSchema = z.object({
    ...tourMealFields,
    cuisines: z.array(tourMealCuisineInputSchema).default([]),
}).strict().superRefine((data, context) => {
    const cuisineIds = data.cuisines.map((item) => item.cuisineId);
    const sortOrders = data.cuisines.map((item) => item.sortOrder);

    if (hasDuplicateValues(cuisineIds)) {
      context.addIssue({
        code: "custom",
        path: ["cuisines"],
        message: "Một món ăn không được liên kết nhiều lần trong cùng bữa",
      });
    }

    if (hasDuplicateValues(sortOrders)) {
      context.addIssue({
        code: "custom",
        path: ["cuisines"],
        message: "Thứ tự món ăn trong cùng bữa không được trùng nhau",
      });
    }
});

export const updateTourMealRequestSchema = z.object({
    mealType: tourMealFields.mealType.optional(),
    startTime: tourMealFields.startTime,
    venueName: tourMealFields.venueName,
    venueNameEn: tourMealFields.venueNameEn,
    note: tourMealFields.note,
    noteEn: tourMealFields.noteEn,
    isIncluded: z.boolean().optional(),
    sortOrder: tourMealFields.sortOrder.optional(),
    cuisines: z.array(tourMealCuisineInputSchema).optional(),
}).strict().refine((data) => Object.values(data).some((value) => value !== undefined),{
    message: "Cần cung cấp ít nhất một trường để cập nhật",
    },
).superRefine((data, context) => {
    if (!data.cuisines) {
      return;
    }

    const cuisineIds = data.cuisines.map((item) => item.cuisineId);
    const sortOrders = data.cuisines.map((item) => item.sortOrder);

    if (hasDuplicateValues(cuisineIds)) {
      context.addIssue({
        code: "custom",
        path: ["cuisines"],
        message: "Một món ăn không được liên kết nhiều lần trong cùng bữa",
      });
    }

    if (hasDuplicateValues(sortOrders)) {
      context.addIssue({
        code: "custom",
        path: ["cuisines"],
        message: "Thứ tự món ăn trong cùng bữa không được trùng nhau",
      });
    }
});

const tourDayFields = {
  dayNumber: z.number().int().min(1, "Số ngày phải lớn hơn 0"),
  title: requiredNameSchema,
  titleEn: requiredNameSchema.nullable().optional(),
  description: optionalLongTextSchema,
  descriptionEn: optionalLongTextSchema,
};

export const createTourDayRequestSchema = z.object({
    ...tourDayFields,
    items: z.array(createTourItemRequestSchema).default([]),
    meals: z.array(createTourMealRequestSchema).default([]),
}).strict().superRefine((data, context) => {
    const itemSortOrders = data.items.map((item) => item.sortOrder);
    const mealSortOrders = data.meals.map((meal) => meal.sortOrder);

    if (hasDuplicateValues(itemSortOrders)) {
      context.addIssue({
        code: "custom",
        path: ["items"],
        message: "Thứ tự hoạt động trong cùng một ngày không được trùng nhau",
      });
    }

    if (hasDuplicateValues(mealSortOrders)) {
      context.addIssue({
        code: "custom",
        path: ["meals"],
        message: "Thứ tự bữa ăn trong cùng một ngày không được trùng nhau",
      });
    }
});

export const createStandaloneTourDayRequestSchema = z.object(tourDayFields).strict();

export const updateTourDayRequestSchema = z.object({
    dayNumber: tourDayFields.dayNumber.optional(),
    title: tourDayFields.title.optional(),
    titleEn: tourDayFields.titleEn,
    description: tourDayFields.description,
    descriptionEn: tourDayFields.descriptionEn,
}).strict().refine((data) => Object.values(data).some((value) => value !== undefined),{
    message : "Cần cung cấp ít nhất một trường để cập nhật",
    }
);

export const tourSlugSchema = locationSlugSchema.meta({
  description: "Slug duy nhất của tour",
  example: "tinh-hoa-co-do-hue-2n1d",
});

export const createTourRequestSchema = z.object({
    name: requiredNameSchema,
    nameEn: requiredNameSchema.nullable().optional(),
    slug: tourSlugSchema.optional(),
    description: optionalLongTextSchema,
    descriptionEn: optionalLongTextSchema,
    coverImageUrl: optionalImageUrlSchema,
    coverImagePublicId: optionalImagePublicIdSchema,
    durationDays: z.number().int().min(1, "Số ngày phải lớn hơn 0"),
    durationNights: z.number().int().min(0, "Số đêm không được âm").default(0),
    estimatedPrice: estimatedPriceSchema,
    startLocationId: uuidSchema("Start location ID"),
    meetingPoint: optionalTextSchema,
    status: z.enum(TOUR_STATUSES).default("draft"),
    days: z.array(createTourDayRequestSchema).default([]),
}).strict().superRefine((data, context) => {
     if (data.durationNights > data.durationDays) {
      context.addIssue({
        code: "custom",
        path: ["durationNights"],
        message: "Số đêm không được lớn hơn số ngày",
      });
    }

    const dayNumbers = data.days.map((day) => day.dayNumber);

    if (hasDuplicateValues(dayNumbers)) {
      context.addIssue({
        code: "custom",
        path: ["days"],
        message: "Số thứ tự ngày trong tour không được trùng nhau",
      });
    }

    data.days.forEach((day, index) => {
      if (day.dayNumber > data.durationDays) {
        context.addIssue({
          code: "custom",
          path: ["days", index, "dayNumber"],
          message: `Ngày ${day.dayNumber} vượt quá thời lượng ${data.durationDays} ngày của tour`,
        });
      }
    });
});

export const updateTourRequestSchema = z.object({
    name: requiredNameSchema.optional(),
    nameEn: requiredNameSchema.nullable().optional(),
    slug: tourSlugSchema.optional(),
    description: optionalLongTextSchema,
    descriptionEn: optionalLongTextSchema,
    coverImageUrl: optionalImageUrlSchema,
    coverImagePublicId: optionalImagePublicIdSchema,
    durationDays: z.number().int().min(1).optional(),
    durationNights: z.number().int().min(0).optional(),
    estimatedPrice: estimatedPriceSchema,
    startLocationId: uuidSchema("Start location ID").optional(),
    meetingPoint: optionalTextSchema,
    status: z.enum(TOUR_STATUSES).optional(),
}).strict().refine((data) => Object.values(data).some((value) => value !== undefined),{
    message: "Cần cung cấp ít nhất một trường để cập nhật",
    },
);

export const tourListQuerySchema = z.object({
    search: z.string().trim().min(1).max(200).optional(),
    startLocationId: uuidSchema("Start location ID").optional(),
    status: z.enum(TOUR_STATUSES).optional(),
    minPrice: z.coerce.number().int().min(0).max(MAX_PRICE).optional(),
    maxPrice: z.coerce.number().int().min(0).max(MAX_PRICE).optional(),
    durationDays: z.coerce.number().int().min(1).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.enum(["name","estimatedPrice","durationDays","createdAt","updatedAt","publishedAt",]).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).strict().superRefine((data, context) => {
    if (
      data.minPrice !== undefined &&
      data.maxPrice !== undefined &&
      data.minPrice > data.maxPrice
    ) {
      context.addIssue({
        code: "custom",
        path: ["maxPrice"],
        message: "Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu",
      });
    }
});

export const tourIdParamsSchema = z.object({
    id: uuidSchema("Tour ID"),
});

export const tourSlugParamsSchema = z.object({
  slug: tourSlugSchema,
});

export const tourDayIdParamsSchema = z.object({
  id: uuidSchema("Tour day ID"),
});

export const tourItemIdParamsSchema = z.object({
  id: uuidSchema("Tour item ID"),
});

export const tourMealIdParamsSchema = z.object({
  id: uuidSchema("Tour meal ID"),
});

export type CreateTourRequest = z.infer<typeof createTourRequestSchema>;
export type UpdateTourRequest = z.infer<typeof updateTourRequestSchema>;
export type TourListQuery = z.infer<typeof tourListQuerySchema>;

export type CreateTourDayRequest = z.infer<typeof createStandaloneTourDayRequestSchema>;
export type UpdateTourDayRequest = z.infer<typeof updateTourDayRequestSchema>;
export type CreateTourItemRequest = z.infer<typeof createTourItemRequestSchema>;
export type UpdateTourItemRequest = z.infer<typeof updateTourItemRequestSchema>;
export type CreateTourMealRequest = z.infer<typeof createTourMealRequestSchema>;
export type UpdateTourMealRequest = z.infer<typeof updateTourMealRequestSchema>;

