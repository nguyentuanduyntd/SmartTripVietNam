export const TOUR_STATUSES = [
    "draft",
    "published",
    "hidden",
] as const;

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

export const MEAL_TYPES = [
    "breakfast",
    "lunch",
    "dinner",
    "snack",
] as const;

export const CONTENT_STATUSES = [
    "pending",
    "approved",
    "hidden",
] as const;

/**
 * Lý do người dùng báo cáo bài viết / bình luận.
 *
 * Giá trị được lưu bằng tiếng Anh để ổn định ở tầng database/API.
 * UI sẽ map sang label tiếng Việt sau.
 */
export const COMMUNITY_REPORT_REASONS = [
    "spam",
    "harassment",
    "hate_speech",
    "inappropriate_content",
    "misinformation",
    "other",
] as const;

/**
 * Trạng thái xử lý một báo cáo.
 *
 * pending   : Chưa được admin xử lý.
 * resolved  : Admin xác nhận có vấn đề và đã xử lý.
 * dismissed : Admin kiểm tra nhưng không xác định vi phạm.
 */
export const COMMUNITY_REPORT_STATUSES = [
    "pending",
    "resolved",
    "dismissed",
] as const;

export type TourStatus = (typeof TOUR_STATUSES)[number];

export type TransportMethod = (typeof TRANSPORT_METHODS)[number];

export type MealType = (typeof MEAL_TYPES)[number];

export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export type CommunityReportReason =
    (typeof COMMUNITY_REPORT_REASONS)[number];

export type CommunityReportStatus =
    (typeof COMMUNITY_REPORT_STATUSES)[number];