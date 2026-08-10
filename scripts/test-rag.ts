/**
 * Test semantic retrieval.
 *
 * Ví dụ:
 *
 * npm run rag:test -- "Tôi thích biển, món ăn địa phương và muốn đi Đà Nẵng"
 */

import "./env";

import {
    retrieveTravelContextService,
} from "../src/services/rag.service";

async function main() {
    const query =
        process.argv
            .slice(2)
            .join(" ")
            .trim() ||
        "Tôi muốn đi Đà Nẵng, thích biển, cảnh đẹp và món ăn địa phương";

    console.log(
        "\n============================================",
    );

    console.log(
        "RAG QUERY:",
    );

    console.log(
        query,
    );

    console.log(
        "============================================\n",
    );

    try {
        const result =
            await retrieveTravelContextService(
                query,
                {
                    limit: 10,
                },
            );

        console.log(
            `Tìm được ${result.resultCount} nguồn liên quan:\n`,
        );

        result.results.forEach(
            (
                item,
                index,
            ) => {
                console.log(
                    `${index + 1}. [${item.kind.toUpperCase()}] ${item.name}`,
                );

                console.log(
                    `   ID: ${item.id}`,
                );

                console.log(
                    `   Similarity: ${item.similarity.toFixed(4)}`,
                );

                if (
                    item.kind ===
                    "destination"
                ) {
                    console.log(
                        `   Khu vực: ${item.locationName}`,
                    );

                    if (
                        item.address
                    ) {
                        console.log(
                            `   Địa chỉ: ${item.address}`,
                        );
                    }
                }

                if (
                    item.kind ===
                        "cuisine" &&
                    item.avgPrice !==
                        null
                ) {
                    console.log(
                        `   Giá TB: ${item.avgPrice.toLocaleString(
                            "vi-VN",
                        )} VNĐ`,
                    );
                }

                console.log();
            },
        );

        console.log(
            "\n============ CONTEXT CHO GEMINI ============\n",
        );

        console.log(
            result.contextText,
        );

        console.log(
            "\n============================================\n",
        );

        process.exit(0);
    } catch (error) {
        console.error(
            "RAG test thất bại:",
            error,
        );

        process.exit(1);
    }
}

void main();