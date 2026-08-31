import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./", import.meta.url)),
        },
    },

    test: {
        environment: "node",

        setupFiles: [
            "./vitest.setup.ts",
        ],

        include: [
            "src/**/*.test.ts",
            "src/**/*.test.tsx",
        ],

        exclude: [
            "src/**/*.integration.test.ts",
            "src/**/*.contract.test.ts",
        ],

        coverage: {
            provider: "v8",

            include: [
                "src/lib/auth/validation.ts",
                "src/schemas/admin-stats.schema.ts",
                "src/lib/auth/return-path.ts",
                "src/lib/otp.ts",
                "src/lib/cache/redis-cache.ts",
                "src/components/ui/ConfirmDialog.tsx",
                "src/components/auth/AuthFormControls.tsx",
                "src/lib/costs/cost-calculator.ts",
                "src/lib/costs/cost-display.ts",
                "src/services/admin-stats.service.ts",
                "src/lib/formatters.ts",
                "src/i18n/config.ts",
                "src/i18n/localized-text.ts",
                "src/components/planner/ai/chat/travel-chat.utils.ts",
                "src/schemas/destination.schema.test.ts",
                "src/schemas/auth.schema.test.ts",
                "src/schemas/cuisine.schema.test.ts",
                "src/schemas/location.schema.test.ts",
                "src/schemas/tour.schema.test.ts",
                "src/schemas/tour.schema.cost.test.ts",
                "src/schemas/tour.schema.schedule.test.ts",
                "src/schemas/community.schema.test.ts",
                "src/schemas/community-clone.schema.test.ts",
                "src/schemas/community-report.schema.test.ts",
                "src/schemas/admin-story.schema.test.ts",
                "src/schemas/tour-community.schema.test.ts",
                "src/schemas/ai-itinerary.schema.test.ts",
                "src/schemas/itinerary.schema.base.test.ts",
                "src/schemas/itinerary.schema.activity.test.ts",
                "src/schemas/itinerary.schema.meal-stay.test.ts",
                "src/schemas/itinerary.schema.cost.test.ts",
                "src/schemas/restaurant.schema.test.ts",
                "src/schemas/restaurant-itinerary.schema.test.ts",
                "src/schemas/restaurant.service.test.ts",
                "src/schemas/restaurant-itinerary.service.test.ts",
                "src/schemas/profile_avatar.schema.test.ts",
                "src/schemas/notification.schema.test.ts",
                "src/schemas/notification.service.test.ts",
                "src/schemas/profile_avatar.service.test.ts",
                "src/schemas/travel-weather.schema.test.ts",
                "src/schemas/travel-lodging.schema.test.ts",
                "src/schemas/travel-weather.service.test.ts",
                "src/schemas/travel-lodging.service.test.ts",
            ],

            reporter: [
                "text",
                "html",
                "lcov",
            ],

            reportsDirectory: "coverage",
        },
    },
});