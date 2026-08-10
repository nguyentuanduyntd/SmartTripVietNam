import OpenAi from "openai";
import {RAG_EMBEDDING_DIMENSIONS} from "@/src/lib/pgvector";

export const OPENAI_EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small";

let openAIClient: OpenAi | null = null;

export function getOpenAIClient(){
    if(openAIClient){
        return openAIClient;
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim();

    if(!apiKey){
        throw new Error("OPENAI_API_KEY is not set in environment variables");
    }

    openAIClient = new OpenAi({
        apiKey: apiKey,
    });

    return openAIClient;
}

function normalizeEmbeddingInput(value: string){
    
    return value.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

}

export async function createEmbeddings(values: string[]): Promise<number[][]>{
    if(values.length === 0){
        return [];
    }

    const inputs = values.map(normalizeEmbeddingInput);

    if(inputs.some((value)=> value.length === 0)){
        throw new Error("Input values must not be empty after normalization");
    }

    const response = await getOpenAIClient().embeddings.create({
        model: OPENAI_EMBEDDING_MODEL,
        input: inputs,
        encoding_format: "float",
        dimensions: RAG_EMBEDDING_DIMENSIONS,
    });

    const embeddings = [...response.data].sort((a,b) => a.index - b.index).map((item) => item.embedding);

    if(embeddings.length !== inputs.length){
        throw new Error( "Số lượng embedding trả về không khớp dữ liệu đầu vào.");
    }

    for (const embedding of embeddings){
        if(embedding.length !== RAG_EMBEDDING_DIMENSIONS){
            throw new Error( `Embedding không đúng ${RAG_EMBEDDING_DIMENSIONS} chiều. Nhận được ${embedding.length} chiều.`);
        }
    }
    return embeddings;
}

export async function createEmbedding(value: string): Promise<number[]>{
    
    const [embedding] = await createEmbeddings([value]);

    if(!embedding){
        throw new Error("Không tạo được embedding.");
    }

    return embedding;
}