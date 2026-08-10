export const AI_ITINERARY_JSON_SCHEMA =
{
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

            items: {
                type: "object",

                properties: {
                    dayNumber: {
                        type:
                            "integer",
                    },

                    title: {
                        type:
                            "string",
                    },

                    description: {
                        type:
                            "string",
                    },

                    activities: {
                        type:
                            "array",

                        items: {
                            type:
                                "object",

                            properties: {
                                destinationId: {
                                    type:
                                        "string",
                                },

                                destinationName: {
                                    type:
                                        "string",
                                },

                                title: {
                                    type:
                                        "string",
                                },

                                description: {
                                    type:
                                        "string",
                                },

                                startTime: {
                                    type:
                                        "string",
                                },

                                endTime: {
                                    type:
                                        "string",
                                },

                                transportMethod: {
                                    type:
                                        "string",

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

                                estimatedTravelMinutes:
                                    {
                                        type:
                                            "integer",
                                    },
                            },

                            required: [
                                "destinationId",
                                "destinationName",
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
                        type:
                            "array",

                        items: {
                            type:
                                "object",

                            properties: {
                                mealType: {
                                    type:
                                        "string",

                                    enum: [
                                        "breakfast",
                                        "lunch",
                                        "dinner",
                                        "snack",
                                    ],
                                },

                                startTime: {
                                    type:
                                        "string",
                                },

                                note: {
                                    type:
                                        "string",
                                },

                                cuisines: {
                                    type:
                                        "array",

                                    items: {
                                        type:
                                            "object",

                                        properties:
                                            {
                                                cuisineId:
                                                    {
                                                        type:
                                                            "string",
                                                    },

                                                cuisineName:
                                                    {
                                                        type:
                                                            "string",
                                                    },
                                            },

                                        required:
                                            [
                                                "cuisineId",
                                                "cuisineName",
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
        estimatedCosts: {
            type: "array",

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