import type {
    GeneratedItinerary,
    LocationOption,
    Pace,
} from "@/src/components/planner/ai/ai-planner.types";

export type LodgingPreference =
    | "any"
    | "hotel"
    | "homestay";

export type PlannerConversationState = {
    locationId?: string;
    locationName?: string;
    startDate?: string;
    dayCount?: number;
    adultCount?: number;
    childCount: number;
    roomCount: number;
    budget?: number;
    lodgingBudgetPerNight?: number;
    lodgingPreference: LodgingPreference;
    pace: Pace;
    interests: string[];
    note?: string;
};

export type TravelChatIntent =
    | "planning"
    | "modify_plan"
    | "lodging"
    | "weather"
    | "general"
    | "out_of_scope"
    | "unsupported_destination";

export type TravelChatAction =
    | "none"
    | "generate"
    | "offer_regenerate"
    | "lodging_search"
    | "weather_check";

export type TravelQuickReply = {
    label: string;
    value: string;
    action: "send" | "generate";
};

export type TravelChatServerResponse = {
    state: PlannerConversationState;
    reply: string;
    intent: TravelChatIntent;
    action: TravelChatAction;
    readyToGenerate: boolean;
    quickReplies: TravelQuickReply[];
};

export type TravelChatHistoryItem = {
    role: "user" | "assistant";
    content: string;
};

export type HotelSearchItem = {
    provider: "liteapi";
    hotelId: string;
    name: string;
    address?: string;
    imageUrl?: string;
    latitude?: number;
    longitude?: number;
    rating?: number;
    available: boolean;
    offerId?: string;
    checkInDate: string;
    checkOutDate: string;
    roomDescription?: string;
    boardName?: string;
    currency?: string;
    totalPrice?: number;
    pricePerNight?: number;
    refundable?: boolean | null;
    taxesIncluded?: boolean | null;
};

export type HotelSearchResult = {
    configured: boolean;
    provider: "liteapi";
    sourceLabel: string;
    sandbox?: boolean;
    locationName: string;
    checkInDate: string;
    checkOutDate: string;
    nights: number;
    maxPricePerNight?: number;
    items: HotelSearchItem[];
    message?: string;
};

export type TravelWeatherActivityWarning = {
    dayNumber: number;
    destinationName: string;
    title: string;
    startTime: string;
    severity:
        | "info"
        | "warning"
        | "danger";
    label: string;
    detail: string;
    temperature?: number;
    precipitationProbability?: number;
    windSpeed?: number;
};

export type TravelWeatherDay = {
    date: string;
    weatherCode?: number;
    minTemperature?: number;
    maxTemperature?: number;
    precipitationProbabilityMax?: number;
    precipitationSum?: number;
};

export type TravelWeatherResult = {
    source: "open-meteo";
    sourceLabel: "Open-Meteo";
    available: boolean;
    locationName: string;
    resolvedLocationName?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
    days: TravelWeatherDay[];
    activityWarnings: TravelWeatherActivityWarning[];
    message?: string;
};

export type TravelChatRequestBody = {
    message: string;
    state: PlannerConversationState;
    locations: LocationOption[];
    history?: TravelChatHistoryItem[];
    hasGeneratedPlan?: boolean;
};

type ChatMessageBase = {
    id: string;
    createdAt: number;
};

export type UserChatMessage =
    ChatMessageBase & {
        role: "user";
        type: "text";
        content: string;
    };

export type AssistantChatMessage =
    ChatMessageBase & {
        role: "assistant";
        type: "text";
        content: string;
        quickReplies?: TravelQuickReply[];
    };

export type ItineraryChatMessage =
    ChatMessageBase & {
        role: "assistant";
        type: "itinerary";
        content: string;
        generated: GeneratedItinerary;
    };

export type HotelChatMessage =
    ChatMessageBase & {
        role: "assistant";
        type: "hotels";
        content: string;
        result: HotelSearchResult;
    };

export type WeatherChatMessage =
    ChatMessageBase & {
        role: "assistant";
        type: "weather";
        content: string;
        result: TravelWeatherResult;
    };

export type TravelChatMessage =
    | UserChatMessage
    | AssistantChatMessage
    | ItineraryChatMessage
    | HotelChatMessage
    | WeatherChatMessage;