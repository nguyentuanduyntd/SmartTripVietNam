import "./env";
import {ingestTravelKnowledgeService,} from "../src/services/rag.service";

async function main() {
    try {
        console.log("Bắt đầu tạo embeddings cho SmartTripVietNam...");

        const result = await ingestTravelKnowledgeService();

        console.log("\nRAG knowledge base đã sẵn sàng.");

        console.table({"Địa điểm": result.destinations,
            "Chunk địa điểm": result.destinationChunks,
            "Ẩm thực": result.cuisines,
            "Chunk ẩm thực": result.cuisineChunks,
            "Tổng documents": result.totalDocuments,
            "Tổng chunks": result.totalChunks});

        process.exit(0);
    } catch (error) {
        console.error("\nRAG ingest thất bại:",error);

        process.exit(1);
    }
}

void main();