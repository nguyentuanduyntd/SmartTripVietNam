import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/src/db";
import { profiles } from "@/src/db/schema/profiles";

export async function findProfileById(
    userId: string,
) {
    const [profile] = await db
        .select({
            id: profiles.id,
            fullName: profiles.fullName,
            avatarUrl: profiles.avatarUrl,
            avatarPublicId:
                profiles.avatarPublicId,
            role: profiles.role,
            createdAt: profiles.createdAt,
        })
        .from(profiles)
        .where(
            eq(profiles.id, userId),
        )
        .limit(1);

    return profile ?? null;
}

export async function saveProfileBasics(
    userId: string,
    input: {
        fullName: string;
    },
) {
    const [savedProfile] = await db
        .insert(profiles)
        .values({
            id: userId,
            fullName: input.fullName,
        })
        .onConflictDoUpdate({
            target: profiles.id,
            set: {
                fullName:
                    input.fullName,
            },
        })
        .returning({
            id: profiles.id,
            fullName: profiles.fullName,
            avatarUrl: profiles.avatarUrl,
            role: profiles.role,
        });

    return savedProfile ?? null;
}

export async function updateProfileAvatar(
    userId: string,
    avatar: {
        url: string,
        publicId: string,
    },
) {
    const [updatedProfile] = await db
        .insert(profiles)
        .values({
            id: userId,
            avatarUrl: avatar.url,
            avatarPublicId:
                avatar.publicId,
        })
        .onConflictDoUpdate({
            target: profiles.id,
            set: {
                avatarUrl: avatar.url,
                avatarPublicId:
                    avatar.publicId,
            },
        })
        .returning({
            id: profiles.id,
            avatarUrl: profiles.avatarUrl,
            avatarPublicId:
                profiles.avatarPublicId,
        });

    return updatedProfile ?? null;
}

export async function clearProfileAvatar(
    userId: string,
) {
    const [updatedProfile] = await db
        .update(profiles)
        .set({
            avatarUrl: null,
            avatarPublicId: null,
        })
        .where(
            eq(profiles.id, userId),
        )
        .returning({
            id: profiles.id,
            avatarUrl: profiles.avatarUrl,
            avatarPublicId:
                profiles.avatarPublicId,
        });

    return updatedProfile ?? null;
}
