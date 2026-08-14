export const RAG_EMBEDDING_DIMENSIONS = 1536;

export const RAG_DEFAULT_LIMIT = 48;

export const RAG_MIN_SIMILARITY = 0.35;

export const RAG_CHUNK_SIZE = 1200;

export const RAG_CHUNK_OVERLAP = 160;

export function normalizeRagLimit(value?:number){
    const normalized = Math.trunc(value ?? RAG_DEFAULT_LIMIT);

    return Math.min(Math.max(normalized, 1), RAG_DEFAULT_LIMIT);
}