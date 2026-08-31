import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: {
            "@": fileURLToPath(
                new URL("./", import.meta.url),
            ),
        },
    },
    test: {
        environment: "node",

        setupFiles: [
            "./vitest.integration.setup.ts",
        ],

        include: [
            "src/**/*.integration.test.ts",
        ],
        fileParallelism: false,
        hookTimeout: 15_000,
        testTimeout: 15_000,
    },
});
