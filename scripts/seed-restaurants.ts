/**
 * Seed dữ liệu quán ăn DEMO cho Food Discovery.
 *
 * Chạy:
 *   npx tsx scripts/seed-restaurants.ts
 *
 * Lưu ý:
 * - Đây là dữ liệu demo phục vụ đồ án, KHÔNG phải danh bạ quán realtime.
 * - source = "demo" để UI có thể hiển thị badge DEMO DATA.
 * - Sau này Google Places có thể ghi dữ liệu source="google_places"
 *   mà không cần đổi schema/API hiện tại.
 */
import "./env";

import { inArray } from "drizzle-orm";

import { db } from "../src/db";
import { cuisines } from "../src/db/schema/cuisines";
import { locations } from "../src/db/schema/locations";
import {
    restaurants,
    restaurantsToCuisines,
    type RestaurantOpeningHours,
} from "../src/db/schema/restaurants";

const EVERY_DAY_06_22: RestaurantOpeningHours = {
    mon: ["06:00-22:00"],
    tue: ["06:00-22:00"],
    wed: ["06:00-22:00"],
    thu: ["06:00-22:00"],
    fri: ["06:00-22:00"],
    sat: ["06:00-22:00"],
    sun: ["06:00-22:00"],
};

const EVERY_DAY_10_2330: RestaurantOpeningHours = {
    mon: ["10:00-23:30"],
    tue: ["10:00-23:30"],
    wed: ["10:00-23:30"],
    thu: ["10:00-23:30"],
    fri: ["10:00-23:30"],
    sat: ["10:00-23:30"],
    sun: ["10:00-23:30"],
};

type RestaurantSeed = {
    slug: string;
    locationSlug: "hue" | "da-nang" | "hoi-an";
    cuisineSlugs: string[];
    name: string;
    description: string;
    address: string;
    latitude: number;
    longitude: number;
    priceMin: number;
    priceMax: number;
    rating: number;
    reviewCount: number;
    tags: string[];
    isOpenLate?: boolean;
    isFamilyFriendly?: boolean;
    openingHours?: RestaurantOpeningHours;
};

/**
 * Tên có prefix "SmartTrip Demo" để không gây hiểu nhầm là dữ liệu
 * doanh nghiệp đã được xác minh ngoài đời thật.
 */
const RESTAURANTS_DATA: RestaurantSeed[] = [
    // ---------------------------------------------------------------------
    // HUẾ — quanh Đại Nội / Chợ Đông Ba / trung tâm
    // ---------------------------------------------------------------------
    {
        slug: "demo-hue-bep-co-do",
        locationSlug: "hue",
        cuisineSlugs: ["bun-bo-hue", "banh-khoai"],
        name: "SmartTrip Demo · Bếp Cố Đô",
        description: "Quán demo thiên về các món Huế đậm vị, phù hợp trải nghiệm local và gia đình.",
        address: "Khu vực trung tâm Huế (dữ liệu demo)",
        latitude: 16.4708,
        longitude: 107.5812,
        priceMin: 35000,
        priceMax: 120000,
        rating: 4.6,
        reviewCount: 328,
        tags: ["local", "family", "spicy", "lunch", "dinner"],
    },
    {
        slug: "demo-hue-bun-bo-song-huong",
        locationSlug: "hue",
        cuisineSlugs: ["bun-bo-hue"],
        name: "SmartTrip Demo · Bún Bò Sông Hương",
        description: "Điểm demo chuyên bún bò Huế, giá mềm và phù hợp bữa sáng.",
        address: "Gần sông Hương, Huế (dữ liệu demo)",
        latitude: 16.4679,
        longitude: 107.5864,
        priceMin: 35000,
        priceMax: 65000,
        rating: 4.7,
        reviewCount: 512,
        tags: ["local", "budget", "breakfast", "spicy"],
    },
    {
        slug: "demo-hue-com-hen-vi-da",
        locationSlug: "hue",
        cuisineSlugs: ["com-hen"],
        name: "SmartTrip Demo · Cơm Hến Vĩ Dạ",
        description: "Quán demo cho trải nghiệm cơm hến dân dã, cay vừa và giá thấp.",
        address: "Khu Vĩ Dạ, Huế (dữ liệu demo)",
        latitude: 16.4715,
        longitude: 107.5962,
        priceMin: 20000,
        priceMax: 55000,
        rating: 4.5,
        reviewCount: 271,
        tags: ["local", "budget", "street-food", "spicy"],
    },
    {
        slug: "demo-hue-banh-khoai-dong-ba",
        locationSlug: "hue",
        cuisineSlugs: ["banh-khoai"],
        name: "SmartTrip Demo · Bánh Khoái Đông Ba",
        description: "Điểm demo gần chợ, ưu tiên bánh khoái và món ăn nhanh kiểu Huế.",
        address: "Gần Chợ Đông Ba, Huế (dữ liệu demo)",
        latitude: 16.4731,
        longitude: 107.5894,
        priceMin: 25000,
        priceMax: 85000,
        rating: 4.4,
        reviewCount: 194,
        tags: ["local", "budget", "street-food", "family"],
    },
    {
        slug: "demo-hue-quan-dem-trang-tien",
        locationSlug: "hue",
        cuisineSlugs: ["bun-bo-hue", "com-hen"],
        name: "SmartTrip Demo · Quán Đêm Tràng Tiền",
        description: "Điểm demo phục vụ muộn, phù hợp người muốn ăn sau khi dạo sông Hương.",
        address: "Khu Tràng Tiền, Huế (dữ liệu demo)",
        latitude: 16.4684,
        longitude: 107.5901,
        priceMin: 30000,
        priceMax: 100000,
        rating: 4.3,
        reviewCount: 153,
        tags: ["local", "night", "budget", "riverside"],
        isOpenLate: true,
        openingHours: EVERY_DAY_10_2330,
    },
    {
        slug: "demo-hue-gia-dinh-kim-long",
        locationSlug: "hue",
        cuisineSlugs: ["bun-bo-hue", "banh-khoai"],
        name: "SmartTrip Demo · Bếp Gia Đình Kim Long",
        description: "Không gian demo nhẹ nhàng, ưu tiên nhóm gia đình và trẻ nhỏ.",
        address: "Khu Kim Long, Huế (dữ liệu demo)",
        latitude: 16.4578,
        longitude: 107.5528,
        priceMin: 45000,
        priceMax: 150000,
        rating: 4.7,
        reviewCount: 226,
        tags: ["family", "local", "mild", "quiet"],
    },
    {
        slug: "demo-hue-an-sang-thuan-hoa",
        locationSlug: "hue",
        cuisineSlugs: ["bun-bo-hue", "com-hen"],
        name: "SmartTrip Demo · Ăn Sáng Thuận Hóa",
        description: "Quán demo bữa sáng nhanh, giá bình dân, gần khu Đại Nội.",
        address: "Thuận Hóa, Huế (dữ liệu demo)",
        latitude: 16.4743,
        longitude: 107.5742,
        priceMin: 25000,
        priceMax: 65000,
        rating: 4.4,
        reviewCount: 178,
        tags: ["breakfast", "budget", "local"],
    },
    {
        slug: "demo-hue-bep-chay-nhe",
        locationSlug: "hue",
        cuisineSlugs: ["com-hen"],
        name: "SmartTrip Demo · Bếp Nhẹ Xứ Huế",
        description: "Điểm demo vị nhẹ, có lựa chọn ít cay và phù hợp khách muốn ăn thanh đạm.",
        address: "Trung tâm Huế (dữ liệu demo)",
        latitude: 16.4663,
        longitude: 107.5796,
        priceMin: 30000,
        priceMax: 90000,
        rating: 4.5,
        reviewCount: 119,
        tags: ["mild", "family", "quiet", "vegetarian-friendly"],
    },
    {
        slug: "demo-hue-cho-dem-local",
        locationSlug: "hue",
        cuisineSlugs: ["banh-khoai", "com-hen"],
        name: "SmartTrip Demo · Góc Chợ Đêm Huế",
        description: "Mô phỏng điểm street-food phục vụ tối muộn, nhiều món nhỏ dễ thử.",
        address: "Khu chợ đêm Huế (dữ liệu demo)",
        latitude: 16.4701,
        longitude: 107.5923,
        priceMin: 20000,
        priceMax: 80000,
        rating: 4.2,
        reviewCount: 341,
        tags: ["street-food", "night", "budget", "local"],
        isOpenLate: true,
        openingHours: EVERY_DAY_10_2330,
    },
    {
        slug: "demo-hue-am-thuc-cung-dinh",
        locationSlug: "hue",
        cuisineSlugs: ["banh-khoai", "bun-bo-hue"],
        name: "SmartTrip Demo · Hương Vị Cung Đình",
        description: "Điểm demo phân khúc cao hơn, phù hợp bữa tối trải nghiệm và nhóm gia đình.",
        address: "Gần Đại Nội Huế (dữ liệu demo)",
        latitude: 16.4722,
        longitude: 107.5761,
        priceMin: 120000,
        priceMax: 320000,
        rating: 4.8,
        reviewCount: 408,
        tags: ["local", "family", "premium", "dinner"],
    },

    // ---------------------------------------------------------------------
    // ĐÀ NẴNG — quanh Cầu Rồng / Mỹ Khê
    // ---------------------------------------------------------------------
    {
        slug: "demo-da-nang-mi-quang-cau-rong",
        locationSlug: "da-nang",
        cuisineSlugs: ["mi-quang"],
        name: "SmartTrip Demo · Mì Quảng Cầu Rồng",
        description: "Quán demo món Mì Quảng gần điểm check-in trung tâm.",
        address: "Gần Cầu Rồng, Đà Nẵng (dữ liệu demo)",
        latitude: 16.0623,
        longitude: 108.2291,
        priceMin: 30000,
        priceMax: 70000,
        rating: 4.7,
        reviewCount: 611,
        tags: ["local", "budget", "breakfast", "lunch"],
    },
    {
        slug: "demo-da-nang-banh-trang-tran-thi-ly",
        locationSlug: "da-nang",
        cuisineSlugs: ["banh-trang-cuon-thit-heo"],
        name: "SmartTrip Demo · Bánh Tráng Trần Thị Lý",
        description: "Điểm demo chuyên bánh tráng cuốn thịt heo, phù hợp nhóm 2-4 người.",
        address: "Khu Trần Thị Lý, Đà Nẵng (dữ liệu demo)",
        latitude: 16.0538,
        longitude: 108.2297,
        priceMin: 60000,
        priceMax: 160000,
        rating: 4.6,
        reviewCount: 477,
        tags: ["local", "family", "lunch", "dinner"],
    },
    {
        slug: "demo-da-nang-bep-bien-my-khe",
        locationSlug: "da-nang",
        cuisineSlugs: ["mi-quang", "banh-trang-cuon-thit-heo"],
        name: "SmartTrip Demo · Bếp Biển Mỹ Khê",
        description: "Điểm demo gần biển, thích hợp ăn tối sau khi tắm biển.",
        address: "Khu Mỹ Khê, Đà Nẵng (dữ liệu demo)",
        latitude: 16.0632,
        longitude: 108.2483,
        priceMin: 70000,
        priceMax: 220000,
        rating: 4.7,
        reviewCount: 854,
        tags: ["local", "seaside", "family", "dinner"],
    },
    {
        slug: "demo-da-nang-an-dem-son-tra",
        locationSlug: "da-nang",
        cuisineSlugs: ["mi-quang"],
        name: "SmartTrip Demo · Ăn Đêm Sơn Trà",
        description: "Quán demo mở muộn, phục vụ khách đi chơi biển và cầu về đêm.",
        address: "Sơn Trà, Đà Nẵng (dữ liệu demo)",
        latitude: 16.0688,
        longitude: 108.2411,
        priceMin: 35000,
        priceMax: 100000,
        rating: 4.4,
        reviewCount: 263,
        tags: ["night", "local", "budget"],
        isOpenLate: true,
        openingHours: EVERY_DAY_10_2330,
    },
    {
        slug: "demo-da-nang-family-han-river",
        locationSlug: "da-nang",
        cuisineSlugs: ["banh-trang-cuon-thit-heo", "mi-quang"],
        name: "SmartTrip Demo · Bếp Gia Đình Sông Hàn",
        description: "Điểm demo không gian gia đình, món ít cay và dễ chọn cho trẻ nhỏ.",
        address: "Bờ sông Hàn, Đà Nẵng (dữ liệu demo)",
        latitude: 16.0662,
        longitude: 108.2248,
        priceMin: 50000,
        priceMax: 180000,
        rating: 4.8,
        reviewCount: 502,
        tags: ["family", "mild", "riverside", "local"],
    },
    {
        slug: "demo-da-nang-street-food-cham",
        locationSlug: "da-nang",
        cuisineSlugs: ["mi-quang"],
        name: "SmartTrip Demo · Góc Street Food Chăm",
        description: "Điểm demo món nhanh gần khu bảo tàng, hợp khách thích thử nhiều món nhỏ.",
        address: "Gần Bảo tàng Chăm, Đà Nẵng (dữ liệu demo)",
        latitude: 16.0594,
        longitude: 108.2221,
        priceMin: 25000,
        priceMax: 85000,
        rating: 4.3,
        reviewCount: 187,
        tags: ["street-food", "budget", "local"],
    },
    {
        slug: "demo-da-nang-local-breakfast",
        locationSlug: "da-nang",
        cuisineSlugs: ["mi-quang"],
        name: "SmartTrip Demo · Bữa Sáng Đà Thành",
        description: "Quán demo tập trung bữa sáng địa phương, phục vụ nhanh trước khi đi tham quan.",
        address: "Hải Châu, Đà Nẵng (dữ liệu demo)",
        latitude: 16.0645,
        longitude: 108.2189,
        priceMin: 25000,
        priceMax: 65000,
        rating: 4.5,
        reviewCount: 296,
        tags: ["breakfast", "local", "budget"],
    },
    {
        slug: "demo-da-nang-bep-nhe-my-khe",
        locationSlug: "da-nang",
        cuisineSlugs: ["banh-trang-cuon-thit-heo"],
        name: "SmartTrip Demo · Bếp Nhẹ Mỹ Khê",
        description: "Điểm demo ưu tiên món nhẹ, ít cay và không gian yên tĩnh.",
        address: "Mỹ An, Đà Nẵng (dữ liệu demo)",
        latitude: 16.0509,
        longitude: 108.2438,
        priceMin: 45000,
        priceMax: 140000,
        rating: 4.6,
        reviewCount: 144,
        tags: ["mild", "quiet", "family", "seaside"],
    },
    {
        slug: "demo-da-nang-night-river",
        locationSlug: "da-nang",
        cuisineSlugs: ["mi-quang", "banh-trang-cuon-thit-heo"],
        name: "SmartTrip Demo · Đêm Bên Sông Hàn",
        description: "Quán demo buổi tối, phù hợp lịch đi Cầu Rồng và dạo sông Hàn.",
        address: "Ven sông Hàn, Đà Nẵng (dữ liệu demo)",
        latitude: 16.0627,
        longitude: 108.2261,
        priceMin: 50000,
        priceMax: 160000,
        rating: 4.5,
        reviewCount: 364,
        tags: ["night", "riverside", "local", "dinner"],
        isOpenLate: true,
        openingHours: EVERY_DAY_10_2330,
    },
    {
        slug: "demo-da-nang-local-premium",
        locationSlug: "da-nang",
        cuisineSlugs: ["banh-trang-cuon-thit-heo", "mi-quang"],
        name: "SmartTrip Demo · Bếp Đà Thành Premium",
        description: "Điểm demo cho bữa tối chỉn chu, ưu tiên nhóm gia đình và trải nghiệm món địa phương.",
        address: "Trung tâm Đà Nẵng (dữ liệu demo)",
        latitude: 16.0588,
        longitude: 108.2324,
        priceMin: 110000,
        priceMax: 300000,
        rating: 4.9,
        reviewCount: 738,
        tags: ["premium", "family", "local", "dinner"],
    },

    // ---------------------------------------------------------------------
    // HỘI AN — quanh phố cổ
    // ---------------------------------------------------------------------
    {
        slug: "demo-hoi-an-cao-lau-pho-co",
        locationSlug: "hoi-an",
        cuisineSlugs: ["cao-lau"],
        name: "SmartTrip Demo · Cao Lầu Phố Cổ",
        description: "Điểm demo chuyên Cao lầu trong bán kính đi bộ khu phố cổ.",
        address: "Phố cổ Hội An (dữ liệu demo)",
        latitude: 15.8789,
        longitude: 108.3309,
        priceMin: 35000,
        priceMax: 75000,
        rating: 4.8,
        reviewCount: 903,
        tags: ["local", "walking", "budget", "lunch", "dinner"],
    },
    {
        slug: "demo-hoi-an-com-ga-pho-hoi",
        locationSlug: "hoi-an",
        cuisineSlugs: ["com-ga-hoi-an"],
        name: "SmartTrip Demo · Cơm Gà Phố Hội",
        description: "Quán demo cơm gà Hội An, phù hợp bữa trưa nhanh khi khám phá phố cổ.",
        address: "Trung tâm Hội An (dữ liệu demo)",
        latitude: 15.8796,
        longitude: 108.3343,
        priceMin: 35000,
        priceMax: 80000,
        rating: 4.7,
        reviewCount: 721,
        tags: ["local", "budget", "lunch", "family"],
    },
    {
        slug: "demo-hoi-an-banh-mi-lantern",
        locationSlug: "hoi-an",
        cuisineSlugs: ["banh-mi-hoi-an"],
        name: "SmartTrip Demo · Bánh Mì Đèn Lồng",
        description: "Điểm demo bánh mì mang đi, hợp food trail và lịch đi bộ phố cổ.",
        address: "Khu đèn lồng Hội An (dữ liệu demo)",
        latitude: 15.8777,
        longitude: 108.3338,
        priceMin: 25000,
        priceMax: 50000,
        rating: 4.8,
        reviewCount: 1084,
        tags: ["street-food", "budget", "walking", "local"],
    },
    {
        slug: "demo-hoi-an-mi-quang-cam-pho",
        locationSlug: "hoi-an",
        cuisineSlugs: ["mi-quang", "cao-lau"],
        name: "SmartTrip Demo · Mì Quảng Cẩm Phô",
        description: "Điểm demo phục vụ Mì Quảng và Cao lầu, phù hợp khách muốn so sánh hai món mì miền Trung.",
        address: "Cẩm Phô, Hội An (dữ liệu demo)",
        latitude: 15.8794,
        longitude: 108.3268,
        priceMin: 30000,
        priceMax: 90000,
        rating: 4.6,
        reviewCount: 356,
        tags: ["local", "budget", "lunch", "dinner"],
    },
    {
        slug: "demo-hoi-an-night-food-trail",
        locationSlug: "hoi-an",
        cuisineSlugs: ["banh-mi-hoi-an", "cao-lau"],
        name: "SmartTrip Demo · Food Trail Bờ Sông",
        description: "Điểm demo phục vụ tối muộn, thích hợp nối vào food trail sau khi ngắm đèn lồng.",
        address: "Ven sông Hoài, Hội An (dữ liệu demo)",
        latitude: 15.8769,
        longitude: 108.3321,
        priceMin: 30000,
        priceMax: 110000,
        rating: 4.5,
        reviewCount: 438,
        tags: ["night", "riverside", "walking", "street-food"],
        isOpenLate: true,
        openingHours: EVERY_DAY_10_2330,
    },
    {
        slug: "demo-hoi-an-family-riverside",
        locationSlug: "hoi-an",
        cuisineSlugs: ["com-ga-hoi-an", "cao-lau"],
        name: "SmartTrip Demo · Bếp Gia Đình Sông Hoài",
        description: "Điểm demo phù hợp gia đình, vị vừa và vị trí dễ đi bộ từ phố cổ.",
        address: "Gần sông Hoài, Hội An (dữ liệu demo)",
        latitude: 15.8772,
        longitude: 108.3361,
        priceMin: 50000,
        priceMax: 170000,
        rating: 4.8,
        reviewCount: 482,
        tags: ["family", "mild", "riverside", "local"],
    },
    {
        slug: "demo-hoi-an-breakfast-old-town",
        locationSlug: "hoi-an",
        cuisineSlugs: ["banh-mi-hoi-an", "com-ga-hoi-an"],
        name: "SmartTrip Demo · Sáng Phố Hội",
        description: "Quán demo cho bữa sáng gọn trước khi bắt đầu lịch tham quan Hội An.",
        address: "Phố cổ Hội An (dữ liệu demo)",
        latitude: 15.8802,
        longitude: 108.3313,
        priceMin: 25000,
        priceMax: 70000,
        rating: 4.4,
        reviewCount: 229,
        tags: ["breakfast", "budget", "walking", "local"],
    },
    {
        slug: "demo-hoi-an-tra-que-light",
        locationSlug: "hoi-an",
        cuisineSlugs: ["cao-lau", "mi-quang"],
        name: "SmartTrip Demo · Bếp Rau Trà Quế",
        description: "Điểm demo ưu tiên rau xanh, món nhẹ và không gian yên tĩnh.",
        address: "Khu Trà Quế, Hội An (dữ liệu demo)",
        latitude: 15.8987,
        longitude: 108.3395,
        priceMin: 50000,
        priceMax: 160000,
        rating: 4.7,
        reviewCount: 188,
        tags: ["quiet", "mild", "vegetarian-friendly", "family"],
    },
    {
        slug: "demo-hoi-an-street-food-market",
        locationSlug: "hoi-an",
        cuisineSlugs: ["banh-mi-hoi-an", "cao-lau", "com-ga-hoi-an"],
        name: "SmartTrip Demo · Góc Chợ Ẩm Thực Hội An",
        description: "Điểm demo street-food với nhiều món đặc trưng trong một điểm dừng.",
        address: "Khu chợ Hội An (dữ liệu demo)",
        latitude: 15.8791,
        longitude: 108.3354,
        priceMin: 20000,
        priceMax: 100000,
        rating: 4.3,
        reviewCount: 612,
        tags: ["street-food", "budget", "local", "walking"],
    },
    {
        slug: "demo-hoi-an-dinner-premium",
        locationSlug: "hoi-an",
        cuisineSlugs: ["cao-lau", "com-ga-hoi-an"],
        name: "SmartTrip Demo · Bữa Tối Phố Hội",
        description: "Điểm demo bữa tối phân khúc cao hơn, phù hợp cặp đôi hoặc gia đình muốn ngồi lâu.",
        address: "Khu phố cổ Hội An (dữ liệu demo)",
        latitude: 15.8768,
        longitude: 108.3297,
        priceMin: 120000,
        priceMax: 320000,
        rating: 4.9,
        reviewCount: 577,
        tags: ["premium", "dinner", "family", "walking"],
    },
];

async function main() {
    console.log(
        "Bắt đầu seed 30 restaurant DEMO cho SmartTrip Food Discovery...\n",
    );

    const locationSlugs = Array.from(
        new Set(
            RESTAURANTS_DATA.map(
                (item) => item.locationSlug,
            ),
        ),
    );

    const cuisineSlugs = Array.from(
        new Set(
            RESTAURANTS_DATA.flatMap(
                (item) => item.cuisineSlugs,
            ),
        ),
    );

    const locationRows = await db
        .select({
            id: locations.id,
            slug: locations.slug,
        })
        .from(locations)
        .where(
            inArray(
                locations.slug,
                locationSlugs,
            ),
        );

    const cuisineRows = await db
        .select({
            id: cuisines.id,
            slug: cuisines.slug,
        })
        .from(cuisines)
        .where(
            inArray(
                cuisines.slug,
                cuisineSlugs,
            ),
        );

    const locationMap = new Map(
        locationRows.map((row) => [
            row.slug,
            row.id,
        ]),
    );
    const cuisineMap = new Map(
        cuisineRows.map((row) => [
            row.slug,
            row.id,
        ]),
    );

    for (const slug of locationSlugs) {
        if (!locationMap.has(slug)) {
            throw new Error(
                `Không tìm thấy location slug "${slug}". Hãy chạy seed chính trước.`,
            );
        }
    }

    for (const slug of cuisineSlugs) {
        if (!cuisineMap.has(slug)) {
            throw new Error(
                `Không tìm thấy cuisine slug "${slug}". Hãy chạy seed chính trước.`,
            );
        }
    }

    await db
        .insert(restaurants)
        .values(
            RESTAURANTS_DATA.map((item) => ({
                locationId:
                    locationMap.get(
                        item.locationSlug,
                    )!,
                slug: item.slug,
                name: item.name,
                description:
                    item.description,
                address: item.address,
                latitude: item.latitude,
                longitude: item.longitude,
                priceMin: item.priceMin,
                priceMax: item.priceMax,
                rating: item.rating,
                reviewCount:
                    item.reviewCount,
                openingHours:
                    item.openingHours ??
                    EVERY_DAY_06_22,
                tags: item.tags,
                isOpenLate:
                    item.isOpenLate ??
                    false,
                isFamilyFriendly:
                    item.isFamilyFriendly ??
                    true,
                isActive: true,
                source: "demo" as const,
            })),
        )
        .onConflictDoNothing({
            target: restaurants.slug,
        });

    const restaurantRows = await db
        .select({
            id: restaurants.id,
            slug: restaurants.slug,
        })
        .from(restaurants)
        .where(
            inArray(
                restaurants.slug,
                RESTAURANTS_DATA.map(
                    (item) => item.slug,
                ),
            ),
        );

    const restaurantMap = new Map(
        restaurantRows.map((row) => [
            row.slug,
            row.id,
        ]),
    );

    const cuisineLinks =
        RESTAURANTS_DATA.flatMap(
            (restaurant) => {
                const restaurantId =
                    restaurantMap.get(
                        restaurant.slug,
                    );

                if (!restaurantId) {
                    return [];
                }

                return restaurant.cuisineSlugs.map(
                    (cuisineSlug, index) => ({
                        restaurantId,
                        cuisineId:
                            cuisineMap.get(
                                cuisineSlug,
                            )!,
                        isSignature:
                            index === 0,
                    }),
                );
            },
        );

    if (cuisineLinks.length > 0) {
        await db
            .insert(
                restaurantsToCuisines,
            )
            .values(cuisineLinks)
            .onConflictDoNothing({
                target: [
                    restaurantsToCuisines.restaurantId,
                    restaurantsToCuisines.cuisineId,
                ],
            });
    }

    console.log(
        `✔ restaurants: ${restaurantRows.length}/${RESTAURANTS_DATA.length}`,
    );
    console.log(
        `✔ restaurants_to_cuisines: ${cuisineLinks.length} liên kết`,
    );
    console.log(
        "\nSeed restaurant demo hoàn tất.",
    );

    process.exit(0);
}

main().catch((error) => {
    console.error(
        "Seed restaurant demo thất bại:",
        error,
    );
    process.exit(1);
});