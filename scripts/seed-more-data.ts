import "./env";
import { inArray } from "drizzle-orm";
import { db } from "../src/db";
import { cuisines, cuisinesToDestinations } from "../src/db/schema/cuisines";
import { destinationCategories } from "../src/db/schema/destination_categories";
import { destinations, destinationsToCategoies } from "../src/db/schema/destinations";
import { locations } from "../src/db/schema/locations";
import {
  restaurants,
  restaurantsToCuisines,
  type RestaurantOpeningHours,
} from "../src/db/schema/restaurants";

const LOCATION_DATA = [
  {
    slug: "hue",
    name: "Huế",
    nameEn: "Hue",
    description: "Cố đô triều Nguyễn, nổi bật với di sản cung đình, lăng tẩm, làng nghề và cảnh quan sông Hương.",
    descriptionEn: "Vietnam's former imperial capital, known for royal heritage, craft villages and the Perfume River landscape.",
  },
  {
    slug: "da-nang",
    name: "Đà Nẵng",
    nameEn: "Da Nang",
    description: "Thành phố biển miền Trung có bán đảo, đèo núi, bãi biển và nhịp sống đô thị hiện đại.",
    descriptionEn: "A Central Vietnam coastal city with beaches, mountains, a peninsula and a modern urban lifestyle.",
  },
  {
    slug: "hoi-an",
    name: "Hội An",
    nameEn: "Hoi An",
    description: "Đô thị di sản bên sông Thu Bồn với phố cổ, hội quán, làng nghề và không gian biển gần thành phố.",
    descriptionEn: "A heritage town on the Thu Bon River with historic streets, assembly halls, craft villages and nearby beaches.",
  },
] as const;

const CATEGORY_DATA = [
  { slug: "di-tich-lich-su", name: "Di tích lịch sử", nameEn: "Historical Site", icon: "🏛️" },
  { slug: "tam-linh", name: "Tâm linh - Tôn giáo", nameEn: "Spiritual Site", icon: "🛕" },
  { slug: "thien-nhien", name: "Thiên nhiên - Danh thắng", nameEn: "Nature & Scenery", icon: "🏞️" },
  { slug: "bien", name: "Biển", nameEn: "Beach", icon: "🏖️" },
  { slug: "lang-nghe", name: "Làng nghề - Văn hoá", nameEn: "Craft Village", icon: "🎨" },
  { slug: "cho-mua-sam", name: "Chợ - Mua sắm", nameEn: "Market & Shopping", icon: "🛍️" },
  { slug: "bao-tang", name: "Bảo tàng", nameEn: "Museum", icon: "🖼️" },
] as const;

type LocationSlug = (typeof LOCATION_DATA)[number]["slug"];
type CategorySlug = (typeof CATEGORY_DATA)[number]["slug"];

type DestinationSeed = {
  slug: string;
  locationSlug: LocationSlug;
  categorySlugs: CategorySlug[];
  name: string;
  nameEn: string;
  address: string;
  description: string;
  history: string;
  latitude: number;
  longitude: number;
};

const DESTINATIONS_DATA: DestinationSeed[] = [
  {
    slug: "cung-an-dinh",
    locationSlug: "hue",
    categorySlugs: ["di-tich-lich-su"],
    name: "Cung An Định",
    nameEn: "An Dinh Palace",
    address: "179B Phan Đình Phùng, TP. Huế",
    description: "Cung điện bên bờ sông An Cựu có mặt tiền trang trí cầu kỳ, kết hợp mỹ thuật cung đình Nguyễn với phong cách kiến trúc châu Âu đầu thế kỷ 20.",
    history: "Tiền thân là phủ riêng của vua Khải Định khi còn là hoàng tử. Công trình được xây dựng lại từ năm 1917 và từng là nơi sinh sống của nhiều thành viên hoàng gia Nguyễn.",
    latitude: 16.45763,
    longitude: 107.5985,
  },
  {
    slug: "lang-gia-long",
    locationSlug: "hue",
    categorySlugs: ["di-tich-lich-su", "thien-nhien"],
    name: "Lăng Gia Long",
    nameEn: "Tomb of Emperor Gia Long",
    address: "Xã Hương Thọ, TP. Huế",
    description: "Quần thể lăng nằm giữa vùng đồi núi rộng lớn, có không gian khoáng đạt và bố cục hòa vào cảnh quan tự nhiên ở thượng nguồn sông Hương.",
    history: "Lăng được xây dựng trong giai đoạn 1814-1820 để an táng vua Gia Long và Thừa Thiên Cao Hoàng hậu, mở đầu hệ thống lăng tẩm của triều Nguyễn tại Huế.",
    latitude: 16.37217,
    longitude: 107.59404,
  },
  {
    slug: "dien-hon-chen",
    locationSlug: "hue",
    categorySlugs: ["tam-linh", "di-tich-lich-su"],
    name: "Điện Hòn Chén",
    nameEn: "Hon Chen Temple",
    address: "Núi Ngọc Trản, xã Hương Thọ, TP. Huế",
    description: "Cụm điện thờ nằm trên sườn núi Ngọc Trản nhìn xuống sông Hương, nổi tiếng với kiến trúc nhiều màu sắc và lễ hội đường thủy giàu bản sắc.",
    history: "Nơi đây vốn là điểm thờ nữ thần của người Chăm, sau được Việt hóa thành trung tâm thờ Thiên Y A Na và được các vua Nguyễn nhiều lần tu sửa, ban sắc.",
    latitude: 16.41292,
    longitude: 107.55539,
  },
  {
    slug: "doi-vong-canh",
    locationSlug: "hue",
    categorySlugs: ["thien-nhien"],
    name: "Đồi Vọng Cảnh",
    nameEn: "Vong Canh Hill",
    address: "Đường Huyền Trân Công Chúa, phường Thủy Xuân, TP. Huế",
    description: "Điểm ngắm cảnh trên đồi thông, từ đây có thể quan sát sông Hương uốn quanh, núi Ngọc Trản và vùng lăng tẩm phía tây nam thành phố.",
    history: "Đồi từng được các vua Nguyễn chọn làm nơi dừng chân thưởng ngoạn phong cảnh. Tên gọi Vọng Cảnh phản ánh vai trò lâu đời của nơi này như một đài quan sát tự nhiên.",
    latitude: 16.42958,
    longitude: 107.56316,
  },
  {
    slug: "cau-ngoi-thanh-toan",
    locationSlug: "hue",
    categorySlugs: ["di-tich-lich-su", "lang-nghe"],
    name: "Cầu ngói Thanh Toàn",
    nameEn: "Thanh Toan Tile-Roofed Bridge",
    address: "Làng Thanh Thủy Chánh, phường Hương Thủy, TP. Huế",
    description: "Cây cầu gỗ mái ngói kiểu thượng gia hạ kiều bắc qua con mương của làng, vừa phục vụ đi lại vừa là nơi nghỉ chân và sinh hoạt cộng đồng.",
    history: "Cầu được bà Trần Thị Đạo, người làng Thanh Thủy Chánh, bỏ tiền xây dựng vào thế kỷ 18. Triều đình ghi nhận công đức và người dân duy trì việc thờ phụng bà bên cầu.",
    latitude: 16.46669,
    longitude: 107.64267,
  },
  {
    slug: "pha-tam-giang",
    locationSlug: "hue",
    categorySlugs: ["thien-nhien"],
    name: "Phá Tam Giang",
    nameEn: "Tam Giang Lagoon",
    address: "Khu vực Quảng Điền - Phong Điền, TP. Huế",
    description: "Vùng đầm phá nước lợ rộng lớn với cảnh hoàng hôn, làng chài, nò sáo và hệ sinh thái thủy sinh đặc trưng của dải duyên hải miền Trung.",
    history: "Đầm phá hình thành từ quá trình bồi tụ giữa hệ thống sông và dải cồn cát ven biển. Nhiều thế hệ cư dân đã phát triển nghề đánh bắt, nuôi trồng thủy sản tại đây.",
    latitude: 16.56631,
    longitude: 107.60027,
  },
  {
    slug: "bien-thuan-an",
    locationSlug: "hue",
    categorySlugs: ["bien", "thien-nhien"],
    name: "Biển Thuận An",
    nameEn: "Thuan An Beach",
    address: "Phường Thuận An, TP. Huế",
    description: "Bãi biển gần trung tâm Huế, nằm cạnh cửa biển nối phá Tam Giang với Biển Đông, phù hợp tắm biển và thưởng thức hải sản vào mùa hè.",
    history: "Cửa Thuận An từng là tuyến đường thủy quan trọng bảo vệ và kết nối Kinh thành Huế với biển. Khu vực này còn gắn với hệ thống đồn lũy ven cửa biển thời Nguyễn.",
    latitude: 16.56702,
    longitude: 107.63515,
  },
  {
    slug: "vuon-quoc-gia-bach-ma",
    locationSlug: "hue",
    categorySlugs: ["thien-nhien"],
    name: "Vườn quốc gia Bạch Mã",
    nameEn: "Bach Ma National Park",
    address: "Huyện Phú Lộc, TP. Huế",
    description: "Khu rừng núi có khí hậu mát, đa dạng sinh học cao và nhiều tuyến trekking qua Hải Vọng Đài, Ngũ Hồ, thác Đỗ Quyên.",
    history: "Bạch Mã được người Pháp phát triển thành khu nghỉ dưỡng núi vào thập niên 1930. Sau chiến tranh, khu vực được thành lập vườn quốc gia để bảo tồn hệ sinh thái chuyển tiếp Bắc - Nam.",
    latitude: 16.19215,
    longitude: 107.85329,
  },
  {
    slug: "ban-dao-son-tra",
    locationSlug: "da-nang",
    categorySlugs: ["thien-nhien"],
    name: "Bán đảo Sơn Trà",
    nameEn: "Son Tra Peninsula",
    address: "Quận Sơn Trà, Đà Nẵng",
    description: "Bán đảo rừng sát biển có nhiều cung đường ngắm cảnh, bãi nhỏ và sinh cảnh quan trọng của voọc chà vá chân nâu.",
    history: "Sơn Trà giữ vị trí án ngữ cửa vịnh Đà Nẵng và từng có vai trò quân sự quan trọng. Rừng tự nhiên còn lại giúp nơi đây trở thành vùng bảo tồn sinh thái đặc biệt của thành phố.",
    latitude: 16.10501,
    longitude: 108.27693,
  },
  {
    slug: "dinh-ban-co",
    locationSlug: "da-nang",
    categorySlugs: ["thien-nhien"],
    name: "Đỉnh Bàn Cờ",
    nameEn: "Ban Co Peak",
    address: "Bán đảo Sơn Trà, quận Sơn Trà, Đà Nẵng",
    description: "Điểm cao trên bán đảo Sơn Trà có tầm nhìn rộng xuống thành phố, vịnh Đà Nẵng và đường bờ biển phía đông.",
    history: "Tên gọi gắn với truyền thuyết hai vị tiên đánh cờ trên núi. Tượng Đế Thích bên bàn cờ đá được dựng để kể lại câu chuyện dân gian và tạo dấu nhận diện cho điểm ngắm cảnh.",
    latitude: 16.11807,
    longitude: 108.27734,
  },
  {
    slug: "deo-hai-van-da-nang",
    locationSlug: "da-nang",
    categorySlugs: ["di-tich-lich-su", "thien-nhien"],
    name: "Đèo Hải Vân",
    nameEn: "Hai Van Pass",
    address: "Ranh giới Đà Nẵng và TP. Huế",
    description: "Cung đèo ven biển nổi tiếng với đường núi uốn lượn, tầm nhìn xuống vịnh Lăng Cô và vịnh Đà Nẵng.",
    history: "Hải Vân là cửa ngõ tự nhiên trên trục Bắc - Nam. Cụm Hải Vân Quan được xây dựng dưới triều Minh Mạng năm 1826 để kiểm soát giao thông và phòng thủ kinh đô từ phía nam.",
    latitude: 16.18727,
    longitude: 108.13048,
  },
  {
    slug: "cho-han-da-nang",
    locationSlug: "da-nang",
    categorySlugs: ["cho-mua-sam"],
    name: "Chợ Hàn",
    nameEn: "Han Market",
    address: "119 Trần Phú, quận Hải Châu, Đà Nẵng",
    description: "Chợ trung tâm bán thực phẩm, đặc sản khô, quần áo và quà lưu niệm, thuận tiện cho du khách khám phá ẩm thực địa phương.",
    history: "Chợ hình thành từ một điểm giao thương nhỏ gần sông Hàn rồi phát triển theo quá trình đô thị hóa của Đà Nẵng, đặc biệt sôi động từ giữa thế kỷ 20.",
    latitude: 16.06806,
    longitude: 108.22428,
  },
  {
    slug: "cho-con-da-nang",
    locationSlug: "da-nang",
    categorySlugs: ["cho-mua-sam"],
    name: "Chợ Cồn",
    nameEn: "Con Market",
    address: "290 Hùng Vương, quận Hải Châu, Đà Nẵng",
    description: "Khu chợ lâu đời có khu ẩm thực trong nhà và ngoài trời, tập trung nhiều món ăn vặt, món mì và đặc sản miền Trung.",
    history: "Chợ ra đời trên một cồn đất cao trong thập niên 1940. Từ khu buôn bán bình dân, nơi đây dần trở thành đầu mối thương mại lớn và điểm trải nghiệm ẩm thực của thành phố.",
    latitude: 16.06617,
    longitude: 108.21418,
  },
  {
    slug: "ran-nam-o",
    locationSlug: "da-nang",
    categorySlugs: ["bien", "thien-nhien"],
    name: "Rạn Nam Ô",
    nameEn: "Nam O Reef",
    address: "Phường Hòa Hiệp Nam, quận Liên Chiểu, Đà Nẵng",
    description: "Bãi đá ven biển nổi bật vào mùa nước rút với lớp rong xanh, nền đá sẫm màu và khung cảnh làng chài Nam Ô.",
    history: "Rạn đá gắn với làng biển Nam Ô, nơi cư dân duy trì nghề đánh bắt và làm nước mắm truyền thống. Cảnh quan hình thành tự nhiên qua quá trình biển bào mòn các lớp đá ven bờ.",
    latitude: 16.12715,
    longitude: 108.12881,
  },
  {
    slug: "ho-hoa-trung",
    locationSlug: "da-nang",
    categorySlugs: ["thien-nhien"],
    name: "Hồ Hòa Trung",
    nameEn: "Hoa Trung Lake",
    address: "Xã Hòa Liên, huyện Hòa Vang, Đà Nẵng",
    description: "Hồ nước giữa vùng đồi cỏ, có cảnh quan thay đổi theo mùa và không gian rộng phù hợp dã ngoại, chụp ảnh.",
    history: "Hồ được tạo nên để phục vụ thủy lợi cho khu vực Hòa Vang. Mực nước theo mùa làm xuất hiện các bãi cỏ và đảo nhỏ, dần thu hút người dân đến tham quan.",
    latitude: 16.09054,
    longitude: 108.06012,
  },
  {
    slug: "bai-bien-non-nuoc",
    locationSlug: "da-nang",
    categorySlugs: ["bien", "thien-nhien"],
    name: "Bãi biển Non Nước",
    nameEn: "Non Nuoc Beach",
    address: "Phường Hòa Hải, quận Ngũ Hành Sơn, Đà Nẵng",
    description: "Bãi biển cát sáng nằm dưới chân Ngũ Hành Sơn, có đường bờ dài và vị trí thuận lợi trên tuyến Đà Nẵng - Hội An.",
    history: "Khu vực Non Nước từ lâu gắn với làng đá mỹ nghệ và cụm Ngũ Hành Sơn. Khi tuyến du lịch ven biển phát triển, bãi biển trở thành một điểm nghỉ dưỡng quan trọng phía nam thành phố.",
    latitude: 16.00037,
    longitude: 108.27703,
  },
  {
    slug: "hoi-quan-phuc-kien",
    locationSlug: "hoi-an",
    categorySlugs: ["di-tich-lich-su", "tam-linh"],
    name: "Hội quán Phúc Kiến",
    nameEn: "Fujian Assembly Hall",
    address: "46 Trần Phú, phường Hội An, TP. Đà Nẵng",
    description: "Hội quán có cổng tam quan, sân, chính điện và nhiều mảng chạm khắc, là một trong những công trình cộng đồng người Hoa tiêu biểu tại phố cổ.",
    history: "Cộng đồng thương nhân Phúc Kiến xây dựng hội quán vào cuối thế kỷ 17, ban đầu làm nơi gặp gỡ đồng hương rồi mở rộng thành nơi thờ Thiên Hậu Thánh Mẫu.",
    latitude: 15.87734,
    longitude: 108.33343,
  },
  {
    slug: "nha-co-tan-ky",
    locationSlug: "hoi-an",
    categorySlugs: ["di-tich-lich-su"],
    name: "Nhà cổ Tấn Ký",
    nameEn: "Tan Ky Old House",
    address: "101 Nguyễn Thái Học, phường Hội An, TP. Đà Nẵng",
    description: "Ngôi nhà buôn truyền thống có kết cấu gỗ, sân trời và cách tổ chức không gian thích ứng với khí hậu, thể hiện giao thoa kiến trúc Việt - Hoa - Nhật.",
    history: "Nhà được xây dựng vào cuối thế kỷ 18 và được nhiều thế hệ một gia đình thương nhân gìn giữ. Vị trí thông từ phố ra sông từng thuận lợi cho việc nhập, xuất hàng hóa.",
    latitude: 15.8775,
    longitude: 108.32982,
  },
  {
    slug: "nha-co-phung-hung",
    locationSlug: "hoi-an",
    categorySlugs: ["di-tich-lich-su"],
    name: "Nhà cổ Phùng Hưng",
    nameEn: "Phung Hung Old House",
    address: "4 Nguyễn Thị Minh Khai, phường Hội An, TP. Đà Nẵng",
    description: "Nhà cổ hai tầng có hệ khung gỗ và không gian buôn bán truyền thống, nằm gần Chùa Cầu ở đầu phía tây phố cổ.",
    history: "Công trình được một thương nhân xây dựng vào cuối thế kỷ 18 để kinh doanh lâm thổ sản. Kiến trúc cho thấy sự kết hợp kỹ thuật và thẩm mỹ của nhiều cộng đồng từng giao thương tại Hội An.",
    latitude: 15.87779,
    longitude: 108.32698,
  },
  {
    slug: "hoi-quan-trieu-chau",
    locationSlug: "hoi-an",
    categorySlugs: ["di-tich-lich-su", "tam-linh"],
    name: "Hội quán Triều Châu",
    nameEn: "Chaozhou Assembly Hall",
    address: "157 Nguyễn Duy Hiệu, phường Hội An, TP. Đà Nẵng",
    description: "Công trình nổi bật với nghệ thuật đắp nổi sành sứ, chạm gỗ và các mô-típ về biển, phản ánh đời sống tinh thần của cộng đồng thương nhân Triều Châu.",
    history: "Hội quán được cộng đồng người Hoa gốc Triều Châu xây dựng vào giữa thế kỷ 19 để sinh hoạt đồng hương và thờ Phục Ba tướng quân, vị thần bảo hộ người đi biển.",
    latitude: 15.87996,
    longitude: 108.33708,
  },
  {
    slug: "cho-hoi-an",
    locationSlug: "hoi-an",
    categorySlugs: ["cho-mua-sam"],
    name: "Chợ Hội An",
    nameEn: "Hoi An Market",
    address: "Đường Trần Quý Cáp, phường Hội An, TP. Đà Nẵng",
    description: "Chợ ven khu phố cổ tập trung rau củ, thủy sản, gia vị, hàng lưu niệm và một khu ẩm thực nhiều món địa phương.",
    history: "Chợ tiếp nối truyền thống trao đổi hàng hóa của thương cảng Hội An. Vị trí gần sông thuận tiện cho việc đưa nông sản, thủy sản từ các làng lân cận vào phố.",
    latitude: 15.87831,
    longitude: 108.33548,
  },
  {
    slug: "bien-an-bang",
    locationSlug: "hoi-an",
    categorySlugs: ["bien", "thien-nhien"],
    name: "Biển An Bàng",
    nameEn: "An Bang Beach",
    address: "Phường Hội An Tây, TP. Đà Nẵng",
    description: "Bãi biển có dải cát thoáng, làng dân cư phía sau và nhiều dịch vụ quy mô nhỏ, cách phố cổ Hội An vài kilômét.",
    history: "An Bàng vốn là không gian sinh hoạt và đánh bắt của cộng đồng ven biển. Sự phát triển du lịch Hội An đã đưa nơi đây từ một bãi tắm địa phương thành điểm nghỉ biển được nhiều du khách biết đến.",
    latitude: 15.9147,
    longitude: 108.33872,
  },
  {
    slug: "bien-cua-dai",
    locationSlug: "hoi-an",
    categorySlugs: ["bien", "thien-nhien"],
    name: "Biển Cửa Đại",
    nameEn: "Cua Dai Beach",
    address: "Phường Hội An Đông, TP. Đà Nẵng",
    description: "Bãi biển gần cửa sông Thu Bồn, là điểm kết nối đường biển từ Hội An ra Cù Lao Chàm và vùng ven bờ.",
    history: "Cửa Đại là lối ra biển của hệ thống sông Thu Bồn, góp phần tạo điều kiện cho thương cảng Hội An phát triển. Bờ biển biến đổi theo mùa do tác động của sóng, dòng chảy và bồi lắng.",
    latitude: 15.90089,
    longitude: 108.3609,
  },
  {
    slug: "lang-moc-kim-bong",
    locationSlug: "hoi-an",
    categorySlugs: ["lang-nghe"],
    name: "Làng mộc Kim Bồng",
    nameEn: "Kim Bong Carpentry Village",
    address: "Xã Cẩm Kim, khu vực Hội An, TP. Đà Nẵng",
    description: "Làng nghề bên sông Thu Bồn nổi tiếng với kỹ thuật dựng nhà gỗ, đóng thuyền và chạm khắc, thích hợp khám phá bằng xe đạp hoặc thuyền.",
    history: "Nghề mộc Kim Bồng phát triển mạnh từ thời thương cảng Hội An. Thợ làng tham gia xây dựng nhà cổ, hội quán, đình chùa và nhiều công trình cung đình ở miền Trung.",
    latitude: 15.87182,
    longitude: 108.30778,
  },
];

type CuisineSeed = {
  slug: string;
  name: string;
  nameEn: string;
  description: string;
  avgPrice: number;
  destinationSlugs?: string[];
};

const CUISINES_DATA: CuisineSeed[] = [
  { slug: "banh-beo-hue", name: "Bánh bèo Huế", nameEn: "Hue Steamed Rice Cakes", description: "Bánh bột gạo hấp trong chén nhỏ, phủ tôm chấy, da heo chiên và chan nước mắm ngọt nhẹ.", avgPrice: 30000 },
  { slug: "banh-nam-hue", name: "Bánh nậm Huế", nameEn: "Hue Flat Rice Dumplings", description: "Bánh bột gạo mỏng gói lá chuối với nhân tôm thịt, có kết cấu mềm và hương thơm dịu.", avgPrice: 30000 },
  { slug: "banh-loc-hue", name: "Bánh bột lọc Huế", nameEn: "Hue Tapioca Dumplings", description: "Bánh trong dai làm từ bột năng, nhân tôm thịt rim đậm vị, có loại gói lá và loại trần.", avgPrice: 35000 },
  { slug: "nem-lui-hue", name: "Nem lụi Huế", nameEn: "Hue Lemongrass Pork Skewers", description: "Thịt xay nướng quanh cây sả, cuốn bánh tráng với rau sống và chấm nước lèo sánh.", avgPrice: 60000 },
  { slug: "che-hue", name: "Chè Huế", nameEn: "Hue Sweet Soup", description: "Nhóm món chè đa dạng như hạt sen, đậu ngự, bắp, khoai tía và bột lọc heo quay.", avgPrice: 25000 },
  { slug: "com-am-phu", name: "Cơm Âm Phủ", nameEn: "Am Phu Rice", description: "Đĩa cơm nhiều màu với thịt nướng, trứng, tôm, chả và rau củ thái sợi, ăn cùng nước mắm.", avgPrice: 50000, destinationSlugs: ["cung-an-dinh"] },
  { slug: "tom-chua-hue", name: "Tôm chua Huế", nameEn: "Hue Fermented Sour Shrimp", description: "Tôm lên men cùng riềng, tỏi, ớt tạo vị chua cay mặn ngọt, thường ăn với thịt luộc và rau.", avgPrice: 70000, destinationSlugs: ["bien-thuan-an"] },
  { slug: "banh-canh-nam-pho", name: "Bánh canh Nam Phổ", nameEn: "Nam Pho Thick Noodle Soup", description: "Súp bánh canh sánh màu đỏ cam, có tôm, cua và chả, là món quà chiều quen thuộc của vùng Huế.", avgPrice: 30000, destinationSlugs: ["cau-ngoi-thanh-toan"] },
  { slug: "bun-cha-ca-da-nang", name: "Bún chả cá Đà Nẵng", nameEn: "Da Nang Fish Cake Noodle Soup", description: "Bún nước thanh ngọt từ cá và rau củ, ăn cùng chả cá chiên hoặc hấp và rau sống.", avgPrice: 40000, destinationSlugs: ["cho-han-da-nang"] },
  { slug: "goi-ca-nam-o", name: "Gỏi cá Nam Ô", nameEn: "Nam O Fish Salad", description: "Cá tươi trộn thính và gia vị, cuốn với rau rừng, bánh tráng rồi chấm nước sốt đậm vị.", avgPrice: 120000, destinationSlugs: ["ran-nam-o"] },
  { slug: "banh-xeo-da-nang", name: "Bánh xèo Đà Nẵng", nameEn: "Da Nang Sizzling Pancake", description: "Bánh xèo nhỏ giòn với nhân tôm thịt giá đỗ, cuốn bánh tráng và dùng cùng nem lụi.", avgPrice: 70000 },
  { slug: "oc-hut-da-nang", name: "Ốc hút Đà Nẵng", nameEn: "Da Nang Spicy Snails", description: "Ốc xào sả ớt cay thơm, thường ăn kèm đu đủ xanh và bánh tráng vào buổi chiều tối.", avgPrice: 50000 },
  { slug: "bun-mam-nem-da-nang", name: "Bún mắm nêm Đà Nẵng", nameEn: "Da Nang Fermented Fish Sauce Noodles", description: "Bún trộn thịt heo, chả, mít non, rau sống và mắm nêm pha thơm cay.", avgPrice: 40000, destinationSlugs: ["cho-con-da-nang"] },
  { slug: "be-thui-cau-mong", name: "Bê thui Cầu Mống", nameEn: "Cau Mong Rare Roasted Veal", description: "Thịt bê thui thái mỏng cuốn bánh tráng, rau sống và chấm mắm cá cơm pha cay.", avgPrice: 150000 },
  { slug: "ram-cuon-cai", name: "Ram cuốn cải", nameEn: "Fried Spring Rolls with Mustard Greens", description: "Ram nhỏ giòn cuốn cùng lá cải, rau thơm và đồ chua, chấm nước mắm chua ngọt.", avgPrice: 50000 },
  { slug: "mit-tron-da-nang", name: "Mít trộn Đà Nẵng", nameEn: "Da Nang Young Jackfruit Salad", description: "Mít non trộn da heo, tôm, đậu phộng, rau răm và hành phi, ăn kèm bánh tráng nướng.", avgPrice: 35000, destinationSlugs: ["cho-con-da-nang"] },
  { slug: "banh-bao-banh-vac", name: "Bánh bao bánh vạc", nameEn: "White Rose Dumplings", description: "Bánh bột gạo trong mỏng tạo hình như cánh hoa, nhân tôm thịt và rắc hành phi.", avgPrice: 70000, destinationSlugs: ["cho-hoi-an"] },
  { slug: "hoanh-thanh-hoi-an", name: "Hoành thánh Hội An", nameEn: "Hoi An Wontons", description: "Hoành thánh nhân thịt hoặc tôm, dùng theo kiểu chiên giòn, súp hoặc ăn cùng sốt cà chua.", avgPrice: 60000 },
  { slug: "banh-dap-hen-xao", name: "Bánh đập hến xào", nameEn: "Cracked Rice Crackers with Stir-fried Clams", description: "Bánh tráng nướng kẹp bánh ướt, bẻ giòn rồi ăn cùng hến xào và mắm nêm.", avgPrice: 45000, destinationSlugs: ["lang-moc-kim-bong"] },
  { slug: "che-bap-cam-nam", name: "Chè bắp Cẩm Nam", nameEn: "Cam Nam Sweet Corn Pudding", description: "Chè nấu từ bắp non ven sông Thu Bồn, có vị ngọt nhẹ và hương bắp tự nhiên.", avgPrice: 25000, destinationSlugs: ["lang-moc-kim-bong"] },
  { slug: "tam-huu-tra-que", name: "Tam hữu Trà Quế", nameEn: "Tra Que Three Friends Rolls", description: "Tôm, thịt và rau húng được buộc thành cuốn nhỏ bằng cọng hành, dùng với nước chấm.", avgPrice: 80000 },
  { slug: "xi-ma-phu", name: "Xí mà phù", nameEn: "Black Sesame Sweet Soup", description: "Chè mè đen sánh mịn có vị bùi, thơm và thường được bán trong các gánh nhỏ ở phố cổ.", avgPrice: 25000 },
  { slug: "nuoc-mot-hoi-an", name: "Nước Mót Hội An", nameEn: "Hoi An Herbal Drink", description: "Thức uống thảo mộc mát với sả, chanh, gừng và hương sen, thường dùng khi dạo phố cổ.", avgPrice: 20000 },
  { slug: "dau-hu-nuoc-duong-hoi-an", name: "Đậu hũ nước đường Hội An", nameEn: "Hoi An Silken Tofu Dessert", description: "Đậu hũ mềm dùng với nước đường gừng, đôi khi thêm thạch hoặc nước cốt dừa.", avgPrice: 20000, destinationSlugs: ["cho-hoi-an"] },
];

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
  locationSlug: LocationSlug;
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

const RESTAURANTS_DATA: RestaurantSeed[] = [
  { slug: "demo-hue-quan-banh-kim-long", locationSlug: "hue", cuisineSlugs: ["banh-beo-hue", "banh-nam-hue", "banh-loc-hue"], name: "SmartTrip Demo · Quán Bánh Kim Long", description: "Điểm demo phục vụ nhiều loại bánh Huế theo phần nhỏ, phù hợp nhóm muốn thử nhiều món.", address: "Khu Kim Long, Huế (dữ liệu demo)", latitude: 16.4591, longitude: 107.5537, priceMin: 25000, priceMax: 90000, rating: 4.6, reviewCount: 286, tags: ["local", "budget", "family", "snack"] },
  { slug: "demo-hue-nem-lui-thuy-xuan", locationSlug: "hue", cuisineSlugs: ["nem-lui-hue", "banh-loc-hue"], name: "SmartTrip Demo · Nem Lụi Thủy Xuân", description: "Quán demo gần tuyến lăng tẩm, có nem lụi và bánh Huế cho bữa trưa gọn.", address: "Khu Thủy Xuân, Huế (dữ liệu demo)", latitude: 16.4378, longitude: 107.5696, priceMin: 40000, priceMax: 130000, rating: 4.7, reviewCount: 354, tags: ["local", "lunch", "family"] },
  { slug: "demo-hue-che-ben-song", locationSlug: "hue", cuisineSlugs: ["che-hue"], name: "SmartTrip Demo · Chè Bên Sông", description: "Điểm demo bán nhiều loại chè Huế, phù hợp dừng chân sau khi dạo sông Hương.", address: "Ven sông Hương, Huế (dữ liệu demo)", latitude: 16.4683, longitude: 107.5873, priceMin: 15000, priceMax: 45000, rating: 4.5, reviewCount: 421, tags: ["dessert", "budget", "riverside", "night"] },
  { slug: "demo-hue-com-am-phu-an-cuu", locationSlug: "hue", cuisineSlugs: ["com-am-phu", "nem-lui-hue"], name: "SmartTrip Demo · Cơm Âm Phủ An Cựu", description: "Quán demo cơm Huế nhiều thành phần, phù hợp bữa trưa và nhóm gia đình.", address: "Khu An Cựu, Huế (dữ liệu demo)", latitude: 16.4522, longitude: 107.6001, priceMin: 45000, priceMax: 140000, rating: 4.6, reviewCount: 238, tags: ["local", "lunch", "family"] },
  { slug: "demo-hue-banh-canh-nam-pho", locationSlug: "hue", cuisineSlugs: ["banh-canh-nam-pho", "banh-nam-hue"], name: "SmartTrip Demo · Bánh Canh Nam Phổ", description: "Điểm demo món bánh canh sánh và bánh lá, phục vụ từ chiều đến tối.", address: "Khu Phú Vang, Huế (dữ liệu demo)", latitude: 16.4961, longitude: 107.6538, priceMin: 25000, priceMax: 70000, rating: 4.7, reviewCount: 197, tags: ["local", "budget", "afternoon"] },
  { slug: "demo-hue-dac-san-thuan-an", locationSlug: "hue", cuisineSlugs: ["tom-chua-hue", "banh-loc-hue"], name: "SmartTrip Demo · Đặc Sản Thuận An", description: "Điểm demo gần biển, giới thiệu tôm chua và các món bánh dùng làm quà.", address: "Thuận An, Huế (dữ liệu demo)", latitude: 16.5658, longitude: 107.6337, priceMin: 50000, priceMax: 220000, rating: 4.5, reviewCount: 164, tags: ["local", "seaside", "souvenir", "family"] },
  { slug: "demo-hue-bep-dem-co-do", locationSlug: "hue", cuisineSlugs: ["nem-lui-hue", "che-hue"], name: "SmartTrip Demo · Bếp Đêm Cố Đô", description: "Quán demo phục vụ tối muộn với nem lụi, món ăn nhẹ và chè Huế.", address: "Trung tâm Huế (dữ liệu demo)", latitude: 16.4667, longitude: 107.5909, priceMin: 30000, priceMax: 120000, rating: 4.4, reviewCount: 309, tags: ["night", "local", "street-food"], isOpenLate: true, openingHours: EVERY_DAY_10_2330 },
  { slug: "demo-hue-banh-gia-dinh", locationSlug: "hue", cuisineSlugs: ["banh-beo-hue", "banh-loc-hue", "banh-nam-hue"], name: "SmartTrip Demo · Bếp Bánh Gia Đình", description: "Không gian demo yên tĩnh, khẩu vị vừa và có suất tổng hợp cho gia đình.", address: "Khu Vĩ Dạ, Huế (dữ liệu demo)", latitude: 16.4714, longitude: 107.5981, priceMin: 35000, priceMax: 150000, rating: 4.8, reviewCount: 272, tags: ["family", "quiet", "local", "mild"] },
  { slug: "demo-da-nang-bun-cha-ca-han", locationSlug: "da-nang", cuisineSlugs: ["bun-cha-ca-da-nang"], name: "SmartTrip Demo · Bún Chả Cá Sông Hàn", description: "Quán demo bún chả cá cho bữa sáng hoặc trưa gần khu trung tâm.", address: "Hải Châu, Đà Nẵng (dữ liệu demo)", latitude: 16.0692, longitude: 108.2217, priceMin: 30000, priceMax: 75000, rating: 4.7, reviewCount: 548, tags: ["breakfast", "local", "budget"] },
  { slug: "demo-da-nang-goi-ca-nam-o", locationSlug: "da-nang", cuisineSlugs: ["goi-ca-nam-o"], name: "SmartTrip Demo · Gỏi Cá Làng Nam Ô", description: "Điểm demo chuyên gỏi cá, phù hợp nhóm bạn muốn thử món đặc trưng làng biển.", address: "Nam Ô, Liên Chiểu, Đà Nẵng (dữ liệu demo)", latitude: 16.1261, longitude: 108.1302, priceMin: 90000, priceMax: 260000, rating: 4.8, reviewCount: 376, tags: ["local", "seafood", "group"] },
  { slug: "demo-da-nang-banh-xeo-hai-chau", locationSlug: "da-nang", cuisineSlugs: ["banh-xeo-da-nang", "ram-cuon-cai"], name: "SmartTrip Demo · Bánh Xèo Hải Châu", description: "Quán demo bánh xèo và ram cuốn cải, có phần ăn cho nhóm hai đến bốn người.", address: "Hải Châu, Đà Nẵng (dữ liệu demo)", latitude: 16.0611, longitude: 108.2184, priceMin: 50000, priceMax: 170000, rating: 4.6, reviewCount: 462, tags: ["local", "family", "dinner"] },
  { slug: "demo-da-nang-oc-hut-cho-con", locationSlug: "da-nang", cuisineSlugs: ["oc-hut-da-nang", "mit-tron-da-nang"], name: "SmartTrip Demo · Ốc Hút Chợ Cồn", description: "Điểm demo món ăn vặt buổi chiều với ốc hút, mít trộn và bánh tráng.", address: "Gần Chợ Cồn, Đà Nẵng (dữ liệu demo)", latitude: 16.0668, longitude: 108.2136, priceMin: 25000, priceMax: 100000, rating: 4.5, reviewCount: 633, tags: ["street-food", "budget", "afternoon", "local"] },
  { slug: "demo-da-nang-bun-mam-tran-phu", locationSlug: "da-nang", cuisineSlugs: ["bun-mam-nem-da-nang", "mit-tron-da-nang"], name: "SmartTrip Demo · Bún Mắm Trần Phú", description: "Quán demo bún mắm nêm vị đậm, có lựa chọn mức cay và phần ăn nhỏ.", address: "Trần Phú, Đà Nẵng (dữ liệu demo)", latitude: 16.0653, longitude: 108.2235, priceMin: 30000, priceMax: 85000, rating: 4.6, reviewCount: 394, tags: ["local", "budget", "spicy"] },
  { slug: "demo-da-nang-be-thui-gia-dinh", locationSlug: "da-nang", cuisineSlugs: ["be-thui-cau-mong", "ram-cuon-cai"], name: "SmartTrip Demo · Bê Thui Gia Đình", description: "Điểm demo phục vụ bê thui theo phần, phù hợp nhóm gia đình và bữa tối.", address: "Cẩm Lệ, Đà Nẵng (dữ liệu demo)", latitude: 16.0308, longitude: 108.2126, priceMin: 100000, priceMax: 350000, rating: 4.8, reviewCount: 431, tags: ["family", "local", "dinner", "group"] },
  { slug: "demo-da-nang-an-vat-ban-dem", locationSlug: "da-nang", cuisineSlugs: ["oc-hut-da-nang", "ram-cuon-cai", "mit-tron-da-nang"], name: "SmartTrip Demo · Ăn Vặt Ban Đêm", description: "Quán demo mở muộn với nhiều món nhỏ, phù hợp lịch dạo cầu và sông Hàn.", address: "Sơn Trà, Đà Nẵng (dữ liệu demo)", latitude: 16.0674, longitude: 108.2361, priceMin: 20000, priceMax: 110000, rating: 4.4, reviewCount: 517, tags: ["night", "street-food", "budget"], isOpenLate: true, openingHours: EVERY_DAY_10_2330 },
  { slug: "demo-da-nang-bep-mien-trung", locationSlug: "da-nang", cuisineSlugs: ["bun-cha-ca-da-nang", "banh-xeo-da-nang", "be-thui-cau-mong"], name: "SmartTrip Demo · Bếp Miền Trung", description: "Nhà hàng demo có thực đơn nhiều món, không gian rộng cho gia đình và nhóm đông.", address: "Ngũ Hành Sơn, Đà Nẵng (dữ liệu demo)", latitude: 16.0442, longitude: 108.2454, priceMin: 70000, priceMax: 320000, rating: 4.9, reviewCount: 705, tags: ["family", "local", "premium", "group"] },
  { slug: "demo-hoi-an-banh-hoa-hong", locationSlug: "hoi-an", cuisineSlugs: ["banh-bao-banh-vac", "hoanh-thanh-hoi-an"], name: "SmartTrip Demo · Bánh Hoa Hồng Phố Hội", description: "Điểm demo bánh bao bánh vạc và hoành thánh trong bán kính đi bộ phố cổ.", address: "Phố cổ Hội An (dữ liệu demo)", latitude: 15.8784, longitude: 108.3327, priceMin: 45000, priceMax: 130000, rating: 4.8, reviewCount: 612, tags: ["local", "walking", "lunch"] },
  { slug: "demo-hoi-an-banh-dap-cam-nam", locationSlug: "hoi-an", cuisineSlugs: ["banh-dap-hen-xao", "che-bap-cam-nam"], name: "SmartTrip Demo · Bánh Đập Cẩm Nam", description: "Quán demo ven sông phục vụ bánh đập hến xào và chè bắp.", address: "Cẩm Nam, Hội An (dữ liệu demo)", latitude: 15.8742, longitude: 108.3378, priceMin: 25000, priceMax: 100000, rating: 4.7, reviewCount: 389, tags: ["local", "riverside", "budget"] },
  { slug: "demo-hoi-an-bep-rau-tra-que-moi", locationSlug: "hoi-an", cuisineSlugs: ["tam-huu-tra-que", "banh-bao-banh-vac"], name: "SmartTrip Demo · Bếp Rau Trà Quế Mới", description: "Điểm demo ưu tiên rau thơm địa phương, món nhẹ và không gian phù hợp gia đình.", address: "Trà Quế, Hội An (dữ liệu demo)", latitude: 15.8996, longitude: 108.3391, priceMin: 60000, priceMax: 190000, rating: 4.8, reviewCount: 246, tags: ["family", "vegetarian-friendly", "quiet", "local"] },
  { slug: "demo-hoi-an-xi-ma-phu", locationSlug: "hoi-an", cuisineSlugs: ["xi-ma-phu", "dau-hu-nuoc-duong-hoi-an"], name: "SmartTrip Demo · Gánh Chè Phố Cổ", description: "Điểm demo món ngọt truyền thống, phù hợp dừng chân khi đi bộ trong phố cổ.", address: "Khu phố cổ Hội An (dữ liệu demo)", latitude: 15.8779, longitude: 108.3312, priceMin: 15000, priceMax: 45000, rating: 4.6, reviewCount: 493, tags: ["dessert", "walking", "budget", "local"] },
  { slug: "demo-hoi-an-nuoc-thao-moc", locationSlug: "hoi-an", cuisineSlugs: ["nuoc-mot-hoi-an", "che-bap-cam-nam"], name: "SmartTrip Demo · Nước Thảo Mộc Sông Hoài", description: "Quầy demo đồ uống thảo mộc và chè mang đi gần tuyến dạo bộ ven sông.", address: "Ven sông Hoài, Hội An (dữ liệu demo)", latitude: 15.8768, longitude: 108.3329, priceMin: 15000, priceMax: 50000, rating: 4.5, reviewCount: 701, tags: ["drink", "walking", "riverside", "budget"] },
  { slug: "demo-hoi-an-hoanh-thanh-dem", locationSlug: "hoi-an", cuisineSlugs: ["hoanh-thanh-hoi-an", "banh-bao-banh-vac"], name: "SmartTrip Demo · Hoành Thánh Đêm Hội An", description: "Quán demo mở muộn, có hoành thánh chiên và súp cho khách dạo phố ban đêm.", address: "Cẩm Phô, Hội An (dữ liệu demo)", latitude: 15.8791, longitude: 108.3281, priceMin: 40000, priceMax: 130000, rating: 4.6, reviewCount: 358, tags: ["night", "walking", "local"], isOpenLate: true, openingHours: EVERY_DAY_10_2330 },
  { slug: "demo-hoi-an-bep-kim-bong", locationSlug: "hoi-an", cuisineSlugs: ["banh-dap-hen-xao", "tam-huu-tra-que"], name: "SmartTrip Demo · Bếp Kim Bồng", description: "Điểm demo gần làng nghề, phục vụ món địa phương theo kiểu bữa cơm gia đình.", address: "Cẩm Kim, Hội An (dữ liệu demo)", latitude: 15.8724, longitude: 108.3093, priceMin: 50000, priceMax: 180000, rating: 4.7, reviewCount: 211, tags: ["family", "local", "quiet", "riverside"] },
  { slug: "demo-hoi-an-bua-toi-di-san", locationSlug: "hoi-an", cuisineSlugs: ["banh-bao-banh-vac", "tam-huu-tra-que", "hoanh-thanh-hoi-an"], name: "SmartTrip Demo · Bữa Tối Di Sản", description: "Nhà hàng demo phân khúc cao hơn với thực đơn nhiều món dành cho gia đình hoặc cặp đôi.", address: "Trung tâm Hội An (dữ liệu demo)", latitude: 15.8803, longitude: 108.3341, priceMin: 120000, priceMax: 360000, rating: 4.9, reviewCount: 584, tags: ["premium", "dinner", "family", "local"] },
];

function assertMapEntries(map: Map<string, string>, slugs: readonly string[], label: string) {
  const missing = slugs.filter((slug) => !map.has(slug));
  if (missing.length > 0) {
    throw new Error("Thiếu " + label + ": " + missing.join(", "));
  }
}

async function seedLocationsAndCategories() {
  await db
    .insert(locations)
    .values(LOCATION_DATA.map((item) => ({ ...item })))
    .onConflictDoNothing({ target: locations.slug });
  await db
    .insert(destinationCategories)
    .values(CATEGORY_DATA.map((item) => ({ ...item })))
    .onConflictDoNothing({ target: destinationCategories.slug });

  const locationRows = await db
    .select({ id: locations.id, slug: locations.slug })
    .from(locations)
    .where(inArray(locations.slug, LOCATION_DATA.map((item) => item.slug)));
  const categoryRows = await db
    .select({ id: destinationCategories.id, slug: destinationCategories.slug })
    .from(destinationCategories)
    .where(inArray(destinationCategories.slug, CATEGORY_DATA.map((item) => item.slug)));
  const locationMap = new Map(locationRows.map((row) => [row.slug, row.id]));
  const categoryMap = new Map(categoryRows.map((row) => [row.slug, row.id]));

  assertMapEntries(locationMap, LOCATION_DATA.map((item) => item.slug), "location");
  assertMapEntries(categoryMap, CATEGORY_DATA.map((item) => item.slug), "destination category");
  console.log("✔ locations: " + locationRows.length + "/" + LOCATION_DATA.length);
  console.log("✔ destination_categories: " + categoryRows.length + "/" + CATEGORY_DATA.length);
  return { locationMap, categoryMap };
}

async function seedDestinations(locationMap: Map<string, string>, categoryMap: Map<string, string>) {
  await db
    .insert(destinations)
    .values(
      DESTINATIONS_DATA.map((item) => ({
        locationId: locationMap.get(item.locationSlug)!,
        slug: item.slug,
        name: item.name,
        nameEn: item.nameEn,
        address: item.address,
        description: item.description,
        history: item.history,
        latitude: item.latitude,
        longitude: item.longitude,
      })),
    )
    .onConflictDoNothing({ target: destinations.slug });

  const rows = await db
    .select({ id: destinations.id, slug: destinations.slug })
    .from(destinations)
    .where(inArray(destinations.slug, DESTINATIONS_DATA.map((item) => item.slug)));
  const destinationMap = new Map(rows.map((row) => [row.slug, row.id]));
  assertMapEntries(destinationMap, DESTINATIONS_DATA.map((item) => item.slug), "destination");

  const categoryLinks = DESTINATIONS_DATA.flatMap((item) =>
    item.categorySlugs.map((categorySlug) => ({
      destinationId: destinationMap.get(item.slug)!,
      categoryId: categoryMap.get(categorySlug)!,
    })),
  );
  await db
    .insert(destinationsToCategoies)
    .values(categoryLinks)
    .onConflictDoNothing({
      target: [destinationsToCategoies.destinationId, destinationsToCategoies.categoryId],
    });

  console.log("✔ destinations: " + rows.length + "/" + DESTINATIONS_DATA.length);
  console.log("✔ destinations_to_categories: " + categoryLinks.length + " liên kết");
  return destinationMap;
}

async function seedCuisines(destinationMap: Map<string, string>) {
  const referencedDestinationSlugs = Array.from(
    new Set(CUISINES_DATA.flatMap((item) => item.destinationSlugs ?? [])),
  );
  assertMapEntries(destinationMap, referencedDestinationSlugs, "cuisine destination");

  await db
    .insert(cuisines)
    .values(
      CUISINES_DATA.map((item) => ({
        slug: item.slug,
        name: item.name,
        nameEn: item.nameEn,
        description: item.description,
        avgPrice: item.avgPrice,
      })),
    )
    .onConflictDoNothing({ target: cuisines.slug });

  const rows = await db
    .select({ id: cuisines.id, slug: cuisines.slug })
    .from(cuisines)
    .where(inArray(cuisines.slug, CUISINES_DATA.map((item) => item.slug)));
  const cuisineMap = new Map(rows.map((row) => [row.slug, row.id]));
  assertMapEntries(cuisineMap, CUISINES_DATA.map((item) => item.slug), "cuisine");

  const destinationLinks = CUISINES_DATA.flatMap((item) =>
    (item.destinationSlugs ?? []).map((destinationSlug) => ({
      cuisineId: cuisineMap.get(item.slug)!,
      destinationId: destinationMap.get(destinationSlug)!,
    })),
  );
  if (destinationLinks.length > 0) {
    await db
      .insert(cuisinesToDestinations)
      .values(destinationLinks)
      .onConflictDoNothing({
        target: [cuisinesToDestinations.cuisineId, cuisinesToDestinations.destinationId],
      });
  }

  console.log("✔ cuisines: " + rows.length + "/" + CUISINES_DATA.length);
  console.log("✔ cuisines_to_destinations: " + destinationLinks.length + " liên kết");
  return cuisineMap;
}

async function seedRestaurants(locationMap: Map<string, string>, cuisineMap: Map<string, string>) {
  const referencedCuisineSlugs = Array.from(new Set(RESTAURANTS_DATA.flatMap((item) => item.cuisineSlugs)));
  assertMapEntries(cuisineMap, referencedCuisineSlugs, "restaurant cuisine");

  await db
    .insert(restaurants)
    .values(
      RESTAURANTS_DATA.map((item) => ({
        locationId: locationMap.get(item.locationSlug)!,
        slug: item.slug,
        name: item.name,
        description: item.description,
        address: item.address,
        latitude: item.latitude,
        longitude: item.longitude,
        priceMin: item.priceMin,
        priceMax: item.priceMax,
        rating: item.rating,
        reviewCount: item.reviewCount,
        openingHours: item.openingHours ?? EVERY_DAY_06_22,
        tags: item.tags,
        isOpenLate: item.isOpenLate ?? false,
        isFamilyFriendly: item.isFamilyFriendly ?? true,
        isActive: true,
        source: "demo" as const,
      })),
    )
    .onConflictDoNothing({ target: restaurants.slug });

  const rows = await db
    .select({ id: restaurants.id, slug: restaurants.slug })
    .from(restaurants)
    .where(inArray(restaurants.slug, RESTAURANTS_DATA.map((item) => item.slug)));
  const restaurantMap = new Map(rows.map((row) => [row.slug, row.id]));
  assertMapEntries(restaurantMap, RESTAURANTS_DATA.map((item) => item.slug), "restaurant");

  const cuisineLinks = RESTAURANTS_DATA.flatMap((item) =>
    item.cuisineSlugs.map((cuisineSlug, index) => ({
      restaurantId: restaurantMap.get(item.slug)!,
      cuisineId: cuisineMap.get(cuisineSlug)!,
      isSignature: index === 0,
    })),
  );
  await db
    .insert(restaurantsToCuisines)
    .values(cuisineLinks)
    .onConflictDoNothing({
      target: [restaurantsToCuisines.restaurantId, restaurantsToCuisines.cuisineId],
    });

  console.log("✔ restaurants: " + rows.length + "/" + RESTAURANTS_DATA.length);
  console.log("✔ restaurants_to_cuisines: " + cuisineLinks.length + " liên kết");
}

async function main() {
  console.log("Bắt đầu seed dữ liệu mở rộng Huế - Đà Nẵng - Hội An...\n");
  const { locationMap, categoryMap } = await seedLocationsAndCategories();
  const destinationMap = await seedDestinations(locationMap, categoryMap);
  const cuisineMap = await seedCuisines(destinationMap);
  await seedRestaurants(locationMap, cuisineMap);
  console.log("\nSeed dữ liệu mở rộng hoàn tất.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Seed dữ liệu mở rộng thất bại:", error);
  process.exit(1);
});
