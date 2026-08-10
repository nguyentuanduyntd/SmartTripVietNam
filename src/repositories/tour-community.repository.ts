import "server-only";

import {
    and,
    count,
    desc,
    eq,
    isNull,
} from "drizzle-orm";

import { db } from "@/src/db";
import { profiles } from "@/src/db/schema/profiles";
import {
    tourComments,
    tourLikes,
} from "@/src/db/schema/tours";

/* -------------------------------------------------------------------------- */
/* Community overview                                                         */
/* -------------------------------------------------------------------------- */

export async function findTourCommunity(
    tourId: string,
    currentUserId: string | null,
) {
    const [likeCountRows, comments] =
        await Promise.all([
            db
                .select({
                    value: count(),
                })
                .from(tourLikes)
                .where(
                    eq(
                        tourLikes.tourId,
                        tourId,
                    ),
                ),

            db
                .select({
                    id: tourComments.id,
                    tourId:
                        tourComments.tourId,
                    userId:
                        tourComments.userId,
                    content:
                        tourComments.content,
                    createdAt:
                        tourComments.createdAt,
                    updatedAt:
                        tourComments.updatedAt,

                    user: {
                        id: profiles.id,
                        fullName:
                            profiles.fullName,
                        avatarUrl:
                            profiles.avatarUrl,
                    },
                })
                .from(tourComments)
                .innerJoin(
                    profiles,
                    eq(
                        tourComments.userId,
                        profiles.id,
                    ),
                )
                .where(
                    and(
                        eq(
                            tourComments.tourId,
                            tourId,
                        ),
                        eq(
                            tourComments.status,
                            "approved",
                        ),
                        isNull(
                            tourComments.deletedAt,
                        ),
                        isNull(
                            tourComments.parentId,
                        ),
                    ),
                )
                .orderBy(
                    desc(
                        tourComments.createdAt,
                    ),
                ),
        ]);

    let likedByMe = false;

    if (currentUserId) {
        const [likedRow] = await db
            .select({
                tourId: tourLikes.tourId,
            })
            .from(tourLikes)
            .where(
                and(
                    eq(
                        tourLikes.tourId,
                        tourId,
                    ),
                    eq(
                        tourLikes.userId,
                        currentUserId,
                    ),
                ),
            )
            .limit(1);

        likedByMe = Boolean(likedRow);
    }

    return {
        likeCount:
            likeCountRows[0]?.value ?? 0,
        commentCount: comments.length,
        likedByMe,
        comments,
    };
}

/* -------------------------------------------------------------------------- */
/* Likes                                                                      */
/* -------------------------------------------------------------------------- */

export async function createTourLike(
    tourId: string,
    userId: string,
) {
    await db
        .insert(tourLikes)
        .values({
            tourId,
            userId,
        })
        .onConflictDoNothing();

    return {
        tourId,
        userId,
    };
}

export async function deleteTourLike(
    tourId: string,
    userId: string,
) {
    await db
        .delete(tourLikes)
        .where(
            and(
                eq(
                    tourLikes.tourId,
                    tourId,
                ),
                eq(
                    tourLikes.userId,
                    userId,
                ),
            ),
        );

    return {
        tourId,
        userId,
    };
}

/* -------------------------------------------------------------------------- */
/* Comments                                                                   */
/* -------------------------------------------------------------------------- */

export async function createTourComment(
    tourId: string,
    userId: string,
    content: string,
) {
    const [comment] = await db
        .insert(tourComments)
        .values({
            tourId,
            userId,
            content,
            parentId: null,
            status: "approved",
        })
        .returning({
            id: tourComments.id,
            tourId: tourComments.tourId,
            userId: tourComments.userId,
            content: tourComments.content,
            createdAt:
                tourComments.createdAt,
            updatedAt:
                tourComments.updatedAt,
        });

    return comment ?? null;
}

export async function findTourCommentById(
    commentId: string,
) {
    const [comment] = await db
        .select({
            id: tourComments.id,
            tourId: tourComments.tourId,
            userId: tourComments.userId,
            content: tourComments.content,
            status: tourComments.status,
            deletedAt:
                tourComments.deletedAt,
            createdAt:
                tourComments.createdAt,
            updatedAt:
                tourComments.updatedAt,
        })
        .from(tourComments)
        .where(
            eq(
                tourComments.id,
                commentId,
            ),
        )
        .limit(1);

    return comment ?? null;
}

export async function updateTourComment(
    commentId: string,
    content: string,
) {
    const [comment] = await db
        .update(tourComments)
        .set({
            content,
            updatedAt: new Date(),
        })
        .where(
            eq(
                tourComments.id,
                commentId,
            ),
        )
        .returning({
            id: tourComments.id,
            content: tourComments.content,
            updatedAt:
                tourComments.updatedAt,
        });

    return comment ?? null;
}

/**
 * Soft delete.
 *
 * Không xóa cứng để sau này admin vẫn có thể
 * audit/moderate nếu cần.
 */
export async function softDeleteTourComment(
    commentId: string,
) {
    const [comment] = await db
        .update(tourComments)
        .set({
            deletedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(
            eq(
                tourComments.id,
                commentId,
            ),
        )
        .returning({
            id: tourComments.id,
        });

    return comment ?? null;
}