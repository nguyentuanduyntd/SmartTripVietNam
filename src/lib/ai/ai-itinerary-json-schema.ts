export type BuildAiItineraryJsonSchemaInput = {
    dayCount: number;
    destinationKeys: string[];
    cuisineKeys: string[];
};

/**
 * Structured Output schema dành riêng cho Gemini.
 *
 * Mục tiêu của schema này là giữ những constraint quan trọng nhất nhưng
 * tránh làm schema quá sâu/phức tạp khiến Interactions API trả HTTP 400.
 *
 * Những validation chi tiết hơn vẫn được kiểm tra bằng Zod ở backend.
 */
export function buildAiItineraryJsonSchema(
    input: BuildAiItineraryJsonSchemaInput,
) {
    if (
        !Number.isInteger(input.dayCount) ||
        input.dayCount < 1 ||
        input.dayCount > 7
    ) {
        throw new Error(
            "dayCount của AI itinerary phải nằm trong khoảng 1-7.",
        );
    }

    if (input.destinationKeys.length === 0) {
        throw new Error(
            "Không thể tạo AI schema khi không có destination key.",
        );
    }

    const cuisineMaxItems =
        input.cuisineKeys.length > 0
            ? Math.min(
                  3,
                  input.cuisineKeys.length,
              )
            : 0;

    const cuisineKeySchema =
        input.cuisineKeys.length > 0
            ? {
                  type: "string",
                  enum: input.cuisineKeys,
              }
            : {
                  type: "string",
              };

    return {
        type: "object",

        properties: {
            title: {
                type: "string",
            },

            description: {
                type: "string",
            },

            days: {
                type: "array",

                /**
                 * Constraint quan trọng nhất:
                 * ép Gemini trả đúng số ngày ngay ở Structured Output.
                 */
                minItems: input.dayCount,
                maxItems: input.dayCount,

                items: {
                    type: "object",

                    properties: {
                        dayNumber: {
                            type: "integer",
                        },

                        title: {
                            type: "string",
                        },

                        description: {
                            type: "string",
                        },

                        activities: {
                            type: "array",
                            minItems: 1,
                            maxItems: 5,

                            items: {
                                type: "object",

                                properties: {
                                    /**
                                     * Chỉ cho phép short key lấy từ RAG.
                                     * Không bắt model copy UUID dài nữa.
                                     */
                                    destinationKey: {
                                        type: "string",
                                        enum: input.destinationKeys,
                                    },

                                    title: {
                                        type: "string",
                                    },

                                    description: {
                                        type: "string",
                                    },

                                    startTime: {
                                        type: "string",
                                    },

                                    endTime: {
                                        type: "string",
                                    },

                                    transportMethod: {
                                        type: "string",
                                        enum: [
                                            "walking",
                                            "bicycle",
                                            "motobike",
                                            "car",
                                            "bus",
                                            "train",
                                            "airplane",
                                            "boat",
                                            "other",
                                        ],
                                    },

                                    estimatedTravelMinutes: {
                                        type: "integer",
                                    },
                                },

                                required: [
                                    "destinationKey",
                                    "title",
                                    "description",
                                    "startTime",
                                    "endTime",
                                    "transportMethod",
                                    "estimatedTravelMinutes",
                                ],
                            },
                        },

                        meals: {
                            type: "array",
                            maxItems: 4,

                            items: {
                                type: "object",

                                properties: {
                                    mealType: {
                                        type: "string",
                                        enum: [
                                            "breakfast",
                                            "lunch",
                                            "dinner",
                                            "snack",
                                        ],
                                    },

                                    startTime: {
                                        type: "string",
                                    },

                                    note: {
                                        type: "string",
                                    },

                                    cuisines: {
                                        type: "array",
                                        maxItems:
                                            cuisineMaxItems,

                                        items: {
                                            type: "object",

                                            properties: {
                                                cuisineKey:
                                                    cuisineKeySchema,
                                            },

                                            required: [
                                                "cuisineKey",
                                            ],
                                        },
                                    },
                                },

                                required: [
                                    "mealType",
                                    "startTime",
                                    "note",
                                    "cuisines",
                                ],
                            },
                        },
                    },

                    required: [
                        "dayNumber",
                        "title",
                        "description",
                        "activities",
                        "meals",
                    ],
                },
            },

            /**
             * Phần cost giữ schema nhẹ.
             * Validation chi tiết về giá trị vẫn để Zod/backend xử lý.
             */
            estimatedCosts: {
                type: "array",
                minItems: 1,
                maxItems: 20,

                items: {
                    type: "object",

                    properties: {
                        title: {
                            type: "string",
                        },

                        category: {
                            type: "string",
                            enum: [
                                "ticket",
                                "food",
                                "transport",
                                "accommodation",
                                "activity",
                                "shopping",
                                "other",
                            ],
                        },

                        calculationUnit: {
                            type: "string",
                            enum: [
                                "per_person",
                                "per_group",
                                "per_room",
                                "fixed",
                            ],
                        },

                        travelerScope: {
                            type: "string",
                            enum: [
                                "all",
                                "adult",
                                "child",
                            ],
                        },

                        unitPrice: {
                            type: "integer",
                        },

                        quantity: {
                            type: "number",
                        },

                        nightCount: {
                            type: [
                                "integer",
                                "null",
                            ],
                        },

                        note: {
                            type: "string",
                        },
                    },

                    required: [
                        "title",
                        "category",
                        "calculationUnit",
                        "travelerScope",
                        "unitPrice",
                        "quantity",
                        "nightCount",
                        "note",
                    ],
                },
            },
        },

        required: [
            "title",
            "description",
            "days",
            "estimatedCosts",
        ],
    } as const;
}