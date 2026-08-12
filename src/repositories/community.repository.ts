import "server-only";

import {
    and,
    asc,
    count,
    desc,
    eq,
    inArray,
    isNull,
    sql,
} from "drizzle-orm";

import { db } from "@/src/db";
import {
    communityPosts,
    postComments,
    postDestinations,
    postImages,
    postLikes,
    postSaves,
    type CommunityItinerarySnapshot,
} from "@/src/db/schema/community";
import { destinations } from "@/src/db/schema/destinations";
import { locations } from "@/src/db/schema/locations";
import { profiles } from "@/src/db/schema/profiles";

export type CreateCommunityPostRecordInput = {
    userId: string;
    sourceItineraryId: string | null;
    locationId: string | null;
    title: string;
    content: string;
    rating: number;
    tripStartDate: string | null;
    tripEndDate: string | null;
    dayCount: number | null;
    estimatedCost: number | null;
    itinerarySnapshot: CommunityItinerarySnapshot | null;
    destinationIds: string[];
    images: Array<{
        url: string;
        publicId: string;
        width: number;
        height: number;
    }>;
};

export type CommunityFeedRepositoryOptions = {
    sort: "latest" | "popular" | "saved";
    locationId?: string;
    page: number;
    limit: number;
    currentUserId: string | null;
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function uniqueStrings(values: string[]) {
    return [...new Set(values)];
}

async function hydrateCommunityPostCards(
    rows: Array<{
        id: string;
        userId: string;
        title: string | null;
        content: string;
        rating: number | null;
        sourceItineraryId: string | null;
        locationId: string | null;
        locationName: string | null;
        tripStartDate: string | null;
        tripEndDate: string | null;
        dayCount: number | null;
        estimatedCost: string | null;
        createdAt: Date;
        updatedAt: Date;
        author: {
            id: string;
            fullName: string | null;
            avatarUrl: string | null;
        };
        likeCount: number;
        commentCount: number;
        saveCount: number;
    }>,
    currentUserId: string | null,
) {
    if (rows.length === 0) {
        return [];
    }

    const postIds = rows.map((row) => row.id);

    const [images, mentionedDestinations, likedRows, savedRows] =
        await Promise.all([
            db
                .select({
                    id: postImages.id,
                    postId: postImages.postId,
                    url: postImages.url,
                    width: postImages.width,
                    height: postImages.height,
                    altText: postImages.altText,
                    caption: postImages.caption,
                    sortOrder: postImages.sortOrder,
                })
                .from(postImages)
                .where(inArray(postImages.postId, postIds))
                .orderBy(asc(postImages.sortOrder)),

            db
                .select({
                    postId: postDestinations.postId,
                    id: destinations.id,
                    name: destinations.name,
                    address: destinations.address,
                })
                .from(postDestinations)
                .innerJoin(
                    destinations,
                    eq(postDestinations.destinationId, destinations.id),
                )
                .where(inArray(postDestinations.postId, postIds)),

            !currentUserId
                ? Promise.resolve([])
                : db
                      .select({
                          postId: postLikes.postId,
                      })
                      .from(postLikes)
                      .where(
                          and(
                              inArray(postLikes.postId, postIds),
                              eq(postLikes.userId, currentUserId),
                          ),
                      ),

            !currentUserId
                ? Promise.resolve([])
                : db
                      .select({
                          postId: postSaves.postId,
                      })
                      .from(postSaves)
                      .where(
                          and(
                              inArray(postSaves.postId, postIds),
                              eq(postSaves.userId, currentUserId),
                          ),
                      ),
        ]);

    const imagesByPostId = new Map<string, typeof images>();
    for (const image of images) {
        const current = imagesByPostId.get(image.postId) ?? [];
        current.push(image);
        imagesByPostId.set(image.postId, current);
    }

    const destinationsByPostId = new Map<
        string,
        typeof mentionedDestinations
    >();
    for (const destination of mentionedDestinations) {
        const current = destinationsByPostId.get(destination.postId) ?? [];
        current.push(destination);
        destinationsByPostId.set(destination.postId, current);
    }

    const likedSet = new Set(likedRows.map((row) => row.postId));
    const savedSet = new Set(savedRows.map((row) => row.postId));

    return rows.map((row) => ({
        ...row,
        images: imagesByPostId.get(row.id) ?? [],
        destinations: destinationsByPostId.get(row.id) ?? [],
        likedByMe: likedSet.has(row.id),
        savedByMe: savedSet.has(row.id),
    }));
}

/* -------------------------------------------------------------------------- */
/* Destinations                                                               */
/* -------------------------------------------------------------------------- */

export async function findExistingDestinationIds(ids: string[]) {
    const uniqueIds = uniqueStrings(ids);

    if (uniqueIds.length === 0) {
        return [];
    }

    const rows = await db
        .select({ id: destinations.id })
        .from(destinations)
        .where(inArray(destinations.id, uniqueIds));

    return rows.map((row) => row.id);
}

/* -------------------------------------------------------------------------- */
/* Create                                                                     */
/* -------------------------------------------------------------------------- */

export async function createCommunityPostRecord(
    input: CreateCommunityPostRecordInput,
) {
    return db.transaction(async (tx) => {
        const [post] = await tx
            .insert(communityPosts)
            .values({
                userId: input.userId,
                sourceItineraryId: input.sourceItineraryId,
                locationId: input.locationId,
                title: input.title,
                content: input.content,
                rating: input.rating,
                tripStartDate: input.tripStartDate,
                tripEndDate: input.tripEndDate,
                dayCount: input.dayCount,
                estimatedCost:
                    input.estimatedCost === null
                        ? null
                        : String(input.estimatedCost),
                itinerarySnapshot: input.itinerarySnapshot,
                status: "approved",
            })
            .returning({
                id: communityPosts.id,
                title: communityPosts.title,
                createdAt: communityPosts.createdAt,
            });

        if (!post) {
            throw new Error("Không thể tạo bài chia sẻ cộng đồng");
        }

        if (input.images.length > 0) {
            await tx.insert(postImages).values(
                input.images.map((image, index) => ({
                    postId: post.id,
                    url: image.url,
                    publicId: image.publicId,
                    width: image.width,
                    height: image.height,
                    altText: input.title,
                    caption: null,
                    sortOrder: index,
                })),
            );
        }

        const uniqueDestinationIds = uniqueStrings(input.destinationIds);

        if (uniqueDestinationIds.length > 0) {
            await tx.insert(postDestinations).values(
                uniqueDestinationIds.map((destinationId) => ({
                    postId: post.id,
                    destinationId,
                })),
            );
        }

        return post;
    });
}

/* -------------------------------------------------------------------------- */
/* Feed                                                                       */
/* -------------------------------------------------------------------------- */

export async function findCommunityFeed(
    options: CommunityFeedRepositoryOptions,
) {
    const likeCount = sql<number>`(
        select count(*)::int
        from ${postLikes}
        where ${postLikes.postId} = ${communityPosts.id}
    )`;

    const commentCount = sql<number>`(
        select count(*)::int
        from ${postComments}
        where ${postComments.postId} = ${communityPosts.id}
          and ${postComments.status} = 'approved'
          and ${postComments.deletedAt} is null
    )`;

    const saveCount = sql<number>`(
        select count(*)::int
        from ${postSaves}
        where ${postSaves.postId} = ${communityPosts.id}
    )`;

    const conditions = [
        eq(communityPosts.status, "approved"),
        isNull(communityPosts.deletedAt),
    ];

    if (options.locationId) {
        conditions.push(eq(communityPosts.locationId, options.locationId));
    }

    if (options.sort === "saved" && options.currentUserId) {
        conditions.push(sql<boolean>`exists (
            select 1
            from ${postSaves}
            where ${postSaves.postId} = ${communityPosts.id}
              and ${postSaves.userId} = ${options.currentUserId}
        )`);
    }

    const offset = (options.page - 1) * options.limit;

    const baseQuery = db
        .select({
            id: communityPosts.id,
            userId: communityPosts.userId,
            title: communityPosts.title,
            content: communityPosts.content,
            rating: communityPosts.rating,
            sourceItineraryId: communityPosts.sourceItineraryId,
            locationId: communityPosts.locationId,
            locationName: locations.name,
            tripStartDate: communityPosts.tripStartDate,
            tripEndDate: communityPosts.tripEndDate,
            dayCount: communityPosts.dayCount,
            estimatedCost: communityPosts.estimatedCost,
            createdAt: communityPosts.createdAt,
            updatedAt: communityPosts.updatedAt,
            author: {
                id: profiles.id,
                fullName: profiles.fullName,
                avatarUrl: profiles.avatarUrl,
            },
            likeCount,
            commentCount,
            saveCount,
        })
        .from(communityPosts)
        .innerJoin(profiles, eq(communityPosts.userId, profiles.id))
        .leftJoin(locations, eq(communityPosts.locationId, locations.id))
        .where(and(...conditions));

    const rows =
        options.sort === "popular"
            ? await baseQuery
                  .orderBy(desc(likeCount), desc(communityPosts.createdAt))
                  .limit(options.limit)
                  .offset(offset)
            : await baseQuery
                  .orderBy(desc(communityPosts.createdAt))
                  .limit(options.limit)
                  .offset(offset);

    const hydrated = await hydrateCommunityPostCards(
        rows,
        options.currentUserId,
    );

    return {
        items: hydrated,
        page: options.page,
        limit: options.limit,
        hasMore: rows.length === options.limit,
    };
}

/* -------------------------------------------------------------------------- */
/* Public detail                                                              */
/* -------------------------------------------------------------------------- */

export async function findPublicCommunityPostById(
    postId: string,
    currentUserId: string | null,
) {
    const likeCount = sql<number>`(
        select count(*)::int
        from ${postLikes}
        where ${postLikes.postId} = ${communityPosts.id}
    )`;

    const commentCount = sql<number>`(
        select count(*)::int
        from ${postComments}
        where ${postComments.postId} = ${communityPosts.id}
          and ${postComments.status} = 'approved'
          and ${postComments.deletedAt} is null
    )`;

    const saveCount = sql<number>`(
        select count(*)::int
        from ${postSaves}
        where ${postSaves.postId} = ${communityPosts.id}
    )`;

    const [row] = await db
        .select({
            id: communityPosts.id,
            userId: communityPosts.userId,
            title: communityPosts.title,
            content: communityPosts.content,
            rating: communityPosts.rating,
            sourceItineraryId: communityPosts.sourceItineraryId,
            itinerarySnapshot: communityPosts.itinerarySnapshot,
            locationId: communityPosts.locationId,
            locationName: locations.name,
            tripStartDate: communityPosts.tripStartDate,
            tripEndDate: communityPosts.tripEndDate,
            dayCount: communityPosts.dayCount,
            estimatedCost: communityPosts.estimatedCost,
            createdAt: communityPosts.createdAt,
            updatedAt: communityPosts.updatedAt,
            author: {
                id: profiles.id,
                fullName: profiles.fullName,
                avatarUrl: profiles.avatarUrl,
            },
            likeCount,
            commentCount,
            saveCount,
        })
        .from(communityPosts)
        .innerJoin(profiles, eq(communityPosts.userId, profiles.id))
        .leftJoin(locations, eq(communityPosts.locationId, locations.id))
        .where(
            and(
                eq(communityPosts.id, postId),
                eq(communityPosts.status, "approved"),
                isNull(communityPosts.deletedAt),
            ),
        )
        .limit(1);

    if (!row) {
        return null;
    }

    const [hydrated] = await hydrateCommunityPostCards(
        [row],
        currentUserId,
    );

    return hydrated ?? null;
}

export async function findPublicCommunityPostBasic(postId: string) {
    const [post] = await db
        .select({
            id: communityPosts.id,
            userId: communityPosts.userId,
        })
        .from(communityPosts)
        .where(
            and(
                eq(communityPosts.id, postId),
                eq(communityPosts.status, "approved"),
                isNull(communityPosts.deletedAt),
            ),
        )
        .limit(1);

    return post ?? null;
}

/* -------------------------------------------------------------------------- */
/* Ownership / edit / delete                                                  */
/* -------------------------------------------------------------------------- */

export async function findOwnedCommunityPost(
    postId: string,
    userId: string,
) {
    const [post] = await db
        .select({
            id: communityPosts.id,
            userId: communityPosts.userId,
            deletedAt: communityPosts.deletedAt,
        })
        .from(communityPosts)
        .where(
            and(
                eq(communityPosts.id, postId),
                eq(communityPosts.userId, userId),
                isNull(communityPosts.deletedAt),
            ),
        )
        .limit(1);

    if (!post) {
        return null;
    }

    const images = await db
        .select({
            publicId: postImages.publicId,
        })
        .from(postImages)
        .where(eq(postImages.postId, postId));

    return {
        ...post,
        imagePublicIds: images.map((image) => image.publicId),
    };
}

export async function updateOwnedCommunityPost(
    postId: string,
    userId: string,
    data: {
        title?: string;
        content?: string;
        rating?: number;
    },
) {
    const [post] = await db
        .update(communityPosts)
        .set({
            ...data,
            updatedAt: new Date(),
        })
        .where(
            and(
                eq(communityPosts.id, postId),
                eq(communityPosts.userId, userId),
                isNull(communityPosts.deletedAt),
            ),
        )
        .returning({
            id: communityPosts.id,
            title: communityPosts.title,
            content: communityPosts.content,
            rating: communityPosts.rating,
            updatedAt: communityPosts.updatedAt,
        });

    return post ?? null;
}

export async function softDeleteOwnedCommunityPost(
    postId: string,
    userId: string,
) {
    const [post] = await db
        .update(communityPosts)
        .set({
            deletedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(
            and(
                eq(communityPosts.id, postId),
                eq(communityPosts.userId, userId),
                isNull(communityPosts.deletedAt),
            ),
        )
        .returning({ id: communityPosts.id });

    return post ?? null;
}

/* -------------------------------------------------------------------------- */
/* Likes / saves                                                              */
/* -------------------------------------------------------------------------- */

export async function setCommunityPostLike(
    postId: string,
    userId: string,
    active: boolean,
) {
    if (active) {
        await db
            .insert(postLikes)
            .values({ postId, userId })
            .onConflictDoNothing();
    } else {
        await db
            .delete(postLikes)
            .where(
                and(
                    eq(postLikes.postId, postId),
                    eq(postLikes.userId, userId),
                ),
            );
    }

    const [row] = await db
        .select({ value: count() })
        .from(postLikes)
        .where(eq(postLikes.postId, postId));

    return {
        postId,
        liked: active,
        likeCount: row?.value ?? 0,
    };
}

export async function setCommunityPostSave(
    postId: string,
    userId: string,
    active: boolean,
) {
    if (active) {
        await db
            .insert(postSaves)
            .values({ postId, userId })
            .onConflictDoNothing();
    } else {
        await db
            .delete(postSaves)
            .where(
                and(
                    eq(postSaves.postId, postId),
                    eq(postSaves.userId, userId),
                ),
            );
    }

    const [row] = await db
        .select({ value: count() })
        .from(postSaves)
        .where(eq(postSaves.postId, postId));

    return {
        postId,
        saved: active,
        saveCount: row?.value ?? 0,
    };
}

/* -------------------------------------------------------------------------- */
/* Comments                                                                   */
/* -------------------------------------------------------------------------- */

export async function findCommunityPostComments(postId: string) {
    return db
        .select({
            id: postComments.id,
            postId: postComments.postId,
            userId: postComments.userId,
            parentId: postComments.parentId,
            content: postComments.content,
            createdAt: postComments.createdAt,
            updatedAt: postComments.updatedAt,
            author: {
                id: profiles.id,
                fullName: profiles.fullName,
                avatarUrl: profiles.avatarUrl,
            },
        })
        .from(postComments)
        .innerJoin(profiles, eq(postComments.userId, profiles.id))
        .where(
            and(
                eq(postComments.postId, postId),
                eq(postComments.status, "approved"),
                isNull(postComments.deletedAt),
            ),
        )
        .orderBy(asc(postComments.createdAt), asc(postComments.id));
}

export async function findCommunityCommentById(commentId: string) {
    const [comment] = await db
        .select({
            id: postComments.id,
            postId: postComments.postId,
            userId: postComments.userId,
            parentId: postComments.parentId,
            status: postComments.status,
            deletedAt: postComments.deletedAt,
        })
        .from(postComments)
        .where(eq(postComments.id, commentId))
        .limit(1);

    return comment ?? null;
}

export async function createCommunityComment(input: {
    postId: string;
    userId: string;
    parentId: string | null;
    content: string;
}) {
    const [comment] = await db
        .insert(postComments)
        .values({
            postId: input.postId,
            userId: input.userId,
            parentId: input.parentId,
            content: input.content,
            status: "approved",
        })
        .returning({
            id: postComments.id,
            postId: postComments.postId,
            userId: postComments.userId,
            parentId: postComments.parentId,
            content: postComments.content,
            createdAt: postComments.createdAt,
            updatedAt: postComments.updatedAt,
        });

    return comment ?? null;
}

export async function updateOwnedCommunityComment(
    commentId: string,
    userId: string,
    content: string,
) {
    const [comment] = await db
        .update(postComments)
        .set({
            content,
            updatedAt: new Date(),
        })
        .where(
            and(
                eq(postComments.id, commentId),
                eq(postComments.userId, userId),
                isNull(postComments.deletedAt),
            ),
        )
        .returning({
            id: postComments.id,
            content: postComments.content,
            updatedAt: postComments.updatedAt,
        });

    return comment ?? null;
}

export async function softDeleteOwnedCommunityComment(
    commentId: string,
    userId: string,
) {
    const [comment] = await db
        .update(postComments)
        .set({
            deletedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(
            and(
                eq(postComments.id, commentId),
                eq(postComments.userId, userId),
                isNull(postComments.deletedAt),
            ),
        )
        .returning({ id: postComments.id });

    return comment ?? null;
}