import { pgEnum } from "drizzle-orm/pg-core";
import {COMMUNITY_REPORT_REASONS,COMMUNITY_REPORT_STATUSES,CONTENT_STATUSES,MEAL_TYPES,TOUR_STATUSES,
  TRANSPORT_METHODS,
} from "@/src/constants/tour_community";
export const tourStatusEnum = pgEnum("tour_status",TOUR_STATUSES,);

export const transportMethodEnum = pgEnum(
  "transport_method",
  TRANSPORT_METHODS,
);

export const mealTypeEnum = pgEnum(
  "meal_type",
  MEAL_TYPES,
);

export const socialContentStatusEnum = pgEnum(
  "social_content_status",
  CONTENT_STATUSES,
);

export const communityReportReasonEnum = pgEnum(
  "community_report_reason",
  COMMUNITY_REPORT_REASONS,
);

export const communityReportStatusEnum = pgEnum(
  "community_report_status",
  COMMUNITY_REPORT_STATUSES,
);