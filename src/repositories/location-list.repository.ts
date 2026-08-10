import "server-only";

import {asc,eq,} from "drizzle-orm";
import { db } from "@/src/db";
import {destinationEmbeddings,} from "@/src/db/schema/destination_embeddings";
import {destinations,} from "@/src/db/schema/destinations";
import {locations,} from "@/src/db/schema/locations";

/**
 * Chỉ lấy những location đã có dữ liệu
 * trong RAG knowledge base.
 *
 * Như vậy user sẽ không chọn một tỉnh/thành
 * chưa được ingest embeddings.
 */
export async function findAiPlannerLocationList() {
    return db
        .selectDistinct({
            id:
                locations.id,

            name:
                locations.name,

            slug:
                locations.slug,
        })
        .from(locations)
        .innerJoin(
            destinations,
            eq(
                destinations.locationId,
                locations.id,
            ),
        )
        .innerJoin(
            destinationEmbeddings,
            eq(
                destinationEmbeddings.destinationId,
                destinations.id,
            ),
        )
        .orderBy(
            asc(
                locations.name,
            ),
        );
}

export type AiPlannerLocation =
    Awaited<
        ReturnType<
            typeof findAiPlannerLocationList
        >
    >[number];