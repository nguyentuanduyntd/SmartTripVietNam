import "server-only";

import {
    and,
    count,
    desc,
    eq,
    gte,
    isNull,
    lt,
    sql,
} from "drizzle-orm";

import { db } from "@/src/db";
import {
    communityPosts,
    communityReports,
    postDestinations,
} from "@/src/db/schema/community";
import { cuisines } from "@/src/db/schema/cuisines";
import { destinations } from "@/src/db/schema/destinations";
import { profiles } from "@/src/db/schema/profiles";

type DateRange = {
    start: Date;
    end: Date;
};

async function countCreatedInRange(
    table: typeof destinations | typeof cuisines | typeof profiles,
    range: DateRange,
) {
    const [row] = await db
        .select({ value: count() })
        .from(table)
        .where(
            and(
                gte(table.createdAt, range.start),
                lt(table.createdAt, range.end),
            ),
        );

    return row?.value ?? 0;
}

async function countStoriesInRange(range: DateRange) {
    const [row] = await db
        .select({ value: count() })
        .from(communityPosts)
        .where(
            and(
                isNull(communityPosts.deletedAt),
                gte(communityPosts.createdAt, range.start),
                lt(communityPosts.createdAt, range.end),
            ),
        );

    return row?.value ?? 0;
}

export async function getAdminStatsData(
    currentRange: DateRange,
    previousRange: DateRange,
) {
    const storyDay = sql<string>`to_char(
        timezone('Asia/Bangkok', ${communityPosts.createdAt}),
        'YYYY-MM-DD'
    )`;
    const userDay = sql<string>`to_char(
        timezone('Asia/Bangkok', ${profiles.createdAt}),
        'YYYY-MM-DD'
    )`;

    const [
        totalDestinations,
        totalCuisines,
        totalStories,
        totalUsers,
        destinationsThisMonth,
        destinationsPreviousMonth,
        cuisinesThisMonth,
        cuisinesPreviousMonth,
        storiesThisMonth,
        storiesPreviousMonth,
        usersThisMonth,
        usersPreviousMonth,
        activeAuthorsThisMonth,
        activeAuthorsPreviousMonth,
        storyTimeline,
        userTimeline,
        topDestinations,
        mostReportedStories,
        statusDistribution,
    ] = await Promise.all([
        db.select({ value: count() }).from(destinations),
        db.select({ value: count() }).from(cuisines),
        db
            .select({ value: count() })
            .from(communityPosts)
            .where(isNull(communityPosts.deletedAt)),
        db.select({ value: count() }).from(profiles),
        countCreatedInRange(destinations, currentRange),
        countCreatedInRange(destinations, previousRange),
        countCreatedInRange(cuisines, currentRange),
        countCreatedInRange(cuisines, previousRange),
        countStoriesInRange(currentRange),
        countStoriesInRange(previousRange),
        countCreatedInRange(profiles, currentRange),
        countCreatedInRange(profiles, previousRange),
        db
            .select({
                value: sql<number>`count(distinct ${communityPosts.userId})::int`,
            })
            .from(communityPosts)
            .where(
                and(
                    isNull(communityPosts.deletedAt),
                    gte(communityPosts.createdAt, currentRange.start),
                    lt(communityPosts.createdAt, currentRange.end),
                ),
            ),
        db
            .select({
                value: sql<number>`count(distinct ${communityPosts.userId})::int`,
            })
            .from(communityPosts)
            .where(
                and(
                    isNull(communityPosts.deletedAt),
                    gte(communityPosts.createdAt, previousRange.start),
                    lt(communityPosts.createdAt, previousRange.end),
                ),
            ),
        db
            .select({ day: storyDay, value: count() })
            .from(communityPosts)
            .where(
                and(
                    isNull(communityPosts.deletedAt),
                    gte(communityPosts.createdAt, currentRange.start),
                    lt(communityPosts.createdAt, currentRange.end),
                ),
            )
            .groupBy(storyDay)
            .orderBy(storyDay),
        db
            .select({ day: userDay, value: count() })
            .from(profiles)
            .where(
                and(
                    gte(profiles.createdAt, currentRange.start),
                    lt(profiles.createdAt, currentRange.end),
                ),
            )
            .groupBy(userDay)
            .orderBy(userDay),
        db
            .select({
                id: destinations.id,
                name: destinations.name,
                mentions: count(),
            })
            .from(postDestinations)
            .innerJoin(
                destinations,
                eq(postDestinations.destinationId, destinations.id),
            )
            .innerJoin(
                communityPosts,
                eq(postDestinations.postId, communityPosts.id),
            )
            .where(
                and(
                    isNull(communityPosts.deletedAt),
                    gte(communityPosts.createdAt, currentRange.start),
                    lt(communityPosts.createdAt, currentRange.end),
                ),
            )
            .groupBy(destinations.id, destinations.name)
            .orderBy(desc(count()))
            .limit(5),
        db
            .select({
                id: communityPosts.id,
                title: communityPosts.title,
                authorName: profiles.fullName,
                reports: count(),
            })
            .from(communityReports)
            .innerJoin(
                communityPosts,
                eq(communityReports.postId, communityPosts.id),
            )
            .innerJoin(
                profiles,
                eq(communityPosts.userId, profiles.id),
            )
            .where(
                and(
                    isNull(communityPosts.deletedAt),
                    gte(communityReports.createdAt, currentRange.start),
                    lt(communityReports.createdAt, currentRange.end),
                ),
            )
            .groupBy(
                communityPosts.id,
                communityPosts.title,
                profiles.fullName,
            )
            .orderBy(desc(count()))
            .limit(5),
        db
            .select({
                status: communityPosts.status,
                value: count(),
            })
            .from(communityPosts)
            .where(isNull(communityPosts.deletedAt))
            .groupBy(communityPosts.status),
    ]);

    return {
        totals: {
            destinations: totalDestinations[0]?.value ?? 0,
            cuisines: totalCuisines[0]?.value ?? 0,
            stories: totalStories[0]?.value ?? 0,
            users: totalUsers[0]?.value ?? 0,
        },
        monthly: {
            destinations: {
                current: destinationsThisMonth,
                previous: destinationsPreviousMonth,
            },
            cuisines: {
                current: cuisinesThisMonth,
                previous: cuisinesPreviousMonth,
            },
            stories: {
                current: storiesThisMonth,
                previous: storiesPreviousMonth,
            },
            users: {
                current: usersThisMonth,
                previous: usersPreviousMonth,
            },
            activeAuthors: {
                current: activeAuthorsThisMonth[0]?.value ?? 0,
                previous: activeAuthorsPreviousMonth[0]?.value ?? 0,
            },
        },
        timelines: {
            users: userTimeline,
            stories: storyTimeline,
        },
        topDestinations,
        mostReportedStories,
        statusDistribution,
    };
}