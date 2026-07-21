/**
 * Script seed data mẫu cho Huế - Đà Nẵng - Hội An.
 *
 * Chạy: npm run db:seed
 *
 * Idempotent: chạy lại nhiều lần không tạo trùng lặp, nhờ onConflictDoNothing
 * theo unique constraint (slug, hoặc composite key của bảng nối).
 *
 * Thứ tự insert BẮT BUỘC theo khoá ngoại:
 *   locations -> destination_categories -> destinations
 *   -> destinations_to_categories -> cuisines -> cuisines_to_destinations
 *
 * Nguồn data: toạ độ lấy từ Google Maps (chính xác), mô tả/lịch sử tự viết lại
 * (không copy nguyên văn) dựa trên thông tin công khai của các cổng du lịch
 * chính thống (Trung tâm Bảo tồn Di tích Cố đô Huế, Sở Du lịch Đà Nẵng,
 * Trung tâm QLBT Di sản Văn hoá Hội An). Giá món ăn (avgPrice) là giá tham
 * khảo, cần cập nhật định kỳ như README đã nêu rõ.
 */
import "./env";

import { inArray } from "drizzle-orm";
import { db } from "../src/db";
import { locations } from "../src/db/schema/locations";
import { destinationCategories } from "../src/db/schema/destination_categories";
import {
  destinations,
  destinationsToCategoies,
} from "../src/db/schema/destinations";
import { cuisines, cuisinesToDestinations } from "../src/db/schema/cuisines";

// ---------------------------------------------------------------------------
// 1. DATA — chỉnh/thêm bớt trực tiếp ở đây khi cần mở rộng
// ---------------------------------------------------------------------------

const LOCATIONS_DATA = [
  {
    slug: "hue",
    name: "Huế",
    nameEn: "Hue",
    description:
      "Cố đô của Việt Nam dưới triều Nguyễn, nổi tiếng với hệ thống lăng tẩm, đền đài và các di sản văn hoá phi vật thể như nhã nhạc cung đình.",
    descriptionEn:
      "The former imperial capital of Vietnam under the Nguyen Dynasty, known for its royal tombs, palaces and intangible cultural heritage such as royal court music.",
  },
  {
    slug: "da-nang",
    name: "Đà Nẵng",
    nameEn: "Da Nang",
    description:
      "Thành phố biển năng động miền Trung, cửa ngõ kết nối Huế và Hội An, nổi bật với các bãi biển đẹp và khu du lịch trên núi như Bà Nà Hills.",
    descriptionEn:
      "A dynamic coastal city in Central Vietnam, the gateway connecting Hue and Hoi An, known for its beautiful beaches and mountain resorts such as Ba Na Hills.",
  },
  {
    slug: "hoi-an",
    name: "Hội An",
    nameEn: "Hoi An",
    description:
      "Đô thị cổ ven sông Thu Bồn, từng là thương cảng sầm uất thế kỷ 16-19, nay là Di sản Văn hoá Thế giới UNESCO với kiến trúc nhà cổ và đèn lồng đặc trưng.",
    descriptionEn:
      "An ancient trading port town on the Thu Bon River, a UNESCO World Heritage Site known for its well-preserved architecture and lantern-lit streets.",
  },
] as const;

const CATEGORIES_DATA = [
  { slug: "di-tich-lich-su", name: "Di tích lịch sử", nameEn: "Historical Site", icon: "🏛️" },
  { slug: "tam-linh", name: "Tâm linh - Tôn giáo", nameEn: "Spiritual Site", icon: "🛕" },
  { slug: "thien-nhien", name: "Thiên nhiên - Danh thắng", nameEn: "Nature & Scenery", icon: "🏞️" },
  { slug: "bien", name: "Biển", nameEn: "Beach", icon: "🏖️" },
  { slug: "lang-nghe", name: "Làng nghề - Văn hoá", nameEn: "Craft Village", icon: "🎨" },
  { slug: "cho-mua-sam", name: "Chợ - Mua sắm", nameEn: "Market & Shopping", icon: "🛍️" },
  { slug: "bao-tang", name: "Bảo tàng", nameEn: "Museum", icon: "🖼️" },
] as const;

type DestinationSeed = {
  slug: string;
  locationSlug: (typeof LOCATIONS_DATA)[number]["slug"];
  categorySlugs: string[];
  name: string;
  nameEn: string;
  address: string;
  description: string;
  history: string;
  latitude: number;
  longitude: number;
};

const DESTINATIONS_DATA: DestinationSeed[] = [
  // ---------------- HUẾ ----------------
  {
    slug: "hoang-thanh-hue",
    locationSlug: "hue",
    categorySlugs: ["di-tich-lich-su"],
    name: "Đại Nội Huế (Hoàng thành Huế)",
    nameEn: "Hue Imperial City",
    address: "Phường Thuận Hoá, TP. Huế",
    description:
      "Quần thể hoàng cung của 13 đời vua triều Nguyễn (1802-1945), gồm Ngọ Môn, điện Thái Hoà, Tử Cấm Thành và hàng chục công trình lễ nghi, được UNESCO công nhận Di sản Văn hoá Thế giới năm 1993.",
    history:
      "Được vua Gia Long khởi công xây dựng từ năm 1805 theo nguyên tắc phong thuỷ và mô hình Tử Cấm Thành, là trung tâm chính trị của triều Nguyễn suốt 143 năm.",
    latitude: 16.469527,
    longitude: 107.577432,
  },
  {
    slug: "chua-thien-mu",
    locationSlug: "hue",
    categorySlugs: ["tam-linh"],
    name: "Chùa Thiên Mụ",
    nameEn: "Thien Mu Pagoda",
    address: "Phường Kim Long, TP. Huế",
    description:
      "Ngôi chùa cổ bên bờ sông Hương, biểu tượng của cố đô Huế với tháp Phước Duyên bảy tầng, là nơi tu hành và chiêm bái nổi tiếng bậc nhất miền Trung.",
    history:
      "Chùa được chúa Nguyễn Hoàng cho xây dựng năm 1601, gắn với truyền thuyết bà lão áo đỏ báo mộng; tháp Phước Duyên được vua Thiệu Trị xây thêm năm 1844.",
    latitude: 16.4531778,
    longitude: 107.5448331,
  },
  {
    slug: "lang-tu-duc",
    locationSlug: "hue",
    categorySlugs: ["di-tich-lich-su"],
    name: "Lăng Tự Đức",
    nameEn: "Tomb of Emperor Tu Duc",
    address: "Phường Thuỷ Xuân, TP. Huế",
    description:
      "Khu lăng tẩm được xem là thơ mộng nhất trong hệ thống lăng tẩm triều Nguyễn, với hồ nước, đình tạ và vườn cây được vua Tự Đức dùng làm nơi nghỉ ngơi, sáng tác thơ văn.",
    history:
      "Xây dựng từ năm 1864-1867, ban đầu có tên Vạn Niên Cơ, sau đổi thành Khiêm Lăng, phản ánh gu thẩm mỹ tinh tế và tâm hồn thi sĩ của vua Tự Đức.",
    latitude: 16.4330922,
    longitude: 107.5645182,
  },
  {
    slug: "lang-khai-dinh",
    locationSlug: "hue",
    categorySlugs: ["di-tich-lich-su"],
    name: "Lăng Khải Định",
    nameEn: "Tomb of Emperor Khai Dinh",
    address: "Xã Thuỷ Bằng, TP. Huế",
    description:
      "Công trình lăng tẩm có kiến trúc pha trộn Á - Âu độc đáo nhất triều Nguyễn, nổi bật với nghệ thuật khảm sành sứ tinh xảo trong điện Khải Thành.",
    history:
      "Xây dựng từ năm 1920 đến 1931 (hoàn thành sau khi vua mất), dùng vật liệu nhập từ Pháp, Nhật Bản, Trung Quốc, thể hiện giao thoa văn hoá Đông - Tây đầu thế kỷ 20.",
    latitude: 16.3989535,
    longitude: 107.5902955,
  },
  {
    slug: "lang-minh-mang",
    locationSlug: "hue",
    categorySlugs: ["di-tich-lich-su"],
    name: "Lăng Minh Mạng",
    nameEn: "Tomb of Emperor Minh Mang",
    address: "Xã Hương Thọ, TP. Huế",
    description:
      "Khu lăng tẩm có bố cục đối xứng chặt chẽ nhất trong các lăng tẩm triều Nguyễn, trải dài theo một trục thần đạo qua hồ nước, cầu đá và điện thờ.",
    history:
      "Được vua Thiệu Trị cho xây dựng hoàn thành năm 1843 theo di nguyện của vua cha Minh Mạng, người đã chọn đất và phác thảo ý tưởng từ năm 1840.",
    latitude: 16.3875386,
    longitude: 107.5702467,
  },
  {
    slug: "cau-trang-tien",
    locationSlug: "hue",
    categorySlugs: ["di-tich-lich-su"],
    name: "Cầu Tràng Tiền",
    nameEn: "Trang Tien Bridge",
    address: "Bắc qua sông Hương, TP. Huế",
    description:
      "Cây cầu sắt sáu vài mười hai nhịp bắc qua sông Hương, biểu tượng gắn liền với hình ảnh cố đô, đặc biệt lung linh về đêm nhờ hệ thống chiếu sáng đổi màu.",
    history:
      "Do hãng Eiffel (Pháp) thiết kế, xây dựng lần đầu năm 1899, từng hư hại qua chiến tranh và được trùng tu nhiều lần, lần gần nhất hoàn thành năm 2018.",
    latitude: 16.46911,
    longitude: 107.5886005,
  },
  {
    slug: "cho-dong-ba",
    locationSlug: "hue",
    categorySlugs: ["cho-mua-sam"],
    name: "Chợ Đông Ba",
    nameEn: "Dong Ba Market",
    address: "Đường Trần Hưng Đạo, TP. Huế",
    description:
      "Chợ truyền thống lớn nhất Huế, nơi bán đặc sản địa phương như mè xửng, tôm chua, nón lá và là điểm trải nghiệm đời sống bản địa cho du khách.",
    history:
      "Hình thành từ thời vua Gia Long dưới tên \"Qui Giả Thị\", được vua Đồng Khánh cho xây dựng lại quy mô hơn vào năm 1899 với tên gọi Đông Ba như hiện nay.",
    latitude: 16.4726507,
    longitude: 107.5884891,
  },

  // ---------------- ĐÀ NẴNG ----------------
  {
    slug: "ba-na-hills",
    locationSlug: "da-nang",
    categorySlugs: ["thien-nhien"],
    name: "Bà Nà Hills",
    nameEn: "Ba Na Hills",
    address: "Thôn An Sơn, xã Hoà Vang, Đà Nẵng",
    description:
      "Khu nghỉ dưỡng và giải trí trên núi ở độ cao hơn 1.400m, nổi tiếng với Cầu Vàng, làng Pháp cổ tích và hệ thống cáp treo từng giữ nhiều kỷ lục thế giới.",
    history:
      "Được người Pháp phát hiện và xây dựng thành khu nghỉ mát từ đầu thế kỷ 20, sau đó được đầu tư phục dựng và mở rộng quy mô lớn từ năm 2009 đến nay.",
    latitude: 15.9951364,
    longitude: 107.9961392,
  },
  {
    slug: "ngu-hanh-son",
    locationSlug: "da-nang",
    categorySlugs: ["thien-nhien", "tam-linh"],
    name: "Ngũ Hành Sơn",
    nameEn: "Marble Mountains",
    address: "Phường Hoà Hải, Đà Nẵng",
    description:
      "Cụm 5 ngọn núi đá vôi mang tên Kim - Mộc - Thuỷ - Hoả - Thổ với hệ thống hang động, chùa chiền khắc trong lòng núi, gắn với nghề điêu khắc đá mỹ nghệ truyền thống.",
    history:
      "Vùng núi từng được vua Minh Mạng nhiều lần ghé thăm và đặt tên các hang động, ngọn núi vào đầu thế kỷ 19, hiện được xếp hạng Di tích quốc gia đặc biệt.",
    latitude: 16.0037104,
    longitude: 108.2631605,
  },
  {
    slug: "cau-rong",
    locationSlug: "da-nang",
    categorySlugs: ["di-tich-lich-su"],
    name: "Cầu Rồng",
    nameEn: "Dragon Bridge",
    address: "Bắc qua sông Hàn, Đà Nẵng",
    description:
      "Cây cầu mang hình dáng con rồng vươn ra biển, có khả năng phun lửa và phun nước vào tối cuối tuần, trở thành biểu tượng hiện đại của thành phố Đà Nẵng.",
    history:
      "Khánh thành năm 2013 nhân kỷ niệm 38 năm giải phóng Đà Nẵng, do liên doanh tư vấn Việt Nam - Mỹ thiết kế với kết cấu thép dài gần 666m.",
    latitude: 16.0611042,
    longitude: 108.2276926,
  },
  {
    slug: "bai-bien-my-khe",
    locationSlug: "da-nang",
    categorySlugs: ["bien"],
    name: "Bãi biển Mỹ Khê",
    nameEn: "My Khe Beach",
    address: "Đường Võ Nguyên Giáp, Đà Nẵng",
    description:
      "Một trong những bãi biển được tạp chí Forbes bình chọn quyến rũ nhất hành tinh, với cát trắng mịn, sóng êm và dải bờ biển dài thuận tiện tắm biển quanh năm.",
    history:
      "Từng được lính Mỹ gọi là \"China Beach\" trong thời chiến, sau này được quy hoạch bài bản thành trục du lịch ven biển sầm uất của Đà Nẵng.",
    latitude: 16.0616944,
    longitude: 108.2469346,
  },
  {
    slug: "chua-linh-ung-son-tra",
    locationSlug: "da-nang",
    categorySlugs: ["tam-linh"],
    name: "Chùa Linh Ứng Sơn Trà",
    nameEn: "Linh Ung Pagoda (Son Tra)",
    address: "Bán đảo Sơn Trà, Đà Nẵng",
    description:
      "Ngôi chùa lớn nhất Đà Nẵng nằm trên bán đảo Sơn Trà, nổi bật với tượng Phật Quan Âm cao 67m nhìn ra biển, được xem là biểu tượng tâm linh của thành phố.",
    history:
      "Khởi công xây dựng năm 2004 và khánh thành năm 2010, toạ lạc trên nền một ngôi chùa nhỏ có từ hơn 200 năm trước của ngư dân địa phương.",
    latitude: 16.1002606,
    longitude: 108.2777478,
  },
  {
    slug: "bao-tang-dieu-khac-cham",
    locationSlug: "da-nang",
    categorySlugs: ["bao-tang"],
    name: "Bảo tàng Điêu khắc Chăm",
    nameEn: "Da Nang Museum of Cham Sculpture",
    address: "Số 2 đường 2 Tháng 9, Đà Nẵng",
    description:
      "Bảo tàng lưu giữ bộ sưu tập điêu khắc Chăm bằng đá sa thạch lớn nhất thế giới, trưng bày hiện vật từ thế kỷ 5 đến 15 khai quật tại nhiều di tích miền Trung.",
    history:
      "Được người Pháp xây dựng và khánh thành năm 1919, là một trong những bảo tàng lâu đời nhất Việt Nam về văn hoá Champa.",
    latitude: 16.0603007,
    longitude: 108.2232677,
  },

  // ---------------- HỘI AN ----------------
  {
    slug: "chua-cau-hoi-an",
    locationSlug: "hoi-an",
    categorySlugs: ["di-tich-lich-su"],
    name: "Chùa Cầu Hội An",
    nameEn: "Japanese Covered Bridge",
    address: "Đường Nguyễn Thị Minh Khai, Hội An",
    description:
      "Công trình kiến trúc biểu tượng của phố cổ Hội An, kết hợp phong cách Nhật - Hoa - Việt, vừa là cầu vừa là miếu thờ nhỏ bên trong.",
    history:
      "Do các thương nhân Nhật Bản xây dựng vào khoảng cuối thế kỷ 16 để nối khu phố Nhật với khu phố Hoa, vừa được trùng tu lớn hoàn thành năm 2024.",
    latitude: 15.8770873,
    longitude: 108.3260704,
  },
  {
    slug: "pho-co-hoi-an",
    locationSlug: "hoi-an",
    categorySlugs: ["di-tich-lich-su"],
    name: "Phố cổ Hội An",
    nameEn: "Hoi An Ancient Town",
    address: "Khu phố cổ, Hội An",
    description:
      "Đô thị cổ ven sông Thu Bồn với hàng trăm nhà gỗ, hội quán, nhà thờ tộc gần như nguyên vẹn, nổi tiếng với không gian đèn lồng lung linh mỗi tối.",
    history:
      "Từng là thương cảng quốc tế sầm uất thế kỷ 16-19, được UNESCO công nhận Di sản Văn hoá Thế giới năm 1999 nhờ giữ được gần như nguyên vẹn cấu trúc đô thị cổ.",
    latitude: 15.8783812,
    longitude: 108.3324215,
  },
  {
    slug: "rung-dua-bay-mau",
    locationSlug: "hoi-an",
    categorySlugs: ["thien-nhien"],
    name: "Rừng dừa Bảy Mẫu",
    nameEn: "Bay Mau Coconut Forest",
    address: "Xã Cẩm Thanh, Hội An",
    description:
      "Vùng sinh thái nước lợ rợp bóng dừa nước, nơi du khách trải nghiệm chèo thuyền thúng, tìm hiểu đời sống sông nước và hệ sinh thái rừng ngập mặn đặc trưng miền Trung.",
    history:
      "Hình thành khoảng 200 năm trước khi cư dân di cư từ miền Tây Nam Bộ mang giống dừa nước đến trồng, từng là căn cứ cách mạng trong hai cuộc kháng chiến.",
    latitude: 15.8782982,
    longitude: 108.3724553,
  },
  {
    slug: "lang-gom-thanh-ha",
    locationSlug: "hoi-an",
    categorySlugs: ["lang-nghe"],
    name: "Làng gốm Thanh Hà",
    nameEn: "Thanh Ha Pottery Village",
    address: "Phường Thanh Hà, Hội An",
    description:
      "Làng nghề gốm truyền thống bên sông Thu Bồn, nơi du khách xem nghệ nhân nặn gốm bằng tay và tự trải nghiệm tạo hình sản phẩm gốm mộc.",
    history:
      "Hình thành từ thế kỷ 16 bởi cư dân gốc Thanh Hoá di cư vào, từng cung cấp gốm gia dụng cho cả vùng Nam Trung Bộ trong thời kỳ thương cảng phồn thịnh.",
    latitude: 15.8781302,
    longitude: 108.3005058,
  },
  {
    slug: "lang-rau-tra-que",
    locationSlug: "hoi-an",
    categorySlugs: ["lang-nghe"],
    name: "Làng rau Trà Quế",
    nameEn: "Tra Que Vegetable Village",
    address: "Xã Cẩm Hà, Hội An",
    description:
      "Làng rau hữu cơ trăm tuổi nổi tiếng với hơn 20 loại rau thơm đặc trưng, là nơi du khách trải nghiệm làm nông dân, cày bừa, tưới rau theo cách truyền thống.",
    history:
      "Hình thành từ thế kỷ 16, đất trồng được bồi đắp phù sa từ sông Cổ Cò và tảo biển vớt từ đầm Trà Quế, tạo nên hương vị rau đặc trưng không nơi nào có.",
    latitude: 15.9007548,
    longitude: 108.3382496,
  },
  {
    slug: "cu-lao-cham",
    locationSlug: "hoi-an",
    categorySlugs: ["thien-nhien"],
    name: "Cù Lao Chàm",
    nameEn: "Cham Islands",
    address: "Xã Tân Hiệp, Hội An",
    description:
      "Cụm đảo nhỏ ngoài khơi Hội An với rạn san hô, bãi biển hoang sơ và khu dự trữ sinh quyển thế giới, thích hợp lặn ngắm san hô và khám phá đời sống ngư dân đảo.",
    history:
      "Được UNESCO công nhận Khu dự trữ sinh quyển thế giới năm 2009 nhờ hệ sinh thái biển đa dạng và các di chỉ khảo cổ văn hoá Sa Huỳnh, Chăm Pa trên đảo.",
    latitude: 15.9130325,
    longitude: 108.4496258,
  },
];

type CuisineSeed = {
  slug: string;
  name: string;
  nameEn: string;
  description: string;
  avgPrice: string;
  destinationSlugs?: string[];
};

const CUISINES_DATA: CuisineSeed[] = [
  {
    slug: "bun-bo-hue",
    name: "Bún bò Huế",
    nameEn: "Hue Beef Noodle Soup",
    description:
      "Món bún nước đậm vị sả, ớt và mắm ruốc đặc trưng xứ Huế, thường ăn kèm giò heo, chả cua và rau sống.",
    avgPrice: "35000",
    destinationSlugs: ["cho-dong-ba"],
  },
  {
    slug: "com-hen",
    name: "Cơm hến",
    nameEn: "Hue Baby Clam Rice",
    description:
      "Món cơm nguội trộn hến xào, tóp mỡ, rau thơm và nước hến chan cay nồng, là món ăn dân dã đặc trưng của người Huế.",
    avgPrice: "20000",
    destinationSlugs: ["cho-dong-ba"],
  },
  {
    slug: "banh-khoai",
    name: "Bánh khoái",
    nameEn: "Hue Sizzling Pancake",
    description:
      "Bánh bột gạo giòn rụm nhân tôm thịt giá đỗ, ăn kèm nước lèo pha từ gan heo và đậu phộng, đặc sản ẩm thực đường phố Huế.",
    avgPrice: "25000",
  },
  {
    slug: "mi-quang",
    name: "Mì Quảng",
    nameEn: "Quang-style Noodles",
    description:
      "Sợi mì gạo vàng ăn cùng nước dùng sền sệt xăm xắp mặt, tôm thịt, trứng cút và bánh đa giòn, món ăn linh hồn ẩm thực xứ Quảng.",
    avgPrice: "30000",
  },
  {
    slug: "banh-trang-cuon-thit-heo",
    name: "Bánh tráng cuốn thịt heo",
    nameEn: "Rice Paper Pork Rolls",
    description:
      "Thịt heo hai đầu da luộc cuốn cùng bánh tráng, rau sống và chấm mắm nêm, món ăn phổ biến khắp Đà Nẵng - Hội An.",
    avgPrice: "60000",
  },
  {
    slug: "cao-lau",
    name: "Cao lầu",
    nameEn: "Cao Lau Noodles",
    description:
      "Sợi mì dai vàng đặc trưng chỉ ngon khi làm từ nước giếng Bá Lễ, ăn cùng thịt xá xíu, tóp mỡ chiên giòn và rau sống Trà Quế.",
    avgPrice: "35000",
    destinationSlugs: ["pho-co-hoi-an"],
  },
  {
    slug: "com-ga-hoi-an",
    name: "Cơm gà Hội An",
    nameEn: "Hoi An Chicken Rice",
    description:
      "Cơm nấu bằng nước luộc gà và nghệ, ăn cùng gà xé phay, hành phi và rau răm, món trưa quen thuộc của người Hội An.",
    avgPrice: "35000",
    destinationSlugs: ["pho-co-hoi-an"],
  },
  {
    slug: "banh-mi-hoi-an",
    name: "Bánh mì kiểu Hội An",
    nameEn: "Hoi An-style Banh Mi",
    description:
      "Bánh mì nhiều lớp nhân pate, thịt nguội, rau thơm, tương ớt nhà làm theo công thức riêng của các tiệm lâu năm ở phố cổ, được nhiều du khách quốc tế yêu thích.",
    avgPrice: "25000",
    destinationSlugs: ["pho-co-hoi-an"],
  },
];

// ---------------------------------------------------------------------------
// 2. SEED LOGIC
// ---------------------------------------------------------------------------

async function seedLocations() {
  await db
    .insert(locations)
    .values(LOCATIONS_DATA.map(({ slug, name, nameEn, description, descriptionEn }) => ({
      slug,
      name,
      nameEn,
      description,
      descriptionEn,
    })))
    .onConflictDoNothing({ target: locations.slug });

  const rows = await db
    .select({ id: locations.id, slug: locations.slug })
    .from(locations)
    .where(inArray(locations.slug, LOCATIONS_DATA.map((l) => l.slug)));

  console.log(`✔ locations: ${rows.length}/${LOCATIONS_DATA.length}`);
  return new Map(rows.map((r) => [r.slug, r.id]));
}

async function seedCategories() {
  await db
    .insert(destinationCategories)
    .values(CATEGORIES_DATA.map(({ slug, name, nameEn, icon }) => ({ slug, name, nameEn, icon })))
    .onConflictDoNothing({ target: destinationCategories.slug });

  const rows = await db
    .select({ id: destinationCategories.id, slug: destinationCategories.slug })
    .from(destinationCategories)
    .where(inArray(destinationCategories.slug, CATEGORIES_DATA.map((c) => c.slug)));

  console.log(`✔ destination_categories: ${rows.length}/${CATEGORIES_DATA.length}`);
  return new Map(rows.map((r) => [r.slug, r.id]));
}

async function seedDestinations(
  locationMap: Map<string, string>,
  categoryMap: Map<string, string>,
) {
  const values = DESTINATIONS_DATA.map((d) => {
    const locationId = locationMap.get(d.locationSlug);
    if (!locationId) {
      throw new Error(`Không tìm thấy locationId cho slug "${d.locationSlug}"`);
    }
    return {
      slug: d.slug,
      locationId,
      name: d.name,
      nameEn: d.nameEn,
      address: d.address,
      description: d.description,
      history: d.history,
      latitude: d.latitude,
      longitude: d.longitude,
    };
  });

  await db.insert(destinations).values(values).onConflictDoNothing({ target: destinations.slug });

  const rows = await db
    .select({ id: destinations.id, slug: destinations.slug })
    .from(destinations)
    .where(inArray(destinations.slug, DESTINATIONS_DATA.map((d) => d.slug)));

  console.log(`✔ destinations: ${rows.length}/${DESTINATIONS_DATA.length}`);
  const destinationMap = new Map(rows.map((r) => [r.slug, r.id]));

  // Gắn category cho từng destination (bảng nối n-n)
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
  console.log(`✔ destinations_to_categories: ${links.length} liên kết`);

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
      })),
    )
    .onConflictDoNothing({ target: cuisines.slug });

  const rows = await db
    .select({ id: cuisines.id, slug: cuisines.slug })
    .from(cuisines)
    .where(inArray(cuisines.slug, CUISINES_DATA.map((c) => c.slug)));

  console.log(`✔ cuisines: ${rows.length}/${CUISINES_DATA.length}`);
  const cuisineMap = new Map(rows.map((r) => [r.slug, r.id]));

  const links = CUISINES_DATA.flatMap((c) => {
    const cuisineId = cuisineMap.get(c.slug);
    if (!cuisineId || !c.destinationSlugs) return [];
    return c.destinationSlugs.map((destSlug) => {
      const destinationId = destinationMap.get(destSlug);
      if (!destinationId) {
        throw new Error(`Không tìm thấy destinationId cho slug "${destSlug}"`);
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
  console.log(`✔ cuisines_to_destinations: ${links.length} liên kết`);
}

// ---------------------------------------------------------------------------
// 3. MAIN
// ---------------------------------------------------------------------------

async function main() {
  console.log("Bắt đầu seed data Huế - Đà Nẵng - Hội An...\n");

  const locationMap = await seedLocations();
  const categoryMap = await seedCategories();
  const destinationMap = await seedDestinations(locationMap, categoryMap);
  await seedCuisines(destinationMap);

  console.log("\n Seed hoàn tất.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed thất bại:", err);
  process.exit(1);
});