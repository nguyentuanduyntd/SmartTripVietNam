import "server-only";

import {
    deleteImage,
    uploadImage,
    CLOUDINARY_FOLDERS,
} from "@/src/services/image.service";

import {
    createCommunityComment,
    createCommunityPostRecord,
    findCommunityCommentById,
    findCommunityFeed,
    findCommunityPostComments,
    findExistingDestinationIds,
    findOwnedCommunityPost,
    findPublicCommunityPostBasic,
    findPublicCommunityPostById,
    setCommunityPostLike,
    setCommunityPostSave,
    softDeleteOwnedCommunityComment,
    softDeleteOwnedCommunityPost,
    updateOwnedCommunityComment,
    updateOwnedCommunityPost,
} from "@/src/repositories/community.repository";

import {
    findUserItineraryPlannerDetailById,
} from "@/src/repositories/itinerary-planner.repository";

import type {
    CommunityItinerarySnapshot,
} from "@/src/db/schema/community";

import type {
    CommunityFeedQuery,
    CreateCommunityPostInput,
    UpdateCommunityPostInput,
} from "@/src/schemas/community.schema";

export class CommunityServiceError extends Error {
    constructor(
        message: string,
        public readonly status:
            | 400
            | 401
            | 403
            | 404
            | 422,
    ) {
        super(message);
        this.name = "CommunityServiceError";
    }
}

function badRequest(message: string): never {
    throw new CommunityServiceError(message, 400);
}

function unauthorized(message: string): never {
    throw new CommunityServiceError(message, 401);
}

function forbidden(message: string): never {
    throw new CommunityServiceError(message, 403);
}

function notFound(message: string): never {
    throw new CommunityServiceError(message, 404);
}

function unprocessable(message: string): never {
    throw new CommunityServiceError(message, 422);
}

/* -------------------------------------------------------------------------- */
/* Date helpers                                                               */
/* -------------------------------------------------------------------------- */

function parseDateToUtc(value: string) {
    const [year, month, day] = value
        .split("-")
        .map((part) => Number(part));

    return Date.UTC(year, month - 1, day);
}

function addDays(value: string, dayOffset: number) {
    const date = new Date(parseDateToUtc(value));
    date.setUTCDate(date.getUTCDate() + dayOffset);

    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getDayOffset(
    baseDate: string | null,
    targetDate: string,
) {
    if (!baseDate) {
        return null;
    }

    return Math.round(
        (parseDateToUtc(targetDate) - parseDateToUtc(baseDate)) /
            (24 * 60 * 60 * 1000),
    );
}

function getInclusiveDayCount(
    startDate: string,
    endDate: string,
) {
    return (
        Math.round(
            (parseDateToUtc(endDate) - parseDateToUtc(startDate)) /
                (24 * 60 * 60 * 1000),
        ) + 1
    );
}

/* -------------------------------------------------------------------------- */
/* Planner snapshot                                                           */
/* -------------------------------------------------------------------------- */

function buildCommunitySnapshot(
    planner: NonNullable<
        Awaited<
            ReturnType<typeof findUserItineraryPlannerDetailById>
        >
    >,
): CommunityItinerarySnapshot {
    const dayNumberById = new Map(
        planner.days.map((day) => [day.id, day.dayNumber]),
    );

    const itemScopeById = new Map<
        string,
        { dayNumber: number; sortOrder: number }
    >();

    const mealScopeById = new Map<
        string,
        { dayNumber: number; sortOrder: number }
    >();

    for (const day of planner.days) {
        for (const item of day.items) {
            itemScopeById.set(item.id, {
                dayNumber: day.dayNumber,
                sortOrder: item.sortOrder,
            });
        }

        for (const meal of day.meals) {
            mealScopeById.set(meal.id, {
                dayNumber: day.dayNumber,
                sortOrder: meal.sortOrder,
            });
        }
    }

    return {
        version: 1,

        itinerary: {
            title: planner.title,
            description: planner.description,
            coverImageUrl: planner.coverImageUrl,
            originalStartDate: planner.startDate,
            startLocationId: planner.startLocationId,
            startLocationName: planner.startLocationName,
            meetingPoint: planner.meetingPoint,
            adultCount: planner.adultCount,
            childCount: planner.childCount,
            roomCount: planner.roomCount,
        },

        days: planner.days.map((day) => ({
            dayNumber: day.dayNumber,
            title: day.title,
            description: day.description,

            items: day.items.map((item) => ({
                destinationId: item.destinationId,
                destinationName: item.destinationName,
                title: item.title,
                description: item.description,
                startTime: item.startTime,
                endTime: item.endTime,
                sortOrder: item.sortOrder,
                transportMethod: item.transportMethod,
                transportNote: item.transportNote,
                estimatedTravelMinutes:
                    item.estimatedTravelMinutes,
            })),

            meals: day.meals.map((meal) => ({
                mealType: meal.mealType,
                startTime: meal.startTime,
                venueName: meal.venueName,
                note: meal.note,
                isIncluded: meal.isIncluded,
                sortOrder: meal.sortOrder,
                cuisines: meal.cuisines.map((cuisine) => ({
                    cuisineId: cuisine.cuisineId,
                    cuisineName: cuisine.cuisineName,
                    sortOrder: cuisine.sortOrder,
                    note: cuisine.note,
                })),
            })),
        })),

        stays: planner.stays.map((stay) => ({
            name: stay.name,
            address: stay.address,
            originalCheckInDate: stay.checkInDate,
            originalCheckOutDate: stay.checkOutDate,
            checkInDayOffset: getDayOffset(
                planner.startDate,
                stay.checkInDate,
            ),
            checkOutDayOffset: getDayOffset(
                planner.startDate,
                stay.checkOutDate,
            ),
            roomCount: stay.roomCount,
            pricePerRoomNight: stay.pricePerRoomNight,
            note: stay.note,
            sortOrder: stay.sortOrder,
        })),

        costs: planner.costs.map((cost) => {
            const itemScope = cost.itineraryItemId
                ? itemScopeById.get(cost.itineraryItemId)
                : undefined;

            const mealScope = cost.itineraryMealId
                ? mealScopeById.get(cost.itineraryMealId)
                : undefined;

            const directDayNumber = cost.itineraryDayId
                ? dayNumberById.get(cost.itineraryDayId) ?? null
                : null;

            return {
                title: cost.title,
                category: cost.category,
                calculationUnit: cost.calculationUnit,
                travelerScope: cost.travelerScope,
                unitPrice: cost.unitPrice,
                quantity: cost.quantity,
                nightCount: cost.nightCount,
                note: cost.note,
                sortOrder: cost.sortOrder,

                scope: {
                    dayNumber:
                        itemScope?.dayNumber ??
                        mealScope?.dayNumber ??
                        directDayNumber,
                    itemSortOrder: itemScope?.sortOrder ?? null,
                    mealSortOrder: mealScope?.sortOrder ?? null,
                },
            };
        }),
    };
}

function getPlannerDestinationIds(
    planner: NonNullable<
        Awaited<
            ReturnType<typeof findUserItineraryPlannerDetailById>
        >
    >,
) {
    return [
        ...new Set(
            planner.days.flatMap((day) =>
                day.items
                    .map((item) => item.destinationId)
                    .filter(
                        (value): value is string => Boolean(value),
                    ),
            ),
        ),
    ];
}

/* -------------------------------------------------------------------------- */
/* Create                                                                     */
/* -------------------------------------------------------------------------- */

export async function createCommunityPostService(input: {
    userId: string;
    data: CreateCommunityPostInput;
    images: File[];
}) {
    if (input.images.length > 10) {
        badRequest("Mỗi bài chỉ được đăng tối đa 10 ảnh");
    }

    let sourceItineraryId = input.data.sourceItineraryId ?? null;
    let locationId = input.data.locationId ?? null;
    let tripStartDate = input.data.tripStartDate ?? null;
    let tripEndDate = input.data.tripEndDate ?? null;
    let dayCount = input.data.dayCount ?? null;
    let estimatedCost = input.data.estimatedCost ?? null;
    let destinationIds = input.data.destinationIds;
    let itinerarySnapshot: CommunityItinerarySnapshot | null = null;

    if (sourceItineraryId) {
        const planner = await findUserItineraryPlannerDetailById(
            sourceItineraryId,
            input.userId,
        );

        if (!planner) {
            notFound(
                "Không tìm thấy lịch trình hoặc lịch trình không thuộc tài khoản của bạn",
            );
        }

        itinerarySnapshot = buildCommunitySnapshot(planner);
        locationId = planner.startLocationId;
        tripStartDate = planner.startDate;
        dayCount = planner.days.length > 0 ? planner.days.length : null;
        tripEndDate =
            planner.startDate && planner.days.length > 0
                ? addDays(planner.startDate, planner.days.length - 1)
                : null;
        estimatedCost = planner.costSummary.total;
        destinationIds = getPlannerDestinationIds(planner);
    } else {
        if (
            !dayCount &&
            tripStartDate &&
            tripEndDate
        ) {
            dayCount = getInclusiveDayCount(
                tripStartDate,
                tripEndDate,
            );
        }
    }

    const existingDestinationIds = await findExistingDestinationIds(
        destinationIds,
    );

    if (
        new Set(existingDestinationIds).size !==
        new Set(destinationIds).size
    ) {
        unprocessable("Có điểm đến không tồn tại trong hệ thống");
    }

    const uploadedImages: Array<{
        url: string;
        publicId: string;
        width: number;
        height: number;
    }> = [];

    try {
        for (let index = 0; index < input.images.length; index++) {
            const file = input.images[index];

            if (!file) {
                continue;
            }

            const uploaded = await uploadImage(file, {
                folder: CLOUDINARY_FOLDERS.community,
                publicId: `community-${input.userId}-${Date.now()}-${index}`,
                transformation: [
                    {
                        width: 1800,
                        height: 1800,
                        crop: "limit",
                    },
                    {
                        quality: "auto",
                        fetch_format: "auto",
                    },
                ],
            });

            uploadedImages.push({
                url: uploaded.url,
                publicId: uploaded.publicId,
                width: uploaded.width,
                height: uploaded.height,
            });
        }

        return await createCommunityPostRecord({
            userId: input.userId,
            sourceItineraryId,
            locationId,
            title: input.data.title.trim(),
            content: input.data.content.trim(),
            rating: input.data.rating,
            tripStartDate,
            tripEndDate,
            dayCount,
            estimatedCost,
            itinerarySnapshot,
            destinationIds: existingDestinationIds,
            images: uploadedImages,
        });
    } catch (error) {
        await Promise.allSettled(
            uploadedImages.map((image) =>
                deleteImage(image.publicId),
            ),
        );

        throw error;
    }
}

/* -------------------------------------------------------------------------- */
/* Read                                                                       */
/* -------------------------------------------------------------------------- */

export async function getCommunityFeedService(
    query: CommunityFeedQuery,
    currentUserId: string | null,
) {
    if (query.sort === "saved" && !currentUserId) {
        unauthorized("Bạn cần đăng nhập để xem các bài đã lưu");
    }

    return findCommunityFeed({
        ...query,
        currentUserId,
    });
}

export async function getCommunityPostService(
    postId: string,
    currentUserId: string | null,
) {
    const post = await findPublicCommunityPostById(
        postId,
        currentUserId,
    );

    if (!post) {
        notFound("Không tìm thấy bài chia sẻ");
    }

    return post;
}

/* -------------------------------------------------------------------------- */
/* Update / delete                                                            */
/* -------------------------------------------------------------------------- */

export async function updateCommunityPostService(
    postId: string,
    userId: string,
    data: UpdateCommunityPostInput,
) {
    const owned = await findOwnedCommunityPost(postId, userId);

    if (!owned) {
        notFound("Không tìm thấy bài chia sẻ");
    }

    const updated = await updateOwnedCommunityPost(
        postId,
        userId,
        data,
    );

    if (!updated) {
        notFound("Không tìm thấy bài chia sẻ");
    }

    return updated;
}

export async function deleteCommunityPostService(
    postId: string,
    userId: string,
) {
    const owned = await findOwnedCommunityPost(postId, userId);

    if (!owned) {
        notFound("Không tìm thấy bài chia sẻ");
    }

    const deleted = await softDeleteOwnedCommunityPost(
        postId,
        userId,
    );

    if (!deleted) {
        notFound("Không tìm thấy bài chia sẻ");
    }

    /*
     * Post đã bị ẩn khỏi cộng đồng trước.
     * Nếu Cloudinary lỗi thì chỉ log, không làm bài sống lại.
     */
    const cleanupResults = await Promise.allSettled(
        owned.imagePublicIds.map((publicId) => deleteImage(publicId)),
    );

    for (const result of cleanupResults) {
        if (result.status === "rejected") {
            console.error(
                "Không thể xóa ảnh community trên Cloudinary:",
                result.reason,
            );
        }
    }

    return deleted;
}

/* -------------------------------------------------------------------------- */
/* Like / save                                                                */
/* -------------------------------------------------------------------------- */

async function ensurePublicPost(postId: string) {
    const post = await findPublicCommunityPostBasic(postId);

    if (!post) {
        notFound("Không tìm thấy bài chia sẻ");
    }

    return post;
}

export async function setCommunityPostLikeService(
    postId: string,
    userId: string,
    active: boolean,
) {
    await ensurePublicPost(postId);
    return setCommunityPostLike(postId, userId, active);
}

export async function setCommunityPostSaveService(
    postId: string,
    userId: string,
    active: boolean,
) {
    await ensurePublicPost(postId);
    return setCommunityPostSave(postId, userId, active);
}

/* -------------------------------------------------------------------------- */
/* Comments + 1-level replies                                                 */
/* -------------------------------------------------------------------------- */

export async function getCommunityCommentsService(postId: string) {
    await ensurePublicPost(postId);

    const comments = await findCommunityPostComments(postId);
    const roots = comments.filter((comment) => !comment.parentId);
    const repliesByRootId = new Map<string, typeof comments>();

    for (const comment of comments) {
        if (!comment.parentId) {
            continue;
        }

        const current = repliesByRootId.get(comment.parentId) ?? [];
        current.push(comment);
        repliesByRootId.set(comment.parentId, current);
    }

    return roots.map((root) => ({
        ...root,
        replies: repliesByRootId.get(root.id) ?? [],
    }));
}

export async function createCommunityCommentService(input: {
    postId: string;
    userId: string;
    content: string;
    parentId?: string | null;
}) {
    await ensurePublicPost(input.postId);

    let normalizedParentId: string | null = null;

    if (input.parentId) {
        const parent = await findCommunityCommentById(input.parentId);

        if (
            !parent ||
            parent.postId !== input.postId ||
            parent.status !== "approved" ||
            parent.deletedAt
        ) {
            badRequest("Bình luận cha không hợp lệ");
        }

        if (parent.parentId) {
            const root = await findCommunityCommentById(parent.parentId);

            if (
                !root ||
                root.postId !== input.postId ||
                root.status !== "approved" ||
                root.deletedAt
            ) {
                badRequest("Bình luận gốc không còn tồn tại");
            }

            normalizedParentId = root.id;
        } else {
            normalizedParentId = parent.id;
        }
    }

    const comment = await createCommunityComment({
        postId: input.postId,
        userId: input.userId,
        parentId: normalizedParentId,
        content: input.content.trim(),
    });

    if (!comment) {
        throw new Error("Không thể tạo bình luận");
    }

    return comment;
}

async function requireOwnedComment(
    commentId: string,
    userId: string,
) {
    const comment = await findCommunityCommentById(commentId);

    if (!comment || comment.deletedAt) {
        notFound("Không tìm thấy bình luận");
    }

    if (comment.userId !== userId) {
        forbidden("Bạn không có quyền chỉnh sửa bình luận này");
    }

    return comment;
}

export async function updateCommunityCommentService(
    commentId: string,
    userId: string,
    content: string,
) {
    const comment = await requireOwnedComment(commentId, userId);
    await ensurePublicPost(comment.postId);

    const updated = await updateOwnedCommunityComment(
        commentId,
        userId,
        content.trim(),
    );

    if (!updated) {
        notFound("Không tìm thấy bình luận");
    }

    return updated;
}

export async function deleteCommunityCommentService(
    commentId: string,
    userId: string,
) {
    const comment = await requireOwnedComment(commentId, userId);
    await ensurePublicPost(comment.postId);

    const deleted = await softDeleteOwnedCommunityComment(
        commentId,
        userId,
    );

    if (!deleted) {
        notFound("Không tìm thấy bình luận");
    }

    return deleted;
}