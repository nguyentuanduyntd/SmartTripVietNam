export const TOUR_STATUSES = ["draft", "published", "hidden"] as const;

export const TRANSPORT_METHODS = [
  "walking",
  "bicycle",
  "motobike",
  "car",
  "bus",
  "train",
  "airplane",
  "boat",
  "other",
] as const;

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

export const CONTENT_STATUSES = ["pending", "approved", "hidden"] as const;

export const COMMUNITY_REPORT_REASONS = [
  "spam",
  "harassment",
  "hate_speech",
  "inappropriate_content",
  "misinformation",
  "other",
] as const;

export const COMMUNITY_REPORT_STATUSES = ["pending", "resolved", "dismissed"] as const;

export type TourStatus = (typeof TOUR_STATUSES)[number];

export type TransportMethod = (typeof TRANSPORT_METHODS)[number];

export type MealType = (typeof MEAL_TYPES)[number];

export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export type CommunityReportReason = (typeof COMMUNITY_REPORT_REASONS)[number];

export type CommunityReportStatus = (typeof COMMUNITY_REPORT_STATUSES)[number];
