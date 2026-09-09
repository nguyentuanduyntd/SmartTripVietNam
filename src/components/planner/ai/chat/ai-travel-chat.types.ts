import type { GeneratedItinerary, LocationOption, Pace } from "@/src/components/planner/ai/ai-planner.types";

export type LodgingPreference = "any" | "hotel" | "homestay";

export type SelectedDestinationItem = {
  destinationId: string;
  destinationName: string;
  locationName: string;
  activityType: string;
};

export type PlannerChatStep =
  | "collect_experience"
  | "suggest_one_destination"
  | "confirm_destination"
  | "ask_add_more"
  | "collect_trip_details"
  | "confirm_trip_summary"
  | "generate_itinerary";

export type TravelChatActionPayload = {
  actionType:
    | "select_destination"
    | "reject_destination"
    | "confirm_add_more"
    | "decline_add_more"
    | "confirm_summary"
    | "adapt_weather_rain"
    | "reorder_weather_days"
    | "keep_weather_plan";
  destinationId?: string;
  destinationName?: string;
  locationName?: string;
  activityType?: string;
};

export type TripSummaryInfo = {
  destinations: SelectedDestinationItem[];
  dayCount: number;
  adultCount: number;
  startDate: string;
  budget?: number;
  activitiesPerDay: number;
  freeSlots: number;
};

export type PlannerConversationState = {
  currentStep: PlannerChatStep;
  locationId?: string;
  locationName?: string;
  startDate?: string;
  dayCount?: number;
  adultCount?: number;
  childCount: number;
  childAges: number[];
  roomCount: number;
  budget?: number;
  lodgingBudgetPerNight?: number;
  lodgingPreference: LodgingPreference;
  lodgingRequirements: string[];
  pace: Pace;
  interests: string[];
  note?: string;
  contextTheme?: string;
  activitiesPerDay?: number;
  selectedDestinations: SelectedDestinationItem[];
  pendingDestination?: DestinationCardItem;
  rejectedDestinationIds: string[];
  preferredTimeSlot?: string;
  suggestedDestinations: string[];
};
export type TravelChatIntent =
  | "planning"
  | "modify_plan"
  | "lodging"
  | "weather"
  | "general"
  | "out_of_scope"
  | "unsupported_destination";

export type TravelChatAction = "none" | "generate" | "offer_regenerate" | "lodging_search" | "weather_check";

export type TravelQuickReply = {
  label: string;
  value: string;
  action: "send" | "generate";
};
export type DestinationCardItem = {
  id: string;
  name: string;
  locationName: string;
  locationId?: string;
  imageUrl?: string;
  address?: string;
  description: string;
  tags?: string[];
  relevanceScore?: number;
};

export type TravelChatServerResponse = {
  state: PlannerConversationState;
  reply: string;
  message?: string;
  intent: TravelChatIntent;
  action: TravelChatAction;
  readyToGenerate: boolean;
  quickReplies: TravelQuickReply[];
  destinations?: DestinationCardItem[];
  followUpQuestion?: string;
  tripSummary?: TripSummaryInfo;
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

  googleMapsUrl?: string;
  aiRecommended?: boolean;
  recommendationRank?: number;
  aiReason?: string;
  aiTags?: string[];
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

  nearBudgetItems?: HotelSearchItem[];

  message?: string;
  aiRecommendation?: {
    generatedBy: "gemini" | "fallback";
    summary: string;
    recommendedCount: number;
  };
};
export type TravelWeatherActivityWarning = {
  dayNumber: number;
  destinationName: string;
  title: string;
  startTime: string;
  severity: "info" | "warning" | "danger";
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
  sourceLabel: string;
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
  actionPayload?: TravelChatActionPayload;
};

type ChatMessageBase = {
  id: string;
  createdAt: number;
};

export type UserChatMessage = ChatMessageBase & {
  role: "user";
  type: "text";
  content: string;
};
export type AssistantChatMessage = ChatMessageBase & {
  role: "assistant";
  type: "text";
  content: string;
  quickReplies?: TravelQuickReply[];
  destinations?: DestinationCardItem[];
  followUpQuestion?: string;
  tripSummary?: TripSummaryInfo;
};

export type ItineraryChatMessage = ChatMessageBase & {
  role: "assistant";
  type: "itinerary";
  content: string;
  generated: GeneratedItinerary;
};
export type HotelChatMessage = ChatMessageBase & {
  role: "assistant";
  type: "hotels";
  content: string;
  result: HotelSearchResult;
};

export type WeatherChatMessage = ChatMessageBase & {
  role: "assistant";
  type: "weather";
  content: string;
  result: TravelWeatherResult;
};

export type TravelChatMessage =
  UserChatMessage | AssistantChatMessage | ItineraryChatMessage | HotelChatMessage | WeatherChatMessage;
