/**
 * Seed thêm địa danh (destinations) và món ăn (cuisines) cho Huế - Đà Nẵng - Hội An.
 *
 * Đây là bộ dữ liệu BỔ SUNG, không trùng slug với scripts/seed.ts (seed chính).
 * Ảnh (coverImageUrl) cố tình để NULL — sẽ cập nhật thủ công qua Admin CRUD
 * hoặc script upload Cloudinary sau.
 *
 * Yêu cầu trước khi chạy:
 * - Đã chạy `npm run db:seed` (script chính) ít nhất 1 lần, vì file này cần sẵn
 *   locations (hue/da-nang/hoi-an) và destination_categories trong DB.
 *
 * Chạy:
 *   npx tsx scripts/seed-more-destinations.ts
 *
 * Idempotent: chạy lại nhiều lần không tạo trùng lặp, nhờ onConflictDoNothing
 * theo unique constraint slug (hoặc composite key của bảng nối).
 *
 * Nguồn data: toạ độ tham khảo Google Maps, mô tả/lịch sử tự viết lại (không
 * copy nguyên văn) dựa trên thông tin công khai của các cổng du lịch chính
 * thống. Đây là dữ liệu demo phục vụ đồ án, cần rà soát lại trước khi dùng
 * cho mục đích thương mại.
 */
import "./env";

import { inArray } from "drizzle-orm";

import { db } from "../src/db";
import { destinationCategories } from "../src/db/schema/destination_categories";
import { destinations, destinationsToCategoies } from "../src/db/schema/destinations";
import { cuisines, cuisinesToDestinations } from "../src/db/schema/cuisines";
import { locations } from "../src/db/schema/locations";

// ---------------------------------------------------------------------------
// 1. DATA — chỉnh/thêm bớt trực tiếp ở đây khi cần mở rộng
// ---------------------------------------------------------------------------

type LocationSlug = "hue" | "da-nang" | "hoi-an";

type DestinationSeed = {
    slug: string;
    locationSlug: LocationSlug;
    categorySlugs: string[];
    name: string;
    nameEn: string;
    address: string;
    description: string;
    history?: string;
    latitude: number;
    longitude: number;
};

const DESTINATIONS_DATA: DestinationSeed[] = [
    // ---------------------------------------------------------------------
    // HUẾ
    // ---------------------------------------------------------------------
    {
        slug: "doi-vong-canh",
        locationSlug: "hue",
        categorySlugs: ["thien-nhien"],
        name: "Đồi Vọng Cảnh",
        nameEn: "Vong Canh Hill",
        address: "Phường Thuỷ Biều, TP. Huế",
        description:
            "Ngọn đồi thấp bên bờ sông Hương, điểm ngắm hoàng hôn và toàn cảnh lăng tẩm nổi tiếng, được nhiều nhiếp ảnh gia và du khách yêu thích.",
        history:
            "Từng được xem là một trong những vị trí phong thuỷ đẹp nhất Huế, gắn liền với nhiều lăng tẩm triều Nguyễn xung quanh.",
        latitude: 16.4302,
        longitude: 107.5478,
    },
    {
        slug: "lang-dong-khanh",
        locationSlug: "hue",
        categorySlugs: ["di-tich-lich-su"],
        name: "Lăng Đồng Khánh",
        nameEn: "Dong Khanh Tomb",
        address: "Phường Thuỷ Xuân, TP. Huế",
        description:
            "Lăng mộ vua Đồng Khánh, quy mô nhỏ hơn các lăng khác nhưng mang nét giao thoa kiến trúc Á - Âu độc đáo giai đoạn đầu thế kỷ 20.",
        history:
            "Được xây dựng và hoàn thiện qua nhiều đời vua kế tiếp (Thành Thái, Khải Định) do vua Đồng Khánh mất sớm, hoàn tất năm 1917.",
        latitude: 16.4406,
        longitude: 107.5661,
    },
    {
        slug: "cau-ngoi-thanh-toan",
        locationSlug: "hue",
        categorySlugs: ["lang-nghe", "di-tich-lich-su"],
        name: "Cầu ngói Thanh Toàn",
        nameEn: "Thanh Toan Tile-roofed Bridge",
        address: "Xã Thuỷ Thanh, TP. Huế",
        description:
            "Cây cầu gỗ mái ngói hơn 200 năm tuổi bắc qua con mương làng, gắn với đời sống nông thôn và làng nghề truyền thống vùng ven Huế.",
        history:
            "Do một người cháu gái họ Trần thuộc dòng dõi quan lại triều Lê xây dựng vào cuối thế kỷ 18 để dân làng qua lại và nghỉ chân.",
        latitude: 16.5231,
        longitude: 107.6289,
    },
    {
        slug: "bai-bien-lang-co",
        locationSlug: "hue",
        categorySlugs: ["bien"],
        name: "Bãi biển Lăng Cô",
        nameEn: "Lang Co Beach",
        address: "Thị trấn Lăng Cô, TP. Huế",
        description:
            "Vịnh biển được xem là một trong những vịnh đẹp nhất thế giới, nước trong xanh, núi non bao quanh, gần đèo Hải Vân.",
        history:
            "Được Câu lạc bộ các vịnh đẹp nhất thế giới (Worldbays Club) công nhận là thành viên chính thức năm 2009.",
        latitude: 16.2354,
        longitude: 108.0919,
    },
    {
        slug: "pha-tam-giang",
        locationSlug: "hue",
        categorySlugs: ["thien-nhien"],
        name: "Phá Tam Giang",
        nameEn: "Tam Giang Lagoon",
        address: "Huyện Quảng Điền / Phú Vang, TP. Huế",
        description:
            "Hệ đầm phá nước lợ lớn nhất Đông Nam Á, nổi tiếng với cảnh bình minh trên phá, chợ nổi và đời sống chài lưới của ngư dân địa phương.",
        latitude: 16.5871,
        longitude: 107.5087,
    },

    // ---------------------------------------------------------------------
    // ĐÀ NẴNG
    // ---------------------------------------------------------------------
    {
        slug: "ban-dao-son-tra",
        locationSlug: "da-nang",
        categorySlugs: ["thien-nhien"],
        name: "Bán đảo Sơn Trà",
        nameEn: "Son Tra Peninsula",
        address: "Quận Sơn Trà, TP. Đà Nẵng",
        description:
            "Khu bảo tồn thiên nhiên với rừng nguyên sinh, quần thể voọc chà vá chân nâu quý hiếm và các điểm ngắm toàn cảnh vịnh Đà Nẵng.",
        latitude: 16.1064,
        longitude: 108.2778,
    },
    {
        slug: "cau-vang-ba-na",
        locationSlug: "da-nang",
        categorySlugs: ["thien-nhien"],
        name: "Cầu Vàng (Bà Nà Hills)",
        nameEn: "Golden Bridge",
        address: "Khu du lịch Bà Nà Hills, TP. Đà Nẵng",
        description:
            "Cây cầu đi bộ nổi tiếng toàn cầu với hai bàn tay đá khổng lồ nâng đỡ, nằm trong quần thể du lịch Bà Nà Hills trên đỉnh núi Chúa.",
        history: "Khánh thành năm 2018, nhanh chóng trở thành biểu tượng du lịch mới của Đà Nẵng.",
        latitude: 15.9987,
        longitude: 107.9874,
    },
    {
        slug: "cho-han",
        locationSlug: "da-nang",
        categorySlugs: ["cho-mua-sam"],
        name: "Chợ Hàn",
        nameEn: "Han Market",
        address: "Quận Hải Châu, TP. Đà Nẵng",
        description:
            "Khu chợ truyền thống lâu đời gần sông Hàn, bán đặc sản khô, hải sản, vải vóc và đồ lưu niệm, điểm mua sắm quen thuộc của du khách.",
        history: "Hình thành từ thời Pháp thuộc, được xây mới năm 1989 và là một trong những chợ sầm uất nhất thành phố.",
        latitude: 16.0748,
        longitude: 108.2247,
    },
    {
        slug: "bai-bien-non-nuoc",
        locationSlug: "da-nang",
        categorySlugs: ["bien"],
        name: "Bãi biển Non Nước",
        nameEn: "Non Nuoc Beach",
        address: "Quận Ngũ Hành Sơn, TP. Đà Nẵng",
        description:
            "Bãi biển cát trắng mịn nằm dưới chân núi Ngũ Hành Sơn, nước êm và trong, thích hợp nghỉ dưỡng dài ngày.",
        latitude: 16.0021,
        longitude: 108.2618,
    },
    {
        slug: "nha-tho-con-ga",
        locationSlug: "da-nang",
        categorySlugs: ["tam-linh", "di-tich-lich-su"],
        name: "Nhà thờ Chính toà Đà Nẵng (Nhà thờ Con Gà)",
        nameEn: "Da Nang Cathedral",
        address: "Quận Hải Châu, TP. Đà Nẵng",
        description:
            "Nhà thờ Công giáo mang kiến trúc Gothic Pháp, nổi bật với tượng gà trống trên đỉnh tháp chuông dùng làm cột thu lôi và báo thời tiết.",
        history: "Được người Pháp xây dựng năm 1923, là một trong những công trình tôn giáo tiêu biểu của Đà Nẵng.",
        latitude: 16.0679,
        longitude: 108.2213,
    },

    // ---------------------------------------------------------------------
    // HỘI AN
    // ---------------------------------------------------------------------
    {
        slug: "chua-ba-mu",
        locationSlug: "hoi-an",
        categorySlugs: ["tam-linh", "di-tich-lich-su"],
        name: "Chùa Bà Mụ",
        nameEn: "Ba Mu Pagoda",
        address: "Phường Minh An, Hội An",
        description:
            "Cụm di tích cổng tam quan còn sót lại của ngôi chùa cổ, nay là không gian check-in nổi tiếng với hồ nước phản chiếu kiến trúc cổ về đêm.",
        history: "Nguyên là chùa thờ nữ thần bảo hộ sinh nở, xây dựng từ thế kỷ 17-18, được phục dựng cổng tam quan năm 2020.",
        latitude: 15.8768,
        longitude: 108.3242,
    },
    {
        slug: "nha-co-tan-ky",
        locationSlug: "hoi-an",
        categorySlugs: ["di-tich-lich-su"],
        name: "Nhà cổ Tấn Ký",
        nameEn: "Tan Ky Ancient House",
        address: "Phường Minh An, Hội An",
        description:
            "Ngôi nhà cổ hơn 200 năm tuổi tiêu biểu cho kiến trúc kết hợp phong cách Việt - Hoa - Nhật của thương cảng Hội An xưa.",
        history: "Xây dựng cuối thế kỷ 18 bởi một thương nhân người Việt gốc Hoa, được xếp hạng Di tích Quốc gia năm 1985.",
        latitude: 15.8776,
        longitude: 108.3283,
    },
    {
        slug: "hoi-quan-phuc-kien",
        locationSlug: "hoi-an",
        categorySlugs: ["tam-linh", "di-tich-lich-su"],
        name: "Hội quán Phúc Kiến",
        nameEn: "Phuc Kien Assembly Hall",
        address: "Phường Minh An, Hội An",
        description:
            "Hội quán cổ do cộng đồng người Hoa gốc Phúc Kiến xây dựng, thờ Thiên Hậu Thánh Mẫu, kiến trúc chạm khắc tinh xảo, rực rỡ sắc màu.",
        history: "Xây dựng năm 1697 làm nơi hội họp đồng hương và tín ngưỡng của thương nhân người Hoa tại Hội An.",
        latitude: 15.8759,
        longitude: 108.3296,
    },
    {
        slug: "bai-bien-an-bang",
        locationSlug: "hoi-an",
        categorySlugs: ["bien"],
        name: "Bãi biển An Bàng",
        nameEn: "An Bang Beach",
        address: "Phường Cẩm An, Hội An",
        description:
            "Bãi biển gần phố cổ với nhiều quán bar, nhà hàng ven biển phong cách bohemian, được nhiều tạp chí du lịch quốc tế đánh giá cao.",
        latitude: 15.9186,
        longitude: 108.3486,
    },
    {
        slug: "cho-dem-hoi-an",
        locationSlug: "hoi-an",
        categorySlugs: ["cho-mua-sam"],
        name: "Chợ đêm Hội An (Nguyễn Hoàng)",
        nameEn: "Hoi An Night Market",
        address: "Đường Nguyễn Hoàng, Hội An",
        description:
            "Khu chợ đêm rực rỡ đèn lồng với hàng quán ẩm thực đường phố, đồ lưu niệm và trò chơi dân gian, sầm uất nhất khi trời vừa tối.",
        latitude: 15.8791,
        longitude: 108.3268,
    },
];

type CuisineSeed = {
    slug: string;
    name: string;
    nameEn: string;
    description: string;
    avgPrice: string;
    /** Slug của destination trong DESTINATIONS_DATA ở trên (hoặc đã có sẵn từ seed chính) */
    destinationSlugs?: string[];
};

const CUISINES_DATA: CuisineSeed[] = [
    {
        slug: "banh-beo-nam-loc",
        name: "Bánh bèo, bánh nậm, bánh lọc",
        nameEn: "Hue Steamed Rice Cake Trio",
        description:
            "Bộ ba bánh cung đình Huế thu nhỏ: bánh bèo chén, bánh nậm gói lá, bánh lọc trong veo nhân tôm thịt, chấm nước mắm ớt.",
        avgPrice: "30000",
    },
    {
        slug: "nem-lui-hue",
        name: "Nem lụi Huế",
        nameEn: "Hue Grilled Lemongrass Pork Skewers",
        description:
            "Thịt heo xay ướp sả nướng trên than hoa, cuốn cùng bánh tráng, rau sống và chấm nước lèo đậu phộng sánh béo đặc trưng.",
        avgPrice: "45000",
    },
    {
        slug: "che-hue",
        name: "Chè Huế",
        nameEn: "Hue Sweet Soup (Che)",
        description:
            "Hàng chục loại chè cung đình và dân gian xứ Huế như chè hạt sen, chè bắp, chè đậu ván, thường bán theo set nhiều vị nhỏ.",
        avgPrice: "15000",
    },
    {
        slug: "goi-ca-nam-o",
        name: "Gỏi cá Nam Ô",
        nameEn: "Nam O Raw Fish Salad",
        description:
            "Đặc sản làng chài Nam Ô, cá trích tươi trộn thính, ăn kèm hàng chục loại rau rừng và nước chấm đậu phộng đặc trưng Đà Nẵng.",
        avgPrice: "70000",
    },
    {
        slug: "oc-hut-da-nang",
        name: "Ốc hút",
        nameEn: "Da Nang Sucking Snails",
        description:
            "Ốc xào sả ớt cay nồng, ăn kèm bánh tráng nướng, món ăn vặt buổi tối quen thuộc của giới trẻ Đà Nẵng.",
        avgPrice: "40000",
        destinationSlugs: ["cho-han"],
    },
    {
        slug: "banh-bao-vac",
        name: "Bánh bao bánh vạc (Bông hồng trắng)",
        nameEn: "Hoi An White Rose Dumplings",
        description:
            "Món bánh hấp nhân tôm/thịt gói tay hình bông hồng, chỉ vài nơi ở Hội An còn giữ công thức bột gia truyền.",
        avgPrice: "40000",
        destinationSlugs: ["pho-co-hoi-an"],
    },
    {
        slug: "che-bap-cam-nam",
        name: "Chè bắp Cẩm Nam",
        nameEn: "Cam Nam Corn Sweet Soup",
        description:
            "Chè nấu từ bắp nếp trồng trên cồn Cẩm Nam ven sông Thu Bồn, vị ngọt thanh tự nhiên, thường ăn nóng vào buổi tối.",
        avgPrice: "12000",
        destinationSlugs: ["cho-dem-hoi-an"],
    },
];

// ---------------------------------------------------------------------------
// 2. SEED LOGIC
// ---------------------------------------------------------------------------

async function loadLocationMap() {
    const rows = await db.select({ id: locations.id, slug: locations.slug }).from(locations);
    const map = new Map(rows.map((r) => [r.slug, r.id]));

    const neededSlugs: LocationSlug[] = ["hue", "da-nang", "hoi-an"];
    for (const slug of neededSlugs) {
        if (!map.has(slug)) {
            throw new Error(`Không tìm thấy location slug "${slug}". Hãy chạy "npm run db:seed" trước.`);
        }
    }
    return map;
}

async function loadCategoryMap() {
    const neededSlugs = Array.from(new Set(DESTINATIONS_DATA.flatMap((d) => d.categorySlugs)));
    const rows = await db
        .select({ id: destinationCategories.id, slug: destinationCategories.slug })
        .from(destinationCategories)
        .where(inArray(destinationCategories.slug, neededSlugs));

    const map = new Map(rows.map((r) => [r.slug, r.id]));
    for (const slug of neededSlugs) {
        if (!map.has(slug)) {
            throw new Error(`Không tìm thấy category slug "${slug}". Hãy chạy "npm run db:seed" trước.`);
        }
    }
    return map;
}

async function seedDestinations(locationMap: Map<string, string>, categoryMap: Map<string, string>) {
    const values = DESTINATIONS_DATA.map((d) => ({
        slug: d.slug,
        locationId: locationMap.get(d.locationSlug)!,
        name: d.name,
        nameEn: d.nameEn,
        address: d.address,
        description: d.description,
        history: d.history ?? null,
        latitude: d.latitude,
        longitude: d.longitude,
        // Ảnh để trống, cập nhật thủ công sau qua Admin CRUD.
        coverImageUrl: null,
        coverImagePublicId: null,
    }));

    await db.insert(destinations).values(values).onConflictDoNothing({ target: destinations.slug });

    const rows = await db
        .select({ id: destinations.id, slug: destinations.slug })
        .from(destinations)
        .where(
            inArray(
                destinations.slug,
                DESTINATIONS_DATA.map((d) => d.slug),
            ),
        );

    console.log(`✔ destinations (mới): ${rows.length}/${DESTINATIONS_DATA.length}`);
    const destinationMap = new Map(rows.map((r) => [r.slug, r.id]));

    const links = DESTINATIONS_DATA.flatMap((d) => {
        const destinationId = destinationMap.get(d.slug);
        if (!destinationId) return [];
        return d.categorySlugs.map((catSlug) => {
            const categoryId = categoryMap.get(catSlug);
            if (!categoryId) {
                throw new Error(`Không tìm thấy categoryId cho slug "${catSlug}"`);
            }
            return { destinationId, categoryId };
        });
    });

    if (links.length > 0) {
        await db
            .insert(destinationsToCategoies)
            .values(links)
            .onConflictDoNothing({
                target: [destinationsToCategoies.destinationId, destinationsToCategoies.categoryId],
            });
    }
    console.log(`✔ destinations_to_categories (mới): ${links.length} liên kết`);

    return destinationMap;
}

async function seedCuisines(destinationMap: Map<string, string>) {
    await db
        .insert(cuisines)
        .values(
            CUISINES_DATA.map(({ slug, name, nameEn, description, avgPrice }) => ({
                slug,
                name,
                nameEn,
                description,
                avgPrice: Number(avgPrice),
                // Ảnh để trống, cập nhật thủ công sau qua Admin CRUD.
                coverImageUrl: null,
                coverImagePublicId: null,
            })),
        )
        .onConflictDoNothing({ target: cuisines.slug });

    const rows = await db
        .select({ id: cuisines.id, slug: cuisines.slug })
        .from(cuisines)
        .where(
            inArray(
                cuisines.slug,
                CUISINES_DATA.map((c) => c.slug),
            ),
        );

    console.log(`✔ cuisines (mới): ${rows.length}/${CUISINES_DATA.length}`);
    const cuisineMap = new Map(rows.map((r) => [r.slug, r.id]));

    const links = CUISINES_DATA.flatMap((c) => {
        const cuisineId = cuisineMap.get(c.slug);
        if (!cuisineId || !c.destinationSlugs) return [];
        return c.destinationSlugs.map((destSlug) => {
            const destinationId = destinationMap.get(destSlug);
            if (!destinationId) {
                throw new Error(
                    `Không tìm thấy destinationId cho slug "${destSlug}" (kiểm tra lại DESTINATIONS_DATA hoặc seed chính).`,
                );
            }
            return { cuisineId, destinationId };
        });
    });

    if (links.length > 0) {
        await db
            .insert(cuisinesToDestinations)
            .values(links)
            .onConflictDoNothing({
                target: [cuisinesToDestinations.cuisineId, cuisinesToDestinations.destinationId],
            });
    }
    console.log(`✔ cuisines_to_destinations (mới): ${links.length} liên kết`);

    return cuisineMap;
}

async function main() {
    const locationMap = await loadLocationMap();
    const categoryMap = await loadCategoryMap();

    const destinationMap = await seedDestinations(locationMap, categoryMap);
    await seedCuisines(destinationMap);

    console.log("\nSeed thêm destinations & cuisines hoàn tất.");
    process.exit(0);
}

main().catch((error) => {
    console.error("Seed thêm destinations & cuisines thất bại:", error);
    process.exit(1);
});