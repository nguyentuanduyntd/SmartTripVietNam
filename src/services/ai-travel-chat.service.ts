import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/src/db";
import { destinations } from "@/src/db/schema/destinations";
import { locations } from "@/src/db/schema/locations";
import { generateGeminiLooseJson } from "@/src/lib/ai/gemini";

import type { AiTravelChatRequest, PlannerConversationStateInput } from "@/src/schemas/ai-travel-chat.schema";

import type {
  DestinationCardItem,
  PlannerChatStep,
  PlannerConversationState,
  SelectedDestinationItem,
  TravelChatAction,
  TravelChatIntent,
  TravelChatServerResponse,
  TravelQuickReply,
  TripSummaryInfo,
} from "@/src/components/planner/ai/chat/ai-travel-chat.types";

type StatePatch = Partial<PlannerConversationStateInput> & {
  locationName?: string;
};

type ConversationScope = "travel" | "unsupported_destination" | "off_topic";

type AiExtraction = {
  patch?: StatePatch;
  intent?: TravelChatIntent;
  scope?: ConversationScope;
  removeLodgingRequirements?: string[];
  requestedLocationName?: string;
};

export const THEME_PATTERNS: Array<{
  theme: string;
  keywords: string[];
  destinationKeywords: string[];
  excludeKeywords?: string[];
}> = [
  {
    theme: "biển",
    keywords: ["bien", "bai bien", "tam bien", "di bien", "ngam bien", "dao", "hai san ven bien", "canh bien"],
    destinationKeywords: [
      "bai bien",
      "bai tam",
      "my khe",
      "an bang",
      "non nuoc",
      "ran nam o",
      "cu lao cham",
      "ban dao son tra",
      "tam bien",
      "bo bien",
      "lan san ho",
      "dao",
      "bien",
    ],
    excludeKeywords: [
      "chua",
      "lang",
      "den",
      "thap",
      "bao tang",
      "di tich",
      "nghia trang",
      "ngu hanh son",
      "ba na",
    ],
  },
  {
    theme: "núi",
    keywords: ["nui", "leo nui", "trekking", "rung", "thac", "hang", "dong", "thien nhien", "sinh thai"],
    destinationKeywords: ["nui", "doi", "rung", "thac", "dong", "hang", "ngu hanh son", "ba na", "deo"],
  },
  {
    theme: "văn hóa",
    keywords: ["van hoa", "lich su", "di tich", "bao tang", "chua", "den", "lang", "pho co", "tam linh"],
    destinationKeywords: ["chua", "lang", "dai noi", "bao tang", "di tich", "den", "cham", "pho co", "thap", "chua cau"],
  },
  {
    theme: "ẩm thực",
    keywords: ["am thuc", "an uong", "mon ngon", "cho", "an dac san", "hai san", "food"],
    destinationKeywords: ["cho", "am thuc", "quan an", "cho han", "cho con", "dong ba", "ben thanh"],
  },
  {
    theme: "nghỉ dưỡng",
    keywords: ["nghi duong", "resort", "thu gian", "chill", "spa", "nghi ngoi"],
    destinationKeywords: ["resort", "spa", "ba na", "bai but", "suoi khoang", "khoang nong", "an bang", "my khe"],
  },
];

export function generateDestinationTags(
  dest: { name: string; description?: string | null; locationName?: string },
  theme?: string,
): string[] {
  const tags: string[] = [];
  const text = normalizeText(`${dest.name} ${dest.description || ""}`);

  if (/bien|bai bien|bai tam|my khe|an bang|non nuoc|dao|lan san ho/.test(text)) {
    tags.push("Bãi biển");
    if (/hoang hon|chieu/.test(text)) tags.push("Ngắm hoàng hôn");
    else if (/tam|boi/.test(text)) tags.push("Tắm biển");
    else tags.push("Thư giãn");
  } else if (/nui|thac|rung|hang|dong|ngu hanh son|ba na/.test(text)) {
    tags.push("Thiên nhiên");
    tags.push("Cảnh đẹp");
  } else if (/cho|am thuc|an uong|mon ngon|hai san/.test(text)) {
    tags.push("Ẩm thực");
    tags.push("Đặc sản");
  } else if (/chua|den|lang|di tich|bao tang|pho co/.test(text)) {
    tags.push("Văn hóa");
    tags.push("Lịch sử");
  }

  if (tags.length < 2 && dest.locationName) {
    tags.push(dest.locationName);
  }

  if (tags.length < 3) {
    if (/mien phi|cong cong/.test(text)) {
      tags.push("Miễn phí");
    } else if (/check in|song ao|canh dep|chup anh/.test(text)) {
      tags.push("Check-in đẹp");
    } else if (/trai nghiem|kham pha/.test(text)) {
      tags.push("Khám phá");
    } else {
      tags.push("Địa điểm nổi bật");
    }
  }

  return Array.from(new Set(tags)).slice(0, 3);
}

export async function findDestinationsByLocationAndTheme(
  locationId: string,
  theme?: string,
): Promise<DestinationCardItem[]> {
  try {
    const rows = await db
      .select({
        id: destinations.id,
        name: destinations.name,
        description: destinations.description,
        address: destinations.address,
        imageUrl: destinations.coverImageUrl,
        locationId: destinations.locationId,
        locationName: locations.name,
      })
      .from(destinations)
      .innerJoin(locations, eq(destinations.locationId, locations.id))
      .where(eq(destinations.locationId, locationId));

    if (!rows.length) {
      return [];
    }

    if (!theme) {
      return rows.slice(0, 4).map((dest) => ({
        id: dest.id,
        name: dest.name,
        locationName: dest.locationName,
        locationId: dest.locationId,
        imageUrl: dest.imageUrl ?? undefined,
        address: dest.address ?? undefined,
        description: dest.description || "Điểm đến trải nghiệm hấp dẫn tại " + dest.locationName,
        tags: generateDestinationTags(dest),
        relevanceScore: 10,
      }));
    }

    const normalizedTheme = normalizeText(theme);
    const matchedRule = THEME_PATTERNS.find(
      (rule) =>
        normalizeText(rule.theme) === normalizedTheme ||
        rule.keywords.some(
          (k) => normalizedTheme.includes(normalizeText(k)) || normalizeText(k).includes(normalizedTheme),
        ),
    );

    const isBeachTheme = normalizedTheme.includes("bien");
    const targetKeywords = matchedRule ? matchedRule.destinationKeywords : [normalizedTheme];
    const excludeKeywords = isBeachTheme
      ? (matchedRule?.excludeKeywords ?? ["chua", "lang", "den", "thap", "bao tang", "di tich", "nghia trang", "ngu hanh son", "ba na"])
      : [];

    const scored = rows
      .filter((dest) => {
        const normName = normalizeText(dest.name);
        if (excludeKeywords.some((ex) => normName.includes(ex))) {
          return false;
        }
        return true;
      })
      .map((dest) => {
        const normName = normalizeText(dest.name);
        const normDesc = normalizeText(dest.description || "");
        let score = 0;

        if (isBeachTheme) {
          if (normName.includes("bai bien") || normName.includes("bai tam")) score += 15;
          if (normName.includes("my khe") || normName.includes("an bang") || normName.includes("non nuoc")) score += 20;
        }

        for (const kw of targetKeywords) {
          const normKw = normalizeText(kw);
          if (normName.includes(normKw)) score += 8;
          if (normDesc.includes(normKw)) score += 3;
        }

        const tags = generateDestinationTags(dest, theme);

        return {
          id: dest.id,
          name: dest.name,
          locationName: dest.locationName,
          locationId: dest.locationId,
          imageUrl: dest.imageUrl ?? undefined,
          address: dest.address ?? undefined,
          description: dest.description || "Điểm đến trải nghiệm hấp dẫn tại " + dest.locationName,
          tags,
          relevanceScore: score,
        };
      });

    const themeMatches = scored.filter((item) => (item.relevanceScore ?? 0) > 0).sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));

    if (themeMatches.length > 0) {
      return themeMatches.slice(0, 4);
    }

    return scored.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0)).slice(0, 4);
  } catch (err) {
    console.warn("[AI TRAVEL CHAT] Lỗi truy vấn destinations theo theme:", err);
    return [];
  }
}

export async function findDestinationsByThemeGlobal(
  theme?: string,
): Promise<DestinationCardItem[]> {
  try {
    const rows = await db
      .select({
        id: destinations.id,
        name: destinations.name,
        description: destinations.description,
        address: destinations.address,
        imageUrl: destinations.coverImageUrl,
        locationId: destinations.locationId,
        locationName: locations.name,
      })
      .from(destinations)
      .innerJoin(locations, eq(destinations.locationId, locations.id));

    if (!rows.length) {
      return [];
    }

    if (!theme) {
      return rows.slice(0, 4).map((dest) => ({
        id: dest.id,
        name: dest.name,
        locationName: dest.locationName,
        locationId: dest.locationId,
        imageUrl: dest.imageUrl ?? undefined,
        address: dest.address ?? undefined,
        description: dest.description || "Điểm đến trải nghiệm hấp dẫn tại " + dest.locationName,
        tags: generateDestinationTags(dest),
        relevanceScore: 10,
      }));
    }

    const normalizedTheme = normalizeText(theme);
    const matchedRule = THEME_PATTERNS.find(
      (rule) =>
        normalizeText(rule.theme) === normalizedTheme ||
        rule.keywords.some(
          (k) => normalizedTheme.includes(normalizeText(k)) || normalizeText(k).includes(normalizedTheme),
        ),
    );

    const isBeachTheme = normalizedTheme.includes("bien");
    const targetKeywords = matchedRule ? matchedRule.destinationKeywords : [normalizedTheme];
    const excludeKeywords = isBeachTheme
      ? (matchedRule?.excludeKeywords ?? ["chua", "lang", "den", "thap", "bao tang", "di tich", "nghia trang", "ngu hanh son", "ba na"])
      : [];

    const scored = rows
      .filter((dest) => {
        const normName = normalizeText(dest.name);
        if (excludeKeywords.some((ex) => normName.includes(ex))) {
          return false;
        }
        return true;
      })
      .map((dest) => {
        const normName = normalizeText(dest.name);
        const normDesc = normalizeText(dest.description || "");
        let score = 0;

        if (isBeachTheme) {
          if (normName.includes("bai bien") || normName.includes("bai tam")) score += 15;
          if (normName.includes("my khe") || normName.includes("an bang") || normName.includes("non nuoc")) score += 20;
        }

        for (const kw of targetKeywords) {
          const normKw = normalizeText(kw);
          if (normName.includes(normKw)) score += 8;
          if (normDesc.includes(normKw)) score += 3;
        }

        const tags = generateDestinationTags(dest, theme);

        return {
          id: dest.id,
          name: dest.name,
          locationName: dest.locationName,
          locationId: dest.locationId,
          imageUrl: dest.imageUrl ?? undefined,
          address: dest.address ?? undefined,
          description: dest.description || "Điểm đến trải nghiệm hấp dẫn tại " + dest.locationName,
          tags,
          relevanceScore: score,
        };
      });

    const themeMatches = scored.filter((item) => (item.relevanceScore ?? 0) > 0).sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));

    if (themeMatches.length > 0) {
      return themeMatches.slice(0, 4);
    }

    return scored.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0)).slice(0, 4);
  } catch (err) {
    console.warn("[AI TRAVEL CHAT] Lỗi truy vấn destinations theo theme toàn cục:", err);
    return [];
  }
}

export function buildTripSummary(state: PlannerConversationState | PlannerConversationStateInput): TripSummaryInfo {
  const activitiesPerDay = state.activitiesPerDay ?? 3;
  const dayCount = state.dayCount ?? 1;
  const totalCapacity = dayCount * activitiesPerDay;
  const selectedCount = state.selectedDestinations?.length ?? 0;
  const freeSlots = Math.max(0, totalCapacity - selectedCount);

  return {
    destinations: state.selectedDestinations ?? [],
    dayCount,
    adultCount: state.adultCount ?? 1,
    startDate: state.startDate ?? "",
    budget: state.budget,
    activitiesPerDay,
    freeSlots,
  };
}

export async function findSingleBestDestination(params: {
  theme?: string;
  locationId?: string;
  rejectedIds?: string[];
  selectedIds?: string[];
}): Promise<DestinationCardItem | null> {
  try {
    const rejectedSet = new Set(params.rejectedIds ?? []);
    const selectedSet = new Set(params.selectedIds ?? []);

    const rows = await db
      .select({
        id: destinations.id,
        name: destinations.name,
        description: destinations.description,
        address: destinations.address,
        imageUrl: destinations.coverImageUrl,
        locationId: destinations.locationId,
        locationName: locations.name,
      })
      .from(destinations)
      .innerJoin(locations, eq(destinations.locationId, locations.id));

    if (!rows.length) {
      return null;
    }

    // Filter by locationId if provided
    let filtered = params.locationId
      ? rows.filter((r) => r.locationId === params.locationId)
      : rows;

    // Exclude rejected and already selected
    filtered = filtered.filter((r) => !rejectedSet.has(r.id) && !selectedSet.has(r.id));

    if (!filtered.length) {
      return null;
    }

    if (!params.theme) {
      const first = filtered[0];
      return {
        id: first.id,
        name: first.name,
        locationName: first.locationName,
        locationId: first.locationId,
        imageUrl: first.imageUrl ?? undefined,
        address: first.address ?? undefined,
        description: first.description || `Điểm đến trải nghiệm hấp dẫn tại ${first.locationName}`,
        tags: generateDestinationTags(first),
        relevanceScore: 10,
      };
    }

    const normalizedTheme = normalizeText(params.theme);
    const matchedRule = THEME_PATTERNS.find(
      (rule) =>
        normalizeText(rule.theme) === normalizedTheme ||
        rule.keywords.some(
          (k) => normalizedTheme.includes(normalizeText(k)) || normalizeText(k).includes(normalizedTheme),
        ),
    );

    const isBeachTheme = normalizedTheme.includes("bien");
    const targetKeywords = matchedRule ? matchedRule.destinationKeywords : [normalizedTheme];
    const excludeKeywords = isBeachTheme
      ? (matchedRule?.excludeKeywords ?? [
          "chua",
          "lang",
          "den",
          "thap",
          "bao tang",
          "di tich",
          "nghia trang",
          "ngu hanh son",
          "ba na",
          "deo",
          "hai van",
          "linh ung",
          "son tra",
        ])
      : [];

    const scored = filtered
      .filter((dest) => {
        const normName = normalizeText(dest.name);
        if (excludeKeywords.some((ex) => normName.includes(ex))) {
          return false;
        }
        return true;
      })
      .map((dest) => {
        const normName = normalizeText(dest.name);
        const normDesc = normalizeText(dest.description || "");
        let score = 0;

        if (isBeachTheme) {
          if (normName.includes("bai bien") || normName.includes("bai tam")) score += 20;
          if (normName.includes("my khe")) score += 25;
          if (normName.includes("an bang") || normName.includes("non nuoc")) score += 20;
        }

        for (const kw of targetKeywords) {
          const normKw = normalizeText(kw);
          if (normName.includes(normKw)) score += 10;
          if (normDesc.includes(normKw)) score += 4;
        }

        const tags = generateDestinationTags(dest, params.theme);

        return {
          item: {
            id: dest.id,
            name: dest.name,
            locationName: dest.locationName,
            locationId: dest.locationId,
            imageUrl: dest.imageUrl ?? undefined,
            address: dest.address ?? undefined,
            description: dest.description || `Điểm đến trải nghiệm hấp dẫn tại ${dest.locationName}`,
            tags,
            relevanceScore: score,
          },
          score,
        };
      });

    const matching = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
    if (matching.length > 0) {
      return matching[0].item;
    }

    if (scored.length > 0) {
      scored.sort((a, b) => b.score - a.score);
      return scored[0].item;
    }

    return null;
  } catch (err) {
    console.warn("[AI TRAVEL CHAT] Lỗi findSingleBestDestination:", err);
    return null;
  }
}

export async function findIndoorDestinations(locationId?: string): Promise<DestinationCardItem[]> {
  try {
    const rows = await db
      .select({
        id: destinations.id,
        name: destinations.name,
        description: destinations.description,
        address: destinations.address,
        imageUrl: destinations.coverImageUrl,
        locationId: destinations.locationId,
        locationName: locations.name,
      })
      .from(destinations)
      .innerJoin(locations, eq(destinations.locationId, locations.id));

    if (!rows.length) {
      return [];
    }

    let filtered = locationId ? rows.filter((r) => r.locationId === locationId) : rows;
    if (!filtered.length) {
      filtered = rows;
    }

    const indoorKeywords = [
      "bao tang",
      "cho",
      "am thuc",
      "cung",
      "trien lam",
      "dieu khac",
      "nghe thuat",
      "mua sam",
      "trong nha",
    ];

    const isStrictlyIndoor = (norm: string) =>
      norm.includes("bao tang") ||
      norm.includes("cho han") ||
      norm.includes("cho con") ||
      norm.includes("cho dong ba") ||
      norm.includes("cung an dinh") ||
      norm.includes("trien lam");

    const outdoorExcludePatterns = [
      "bai bien",
      "bai tam",
      "bien",
      "deo",
      "dinh ban co",
      "nui",
      "rung",
      "ran nam o",
      "thac",
      "dao",
      "ban dao",
    ];

    const scored = filtered
      .filter((dest) => {
        const normName = normalizeText(dest.name);
        if (isStrictlyIndoor(normName)) {
          return true;
        }
        if (outdoorExcludePatterns.some((ex) => normName.includes(ex))) {
          return false;
        }
        if (/\b(ho|bien|dao|deo|dinh|nui|rung|thac)\b/.test(normName) && !normName.includes("cho")) {
          return false;
        }
        return true;
      })
      .map((dest) => {
        const normName = normalizeText(dest.name);
        const normDesc = normalizeText(dest.description || "");
        let score = 0;

        if (normName.includes("bao tang dieu khac cham")) score += 50;
        if (normName.includes("cho han") || normName.includes("cho con")) score += 40;
        if (normName.includes("cung an dinh") || normName.includes("chua cau")) score += 40;

        for (const kw of indoorKeywords) {
          if (normName.includes(kw)) score += 10;
          if (normDesc.includes(kw)) score += 5;
        }

        return {
          id: dest.id,
          name: dest.name,
          locationName: dest.locationName,
          locationId: dest.locationId,
          imageUrl: dest.imageUrl ?? undefined,
          address: dest.address ?? undefined,
          description: dest.description || `Trải nghiệm trong nhà hấp dẫn tại ${dest.locationName}`,
          tags: generateDestinationTags(dest, "trong nhà"),
          relevanceScore: score,
        };
      })
      .filter((item) => (item.relevanceScore ?? 0) > 0)
      .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));

    if (scored.length > 0) {
      return scored.slice(0, 4);
    }

    return filtered.slice(0, 2).map((dest) => ({
      id: dest.id,
      name: dest.name,
      locationName: dest.locationName,
      locationId: dest.locationId,
      imageUrl: dest.imageUrl ?? undefined,
      address: dest.address ?? undefined,
      description: dest.description || `Trải nghiệm tại ${dest.locationName}`,
      tags: ["Trải nghiệm", dest.locationName],
    }));
  } catch (err) {
    console.warn("[AI TRAVEL CHAT] Lỗi findIndoorDestinations:", err);
    return [];
  }
}

const INTEREST_RULES: Array<{
  value: string;
  keywords: string[];
}> = [
  {
    value: "Biển",
    keywords: ["bien", "bai bien", "tam bien"],
  },
  {
    value: "Ẩm thực",
    keywords: ["an uong", "am thuc", "food", "hai san", "mon ngon"],
  },
  {
    value: "Văn hóa - lịch sử",
    keywords: ["van hoa", "lich su", "bao tang", "di tich"],
  },
  {
    value: "Thiên nhiên",
    keywords: ["thien nhien", "nui", "rung", "mat me", "mat ma", "thac"],
  },
  {
    value: "Tâm linh",
    keywords: ["tam linh", "chua", "den", "thien vien"],
  },
  {
    value: "Chụp ảnh",
    keywords: ["chup anh", "song ao", "check in", "check-in"],
  },
  {
    value: "Chợ - mua sắm",
    keywords: ["cho", "mua sam", "shopping"],
  },
  {
    value: "Trải nghiệm địa phương",
    keywords: ["dia phuong", "ve dem", "ban dem", "night", "chill", "local"],
  },
];

const LODGING_REQUIREMENT_RULES = [
  {
    value: "Gần biển",
    keywords: ["gan bien", "sat bien", "gan bai bien", "ven bien", "beachfront", "near beach"],
  },
  {
    value: "Yên tĩnh",
    keywords: ["yen tinh", "it on", "khong on", "quiet"],
  },
  {
    value: "View đẹp",
    keywords: ["view dep", "view bien", "view nui", "view thanh pho", "scenic view"],
  },
  {
    value: "Có chỗ đậu xe",
    keywords: ["cho dau xe", "bai dau xe", "dau o to", "parking"],
  },
  {
    value: "Có hồ bơi",
    keywords: ["ho boi", "be boi", "pool", "swimming pool"],
  },
  {
    value: "Có ăn sáng",
    keywords: ["an sang", "bao gom an sang", "breakfast"],
  },
  {
    value: "Gần trung tâm",
    keywords: ["gan trung tam", "trung tam thanh pho", "city center", "city centre"],
  },
  {
    value: "Gần khu ẩm thực",
    keywords: ["gan quan an", "gan khu an uong", "gan am thuc", "nhieu quan an"],
  },
  {
    value: "Phù hợp gia đình",
    keywords: ["gia dinh", "family friendly", "phu hop tre em"],
  },
  {
    value: "Có ban công",
    keywords: ["ban cong", "balcony"],
  },
  {
    value: "Cho phép thú cưng",
    keywords: ["thu cung", "pet friendly", "cho cho meo"],
  },
  {
    value: "Gần sân bay",
    keywords: ["gan san bay", "near airport"],
  },
];

function canonicalizeLodgingRequirement(value: string) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return "";
  }

  for (const rule of LODGING_REQUIREMENT_RULES) {
    if (
      normalizeText(rule.value) === normalized ||
      rule.keywords.some(
        (keyword) => normalized.includes(normalizeText(keyword)) || normalizeText(keyword).includes(normalized),
      )
    ) {
      return rule.value;
    }
  }

  return value.trim().slice(0, 100);
}

export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9\s./-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getVietnamToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;

  const month = parts.find((part) => part.type === "month")?.value;

  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function toIsoDate(day: number, month: number, year: number) {
  const date = new Date(Date.UTC(year, month - 1, day));

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return undefined;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDaysToIso(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function sanitizeChildAges(values: unknown[]) {
  return values
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    .map((value) => Math.trunc(value))
    .filter((value) => value >= 0 && value <= 17)
    .slice(0, 20);
}

function extractChildAgesFromMessage(normalized: string, knownChildCount: number) {
  const hasChildContext = knownChildCount > 0 || /\b(con|be|tre|tre em)\b/.test(normalized);

  if (!hasChildContext) {
    return [];
  }

  const compactPair = normalized.match(/\b(\d{1,2})\s+(?:va\s+)?(\d{1,2})\s*tuoi\b/);

  if (compactPair) {
    return sanitizeChildAges([Number(compactPair[1]), Number(compactPair[2])]);
  }

  const explicitAges = Array.from(normalized.matchAll(/\b(\d{1,2})\s*tuoi\b/g)).map((match) => Number(match[1]));

  if (explicitAges.length > 0) {
    return sanitizeChildAges(explicitAges);
  }

  const shortAges = Array.from(normalized.matchAll(/\b(?:be|con)\s+(\d{1,2})\b/g)).map((match) => Number(match[1]));

  return sanitizeChildAges(shortAges);
}

function mergeChildAges(currentAges: number[], incomingAges: number[], childCount: number) {
  if (childCount <= 0) {
    return [];
  }

  const current = sanitizeChildAges(currentAges).slice(0, childCount);

  const incoming = sanitizeChildAges(incomingAges);

  if (incoming.length === 0) {
    return current;
  }

  if (incoming.length >= childCount) {
    return incoming.slice(0, childCount);
  }

  if (childCount === 1 && current.length === 1) {
    return [incoming[0]];
  }

  if (current.length < childCount) {
    return [...current, ...incoming].slice(0, childCount);
  }

  return current;
}

function hasRecentLodgingContext(input: AiTravelChatRequest) {
  if (input.state.lodgingBudgetPerNight) {
    return true;
  }

  const recentText = (input.history ?? [])
    .slice(-6)
    .map((item) => item.content)
    .join(" ");

  const normalized = normalizeText(recentText);

  return /\b(hotel|khach san|homestay|phong|cho o|luu tru|liteapi|gia phong)\b/.test(normalized);
}

function findSupportedLocation(locationName: string, input: AiTravelChatRequest) {
  const target = normalizeText(locationName);

  if (!target) {
    return null;
  }

  return (
    input.locations.find((location) => {
      const name = normalizeText(location.name);

      const slug = normalizeText(location.slug.replace(/-/g, " "));

      return name === target || slug === target || name.includes(target) || target.includes(name);
    }) ?? null
  );
}

function supportedLocationQuickReplies(input: AiTravelChatRequest, limit = 4): TravelQuickReply[] {
  return input.locations.slice(0, limit).map((location) => ({
    label: location.name,

    value: `Tôi muốn đi ${location.name}`,

    action: "send" as const,
  }));
}

function buildSupportedLocationNames(input: AiTravelChatRequest) {
  const names = input.locations.slice(0, 8).map((location) => location.name);

  if (names.length === 0) {
    return "";
  }

  return names.join(", ");
}

function isClearlyOffTopicCasual(message: string) {
  const normalized = normalizeText(message);

  return /^(?:toi\s+)?(?:dang\s+)?(?:rat\s+|hoi\s+)?(?:buon ngu|met|met qua|chan|chan qua|buon|vui|doi bung|khat nuoc)(?:\s+qua)?$/.test(
    normalized,
  );
}

function createOffTopicResponse(input: AiTravelChatRequest): TravelChatServerResponse {
  const hasCurrentTrip = Boolean(input.state.locationId);

  return {
    state: input.state,

    reply: hasCurrentTrip
      ? "Mình chuyên hỗ trợ lên kế hoạch du lịch cho SmartTrip. Nếu câu này có liên quan đến chuyến đi, bạn có thể nói rõ hơn, ví dụ: “Tôi mệt nên ngày 2 cho lịch nhẹ hơn” hoặc “Tôi muốn nghỉ trưa nhiều hơn”."
      : "Mình là trợ lý lập kế hoạch du lịch của SmartTrip nên mình tập trung vào điểm đến, lịch trình, chỗ ở, ngân sách và thời tiết. Bạn có thể bắt đầu bằng cách nói nơi bạn muốn đi.",

    intent: "out_of_scope",

    action: "none",

    readyToGenerate: isReady(input.state),

    quickReplies: hasCurrentTrip
      ? [
          {
            label: "Lịch trình thư thả hơn",

            value: "Hãy điều chỉnh lịch trình theo nhịp thư thả hơn",

            action: "send",
          },
        ]
      : supportedLocationQuickReplies(input, 4),
  };
}

function createUnsupportedDestinationResponse(
  input: AiTravelChatRequest,
  requestedLocationName?: string,
): TravelChatServerResponse {
  const supportedNames = buildSupportedLocationNames(input);

  return {
    state: input.state,

    reply: requestedLocationName
      ? `Hiện SmartTrip AI chưa có dữ liệu RAG để lập lịch trình cho ${requestedLocationName}. Mình chỉ có thể lên plan cho các khu vực đã được hệ thống hỗ trợ${supportedNames ? `, chẳng hạn: ${supportedNames}` : ""}.`
      : `Điểm đến này hiện chưa nằm trong phạm vi dữ liệu của SmartTrip AI${supportedNames ? `. Các khu vực đang hỗ trợ gồm: ${supportedNames}` : ""}.`,

    intent: "unsupported_destination",

    action: "none",

    readyToGenerate: isReady(input.state),

    quickReplies: supportedLocationQuickReplies(input, 4),
  };
}

export function matchesDestinationName(normalizedInput: string, destName: string): boolean {
  const normDest = normalizeText(destName);
  if (!normDest) return false;
  if (normalizedInput.includes(normDest)) return true;

  const keyAliases: Record<string, string[]> = {
    "bai bien my khe": ["my khe", "bai my khe", "bien my khe"],
    "bai bien an bang": ["an bang", "bai an bang", "bien an bang"],
    "chua linh ung bai but": ["linh ung", "bai but", "chua linh ung", "son tra"],
    "danh thang ngu hanh son": ["ngu hanh son", "chua tam thai", "dong huyen khong"],
    "ba na hills": ["ba na", "bana hills", "cau vang"],
    "pho co hoi an": ["pho co", "hoi an"],
    "chua cau": ["chua cau", "cau nhat ban"],
    "dai noi hue": ["dai noi", "hoang thanh"],
    "chua thien mu": ["thien mu"],
    "cho han": ["cho han"],
    "cho con": ["cho con"],
    "cho dong ba": ["dong ba", "cho dong ba"],
  };

  const aliases = keyAliases[normDest];
  if (aliases && aliases.some((a) => normalizedInput.includes(normalizeText(a)))) {
    return true;
  }

  const stripped = normDest
    .replace(/^(?:bai bien|chua|danh thang|bao tang|pho co|lang|rung dua|lang rau|lang gom|cau ngoi|cau)\s+/, "")
    .trim();

  if (stripped.length >= 4 && normalizedInput.includes(stripped)) {
    return true;
  }

  return false;
}

function parseDeterministicPatch(message: string, input: AiTravelChatRequest): StatePatch {
  const normalized = normalizeText(message);

  const patch: StatePatch = {};

  const location = input.locations.find((item) => {
    const normalizedName = normalizeText(item.name);

    const normalizedSlug = normalizeText(item.slug.replace(/-/g, " "));

    return normalized.includes(normalizedName) || normalized.includes(normalizedSlug);
  });

  if (location) {
    patch.locationId = location.id;

    patch.locationName = location.name;
  }

  const dayMatch = normalized.match(/\b(1|2|3|4|5|6|7)\s*ngay\b/);

  if (dayMatch) {
    patch.dayCount = Number(dayMatch[1]);
  }

  const explicitChildMatch = normalized.match(/\b(\d{1,2})\s*(?:tre em|tre|be|con)\b/);

  if (explicitChildMatch) {
    patch.childCount = Math.min(Number(explicitChildMatch[1]), 20);
  }

  const hasSingularChildRelation =
    /\b(con toi|con minh|con nha toi|con nha minh|vo va con|chong va con|voi vo va con|voi chong va con|di voi con|cung con)\b/.test(
      normalized,
    );

  if (patch.childCount === undefined && hasSingularChildRelation) {
    patch.childCount = Math.max(input.state.childCount ?? 0, 1);
  }

  const explicitAdultMatch = normalized.match(/\b(\d{1,2})\s*(?:nguoi lon|ng lon)\b/);

  if (explicitAdultMatch) {
    patch.adultCount = Math.min(Math.max(Number(explicitAdultMatch[1]), 1), 20);
  }

  const peopleMatch = normalized.match(/\b(\d{1,2})\s*nguoi\b/);

  if (peopleMatch && !explicitAdultMatch) {
    const total = Math.min(Number(peopleMatch[1]), 20);

    const childCount = patch.childCount ?? input.state.childCount ?? 0;

    patch.adultCount = Math.max(1, total - childCount);
  }

  const spouseContext = /\btoi\b/.test(normalized) && /\b(vo|chong)\b/.test(normalized);

  if (spouseContext && patch.adultCount === undefined) {
    patch.adultCount = Math.max(input.state.adultCount ?? 0, 2);
  }

  const knownChildCount = patch.childCount ?? input.state.childCount ?? 0;

  const childAges = extractChildAgesFromMessage(normalized, knownChildCount);

  if (childAges.length > 0) {
    patch.childAges = childAges;
  }

  const lodgingContext = /\b(hotel|khach san|homestay|phong|cho o|luu tru|nha nghi)\b/.test(normalized);

  const hasExistingLodgingContext =
    input.state.lodgingPreference !== "any" ||
    Boolean(input.state.lodgingBudgetPerNight) ||
    (input.state.lodgingRequirements?.length ?? 0) > 0;

  const perNightContext = /\b(dem|moi dem|mot dem|night|per night)\b/.test(normalized);

  const millionMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:trieu|tr)\b/);

  const thousandMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:nghin|ngan|k)\b/);

  const parsedMoney = millionMatch
    ? Math.round(Number(millionMatch[1].replace(",", ".")) * 1_000_000)
    : thousandMatch
      ? Math.round(Number(thousandMatch[1].replace(",", ".")) * 1_000)
      : undefined;

  if (parsedMoney) {
    if ((lodgingContext || hasExistingLodgingContext) && perNightContext) {
      patch.lodgingBudgetPerNight = parsedMoney;
    } else {
      patch.budget = parsedMoney;
    }
  }

  if (/\bhomestay\b/.test(normalized)) {
    patch.lodgingPreference = "homestay";
  } else if (/\b(hotel|khach san)\b/.test(normalized)) {
    patch.lodgingPreference = "hotel";
  }

  if (lodgingContext || hasExistingLodgingContext) {
    const requirements = new Map<string, string>();

    for (const requirement of input.state.lodgingRequirements ?? []) {
      const canonical = canonicalizeLodgingRequirement(requirement);

      if (canonical) {
        requirements.set(normalizeText(canonical), canonical);
      }
    }

    for (const rule of LODGING_REQUIREMENT_RULES) {
      if (rule.keywords.some((keyword) => normalized.includes(normalizeText(keyword)))) {
        requirements.set(normalizeText(rule.value), rule.value);
      }
    }

    if (requirements.size > 0) {
      patch.lodgingRequirements = Array.from(requirements.values()).slice(0, 12);
    }
  }

  const dateMatch = normalized.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?\b/);

  if (dateMatch) {
    const today = getVietnamToday();

    const currentYear = Number(today.slice(0, 4));

    const iso = toIsoDate(
      Number(dateMatch[1]),
      Number(dateMatch[2]),
      dateMatch[3] ? Number(dateMatch[3]) : currentYear,
    );

    if (iso) {
      patch.startDate = iso;
    }
  } else if (/\b(ngay mai|mai)\b/.test(normalized)) {
    patch.startDate = addDaysToIso(getVietnamToday(), 1);
  } else if (/\bhom nay\b/.test(normalized)) {
    patch.startDate = getVietnamToday();
  }

  if (/\b(thu tha|nghi duong|cham rai|nhe nhang)\b/.test(normalized)) {
    patch.pace = "relaxed";
  } else if (/\b(di nhieu|kham pha nhieu|lich day|that nhieu diem)\b/.test(normalized)) {
    patch.pace = "packed";
  } else if (/\b(can bang|vua phai)\b/.test(normalized)) {
    patch.pace = "balanced";
  }

  const interests = new Set(input.state.interests ?? []);

  for (const rule of INTEREST_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      interests.add(rule.value);
    }
  }

  if (interests.size > 0) {
    patch.interests = Array.from(interests);
  }

  for (const rule of THEME_PATTERNS) {
    if (rule.keywords.some((k) => normalized.includes(normalizeText(k)))) {
      patch.contextTheme = rule.theme;
      break;
    }
  }

  if (/\b(canh sang|buoi sang|sang som|chi di sang)\b/.test(normalized)) {
    patch.preferredTimeSlot = "buổi sáng";
  } else if (/\b(canh trua|buoi trua|chi di trua)\b/.test(normalized)) {
    patch.preferredTimeSlot = "buổi trưa";
  } else if (/\b(buoi toi|canh toi|chieu toi|buoi chieu|chi di toi)\b/.test(normalized)) {
    patch.preferredTimeSlot = "buổi chiều - tối";
  } else if (/\b(sang va chieu|sang chieu|canh sang va chieu)\b/.test(normalized)) {
    patch.preferredTimeSlot = "sáng và chiều";
  } else if (/\b(ca ngay|ca ngay linh hoat|nguyen ngay|linh hoat|full ngay)\b/.test(normalized)) {
    patch.preferredTimeSlot = "cả ngày linh hoạt";
  }

  const activitiesMatch = normalized.match(
    /\b([1-5])\s*(?:hoat dong|activities|diem)(?:\/ngay| moi ngay| trong ngay)?\b/,
  );
  if (activitiesMatch) {
    patch.activitiesPerDay = Number(activitiesMatch[1]);
    patch.note = ((input.state.note ?? "") + " | answered_activities_per_day").trim();
  } else if (/^\s*([1-5])\s*$/.test(normalized) && input.state.currentStep === "collect_trip_details") {
    patch.activitiesPerDay = Number(normalized.trim());
    patch.note = ((input.state.note ?? "") + " | answered_activities_per_day").trim();
  }

  if (
    /\b(khong gioi han|linh hoat|tuy y|thoai mai|sao cung duoc)\b/.test(normalized) &&
    input.state.currentStep === "collect_trip_details" &&
    input.state.budget === undefined
  ) {
    patch.budget = 0;
  }

  return patch;
}

function sanitizeAiPatch(raw: unknown, input: AiTravelChatRequest): AiExtraction {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const source = raw as Record<string, unknown>;

  const rawPatch = source.patch && typeof source.patch === "object" ? (source.patch as Record<string, unknown>) : {};

  const patch: StatePatch = {};

  const requestedLocationName =
    typeof source.requestedLocationName === "string" ? source.requestedLocationName.trim().slice(0, 120) : undefined;

  const locationName = typeof rawPatch.locationName === "string" ? rawPatch.locationName.trim() : "";

  if (locationName) {
    const match = findSupportedLocation(locationName, input);

    if (match) {
      patch.locationId = match.id;

      patch.locationName = match.name;
    }
  }

  if (typeof rawPatch.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawPatch.startDate)) {
    patch.startDate = rawPatch.startDate;
  }

  for (const field of [
    "dayCount",
    "adultCount",
    "childCount",
    "roomCount",
    "budget",
    "lodgingBudgetPerNight",
  ] as const) {
    const value = rawPatch[field];

    if (typeof value === "number" && Number.isFinite(value)) {
      if (field === "dayCount" && value >= 1 && value <= 7) {
        patch.dayCount = Math.trunc(value);
      } else if (field === "adultCount" && value >= 1 && value <= 20) {
        patch.adultCount = Math.trunc(value);
      } else if (field === "childCount" && value >= 0 && value <= 20) {
        patch.childCount = Math.trunc(value);
      } else if (field === "roomCount" && value >= 1 && value <= 10) {
        patch.roomCount = Math.trunc(value);
      } else if (field === "budget" && value > 0 && value <= 1_000_000_000) {
        patch.budget = Math.trunc(value);
      } else if (field === "lodgingBudgetPerNight" && value > 0 && value <= 100_000_000) {
        patch.lodgingBudgetPerNight = Math.trunc(value);
      }
    }
  }

  if (Array.isArray(rawPatch.childAges)) {
    const childAges = sanitizeChildAges(rawPatch.childAges);

    if (childAges.length > 0) {
      patch.childAges = childAges;
    }
  }

  if (
    rawPatch.lodgingPreference === "any" ||
    rawPatch.lodgingPreference === "hotel" ||
    rawPatch.lodgingPreference === "homestay"
  ) {
    patch.lodgingPreference = rawPatch.lodgingPreference;
  }

  if (Array.isArray(rawPatch.lodgingRequirements)) {
    const requirementMap = new Map<string, string>();

    for (const value of rawPatch.lodgingRequirements) {
      if (typeof value !== "string") {
        continue;
      }

      const canonical = canonicalizeLodgingRequirement(value);

      if (!canonical) {
        continue;
      }

      requirementMap.set(normalizeText(canonical), canonical);

      if (requirementMap.size >= 12) {
        break;
      }
    }

    if (requirementMap.size > 0) {
      patch.lodgingRequirements = Array.from(requirementMap.values());
    }
  }

  if (rawPatch.pace === "relaxed" || rawPatch.pace === "balanced" || rawPatch.pace === "packed") {
    patch.pace = rawPatch.pace;
  }

  if (Array.isArray(rawPatch.interests)) {
    const values = rawPatch.interests
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim().slice(0, 100))
      .filter(Boolean)
      .slice(0, 20);

    if (values.length > 0) {
      patch.interests = values;
    }
  }

  if (typeof rawPatch.contextTheme === "string" && rawPatch.contextTheme.trim()) {
    patch.contextTheme = rawPatch.contextTheme.trim().slice(0, 100);
  }

  if (typeof rawPatch.preferredTimeSlot === "string" && rawPatch.preferredTimeSlot.trim()) {
    patch.preferredTimeSlot = rawPatch.preferredTimeSlot.trim().slice(0, 100);
  }

  if (Array.isArray(rawPatch.selectedDestinations)) {
    const validDests = (rawPatch.selectedDestinations as unknown[])
      .filter(
        (v): v is SelectedDestinationItem =>
          typeof v === "object" &&
          v !== null &&
          "destinationId" in v &&
          typeof (v as { destinationId: unknown }).destinationId === "string",
      )
      .slice(0, 20);
    if (validDests.length > 0) {
      patch.selectedDestinations = validDests;
    }
  }

  const intent =
    source.intent === "planning" ||
    source.intent === "modify_plan" ||
    source.intent === "lodging" ||
    source.intent === "weather" ||
    source.intent === "general" ||
    source.intent === "out_of_scope" ||
    source.intent === "unsupported_destination"
      ? source.intent
      : undefined;

  const scope =
    source.scope === "travel" || source.scope === "unsupported_destination" || source.scope === "off_topic"
      ? source.scope
      : undefined;

  const removeRequirementMap = new Map<string, string>();

  if (Array.isArray(source.removeLodgingRequirements)) {
    for (const value of source.removeLodgingRequirements) {
      if (typeof value !== "string") {
        continue;
      }

      const canonical = canonicalizeLodgingRequirement(value);

      if (!canonical) {
        continue;
      }

      removeRequirementMap.set(normalizeText(canonical), canonical);

      if (removeRequirementMap.size >= 12) {
        break;
      }
    }
  }

  return {
    patch,
    intent,
    scope,
    requestedLocationName,
    removeLodgingRequirements: Array.from(removeRequirementMap.values()),
  };
}

async function extractWithAi(input: AiTravelChatRequest): Promise<AiExtraction> {
  const today = getVietnamToday();

  const allowedLocations = input.locations.map((location) => `- ${location.name}`).join("\n");

  const history = (input.history ?? [])
    .slice(-8)
    .map((item) => `${item.role}: ${item.content}`)
    .join("\n");

  const prompt = `
Bạn là NLU router cho SmartTrip AI, một trợ lý CHỈ chuyên hỗ trợ lập kế hoạch du lịch trong phạm vi dữ liệu của SmartTrip.

Hôm nay tại Việt Nam: ${today}.

CÁC ĐIỂM ĐẾN SMARTTRIP ĐANG HỖ TRỢ:
${allowedLocations}

STATE HIỆN TẠI:
${JSON.stringify(input.state)}

HỘI THOẠI GẦN ĐÂY:
${history || "(không có)"}

TIN NHẮN MỚI:
${input.message}

Trả JSON duy nhất theo cấu trúc:
{
  "scope": "travel | unsupported_destination | off_topic",
  "intent": "planning | modify_plan | lodging | weather | general | out_of_scope | unsupported_destination",
  "requestedLocationName": "địa điểm user thực sự nhắc tới, kể cả ngoài danh sách; bỏ field nếu không có",
  "patch": {
    "locationName": "CHỈ tên đúng trong danh sách được hỗ trợ hoặc bỏ field",
    "startDate": "YYYY-MM-DD hoặc bỏ field",
    "dayCount": 1-7,
    "adultCount": 1-20,
    "childCount": 0-20,
    "childAges": [tuổi của từng trẻ mà user NÓI RÕ TRONG TIN NHẮN MỚI, mỗi tuổi 0-17],
    "roomCount": 1-10,
    "budget": "số VNĐ nguyên cho toàn chuyến",
    "lodgingBudgetPerNight": "số VNĐ nguyên nếu user nói rõ ngân sách phòng mỗi đêm",
    "lodgingPreference": "any | hotel | homestay",
    "lodgingRequirements": [
      "các yêu cầu riêng cho hotel/homestay, tối đa 12 mục"
    ],
    "pace": "relaxed | balanced | packed",
    "interests": [
      "các sở thích du lịch ngắn gọn bằng tiếng Việt"
    ],
    "contextTheme": "chủ đề du lịch chính: 'biển' | 'núi' | 'văn hóa' | 'ẩm thực' | 'nghỉ dưỡng'..., bỏ field nếu không có",
    "selectedDestinations": ["tên các điểm đến cụ thể user muốn đến hoặc xác nhận chọn"],
    "preferredTimeSlot": "khung giờ user muốn đi: 'buổi sáng' | 'buổi trưa' | 'buổi chiều - tối' | 'cả ngày linh hoạt' | 'sáng và chiều'..., bỏ field nếu không có"
  },
  "removeLodgingRequirements": [
    "các yêu cầu lưu trú user nói rõ muốn bỏ"
  ]
}

PHÂN LOẠI SCOPE:
1. scope="travel":
   - Lên kế hoạch chuyến đi.
   - Sửa lịch trình.
   - Điểm tham quan.
   - Ăn uống trong chuyến đi.
   - Hotel/homestay/chỗ ở.
   - Ngân sách du lịch.
   - Thời tiết liên quan chuyến đi.
   - Di chuyển/nhịp độ/sở thích du lịch.
   - Các yêu cầu cá nhân có ảnh hưởng trực tiếp tới lịch trình.
   Ví dụ: "Tôi mệt nên ngày 2 đi nhẹ thôi" vẫn là travel.

2. scope="unsupported_destination":
   - User muốn đi, tìm hotel, xem thời tiết hoặc lập lịch cho một địa điểm/quốc gia KHÔNG nằm trong danh sách hỗ trợ.
   - Ví dụ nếu "Trung Quốc", "Tokyo", "Bangkok" không có trong danh sách thì phải dùng scope này.
   - requestedLocationName phải giữ đúng nơi user nhắc tới.
   - TUYỆT ĐỐI không ánh xạ địa điểm ngoài phạm vi sang một location khác trong danh sách.

3. scope="off_topic":
   - Tin nhắn không liên quan đến việc lên kế hoạch du lịch.
   - Ví dụ: "tôi buồn ngủ", "giải bài toán này", "viết code cho tôi", "kể chuyện cười".
   - Nếu chỉ nói "tôi buồn ngủ" mà không gắn với lịch trình thì off_topic.
   - Nếu nói "tôi buồn ngủ nên buổi chiều cho tôi nghỉ" thì travel.

QUY TẮC EXTRACT CHUNG:
- Chỉ đưa field vào patch khi user nói rõ hoặc có thể suy ra chắc chắn.
- "2 người" mặc định là 2 người lớn nếu user không nói trẻ em.
- Nếu user nói tổng số người và thành phần gia đình thì phải tách adultCount/childCount đúng.
- Ví dụ "3 người, tôi đi với vợ và con" => adultCount=2, childCount=1.
- Ví dụ "tôi đi với chồng và 2 con" => adultCount=2, childCount=2.
- childAges là tuổi trẻ em user nói RÕ TRONG TIN NHẮN MỚI.
- Không copy lại childAges cũ từ STATE vào patch nếu tin nhắn mới không nhắc tuổi.
- Nếu STATE đang có childCount > 0 và user chỉ trả lời "5 tuổi" thì patch.childAges=[5].
- Nếu user nói "hai bé 5 và 8 tuổi" hoặc "2 bé 5 và 8 tuổi" thì childCount=2 và childAges=[5,8].
- Nếu user đang trả lời câu hỏi tuổi trẻ trong luồng tìm hotel thì intent vẫn phải là "lodging".
- "3 triệu" = 3000000 VNĐ.
- Nếu user nói "hotel dưới 1 triệu/đêm" thì lodgingBudgetPerNight=1000000, không ghi đè budget toàn chuyến.
- Nếu user nói rõ homestay/hotel thì ghi lodgingPreference tương ứng.
- Có thể suy ra ngày tuyệt đối từ "mai", "thứ Sáu tuần sau" dựa trên ngày hôm nay.
- locationName trong patch CHỈ được là một location có trong danh sách hỗ trợ.
- Nếu user muốn thay/sửa lịch đã có thì intent=modify_plan.
- Nếu user hỏi homestay/hotel/chỗ ở hoặc bổ sung tiêu chí cho chỗ ở thì intent=lodging.
- Nếu user hỏi mưa/nắng/dự báo cho chuyến đi thì intent=weather.
- Nếu scope=off_topic thì intent=out_of_scope.
- Nếu scope=unsupported_destination thì intent=unsupported_destination.
- contextTheme: Nếu user nhắc đến trải nghiệm như "đi biển", "tắm biển", "thích biển" thì contextTheme="biển". Nếu "leo núi", "ngắm cảnh thiên nhiên" thì contextTheme="núi". Nếu "ăn uống", "hải sản", "ẩm thực" thì contextTheme="ẩm thực".
- preferredTimeSlot: Nếu user nói về thời gian trong ngày muốn đi chơi như "canh sáng", "buổi sáng", "buổi trưa", "buổi tối", "cả ngày", "sáng và chiều" thì trích xuất tương ứng.
- selectedDestinations: Danh sách các địa điểm đến cụ thể user xác nhận muốn ghé (ví dụ: "Mỹ Khê", "Bán đảo Sơn Trà"...).

QUY TẮC RIÊNG CHO LƯU TRÚ:
- lodgingRequirements CHỈ chứa yêu cầu dành cho hotel/homestay/chỗ ở.
- Không đưa các lodgingRequirements vào interests.
- Không tự tạo requirement mà user không đề cập.

Ví dụ:
"homestay gần biển, yên tĩnh, view đẹp"
→ lodgingPreference="homestay"
→ lodgingRequirements=[
  "Gần biển",
  "Yên tĩnh",
  "View đẹp"
]
→ intent="lodging"

"hotel có hồ bơi và chỗ đậu xe"
→ lodgingPreference="hotel"
→ lodgingRequirements=[
  "Có hồ bơi",
  "Có chỗ đậu xe"
]
→ intent="lodging"

"ưu tiên gần trung tâm, có ăn sáng"
trong ngữ cảnh đang tìm chỗ ở
→ lodgingRequirements=[
  "Gần trung tâm",
  "Có ăn sáng"
]
→ intent="lodging"

Nếu STATE hiện tại đã có lodging context thì câu nối tiếp:
"thêm yêu cầu yên tĩnh và có hồ bơi"
→ lodgingRequirements=[
  "Yên tĩnh",
  "Có hồ bơi"
]
→ intent="lodging"

Nếu user nói:
"không cần gần biển nữa"
→ KHÔNG thêm "Gần biển" vào patch.lodgingRequirements
→ removeLodgingRequirements=[
  "Gần biển"
]
→ intent="lodging"

Nếu user nói:
"bỏ hồ bơi và parking"
→ removeLodgingRequirements=[
  "Có hồ bơi",
  "Có chỗ đậu xe"
]
→ intent="lodging"

- removeLodgingRequirements chỉ chứa các tiêu chí user muốn bỏ, không chứa tiêu chí mới.
- Không trả text ngoài JSON.
`.trim();

  try {
    const raw = await generateGeminiLooseJson({
      prompt,
    });

    return sanitizeAiPatch(raw, input);
  } catch (error) {
    console.warn("[AI TRAVEL CHAT] Gemini extractor lỗi, dùng deterministic fallback.", error);

    return {};
  }
}

function detectIntentFallback(message: string, hasGeneratedPlan: boolean): TravelChatIntent {
  const normalized = normalizeText(message);

  if (
    /\b(hotel|khach san|homestay|nha nghi|cho o|luu tru|phong|ho boi|be boi|bai dau xe|cho dau xe|parking|an sang|breakfast|ban cong|balcony|gan bien|sat bien|yen tinh|view dep|gan trung tam|thu cung|pet friendly)\b/.test(
      normalized,
    )
  ) {
    return "lodging";
  }

  if (/\b(thoi tiet|troi mua|mua lon|mua rao|nang nong|nang gay|troi nang|du bao|nhiet do)\b/.test(normalized)) {
    return "weather";
  }

  if (hasGeneratedPlan && /\b(doi|thay|sua|bo|them|chinh|ngay 1|ngay 2|ngay 3|lich trinh)\b/.test(normalized)) {
    return "modify_plan";
  }

  return "planning";
}

function isExplicitGenerateRequest(message: string) {
  const normalized = normalizeText(message);

  return /^(?:hay\s+)?(?:len|lap|tao|lam)\s+(?:lich|lich trinh|plan|hanh trinh)(?:\s+(?:cho toi|cho minh))?$/.test(
    normalized,
  );
}

function canUseDeterministicOnly(input: AiTravelChatRequest, patch: StatePatch) {
  const normalized = normalizeText(input.message);

  if (!normalized) {
    return false;
  }

  const requiresSemanticAi =
    /\b(hotel|khach san|homestay|nha nghi|cho o|luu tru|phong|ho boi|be boi|bai dau xe|cho dau xe|parking|an sang|breakfast|ban cong|balcony|gan bien|sat bien|yen tinh|view dep|gan trung tam|thu cung|pet friendly|thoi tiet|du bao|nhiet do|troi mua|mua lon|nang nong|nang gay|troi nang|khong can|bo|xoa|doi sang|chuyen sang|sua|thay)\b/.test(
      normalized,
    );

  if (requiresSemanticAi) {
    return false;
  }

  if (patch.locationId) {
    return true;
  }

  if (!input.state.locationId) {
    return false;
  }

  if (isExplicitGenerateRequest(input.message)) {
    return true;
  }

  const simplePatterns = [
    /^(?:toi|minh)?\s*(?:di\s*)?\d{1,2}\s*ngay$/,
    /^\d{1,2}\s*(?:nguoi|nguoi lon|tre em|tre|be|con)$/,
    /^(?:toi|minh)\s+di\s+voi\s+(?:vo|chong|con)(?:\s+va\s+(?:vo|chong|con))*$/,
    /^(?:con|be|tre|tre em)?\s*\d{1,2}\s*tuoi$/,
    /^(?:ngan sach|budget)?\s*(?:khoang|tam|duoi|toi da)?\s*\d+(?:[.,]\d+)?\s*(?:trieu|tr|nghin|ngan|k)(?:\s*(?:vnd|dong))?$/,
    /^(?:ngay\s*)?\d{1,2}[/-]\d{1,2}(?:[/-]\d{4})?$/,
    /^(?:hom nay|ngay mai|mai)$/,
    /^(?:thu tha|nghi duong|cham rai|nhe nhang|di nhieu|kham pha nhieu|lich day|that nhieu diem|can bang|vua phai)$/,
  ];

  if (simplePatterns.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  const interestOnly = INTEREST_RULES.some((rule) =>
    rule.keywords.some((keyword) => {
      const normalizedKeyword = normalizeText(keyword);

      return (
        normalized === normalizedKeyword ||
        normalized === `thich ${normalizedKeyword}` ||
        normalized === `toi thich ${normalizedKeyword}` ||
        normalized === `minh thich ${normalizedKeyword}`
      );
    }),
  );

  return interestOnly;
}

function buildDeterministicAiExtraction(input: AiTravelChatRequest): AiExtraction {
  const fallbackIntent = detectIntentFallback(input.message, input.hasGeneratedPlan ?? false);

  const intent =
    input.hasGeneratedPlan && fallbackIntent === "planning" && !isExplicitGenerateRequest(input.message)
      ? "modify_plan"
      : fallbackIntent;

  return {
    patch: {},
    scope: "travel",
    intent,
  };
}

function mergeState(
  input: AiTravelChatRequest,
  aiPatch: StatePatch,
  deterministicPatch: StatePatch,
  removeLodgingRequirements: string[] = [],
): PlannerConversationStateInput {
  const effectiveAiPatch: StatePatch = {
    ...aiPatch,
  };

  if (deterministicPatch.lodgingBudgetPerNight && deterministicPatch.budget === undefined) {
    delete effectiveAiPatch.budget;
  }

  const combinedInterests = new Set([
    ...(input.state.interests ?? []),

    ...(effectiveAiPatch.interests ?? []),

    ...(deterministicPatch.interests ?? []),
  ]);

  const lodgingRequirementMap = new Map<string, string>();

  const requirementSources = [
    ...(input.state.lodgingRequirements ?? []),

    ...(effectiveAiPatch.lodgingRequirements ?? []),

    ...(deterministicPatch.lodgingRequirements ?? []),
  ];

  for (const requirement of requirementSources) {
    const canonical = canonicalizeLodgingRequirement(requirement);

    if (!canonical) {
      continue;
    }

    lodgingRequirementMap.set(normalizeText(canonical), canonical);
  }

  for (const requirement of removeLodgingRequirements) {
    const canonical = canonicalizeLodgingRequirement(requirement);

    const target = normalizeText(canonical || requirement);

    if (!target) {
      continue;
    }

    for (const key of Array.from(lodgingRequirementMap.keys())) {
      if (key === target || key.includes(target) || target.includes(key)) {
        lodgingRequirementMap.delete(key);
      }
    }
  }

  const childCount = deterministicPatch.childCount ?? effectiveAiPatch.childCount ?? input.state.childCount ?? 0;

  const deterministicChildAges = deterministicPatch.childAges ?? [];

  const aiChildAges = effectiveAiPatch.childAges ?? [];

  const incomingChildAges = deterministicChildAges.length > 0 ? deterministicChildAges : aiChildAges;

  const childAges = mergeChildAges(input.state.childAges ?? [], incomingChildAges, childCount);

  const next: PlannerConversationStateInput = {
    ...input.state,
    ...effectiveAiPatch,
    ...deterministicPatch,

    adultCount: deterministicPatch.adultCount ?? effectiveAiPatch.adultCount ?? input.state.adultCount,

    childCount,

    childAges,

    roomCount: deterministicPatch.roomCount ?? effectiveAiPatch.roomCount ?? input.state.roomCount ?? 1,

    lodgingPreference:
      deterministicPatch.lodgingPreference ??
      effectiveAiPatch.lodgingPreference ??
      input.state.lodgingPreference ??
      "any",

    lodgingRequirements: Array.from(lodgingRequirementMap.values()).slice(0, 12),

    pace: deterministicPatch.pace ?? effectiveAiPatch.pace ?? input.state.pace ?? "balanced",

    interests: Array.from(combinedInterests),

    contextTheme: deterministicPatch.contextTheme ?? effectiveAiPatch.contextTheme ?? input.state.contextTheme,

    preferredTimeSlot:
      deterministicPatch.preferredTimeSlot ??
      effectiveAiPatch.preferredTimeSlot ??
      input.state.preferredTimeSlot,

    currentStep:
      deterministicPatch.currentStep ??
      effectiveAiPatch.currentStep ??
      input.state.currentStep ??
      "collect_experience",

    activitiesPerDay:
      deterministicPatch.activitiesPerDay ??
      effectiveAiPatch.activitiesPerDay ??
      input.state.activitiesPerDay ??
      3,

    pendingDestination:
      deterministicPatch.pendingDestination !== undefined
        ? deterministicPatch.pendingDestination
        : input.state.pendingDestination,

    rejectedDestinationIds: Array.from(
      new Set([...(input.state.rejectedDestinationIds ?? []), ...(deterministicPatch.rejectedDestinationIds ?? [])]),
    ),

    selectedDestinations:
      deterministicPatch.selectedDestinations?.length
        ? deterministicPatch.selectedDestinations
        : effectiveAiPatch.selectedDestinations?.length
          ? effectiveAiPatch.selectedDestinations
          : input.state.selectedDestinations ?? [],

    suggestedDestinations:
      deterministicPatch.suggestedDestinations?.length
        ? deterministicPatch.suggestedDestinations
        : effectiveAiPatch.suggestedDestinations?.length
          ? effectiveAiPatch.suggestedDestinations
          : input.state.suggestedDestinations ?? [],
  };

  if (next.contextTheme && !next.interests.some((i) => i.toLowerCase().includes(next.contextTheme!.toLowerCase()))) {
    next.interests.push(`Đi ${next.contextTheme}`);
  }

  if (next.childCount === 0) {
    next.childAges = [];
  }

  if (next.childAges.length > next.childCount) {
    next.childAges = next.childAges.slice(0, next.childCount);
  }

  if (next.locationId && !next.locationName) {
    const matched = input.locations.find((item) => item.id === next.locationId);
    if (matched) {
      next.locationName = matched.name;
    }
  }

  const noteParts = [input.state.note?.trim(), input.message.trim()].filter(Boolean) as string[];

  next.note = noteParts.join(" | ").slice(-4000);

  return next;
}

function isReady(state: PlannerConversationStateInput) {
  return Boolean(state.locationId && state.startDate && state.dayCount && state.adultCount);
}

export function makeNextTripDetailResponse(
  state: PlannerConversationState | PlannerConversationStateInput,
  input?: AiTravelChatRequest,
): TravelChatServerResponse {
  // Step 1: dayCount
  if (!state.dayCount) {
    return {
      state: { ...state, currentStep: "collect_trip_details" },
      reply: "Bạn dự định chuyến đi kéo dài trong mấy ngày?",
      intent: "planning",
      action: "none",
      readyToGenerate: false,
      quickReplies: [
        { label: "1 ngày", value: "1 ngày", action: "send" },
        { label: "2 ngày", value: "2 ngày", action: "send" },
        { label: "3 ngày", value: "3 ngày", action: "send" },
        { label: "4 ngày", value: "4 ngày", action: "send" },
      ],
    };
  }

  // Step 2: adultCount
  if (!state.adultCount) {
    return {
      state: { ...state, currentStep: "collect_trip_details" },
      reply: "Chuyến đi của bạn có bao nhiêu người lớn? (Nếu có trẻ em bạn hãy nói kèm độ tuổi nhé)",
      intent: "planning",
      action: "none",
      readyToGenerate: false,
      quickReplies: [
        { label: "1 người lớn", value: "1 người lớn", action: "send" },
        { label: "2 người lớn", value: "2 người lớn", action: "send" },
        { label: "4 người lớn", value: "4 người lớn", action: "send" },
        { label: "Gia đình có trẻ em", value: "Gia đình 2 người lớn và 1 trẻ em", action: "send" },
      ],
    };
  }

  // Step 3: startDate
  if (!state.startDate) {
    const tomorrow = addDaysToIso(getVietnamToday(), 1);
    const [y, m, d] = tomorrow.split("-");
    const tomorrowFormatted = `${d}/${m}/${y}`;

    return {
      state: { ...state, currentStep: "collect_trip_details" },
      reply: `Bạn dự định khởi hành vào ngày nào? (Ví dụ: “${tomorrowFormatted}”, “ngày mai” hoặc “thứ Sáu tuần sau”)`,
      intent: "planning",
      action: "none",
      readyToGenerate: false,
      quickReplies: [
        { label: "Khởi hành ngày mai", value: "Khởi hành ngày mai", action: "send" },
        { label: `Ngày ${d}/${m}`, value: `Khởi hành ngày ${tomorrowFormatted}`, action: "send" },
        { label: "Cuối tuần này", value: "Khởi hành cuối tuần này", action: "send" },
      ],
    };
  }

  // Step 4: budget
  if (state.budget === undefined) {
    return {
      state: { ...state, currentStep: "collect_trip_details" },
      reply: "Ngân sách dự kiến cho chuyến đi khoảng bao nhiêu?",
      intent: "planning",
      action: "none",
      readyToGenerate: false,
      quickReplies: [
        { label: "3 triệu", value: "Khoảng 3 triệu", action: "send" },
        { label: "5 triệu", value: "Khoảng 5 triệu", action: "send" },
        { label: "10 triệu", value: "Khoảng 10 triệu", action: "send" },
        { label: "Linh hoạt", value: "Ngân sách linh hoạt", action: "send" },
      ],
    };
  }

  // Step 5: activitiesPerDay
  if (!state.activitiesPerDay) {
    return {
      state: { ...state, currentStep: "collect_trip_details" },
      reply: "Mỗi ngày bạn muốn tham gia khoảng bao nhiêu hoạt động? (Từ 1 đến 5 hoạt động/ngày)",
      intent: "planning",
      action: "none",
      readyToGenerate: false,
      quickReplies: [
        { label: "2 hoạt động/ngày (Thư thả)", value: "2 hoạt động mỗi ngày", action: "send" },
        { label: "3 hoạt động/ngày (Cân bằng)", value: "3 hoạt động mỗi ngày", action: "send" },
        { label: "4 hoạt động/ngày (Dày đặc)", value: "4 hoạt động mỗi ngày", action: "send" },
      ],
    };
  }

  // Capacity validation: selectedDestinations.length <= dayCount * activitiesPerDay
  const activitiesPerDay = state.activitiesPerDay ?? 3;
  const dayCount = state.dayCount;
  const maxCapacity = dayCount * activitiesPerDay;
  const selectedCount = state.selectedDestinations?.length ?? 0;

  if (selectedCount > maxCapacity) {
    return {
      state: { ...state, currentStep: "collect_trip_details" },
      reply: `Bạn đã chọn ${selectedCount} địa điểm, nhưng với lịch trình ${dayCount} ngày và ${activitiesPerDay} hoạt động/ngày thì tối đa là ${maxCapacity} hoạt động. Bạn muốn tăng thêm ngày đi hay tăng số hoạt động mỗi ngày?`,
      intent: "planning",
      action: "none",
      readyToGenerate: false,
      quickReplies: [
        {
          label: `Tăng lên ${Math.ceil(selectedCount / activitiesPerDay)} ngày`,
          value: `Tôi muốn đi ${Math.ceil(selectedCount / activitiesPerDay)} ngày`,
          action: "send",
        },
        {
          label: `Tăng lên ${Math.min(5, Math.ceil(selectedCount / dayCount))} hoạt động/ngày`,
          value: `${Math.min(5, Math.ceil(selectedCount / dayCount))} hoạt động mỗi ngày`,
          action: "send",
        },
      ],
    };
  }

  // Step 6: confirm_trip_summary
  const summaryState: PlannerConversationState = {
    ...state,
    currentStep: "confirm_trip_summary",
  };

  const tripSummary = buildTripSummary(summaryState);
  const travelers = (summaryState.adultCount ?? 0) + (summaryState.childCount ?? 0);
  const freeSlotText = tripSummary.freeSlots > 0 ? `${tripSummary.freeSlots} khoảng thời gian tự do` : "kín lịch";
  const budgetText = summaryState.budget ? formatBudget(summaryState.budget) : "linh hoạt";

  const destListText =
    (summaryState.selectedDestinations ?? []).length > 0
      ? (summaryState.selectedDestinations ?? []).map((d: SelectedDestinationItem) => d.destinationName).join(", ")
      : summaryState.locationName ?? "Địa điểm đã chọn";

  const reply = `Mình đã tổng hợp đầy đủ kế hoạch chuyến đi của bạn ✨
- 📍 Điểm đến (${selectedCount}): ${destListText}
- 📅 Thời gian: ${summaryState.dayCount} ngày, khởi hành ${summaryState.startDate}
- 👥 Thành viên: ${travelers} người (${summaryState.adultCount} người lớn${summaryState.childCount > 0 ? `, ${summaryState.childCount} trẻ em` : ""})
- 💰 Ngân sách: ${budgetText}
- ⏱️ Nhịp độ: ${activitiesPerDay} hoạt động/ngày (${freeSlotText})

Bạn đã sẵn sàng để mình tạo lịch trình chi tiết chưa?`;

  return {
    state: summaryState,
    reply,
    intent: "planning",
    action: "none",
    readyToGenerate: false,
    tripSummary,
    quickReplies: [
      {
        label: "✨ Tạo lịch trình ngay",
        value: "Tạo lịch trình ngay",
        action: "generate",
      },
      {
        label: "➕ Thêm địa điểm khác",
        value: "Có, thêm địa điểm khác",
        action: "send",
      },
    ],
  };
}

function formatBudget(budget?: number) {
  if (!budget) {
    return "chưa giới hạn ngân sách";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(budget);
}

function formatLodgingRequirements(state: PlannerConversationStateInput) {
  const requirements = state.lodgingRequirements ?? [];

  if (requirements.length === 0) {
    return "";
  }

  return requirements.join(", ");
}

function buildIntentResponse(
  intent: TravelChatIntent,
  state: PlannerConversationStateInput,
  hasGeneratedPlan: boolean,
): {
  action: TravelChatAction;
  reply?: string;
  quickReplies?: TravelQuickReply[];
} | null {
  if (intent === "lodging") {
    if (!state.locationId) {
      return {
        action: "none",
        reply: "Được. Bạn muốn tìm hotel/homestay ở đâu?",
      };
    }

    if (!state.startDate || !state.dayCount || !state.adultCount) {
      const requirementLabel = formatLodgingRequirements(state);

      return {
        action: "none",
        reply: `Mình đã ghi nhận yêu cầu chỗ ở${
          requirementLabel ? `: ${requirementLabel}` : ""
        }. Để tìm giá phòng thật, mình cần ngày đi, số ngày và số người trước.`,
      };
    }

    const childCount = state.childCount ?? 0;
    const childAges = state.childAges ?? [];

    if (childCount > childAges.length) {
      const missingCount = childCount - childAges.length;

      if (childAges.length === 0) {
        return {
          action: "none",
          reply:
            childCount === 1
              ? "Mình đã biết chuyến đi có 1 trẻ em. Bé bao nhiêu tuổi để mình lấy đúng giá phòng?"
              : `Mình đã biết có ${childCount} trẻ em. Bạn cho mình tuổi của từng bé để mình lấy đúng giá phòng nhé, ví dụ: “5 và 8 tuổi”.`,
        };
      }

      const knownAges = childAges.map((age) => `${age} tuổi`).join(", ");

      return {
        action: "none",
        reply:
          missingCount === 1
            ? `Mình đã ghi nhận ${knownAges}. Còn 1 bé nữa bao nhiêu tuổi?`
            : `Mình đã ghi nhận ${knownAges}. Bạn cho mình tuổi của ${missingCount} bé còn lại nhé.`,
      };
    }

    const requirementLabel = formatLodgingRequirements(state);
    const travelerText =
      childCount > 0
        ? `${state.adultCount} người lớn + ${childCount} trẻ em (${childAges.map((age) => `${age} tuổi`).join(", ")})`
        : `${state.adultCount} người lớn`;

    const roomText = `${state.roomCount ?? 1} phòng`;

    return {
      action: "lodging_search",
      reply: state.lodgingBudgetPerNight
        ? `Mình đang tìm chỗ ở tại ${state.locationName} cho ${travelerText}, ${roomText}, với mức khoảng tối đa ${formatBudget(
            state.lodgingBudgetPerNight,
          )}/đêm${requirementLabel ? `, ưu tiên: ${requirementLabel}` : ""}.`
        : `Mình đang tìm các chỗ ở có giá thật tại ${state.locationName} cho ${travelerText}, ${roomText}${
            requirementLabel ? `, ưu tiên: ${requirementLabel}` : ""
          }. Nếu muốn giới hạn giá, bạn có thể nói “hotel dưới 1 triệu/đêm”.`,
    };
  }

  if (intent === "weather") {
    if (!state.locationId || !state.startDate) {
      return {
        action: "none",
        reply: "Được. Bạn cho mình điểm đến và ngày khởi hành để mình kiểm tra dự báo đúng thời điểm nhé.",
      };
    }

    return {
      action: "weather_check",
      reply:
        "Mình đang đối chiếu dự báo theo ngày đi. Nếu đã có lịch trình, mình sẽ cảnh báo riêng các hoạt động ngoài trời có nguy cơ mưa/gió/nắng nóng.",
    };
  }

  if (intent === "modify_plan" && hasGeneratedPlan) {
    return {
      action: "offer_regenerate",
      reply: "Mình đã cập nhật yêu cầu mới. Bạn muốn mình dựng lại lịch trình theo thay đổi này ngay không?",
      quickReplies: [
        {
          label: "✨ Cập nhật lịch trình",
          value: "",
          action: "generate",
        },
      ],
    };
  }

  return null;
}

export async function handleAiTravelChatService(input: AiTravelChatRequest): Promise<TravelChatServerResponse> {
  try {
    return await executeAiTravelChat(input);
  } catch (err: unknown) {
    const errorObj = err as { status?: number; message?: string };
    const is429 =
      errorObj?.status === 429 ||
      errorObj?.message?.includes("429") ||
      errorObj?.message?.includes("RESOURCE_EXHAUSTED") ||
      errorObj?.message?.includes("rate limit");

    if (is429) {
      console.warn("[AI TRAVEL CHAT 429 RATE LIMIT]", err);
      return {
        state: input.state,
        reply:
          "Hệ thống AI đang nhận lượng yêu cầu lớn (429 Rate Limit). Toàn bộ lựa chọn và thông tin chuyến đi của bạn vẫn được lưu nguyên vẹn, bạn vui lòng nhấn nút bên dưới để thử lại sau vài giây nhé.",
        intent: "general",
        action: "none",
        readyToGenerate: false,
        quickReplies: [
          {
            label: "🔄 Thử lại",
            value: input.message || "Thử lại",
            action: "send",
          },
        ],
      };
    }
    throw err;
  }
}

export async function handleWeatherRainAdaptation(input: AiTravelChatRequest): Promise<TravelChatServerResponse> {
  const indoorDests = await findIndoorDestinations(input.state.locationId);

  const topIndoor = indoorDests.slice(0, 2);
  const indoorSelected: SelectedDestinationItem[] = topIndoor.map((dest) => ({
    destinationId: dest.id,
    destinationName: dest.name,
    locationName: dest.locationName,
    activityType: "Khám phá trong nhà",
  }));

  const dayCount = input.state.dayCount ?? 1;

  let newSelected: SelectedDestinationItem[] = [];

  if (dayCount === 1) {
    newSelected = indoorSelected.length > 0 ? indoorSelected : input.state.selectedDestinations;
  } else {
    const outdoorDests = (input.state.selectedDestinations ?? []).filter(
      (d) => !topIndoor.some((i) => i.id === d.destinationId),
    );
    newSelected = [...indoorSelected, ...outdoorDests];
  }

  const nextLocationId = input.state.locationId || topIndoor[0]?.locationId;
  const nextLocationName = input.state.locationName || topIndoor[0]?.locationName;

  const nextState: PlannerConversationState = {
    ...input.state,
    locationId: nextLocationId,
    locationName: nextLocationName,
    contextTheme: "trải nghiệm trong nhà",
    interests: Array.from(new Set([...(input.state.interests ?? []), "Bảo tàng", "Ẩm thực trong nhà", "Chợ - mua sắm"])),
    selectedDestinations: newSelected,
    currentStep: "generate_itinerary",
    pendingDestination: undefined,
  };

  const indoorNames = topIndoor.map((d) => d.name).join(" và ");
  const replyText = indoorNames
    ? `Mình đã điều chỉnh lịch trình sang các hoạt động trong nhà để tránh ngày mưa: thay thế bằng trải nghiệm tại ${indoorNames}. Đang tự động tạo lại lịch trình mới cho bạn ngay nhé! ✨`
    : `Mình đã điều chỉnh lịch trình sang các hoạt động trải nghiệm trong nhà (bảo tàng, cafe và mua sắm đặc sản) để tránh mưa. Đang tạo lại lịch trình mới cho bạn ngay nhé! ✨`;

  console.info("[PLANNER STEP]", {
    currentStep: input.state.currentStep,
    action: "adapt_weather_rain",
    selectedDestinationId: topIndoor[0]?.id ?? null,
    geminiCallCount: 0,
    nextStep: "generate_itinerary",
  });

  return {
    state: nextState,
    reply: replyText,
    intent: "modify_plan",
    action: "generate",
    readyToGenerate: true,
    quickReplies: [],
  };
}

export async function handleWeatherReorderDays(input: AiTravelChatRequest): Promise<TravelChatServerResponse> {
  const indoorDests = await findIndoorDestinations(input.state.locationId);
  const topIndoor = indoorDests.slice(0, 1);
  const indoorItem: SelectedDestinationItem[] = topIndoor.map((dest) => ({
    destinationId: dest.id,
    destinationName: dest.name,
    locationName: dest.locationName,
    activityType: "Khám phá trong nhà",
  }));

  const outdoorDests = (input.state.selectedDestinations ?? []).filter(
    (d) => !topIndoor.some((i) => i.id === d.destinationId),
  );

  const newSelected: SelectedDestinationItem[] = [...indoorItem, ...outdoorDests];

  const nextState: PlannerConversationState = {
    ...input.state,
    contextTheme: "sắp xếp theo thời tiết (ngày mưa trong nhà, ngày nắng đi biển)",
    selectedDestinations: newSelected,
    currentStep: "generate_itinerary",
    pendingDestination: undefined,
  };

  const indoorName = topIndoor[0]?.name || "bảo tàng trong nhà";
  const outdoorName = outdoorDests[0]?.destinationName || "bãi biển";

  const replyText = `Đã sắp xếp lại thứ tự các ngày: ngày mưa ưu tiên hoạt động trong nhà (${indoorName}), ngày tạnh ráo dành cho trải nghiệm ngoài trời (${outdoorName}). Đang cập nhật lại lịch trình cho bạn ngay nhé! ✨`;

  console.info("[PLANNER STEP]", {
    currentStep: input.state.currentStep,
    action: "reorder_weather_days",
    selectedDestinationId: topIndoor[0]?.id ?? null,
    geminiCallCount: 0,
    nextStep: "generate_itinerary",
  });

  return {
    state: nextState,
    reply: replyText,
    intent: "modify_plan",
    action: "generate",
    readyToGenerate: true,
    quickReplies: [],
  };
}

export function handleWeatherKeepPlan(input: AiTravelChatRequest): TravelChatServerResponse {
  console.info("[PLANNER STEP]", {
    currentStep: input.state.currentStep,
    action: "keep_weather_plan",
    selectedDestinationId: null,
    geminiCallCount: 0,
    nextStep: input.state.currentStep,
  });

  return {
    state: input.state,
    reply:
      "Mình đã giữ nguyên lịch trình theo mong muốn của bạn. Nếu ngày đi có mưa, bạn nhớ chuẩn bị thêm ô hoặc áo mưa tiện lợi khi vui chơi ngoài trời nhé! Chúc bạn có một chuyến đi tuyệt vời ✨",
    intent: "general",
    action: "none",
    readyToGenerate: false,
    quickReplies: [],
  };
}

async function executeAiTravelChat(input: AiTravelChatRequest): Promise<TravelChatServerResponse> {
  // ── 0. Handle deterministic actionPayload from card buttons & quick actions ──
  if (input.actionPayload) {
    const { actionType, destinationId, destinationName, locationName, activityType } = input.actionPayload;

    if (actionType === "select_destination" && destinationId) {
      const currentSelected = input.state.selectedDestinations ?? [];
      const alreadyExists = currentSelected.some((d) => d.destinationId === destinationId);
      const destName = destinationName || input.state.pendingDestination?.name || "Địa điểm đã chọn";
      const locName =
        locationName ||
        input.state.pendingDestination?.locationName ||
        input.state.locationName ||
        "Việt Nam";

      const updatedSelected = alreadyExists
        ? currentSelected
        : [
            ...currentSelected,
            {
              destinationId,
              destinationName: destName,
              locationName: locName,
              activityType: activityType || "Tham quan",
            },
          ];

      const nextLocationId = input.state.locationId || input.state.pendingDestination?.locationId;
      const nextLocationName = input.state.locationName || input.state.pendingDestination?.locationName;

      const nextState: PlannerConversationState = {
        ...input.state,
        selectedDestinations: updatedSelected,
        locationId: nextLocationId,
        locationName: nextLocationName,
        currentStep: "ask_add_more",
        pendingDestination: undefined,
      };

      console.info("[PLANNER STEP]", {
        currentStep: input.state.currentStep,
        action: "select_destination",
        selectedDestinationId: destinationId,
        geminiCallCount: 0,
        nextStep: "ask_add_more",
      });

      return {
        state: nextState,
        reply: `Đã thêm ${destName} vào chuyến đi. Bạn có muốn đi thêm nơi nào hoặc trải nghiệm hoạt động nào khác không?`,
        intent: "planning",
        action: "none",
        readyToGenerate: false,
        quickReplies: [
          {
            label: "Có, thêm địa điểm khác",
            value: "Có, thêm địa điểm khác",
            action: "send",
          },
          {
            label: "Không, tiếp tục lên lịch",
            value: "Không, tiếp tục lên lịch",
            action: "send",
          },
        ],
      };
    }

    if (actionType === "reject_destination") {
      const rejectedId = destinationId || input.state.pendingDestination?.id;
      const updatedRejected = rejectedId
        ? Array.from(new Set([...(input.state.rejectedDestinationIds ?? []), rejectedId]))
        : input.state.rejectedDestinationIds ?? [];

      const nextDest = await findSingleBestDestination({
        theme: input.state.contextTheme,
        locationId: input.state.locationId,
        rejectedIds: updatedRejected,
        selectedIds: (input.state.selectedDestinations ?? []).map((d) => d.destinationId),
      });

      const nextState: PlannerConversationState = {
        ...input.state,
        rejectedDestinationIds: updatedRejected,
        pendingDestination: nextDest ?? undefined,
        currentStep: "suggest_one_destination",
      };

      console.info("[PLANNER STEP]", {
        currentStep: input.state.currentStep,
        action: "reject_destination",
        selectedDestinationId: rejectedId,
        geminiCallCount: 0,
        nextStep: "suggest_one_destination",
      });

      if (nextDest) {
        return {
          state: nextState,
          reply: "Mình gợi ý một địa điểm khác phù hợp với sở thích của bạn:",
          intent: "planning",
          action: "none",
          readyToGenerate: false,
          destinations: [nextDest],
          quickReplies: [],
        };
      } else {
        return {
          state: nextState,
          reply: `Hiện không còn địa điểm nào khác phù hợp với chủ đề ${input.state.contextTheme ?? "này"}. Bạn có muốn thử trải nghiệm khác hoặc tiếp tục với các điểm đã chọn không?`,
          intent: "planning",
          action: "none",
          readyToGenerate: false,
          quickReplies: [
            {
              label: "Thử trải nghiệm khác",
              value: "Tôi muốn thử trải nghiệm khác",
              action: "send",
            },
            {
              label: "Không thêm nữa, tiếp tục lên lịch",
              value: "Không, tiếp tục lên lịch",
              action: "send",
            },
          ],
        };
      }
    }

    if (actionType === "confirm_add_more") {
      const nextState: PlannerConversationState = {
        ...input.state,
        currentStep: "collect_experience",
        contextTheme: undefined,
        pendingDestination: undefined,
      };

      console.info("[PLANNER STEP]", {
        currentStep: input.state.currentStep,
        action: "confirm_add_more",
        selectedDestinationId: null,
        geminiCallCount: 0,
        nextStep: "collect_experience",
      });

      return {
        state: nextState,
        reply: "Bạn muốn đi thêm nơi nào hoặc trải nghiệm hoạt động nào khác tiếp theo?",
        intent: "planning",
        action: "none",
        readyToGenerate: false,
        quickReplies: [
          {
            label: "🍜 Ẩm thực",
            value: "Tôi thích trải nghiệm ẩm thực đặc sản",
            action: "send",
          },
          {
            label: "🏛️ Văn hóa - lịch sử",
            value: "Tôi thích văn hóa di tích",
            action: "send",
          },
          {
            label: "🏔️ Khám phá thiên nhiên",
            value: "Tôi thích thiên nhiên và cảnh đẹp",
            action: "send",
          },
          {
            label: "🛍️ Chợ - mua sắm",
            value: "Tôi thích dạo chợ và mua sắm",
            action: "send",
          },
        ],
      };
    }

    if (actionType === "decline_add_more") {
      const nextState: PlannerConversationState = {
        ...input.state,
        currentStep: "collect_trip_details",
        pendingDestination: undefined,
      };

      console.info("[PLANNER STEP]", {
        currentStep: input.state.currentStep,
        action: "decline_add_more",
        selectedDestinationId: null,
        geminiCallCount: 0,
        nextStep: "collect_trip_details",
      });

      return makeNextTripDetailResponse(nextState, input);
    }

    if (actionType === "confirm_summary") {
      const nextState: PlannerConversationState = {
        ...input.state,
        currentStep: "generate_itinerary",
      };

      console.info("[PLANNER STEP]", {
        currentStep: input.state.currentStep,
        action: "confirm_summary",
        selectedDestinationId: null,
        geminiCallCount: 0,
        nextStep: "generate_itinerary",
      });

      return {
        state: nextState,
        reply: "Tuyệt vời! Mình bắt đầu tạo lịch trình chi tiết cho bạn ngay bây giờ nhé ✨",
        intent: "planning",
        action: "generate",
        readyToGenerate: true,
        quickReplies: [],
      };
    }

    if (actionType === "adapt_weather_rain") {
      return handleWeatherRainAdaptation(input);
    }

    if (actionType === "reorder_weather_days") {
      return handleWeatherReorderDays(input);
    }

    if (actionType === "keep_weather_plan") {
      return handleWeatherKeepPlan(input);
    }
  }

  // ── 1. Check quick reply text triggers that match state machine actions ──
  const normalized = normalizeText(input.message);

  // Weather rain adaptation text triggers
  const isRainAdaptationIntent =
    normalized.includes("doi cac hoat dong ngay co mua sang trai nghiem trong nha") ||
    normalized.includes("doi hoat dong trong nha vi mua") ||
    normalized.includes("doi sang hoat dong trong nha") ||
    normalized.includes("doi hoat dong trong nha") ||
    normalized.includes("trai nghiem trong nha") ||
    normalized.includes("chuyen sang trong nha") ||
    normalized.includes("hoat dong trong nha vi mua") ||
    normalized.includes("hoat dong trong nha") ||
    normalized.includes("doi lich trinh vi mua") ||
    normalized.includes("doi lich trinh ngay mua") ||
    normalized.includes("tranh mua") ||
    (/\b(doi|chuyen|sang)\b/.test(normalized) && /\b(trong nha|bao tang|cafe|mua sam)\b/.test(normalized)) ||
    (/\b(mua|troi mua|ngay mua)\b/.test(normalized) && /\b(trong nha|doi|chuyen|tranh|bao tang)\b/.test(normalized));

  if (isRainAdaptationIntent) {
    return handleWeatherRainAdaptation(input);
  }

  const isRainReorderIntent =
    normalized.includes("sap xep lai thu tu cac ngay") ||
    normalized.includes("ngay nang di bien ngay mua di trong nha") ||
    normalized.includes("doi thu tu cac ngay") ||
    normalized.includes("doi thu tu ngay");

  if (isRainReorderIntent) {
    return handleWeatherReorderDays(input);
  }

  const isRainKeepIntent =
    normalized.includes("giu nguyen lich trinh") ||
    normalized.includes("giu nguyen") ||
    normalized.includes("toi van muon giu nguyen lich trinh hien tai");

  if (isRainKeepIntent) {
    return handleWeatherKeepPlan(input);
  }

  if (/^(?:co|them|them dia diem|co them dia diem khac|them diem khac|muon them)$/.test(normalized)) {
    return executeAiTravelChat({
      ...input,
      actionPayload: { actionType: "confirm_add_more" },
    });
  }

  if (
    /^(?:khong|khong them|khong tiep tuc len lich|tiep tuc len lich|tiep tuc|len lich|khong can them|du roi)$/.test(
      normalized,
    )
  ) {
    return executeAiTravelChat({
      ...input,
      actionPayload: { actionType: "decline_add_more" },
    });
  }

  if (
    input.state.currentStep === "confirm_trip_summary" &&
    /^(?:tao|len|tao lich|tao lich trinh|tao lich trinh ngay|ok|dong y|duoc|san sang|tao luon|len luon)$/.test(
      normalized,
    )
  ) {
    return executeAiTravelChat({
      ...input,
      actionPayload: { actionType: "confirm_summary" },
    });
  }

  // If in suggest_one_destination and user answers via text:
  if (input.state.currentStep === "suggest_one_destination" && input.state.pendingDestination) {
    const pending = input.state.pendingDestination;
    if (
      matchesDestinationName(normalized, pending.name) ||
      /^(?:chon|chon diem nay|chon dia diem nay|di cho nay|ok cho nay|chon no)$/.test(normalized)
    ) {
      return executeAiTravelChat({
        ...input,
        actionPayload: {
          actionType: "select_destination",
          destinationId: pending.id,
          destinationName: pending.name,
          locationName: pending.locationName,
        },
      });
    }

    if (/^(?:goi y khac|goi y diem khac|doi diem khac|dia diem khac|khong thich|diem khac)$/.test(normalized)) {
      return executeAiTravelChat({
        ...input,
        actionPayload: {
          actionType: "reject_destination",
          destinationId: pending.id,
        },
      });
    }
  }

  if (isClearlyOffTopicCasual(input.message)) {
    console.info("[AI TRAVEL CHAT SCOPE]", {
      scope: "off_topic",
      mode: "deterministic",
      message: input.message.slice(0, 120),
    });

    return createOffTopicResponse(input);
  }

  const wasReady = isReady(input.state);
  const deterministicPatch = parseDeterministicPatch(input.message, input);
  const deterministicOnly = canUseDeterministicOnly(input, deterministicPatch);

  const ai = deterministicOnly ? buildDeterministicAiExtraction(input) : await extractWithAi(input);

  if (deterministicOnly) {
    console.info("[AI TRAVEL CHAT FAST PATH]", {
      mode: "deterministic",
      patchKeys: Object.keys(deterministicPatch),
      intent: ai.intent,
      message: input.message.slice(0, 120),
    });
  }

  const hasChildAgeUpdate = (deterministicPatch.childAges?.length ?? 0) > 0 || (ai.patch?.childAges?.length ?? 0) > 0;
  const isLodgingChildAgeContinuation = hasChildAgeUpdate && hasRecentLodgingContext(input);

  const requestedSupportedLocation = ai.requestedLocationName
    ? findSupportedLocation(ai.requestedLocationName, input)
    : null;

  const hasSupportedLocationInMessage = Boolean(deterministicPatch.locationId || requestedSupportedLocation);

  if (
    ai.scope === "unsupported_destination" ||
    ai.intent === "unsupported_destination" ||
    (ai.requestedLocationName && !requestedSupportedLocation && !hasSupportedLocationInMessage)
  ) {
    console.info("[AI TRAVEL CHAT SCOPE]", {
      scope: "unsupported_destination",
      requestedLocationName: ai.requestedLocationName,
    });

    return createUnsupportedDestinationResponse(input, ai.requestedLocationName);
  }

  if ((ai.scope === "off_topic" || ai.intent === "out_of_scope") && !isLodgingChildAgeContinuation) {
    console.info("[AI TRAVEL CHAT SCOPE]", {
      scope: "off_topic",
      mode: "gemini",
    });

    return createOffTopicResponse(input);
  }

  const state = mergeState(input, ai.patch ?? {}, deterministicPatch, ai.removeLodgingRequirements ?? []);

  let intent: TravelChatIntent = ai.intent ?? detectIntentFallback(input.message, input.hasGeneratedPlan ?? false);
  if (isLodgingChildAgeContinuation) {
    intent = "lodging";
  }

  const readyToGenerate = isReady(state);

  const intentResponse = buildIntentResponse(intent, state, input.hasGeneratedPlan ?? false);
  if (intentResponse) {
    return {
      state,
      reply: intentResponse.reply ?? "Mình đã ghi nhận.",
      intent,
      action: intentResponse.action,
      readyToGenerate,
      quickReplies: intentResponse.quickReplies ?? [],
    };
  }

  // ── 2. Experience / Theme Suggestion Flow (Step: collect_experience -> suggest_one_destination) ──
  const effectiveTheme = state.contextTheme || deterministicPatch.contextTheme;

  if (effectiveTheme && (state.currentStep === "collect_experience" || !state.selectedDestinations?.length)) {
    const singleDest = await findSingleBestDestination({
      theme: effectiveTheme,
      locationId: state.locationId,
      rejectedIds: state.rejectedDestinationIds,
      selectedIds: (state.selectedDestinations ?? []).map((d) => d.destinationId),
    });

    if (singleDest) {
      const nextLocationId = state.locationId || singleDest.locationId;
      const nextLocationName = state.locationName || singleDest.locationName;

      const nextState: PlannerConversationState = {
        ...state,
        locationId: nextLocationId,
        locationName: nextLocationName,
        contextTheme: effectiveTheme,
        pendingDestination: singleDest,
        currentStep: "suggest_one_destination",
      };

      console.info("[PLANNER STEP]", {
        currentStep: "collect_experience",
        action: "suggest_one_destination",
        selectedDestinationId: singleDest.id,
        geminiCallCount: 0,
        nextStep: "suggest_one_destination",
      });

      const reply = `Dựa trên sở thích ${effectiveTheme} của bạn, mình gợi ý điểm đến nổi bật nhất này tại ${singleDest.locationName}:`;

      return {
        state: nextState,
        reply,
        message: reply,
        intent: "planning",
        action: "none",
        readyToGenerate: false,
        destinations: [singleDest],
        quickReplies: [],
      };
    }
  }

  // ── 3. Trip Details Collection Flow (Step: collect_trip_details) ──
  if (state.currentStep === "collect_trip_details" || state.selectedDestinations?.length > 0) {
    return makeNextTripDetailResponse(state, input);
  }

  // ── 4. Fallback if user hasn't chosen a theme or location yet ──
  if (!state.locationId && !state.contextTheme) {
    return {
      state,
      reply: "Bạn muốn đi đâu hoặc thích trải nghiệm theo phong cách nào? (ví dụ: đi biển, ẩm thực đặc sản, văn hóa lịch sử, khám phá thiên nhiên...)",
      intent,
      action: "none",
      readyToGenerate: false,
      quickReplies: [
        { label: "🏖️ Tôi muốn đi biển", value: "Tôi muốn đi biển", action: "send" },
        { label: "🍜 Ẩm thực đặc sản", value: "Tôi muốn thưởng thức ẩm thực", action: "send" },
        { label: "🏛️ Văn hóa - lịch sử", value: "Tôi thích văn hóa và di tích", action: "send" },
      ],
    };
  }

  return makeNextTripDetailResponse(state, input);
}
