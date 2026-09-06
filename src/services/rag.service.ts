import { createEmbedding, createEmbeddings } from "@/src/lib/ai/openai";

import { normalizeRagLimit, RAG_CHUNK_OVERLAP, RAG_CHUNK_SIZE, RAG_MIN_SIMILARITY } from "@/src/lib/pgvector";

import {
  findCuisineDestinationLinks,
  findCuisineEmbeddingSources,
  findDestinationCategoryLinks,
  findDestinationEmbeddingSources,
  replaceCuisineEmbeddings,
  replaceDestinationEmbeddings,
  searchCuisineEmbeddings,
  searchDestinationEmbeddings,
} from "@/src/repositories/rag.repository";

export type RagKnowledgeKind = "destination" | "cuisine";

export type RagRetrievedItem =
  | {
      kind: "destination";

      id: string;

      name: string;

      locationId: string;

      locationName: string;

      address: string | null;

      latitude: number | null;

      longitude: number | null;

      content: string;

      similarity: number;
    }
  | {
      kind: "cuisine";

      id: string;

      name: string;

      avgPrice: number | null;

      content: string;

      similarity: number;
    };

function normalizeDocumentText(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function splitRagDocument(
  value: string,
  options?: {
    chunkSize?: number;
    overlap?: number;
  },
) {
  const text = normalizeDocumentText(value);

  if (!text) {
    return [];
  }

  const chunkSize = Math.max(options?.chunkSize ?? RAG_CHUNK_SIZE, 300);

  const overlap = Math.min(Math.max(options?.overlap ?? RAG_CHUNK_OVERLAP, 0), chunkSize - 1);

  if (text.length <= chunkSize) {
    return [text];
  }

  const chunks: string[] = [];

  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);

    if (end < text.length) {
      const current = text.slice(start, end);

      const lastParagraph = current.lastIndexOf("\n");

      const lastSentence = current.lastIndexOf(". ");

      const preferredBreak = Math.max(lastParagraph, lastSentence >= 0 ? lastSentence + 1 : -1);

      if (preferredBreak > chunkSize * 0.6) {
        end = start + preferredBreak;
      }
    }

    const chunk = text.slice(start, end).trim();

    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= text.length) {
      break;
    }

    const nextStart = end - overlap;

    start = nextStart > start ? nextStart : end;
  }

  return chunks;
}

function buildDestinationDocument(
  destination: {
    name: string;
    nameEn: string | null;
    address: string | null;
    description: string | null;
    history: string | null;
    latitude: number | null;
    longitude: number | null;
    locationName: string;
  },
  categoryNames: string[],
) {
  const lines = [
    "LOẠI DỮ LIỆU: ĐỊA ĐIỂM DU LỊCH",

    `Tên địa điểm: ${destination.name}`,

    destination.nameEn ? `Tên tiếng Anh: ${destination.nameEn}` : null,

    `Khu vực: ${destination.locationName}`,

    categoryNames.length > 0 ? `Danh mục: ${categoryNames.join(", ")}` : null,

    destination.address ? `Địa chỉ: ${destination.address}` : null,

    destination.description ? `Mô tả: ${destination.description}` : null,

    destination.history ? `Lịch sử / thông tin thêm: ${destination.history}` : null,

    typeof destination.latitude === "number" && typeof destination.longitude === "number"
      ? `Tọa độ: ${destination.latitude}, ${destination.longitude}`
      : null,
  ];

  return lines.filter((value): value is string => Boolean(value)).join("\n");
}

function buildCuisineDocument(
  cuisine: {
    name: string;
    nameEn: string | null;
    description: string | null;
    avgPrice: number | null;
  },
  relatedPlaces: Array<{
    destinationName: string;
    locationName: string;
  }>,
) {
  const relatedText =
    relatedPlaces.length > 0
      ? relatedPlaces.map((place) => `${place.destinationName} (${place.locationName})`).join(", ")
      : null;

  const lines = [
    "LOẠI DỮ LIỆU: ẨM THỰC",

    `Tên món: ${cuisine.name}`,

    cuisine.nameEn ? `Tên tiếng Anh: ${cuisine.nameEn}` : null,

    cuisine.description ? `Mô tả: ${cuisine.description}` : null,

    typeof cuisine.avgPrice === "number"
      ? `Giá tham khảo trung bình: ${cuisine.avgPrice.toLocaleString("vi-VN")} VNĐ`
      : null,

    relatedText ? `Điểm đến/khu vực liên quan: ${relatedText}` : null,
  ];

  return lines.filter((value): value is string => Boolean(value)).join("\n");
}

async function ingestDestinations() {
  const [destinations, categoryLinks] = await Promise.all([
    findDestinationEmbeddingSources(),

    findDestinationCategoryLinks(),
  ]);

  const categoriesByDestination = new Map<string, string[]>();

  for (const link of categoryLinks) {
    const current = categoriesByDestination.get(link.destinationId) ?? [];

    current.push(link.categoryName);

    categoriesByDestination.set(link.destinationId, current);
  }

  let chunkCount = 0;

  for (const destination of destinations) {
    const document = buildDestinationDocument(destination, categoriesByDestination.get(destination.id) ?? []);

    const chunks = splitRagDocument(document);

    const embeddings = await createEmbeddings(chunks);

    await replaceDestinationEmbeddings(
      destination.id,
      chunks.map((content, index) => {
        const embedding = embeddings[index];

        if (!embedding) {
          throw new Error(`Thiếu embedding cho destination ${destination.name}, chunk ${index}.`);
        }

        return {
          content,
          embedding,
        };
      }),
    );

    chunkCount += chunks.length;

    console.log(`✓ Destination: ${destination.name} (${chunks.length} chunk)`);
  }

  return {
    documentCount: destinations.length,

    chunkCount,
  };
}

async function ingestCuisines() {
  const [cuisines, cuisineDestinationLinks] = await Promise.all([
    findCuisineEmbeddingSources(),

    findCuisineDestinationLinks(),
  ]);

  const placesByCuisine = new Map<
    string,
    Array<{
      destinationName: string;
      locationName: string;
    }>
  >();

  for (const link of cuisineDestinationLinks) {
    const current = placesByCuisine.get(link.cuisineId) ?? [];

    current.push({
      destinationName: link.destinationName,

      locationName: link.locationName,
    });

    placesByCuisine.set(link.cuisineId, current);
  }

  let chunkCount = 0;

  for (const cuisine of cuisines) {
    const document = buildCuisineDocument(cuisine, placesByCuisine.get(cuisine.id) ?? []);

    const chunks = splitRagDocument(document);

    const embeddings = await createEmbeddings(chunks);

    await replaceCuisineEmbeddings(
      cuisine.id,
      chunks.map((content, index) => {
        const embedding = embeddings[index];

        if (!embedding) {
          throw new Error(`Thiếu embedding cho cuisine ${cuisine.name}, chunk ${index}.`);
        }

        return {
          content,
          embedding,
        };
      }),
    );

    chunkCount += chunks.length;

    console.log(`✓ Cuisine: ${cuisine.name} (${chunks.length} chunk)`);
  }

  return {
    documentCount: cuisines.length,

    chunkCount,
  };
}

export async function ingestTravelKnowledgeService() {
  console.log("\n=== RAG INGEST START ===\n");

  const destinations = await ingestDestinations();

  const cuisines = await ingestCuisines();

  const result = {
    destinations: destinations.documentCount,

    destinationChunks: destinations.chunkCount,

    cuisines: cuisines.documentCount,

    cuisineChunks: cuisines.chunkCount,

    totalDocuments: destinations.documentCount + cuisines.documentCount,

    totalChunks: destinations.chunkCount + cuisines.chunkCount,
  };

  console.log("\n=== RAG INGEST COMPLETED ===");

  console.log(result);

  return result;
}

type RagRetrievalOptions = {
  limit?: number;

  destinationLimit?: number;

  cuisineLimit?: number;

  minSimilarity?: number;

  locationId?: string;
};

const RAG_CHUNK_CANDIDATE_MULTIPLIER = 3;

const RAG_MAX_CHUNK_CANDIDATES = 96;

function buildChunkCandidateLimit(entityLimit: number) {
  return Math.min(Math.max(entityLimit * RAG_CHUNK_CANDIDATE_MULTIPLIER, entityLimit), RAG_MAX_CHUNK_CANDIDATES);
}

function dedupeRagItems(items: RagRetrievedItem[]) {
  const bestByEntity = new Map<string, RagRetrievedItem>();

  for (const item of items) {
    const key = `${item.kind}:${item.id}`;

    const current = bestByEntity.get(key);

    if (!current || item.similarity > current.similarity) {
      bestByEntity.set(key, item);
    }
  }

  return [...bestByEntity.values()].sort((a, b) => b.similarity - a.similarity);
}

function resolveRetrievalLimits(options?: RagRetrievalOptions) {
  const totalLimit = normalizeRagLimit(options?.limit);

  const requestedDestinationLimit = options?.destinationLimit ?? Math.ceil(totalLimit * 0.7);

  const destinationLimit = Math.min(normalizeRagLimit(requestedDestinationLimit), totalLimit);

  const remainingAfterDestination = Math.max(totalLimit - destinationLimit, 0);

  let cuisineLimit = 0;

  if (remainingAfterDestination > 0) {
    const requestedCuisineLimit = options?.cuisineLimit ?? remainingAfterDestination;

    cuisineLimit = Math.min(normalizeRagLimit(requestedCuisineLimit), remainingAfterDestination);
  }

  return {
    totalLimit,
    destinationLimit,
    cuisineLimit,
  };
}

export async function retrieveTravelContextService(query: string, options?: RagRetrievalOptions) {
  const normalizedQuery = query.replace(/\s+/g, " ").trim();

  if (!normalizedQuery) {
    throw new Error("Câu truy vấn RAG không được để trống.");
  }

  const { totalLimit, destinationLimit, cuisineLimit } = resolveRetrievalLimits(options);

  const minSimilarity = options?.minSimilarity ?? RAG_MIN_SIMILARITY;

  const queryEmbedding = await createEmbedding(normalizedQuery);

  const destinationChunkLimit = buildChunkCandidateLimit(destinationLimit);

  const cuisineChunkLimit = cuisineLimit > 0 ? buildChunkCandidateLimit(cuisineLimit) : 0;

  const [destinationHits, cuisineHits] = await Promise.all([
    searchDestinationEmbeddings(queryEmbedding, {
      limit: destinationChunkLimit,

      minSimilarity,

      locationId: options?.locationId,
    }),

    cuisineChunkLimit > 0
      ? searchCuisineEmbeddings(queryEmbedding, {
          limit: cuisineChunkLimit,

          minSimilarity,

          locationId: options?.locationId,
        })
      : Promise.resolve([]),
  ]);

  const rawDestinationResults: RagRetrievedItem[] = destinationHits.map((hit) => ({
    kind: "destination",

    id: hit.destinationId,

    name: hit.name,

    locationId: hit.locationId,

    locationName: hit.locationName,

    address: hit.address,

    latitude: hit.latitude,

    longitude: hit.longitude,

    content: hit.content,

    similarity: Number(hit.similarity),
  }));

  const rawCuisineResults: RagRetrievedItem[] = cuisineHits.map((hit) => ({
    kind: "cuisine",

    id: hit.cuisineId,

    name: hit.name,

    avgPrice: hit.avgPrice,

    content: hit.content,

    similarity: Number(hit.similarity),
  }));

  const uniqueDestinations = dedupeRagItems(rawDestinationResults);

  const uniqueCuisines = dedupeRagItems(rawCuisineResults);

  const selectedDestinations = uniqueDestinations.slice(0, destinationLimit);

  const selectedCuisines = uniqueCuisines.slice(0, cuisineLimit);

  let results: RagRetrievedItem[] = [...selectedDestinations, ...selectedCuisines];

  if (results.length < totalLimit) {
    const selectedKeys = new Set(results.map((item) => `${item.kind}:${item.id}`));

    const overflowCandidates = [
      ...uniqueDestinations.slice(destinationLimit),

      ...uniqueCuisines.slice(cuisineLimit),
    ].sort((a, b) => b.similarity - a.similarity);

    for (const candidate of overflowCandidates) {
      if (results.length >= totalLimit) {
        break;
      }

      const key = `${candidate.kind}:${candidate.id}`;

      if (selectedKeys.has(key)) {
        continue;
      }

      selectedKeys.add(key);

      results.push(candidate);
    }
  }

  results = results.sort((a, b) => b.similarity - a.similarity);

  const contextText = results
    .map((result, index) => {
      if (result.kind === "destination") {
        return [
          `[NGUỒN ${index + 1}]`,

          "TYPE: destination",

          `DATABASE_ID: ${result.id}`,

          `NAME: ${result.name}`,

          `LOCATION_ID: ${result.locationId}`,

          `LOCATION: ${result.locationName}`,

          result.address ? `ADDRESS: ${result.address}` : null,

          `SIMILARITY: ${result.similarity.toFixed(4)}`,

          "",

          result.content,
        ]
          .filter((value): value is string => value !== null)
          .join("\n");
      }

      return [
        `[NGUỒN ${index + 1}]`,

        "TYPE: cuisine",

        `DATABASE_ID: ${result.id}`,

        `NAME: ${result.name}`,

        result.avgPrice !== null ? `AVG_PRICE: ${result.avgPrice}` : null,

        `SIMILARITY: ${result.similarity.toFixed(4)}`,

        "",

        result.content,
      ]
        .filter((value): value is string => value !== null)
        .join("\n");
    })
    .join("\n\n------------------------------\n\n");

  return {
    query: normalizedQuery,

    resultCount: results.length,

    retrievalStats: {
      totalLimit,

      destinationLimit,

      cuisineLimit,

      rawDestinationChunks: destinationHits.length,

      rawCuisineChunks: cuisineHits.length,

      uniqueDestinations: uniqueDestinations.length,

      uniqueCuisines: uniqueCuisines.length,

      minSimilarity,
    },

    results,

    contextText,
  };
}
