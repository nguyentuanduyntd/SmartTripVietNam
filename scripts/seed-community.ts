import "./env";
import { eq, inArray } from "drizzle-orm";
import { db } from "../src/db";
import { locations } from "../src/db/schema/locations";
import { destinations } from "../src/db/schema/destinations";
import { profiles } from "../src/db/schema/profiles";
import { communityPosts, postComments, postLikes, postSaves, communityReports, postDestinations } from "../src/db/schema/community";
import type { CommunityReportReason } from "../src/constants/tour_community";

const DEMO_USERS = [
  { id: "00000000-0000-0000-0000-000000000101", fullName: "Nguyen Minh Tuan", avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=minhtuan", role: "user" as const },
  { id: "00000000-0000-0000-0000-000000000102", fullName: "Tran Thi Lan Anh", avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=lananh", role: "user" as const },
  { id: "00000000-0000-0000-0000-000000000103", fullName: "Pham Quoc Huy", avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=quochuy", role: "user" as const },
  { id: "00000000-0000-0000-0000-000000000104", fullName: "Le Thuy Duong", avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=thuydung", role: "user" as const },
  { id: "00000000-0000-0000-0000-000000000105", fullName: "Vo Thanh Phong", avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=thanhphong", role: "user" as const },
  { id: "00000000-0000-0000-0000-000000000106", fullName: "Do Huong Giang", avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=huonggiang", role: "user" as const },
  { id: "00000000-0000-0000-0000-000000000107", fullName: "Bui Van Nam", avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=vannam", role: "user" as const },
  { id: "00000000-0000-0000-0000-000000000108", fullName: "Hoang Thu Ha", avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=thuha", role: "user" as const },
];

type PostSeed = {
  id: string;
  userId: string;
  locationSlug: string;
  destinationSlugs: string[];
  title: string;
  content: string;
  rating: number;
  tripStartDate: string;
  tripEndDate: string;
  dayCount: number;
  estimatedCost: string;
  status: "approved" | "pending" | "hidden";
};

const POSTS_DATA: PostSeed[] = [
  {
    id: "00000000-0000-0000-0001-000000000001",
    userId: "00000000-0000-0000-0000-000000000101",
    locationSlug: "hue",
    destinationSlugs: ["hoang-thanh-hue", "lang-khai-dinh", "lang-minh-mang"],
    title: "3 ngay 2 dem kham pha lang tam Hue - dep hon toi tuong rat nhieu!",
    content: "Minh vua tro ve tu chuyen di Hue va phai viet ngay review truoc khi quen mat cam xuc.\n\nNgay dau tien minh den Dai Noi vao luc 8h sang - day la thoi diem ly tuong nhat vi chua dong khach. Toan bo quan the Hoang thanh that su rong lon hon nhieu so voi anh tren mang. Dien Thai Hoa duoc trung tu rat dep, mau son do vang ong anh duoi nang sang.\n\nBuoi chieu minh di Lang Khai Dinh - neu ban chi co the den mot lang, hay chon cai nay! Nghe thuat kham sanh su trong dien Khai Thanh cong phu den tung chi tiet nho, nhin mai khong chan.\n\nNgay 2 di Lang Minh Mang, bo cuc doi xung cuc ky an tuong, dac biet khu vuc ho ban nguyet. Goi y: mang theo do an nhe vi khu vuc nay khong co nhieu quan an gan lang.\n\nChi phi 3N2D cua minh (2 nguoi): ve tham quan ~600k, khach san 3 sao ~1.2tr/dem, an uong ~800k/ngay. Tong khoang 5-6 trieu/nguoi rat hop ly!",
    rating: 5,
    tripStartDate: "2025-03-10",
    tripEndDate: "2025-03-12",
    dayCount: 3,
    estimatedCost: "5500000",
    status: "approved",
  },
  {
    id: "00000000-0000-0000-0001-000000000002",
    userId: "00000000-0000-0000-0000-000000000102",
    locationSlug: "hue",
    destinationSlugs: ["chua-thien-mu", "cau-trang-tien", "cho-dong-ba"],
    title: "Hue buoi sang som - yen tinh va tho mong den la",
    content: "Minh la nguoi hay day som nen chuyen Hue lan nay minh tan dung toi da buoi sang.\n\n5h30 sang ra bo song Huong, mat song phang lang nhu guong, cau Trang Tien phan chieu xuong nuoc cuc dep. Gan nhu khong co khach du lich nao, chi co nguoi dan dia phuong di tap the duc.\n\nMinh dat thuyen luc 7h de den chua Thien Mu theo duong song. Tieng chuong chua vong ra tu xa, khong khi trong lanh va yen binh den muc khong muon ve.\n\nBuoi sang ket thuc o cho Dong Ba - day la noi minh mua duoc nhieu dac san nhat: me xuong, banh dau xanh, tom chua... Gia ca hop ly hon han cac cua hang o pho co.\n\nTip: dung mac ca qua hung, nguoi ban hang o day rat than thien nhung ho cung co gioi han.",
    rating: 5,
    tripStartDate: "2025-01-20",
    tripEndDate: "2025-01-22",
    dayCount: 2,
    estimatedCost: "3200000",
    status: "approved",
  },
  {
    id: "00000000-0000-0000-0001-000000000003",
    userId: "00000000-0000-0000-0000-000000000103",
    locationSlug: "hue",
    destinationSlugs: ["lang-tu-duc", "hoang-thanh-hue"],
    title: "Review lang Tu Duc - lang man nhat trong cac lang tam Hue",
    content: "Da den Hue 3 lan nhung day la lan dau minh danh tron buoi sang cho Lang Tu Duc va phai noi: WOW.\n\nKhu vuc ho Luu Khiem voi nhung cay co thu rop bong that su nhu di vao mot buc tranh thuy mac. Vua Tu Duc tung dung day lam noi nghi ngoi, doc sach, lam tho - minh hieu tai sao!\n\nBuoi chieu minh quay lai Dai Noi de chup anh hoang hon qua cong Ngo Mon. Anh nang chieu do xuong mai ngoi vang thuc su rat dep.\n\nLuu y: ve tham quan Dai Noi hien la 200k/nguoi, lang Tu Duc 100k/nguoi. Mua combo tiet kiem hon. Dat ve online truoc de tranh xep hang.",
    rating: 4,
    tripStartDate: "2025-04-05",
    tripEndDate: "2025-04-06",
    dayCount: 2,
    estimatedCost: "2800000",
    status: "approved",
  },
  {
    id: "00000000-0000-0000-0001-000000000004",
    userId: "00000000-0000-0000-0000-000000000104",
    locationSlug: "da-nang",
    destinationSlugs: ["ba-na-hills", "cau-rong"],
    title: "Ba Na Hills - dang tien hay khong? Review thang than sau khi di ve",
    content: "Ve Ba Na Hills hien kha dat (khoang 750k - 1tr/nguoi tuy combo), nen truoc khi di minh cung phan van. Sau khi ve thi... dang tien theo nghia rieng cua no!\n\nDiem cong lon nhat la Cau Vang - that su an tuong khi dung tren cay cau voi hai ban tay khong lo do ben duoi, nhin xuong bien may la cam giac khong ta duoc. Minh den dung buoi sang khi may chua tan nen rat huyen ao.\n\nLang Phap co tich dep kieu san khau - phu hop chup anh, khong nen ky vong trai nghiem van hoa that su.\n\nHan che: dong nguoi cuc ky (nhat la cuoi tuan), buffet trua trong khu khong ngon lam, gia do an thuc uong rat cao.\n\nTong ket: di 1 lan cho biet, khong can di lan 2. Nhung lan 1 thi cuc dang!",
    rating: 4,
    tripStartDate: "2025-05-15",
    tripEndDate: "2025-05-16",
    dayCount: 2,
    estimatedCost: "4200000",
    status: "approved",
  },
  {
    id: "00000000-0000-0000-0001-000000000005",
    userId: "00000000-0000-0000-0000-000000000105",
    locationSlug: "da-nang",
    destinationSlugs: ["bai-bien-my-khe", "chua-linh-ung-son-tra", "ngu-hanh-son"],
    title: "5 ngay bien Da Nang - minh da lam gi moi ngay?",
    content: "Chuyen di lan nay minh chu yeu nghi duong o bien My Khe. Day la lich trinh thuc te cua minh:\n\nNgay 1: Nhan phong, tam bien buoi chieu mat. Bien My Khe song vua phai, nuoc trong, bai cat dai. Buoi toi an hai san tuoi o khu vuc gan bo bien.\n\nNgay 2: Thue xe may leo len ban dao Son Tra vieng chua Linh Ung. Tuong Quan Am cao 67m nhin ra bien - goc nhin tu chan tuong xuong cang Da Nang dep khong kem Cau Vang.\n\nNgay 3: Ngu Hanh Son - leo nui buoi sang mat, tham quan hang dong va chua trong long nui rat thu vi. Chieu mua da my nghe o lang dieu khac ben canh.\n\nNgay 4-5: Luoi bieng huong thu bien, doc sach, an sang muon.\n\nTip quan trong: thue xe may tu di se tiet kiem va linh hoat hon rat nhieu so voi tour.",
    rating: 5,
    tripStartDate: "2025-06-10",
    tripEndDate: "2025-06-14",
    dayCount: 5,
    estimatedCost: "7800000",
    status: "approved",
  },
  {
    id: "00000000-0000-0000-0001-000000000006",
    userId: "00000000-0000-0000-0000-000000000106",
    locationSlug: "da-nang",
    destinationSlugs: ["bao-tang-dieu-khac-cham", "cau-rong"],
    title: "Bao tang Dieu khac Cham - vien ngoc an giua long Da Nang",
    content: "Hau het khach du lich den Da Nang deu bo qua Bao tang Dieu khac Cham - do la mot sai lam lon!\n\nMinh den vao buoi chieu tranh nang, gia ve chi 60k/nguoi. Bo suu tap dieu khac da tu the ky 5-15 cuc ky phong phu va duoc bao quan tot. Dac biet an tuong la phong trung bay cac tuong than Shiva va Ganesha khong lo.\n\nKhong gian bao tang yen tinh, thoang mat, co thuyet minh bang nhieu thu tieng. Minh mat khoang 1.5-2 tieng de xem het.\n\nToi do minh di bo qua Cau Rong de xem phun lua (22h cuoi tuan). Kha dong nhung xung dang cho!\n\nKet luan: day la 2 diem tham quan rat xung dang ma gia ve cuc re so voi Ba Na Hills.",
    rating: 5,
    tripStartDate: "2025-02-22",
    tripEndDate: "2025-02-23",
    dayCount: 2,
    estimatedCost: "2100000",
    status: "approved",
  },
  {
    id: "00000000-0000-0000-0001-000000000007",
    userId: "00000000-0000-0000-0000-000000000107",
    locationSlug: "hoi-an",
    destinationSlugs: ["pho-co-hoi-an", "chua-cau-hoi-an", "lang-gom-thanh-ha"],
    title: "Hoi An ve dem - ly do minh da quay lai 3 lan va van muon quay them",
    content: "Khong biet noi gi hon ngoai: Hoi An ve dem la mot trong nhung trai nghiem dep nhat minh tung co o Viet Nam.\n\nDem dau tien minh di bo tu Chua Cau doc theo pho Nguyen Thai Hoc. Den long du mau, tieng nhac dan gian tu cac quan ca phe vang ra, khach du lich tu khap noi tren the gioi - moi thu tao nen mot bau khong khi hoan toan khac biet.\n\nSang hom sau minh thue xe dap den lang gom Thanh Ha. Duong di ven song Thu Bon rat dep, dac biet buoi sang som. O lang gom, minh dang ky trai nghiem tu nan gom (~50k/nguoi) - rat vui!\n\nTip: mua ve tham quan khu pho co (120k/nguoi, duoc vao 5 diem) se tiet kiem hon mua le. Tranh di vao thang 10-11 vi la mua lu o Hoi An.",
    rating: 5,
    tripStartDate: "2025-04-18",
    tripEndDate: "2025-04-20",
    dayCount: 3,
    estimatedCost: "4100000",
    status: "approved",
  },
  {
    id: "00000000-0000-0000-0001-000000000008",
    userId: "00000000-0000-0000-0000-000000000108",
    locationSlug: "hoi-an",
    destinationSlugs: ["rung-dua-bay-mau", "lang-rau-tra-que", "cu-lao-cham"],
    title: "Hoi An sinh thai - 3 trai nghiem thien nhien ban khong nen bo qua",
    content: "Nhieu nguoi den Hoi An chi tap trung vao pho co, nhung xung quanh con nhieu diem thien nhien cuc dep ma it ai biet den.\n\nRung dua Bay Mau: Cheo thuyen thung vao rung dua nuoc la trai nghiem dac biet nhat trong chuyen di. Thuyen nan nho luon lach giua nhung hang dua nuoc, nghe tieng chim hot, ngam anh nang loc qua tan la. Minh chon tour buoi sang som de tranh nong va dong nguoi.\n\nLang rau Tra Que: Thue xe dap tu pho co ra day khoang 3km. Day la noi trong cac loai rau thom dac trung Hoi An nhu hung que, tia to, mui tau. Co the dang ky lam nong dan 1 ngay, rat thu vi cho cac ban nho!\n\nCu Lao Cham: Can dat tour truoc (160k/nguoi phi tau cao toc). San ho o day van con nguyen ven, nuoc trong xanh tuyet dep. Mang theo do an nhe vi gia do an tren dao hoi cao.",
    rating: 5,
    tripStartDate: "2025-07-02",
    tripEndDate: "2025-07-05",
    dayCount: 4,
    estimatedCost: "5600000",
    status: "approved",
  },
  {
    id: "00000000-0000-0000-0001-000000000009",
    userId: "00000000-0000-0000-0000-000000000103",
    locationSlug: "da-nang",
    destinationSlugs: ["ba-na-hills"],
    title: "Mua ve Ba Na Hills gia re o day!!!",
    content: "Lien he minh de mua ve Ba Na Hills gia re hon 30% so voi gia chinh thuc. Inbox ngay de duoc tu van. Dam bao uy tin 100%!!!",
    rating: 1,
    tripStartDate: "2025-08-01",
    tripEndDate: "2025-08-01",
    dayCount: 1,
    estimatedCost: "0",
    status: "hidden",
  },
  {
    id: "00000000-0000-0000-0001-000000000010",
    userId: "00000000-0000-0000-0000-000000000105",
    locationSlug: "hue",
    destinationSlugs: ["hoang-thanh-hue"],
    title: "Lan dau den Hue voi gia dinh - nhung dieu minh uoc biet truoc",
    content: "Chuyen di Hue dau tien voi bo me (60+ tuoi) va 2 con nho (5 va 8 tuoi) - len ke hoach rat ky nhung van co nhung dieu bat ngo.\n\nDai Noi phu hop voi nguoi lon tuoi vi duong di bang phang, co nhieu bong cay. Nhung troi nang nong nen can mang theo o va nuoc uong.\n\nLang tam thi kho hon vi nhieu bac thang, bo me minh chi di duoc toi san ngoai. Neu di voi nguoi lon tuoi nen chon Lang Minh Mang (bang phang hon) thay vi Lang Khai Dinh (nhieu bac).\n\nTre em rat thich Dai Noi vi rong, co nhieu cho chay nhay. Nhung can quan ly chat vi de di lac.",
    rating: 4,
    tripStartDate: "2025-08-15",
    tripEndDate: "2025-08-17",
    dayCount: 3,
    estimatedCost: "9800000",
    status: "pending",
  },
];

type CommentSeed = {
  id: string;
  postId: string;
  userId: string;
  parentId?: string;
  content: string;
  status: "approved" | "pending" | "hidden";
};

const COMMENTS_DATA: CommentSeed[] = [
  { id: "00000000-0000-0000-0002-000000000001", postId: "00000000-0000-0000-0001-000000000001", userId: "00000000-0000-0000-0000-000000000102", content: "Review rat chi tiet! Minh cung vua dat ve di Hue thang sau, bai nay giup ich rat nhieu.", status: "approved" },
  { id: "00000000-0000-0000-0002-000000000002", postId: "00000000-0000-0000-0001-000000000001", userId: "00000000-0000-0000-0000-000000000103", content: "Ban mua combo ve o dau vay? Minh tim tren web Trung tam Bao ton Di tich Co do Hue nhung hoi kho dieu huong.", status: "approved" },
  { id: "00000000-0000-0000-0002-000000000003", postId: "00000000-0000-0000-0001-000000000001", userId: "00000000-0000-0000-0000-000000000101", parentId: "00000000-0000-0000-0002-000000000002", content: "Minh mua truc tiep tai cong ban oi, nhung co the dat truoc online o hue.vn de tranh xep hang. Combo 5 diem gia 360k/nguoi.", status: "approved" },
  { id: "00000000-0000-0000-0002-000000000004", postId: "00000000-0000-0000-0001-000000000001", userId: "00000000-0000-0000-0000-000000000104", content: "Lang Khai Dinh dung la an tuong nhat! Minh ngoi trong dien Khai Thanh mat 30 phut chi de nhin tran nha.", status: "approved" },
  { id: "00000000-0000-0000-0002-000000000005", postId: "00000000-0000-0000-0001-000000000001", userId: "00000000-0000-0000-0000-000000000105", content: "Chi phi ban share rat thuc te. Minh di thang 3 cung ton tuong duong vay.", status: "approved" },
  { id: "00000000-0000-0000-0002-000000000006", postId: "00000000-0000-0000-0001-000000000001", userId: "00000000-0000-0000-0000-000000000106", content: "Ban co an com Vua o Hue khong? Minh dang phan van co dang tien khong.", status: "approved" },
  { id: "00000000-0000-0000-0002-000000000007", postId: "00000000-0000-0000-0001-000000000001", userId: "00000000-0000-0000-0000-000000000101", parentId: "00000000-0000-0000-0002-000000000006", content: "Minh co thu o nha hang Tinh Gia Vien - khong gian dep, do an cau ky nhung hoi nhat theo khau vi cua minh. Phu hop neu ban thich trai nghiem van hoa hon la an ngon.", status: "approved" },
  { id: "00000000-0000-0000-0002-000000000008", postId: "00000000-0000-0000-0001-000000000001", userId: "00000000-0000-0000-0000-000000000107", content: "Tour Hue gia re chi 500k/nguoi! Inbox minh ngay nhe! Uu dai co han!!!", status: "hidden" },
  { id: "00000000-0000-0000-0002-000000000009", postId: "00000000-0000-0000-0001-000000000002", userId: "00000000-0000-0000-0000-000000000104", content: "Minh cung thich day som de kham pha! Song Huong buoi binh minh dep lam.", status: "approved" },
  { id: "00000000-0000-0000-0002-000000000010", postId: "00000000-0000-0000-0001-000000000002", userId: "00000000-0000-0000-0000-000000000105", content: "Gia thuyen den chua Thien Mu khoang bao nhieu vay ban? Dat o dau?", status: "approved" },
  { id: "00000000-0000-0000-0002-000000000011", postId: "00000000-0000-0000-0001-000000000002", userId: "00000000-0000-0000-0000-000000000102", parentId: "00000000-0000-0000-0002-000000000010", content: "Thuyen rong khoang 150-200k/chuyen (ca thuyen), dat truc tiep o ben Toa Kham hoac nho khach san book giup.", status: "approved" },
  { id: "00000000-0000-0000-0002-000000000012", postId: "00000000-0000-0000-0001-000000000002", userId: "00000000-0000-0000-0000-000000000106", content: "Cho Dong Ba ban tom chua ngon lam! Minh mua ve lam qua moi nguoi ai cung thich.", status: "approved" },
  { id: "00000000-0000-0000-0002-000000000013", postId: "00000000-0000-0000-0001-000000000004", userId: "00000000-0000-0000-0000-000000000101", content: "Review trung thuc qua. Dong y 100% - di 1 lan thoi. Minh cung bi shock khi thay gia do uong trong khu.", status: "approved" },
  { id: "00000000-0000-0000-0002-000000000014", postId: "00000000-0000-0000-0001-000000000004", userId: "00000000-0000-0000-0000-000000000103", content: "Mua ve combo nao tiet kiem nhat ban oi? Minh thay tren web co may loai combo khac nhau rat kho chon.", status: "approved" },
  { id: "00000000-0000-0000-0002-000000000015", postId: "00000000-0000-0000-0001-000000000004", userId: "00000000-0000-0000-0000-000000000104", parentId: "00000000-0000-0000-0002-000000000014", content: "Minh chon combo Silver (cap treo + ve Fantasy Park), bo qua wax museum vi khong thich lam.", status: "approved" },
  { id: "00000000-0000-0000-0002-000000000016", postId: "00000000-0000-0000-0001-000000000004", userId: "00000000-0000-0000-0000-000000000106", content: "Ban den ngay thuong hay cuoi tuan? Minh du dinh di thu 3 de tranh dong.", status: "approved" },
  { id: "00000000-0000-0000-0002-000000000017", postId: "00000000-0000-0000-0001-000000000007", userId: "00000000-0000-0000-0000-000000000102", content: "Hoi An dem ram moi that su tuyet! Ho tat den dien, chi thap den long - khong khi hoan toan khac biet.", status: "approved" },
  { id: "00000000-0000-0000-0002-000000000018", postId: "00000000-0000-0000-0001-000000000007", userId: "00000000-0000-0000-0000-000000000105", content: "Lang gom Thanh Ha ban dat truoc chua hay den truc tiep? Minh so dong.", status: "approved" },
  { id: "00000000-0000-0000-0002-000000000019", postId: "00000000-0000-0000-0001-000000000007", userId: "00000000-0000-0000-0000-000000000107", parentId: "00000000-0000-0000-0002-000000000018", content: "Minh den truc tiep, buoi sang som khong dong lam. Tho gom o day rat than thien va vui tinh.", status: "approved" },
  { id: "00000000-0000-0000-0002-000000000020", postId: "00000000-0000-0000-0001-000000000007", userId: "00000000-0000-0000-0000-000000000101", content: "Hoi An la noi minh muon song chu khong chi du lich. Khong khi, am thuc, con nguoi - tat ca deu qua tuyet.", status: "approved" },
  { id: "00000000-0000-0000-0002-000000000021", postId: "00000000-0000-0000-0001-000000000008", userId: "00000000-0000-0000-0000-000000000103", content: "Cu Lao Cham minh cung me! San ho dep hon Phu Quoc nhieu vi it bi tac dong hon. Ban lan hay chi snorkeling?", status: "approved" },
  { id: "00000000-0000-0000-0002-000000000022", postId: "00000000-0000-0000-0001-000000000008", userId: "00000000-0000-0000-0000-000000000108", parentId: "00000000-0000-0000-0002-000000000021", content: "Minh chi snorkeling thoi vi chua co bang lan. Nhung snorkeling o day cung rat dep roi!", status: "approved" },
  { id: "00000000-0000-0000-0002-000000000023", postId: "00000000-0000-0000-0001-000000000008", userId: "00000000-0000-0000-0000-000000000104", content: "Cheo thuyen thung rung dua Bay Mau ban book tour nao vay? Tim mai khong biet chon tour nao uy tin.", status: "approved" },
  { id: "00000000-0000-0000-0002-000000000024", postId: "00000000-0000-0000-0001-000000000008", userId: "00000000-0000-0000-0000-000000000106", content: "Lang rau Tra Que co loai rau nao mua ve TP khong ban? Minh thich y tuong do.", status: "approved" },
];

const LIKES_DATA: { postId: string; userId: string }[] = [
  { postId: "00000000-0000-0000-0001-000000000001", userId: "00000000-0000-0000-0000-000000000102" },
  { postId: "00000000-0000-0000-0001-000000000001", userId: "00000000-0000-0000-0000-000000000103" },
  { postId: "00000000-0000-0000-0001-000000000001", userId: "00000000-0000-0000-0000-000000000104" },
  { postId: "00000000-0000-0000-0001-000000000001", userId: "00000000-0000-0000-0000-000000000105" },
  { postId: "00000000-0000-0000-0001-000000000001", userId: "00000000-0000-0000-0000-000000000106" },
  { postId: "00000000-0000-0000-0001-000000000001", userId: "00000000-0000-0000-0000-000000000107" },
  { postId: "00000000-0000-0000-0001-000000000001", userId: "00000000-0000-0000-0000-000000000108" },
  { postId: "00000000-0000-0000-0001-000000000002", userId: "00000000-0000-0000-0000-000000000101" },
  { postId: "00000000-0000-0000-0001-000000000002", userId: "00000000-0000-0000-0000-000000000103" },
  { postId: "00000000-0000-0000-0001-000000000002", userId: "00000000-0000-0000-0000-000000000105" },
  { postId: "00000000-0000-0000-0001-000000000002", userId: "00000000-0000-0000-0000-000000000106" },
  { postId: "00000000-0000-0000-0001-000000000003", userId: "00000000-0000-0000-0000-000000000101" },
  { postId: "00000000-0000-0000-0001-000000000003", userId: "00000000-0000-0000-0000-000000000102" },
  { postId: "00000000-0000-0000-0001-000000000003", userId: "00000000-0000-0000-0000-000000000107" },
  { postId: "00000000-0000-0000-0001-000000000004", userId: "00000000-0000-0000-0000-000000000101" },
  { postId: "00000000-0000-0000-0001-000000000004", userId: "00000000-0000-0000-0000-000000000102" },
  { postId: "00000000-0000-0000-0001-000000000004", userId: "00000000-0000-0000-0000-000000000103" },
  { postId: "00000000-0000-0000-0001-000000000004", userId: "00000000-0000-0000-0000-000000000106" },
  { postId: "00000000-0000-0000-0001-000000000004", userId: "00000000-0000-0000-0000-000000000108" },
  { postId: "00000000-0000-0000-0001-000000000005", userId: "00000000-0000-0000-0000-000000000101" },
  { postId: "00000000-0000-0000-0001-000000000005", userId: "00000000-0000-0000-0000-000000000103" },
  { postId: "00000000-0000-0000-0001-000000000005", userId: "00000000-0000-0000-0000-000000000104" },
  { postId: "00000000-0000-0000-0001-000000000005", userId: "00000000-0000-0000-0000-000000000107" },
  { postId: "00000000-0000-0000-0001-000000000006", userId: "00000000-0000-0000-0000-000000000102" },
  { postId: "00000000-0000-0000-0001-000000000006", userId: "00000000-0000-0000-0000-000000000104" },
  { postId: "00000000-0000-0000-0001-000000000006", userId: "00000000-0000-0000-0000-000000000107" },
  { postId: "00000000-0000-0000-0001-000000000007", userId: "00000000-0000-0000-0000-000000000101" },
  { postId: "00000000-0000-0000-0001-000000000007", userId: "00000000-0000-0000-0000-000000000102" },
  { postId: "00000000-0000-0000-0001-000000000007", userId: "00000000-0000-0000-0000-000000000103" },
  { postId: "00000000-0000-0000-0001-000000000007", userId: "00000000-0000-0000-0000-000000000104" },
  { postId: "00000000-0000-0000-0001-000000000007", userId: "00000000-0000-0000-0000-000000000105" },
  { postId: "00000000-0000-0000-0001-000000000007", userId: "00000000-0000-0000-0000-000000000106" },
  { postId: "00000000-0000-0000-0001-000000000008", userId: "00000000-0000-0000-0000-000000000101" },
  { postId: "00000000-0000-0000-0001-000000000008", userId: "00000000-0000-0000-0000-000000000102" },
  { postId: "00000000-0000-0000-0001-000000000008", userId: "00000000-0000-0000-0000-000000000103" },
  { postId: "00000000-0000-0000-0001-000000000008", userId: "00000000-0000-0000-0000-000000000104" },
  { postId: "00000000-0000-0000-0001-000000000008", userId: "00000000-0000-0000-0000-000000000105" },
  { postId: "00000000-0000-0000-0001-000000000008", userId: "00000000-0000-0000-0000-000000000106" },
  { postId: "00000000-0000-0000-0001-000000000008", userId: "00000000-0000-0000-0000-000000000107" },
];

const SAVES_DATA: { postId: string; userId: string }[] = [
  { postId: "00000000-0000-0000-0001-000000000001", userId: "00000000-0000-0000-0000-000000000102" },
  { postId: "00000000-0000-0000-0001-000000000001", userId: "00000000-0000-0000-0000-000000000104" },
  { postId: "00000000-0000-0000-0001-000000000001", userId: "00000000-0000-0000-0000-000000000106" },
  { postId: "00000000-0000-0000-0001-000000000002", userId: "00000000-0000-0000-0000-000000000103" },
  { postId: "00000000-0000-0000-0001-000000000002", userId: "00000000-0000-0000-0000-000000000105" },
  { postId: "00000000-0000-0000-0001-000000000004", userId: "00000000-0000-0000-0000-000000000101" },
  { postId: "00000000-0000-0000-0001-000000000004", userId: "00000000-0000-0000-0000-000000000103" },
  { postId: "00000000-0000-0000-0001-000000000005", userId: "00000000-0000-0000-0000-000000000102" },
  { postId: "00000000-0000-0000-0001-000000000007", userId: "00000000-0000-0000-0000-000000000101" },
  { postId: "00000000-0000-0000-0001-000000000007", userId: "00000000-0000-0000-0000-000000000103" },
  { postId: "00000000-0000-0000-0001-000000000007", userId: "00000000-0000-0000-0000-000000000105" },
  { postId: "00000000-0000-0000-0001-000000000008", userId: "00000000-0000-0000-0000-000000000101" },
  { postId: "00000000-0000-0000-0001-000000000008", userId: "00000000-0000-0000-0000-000000000104" },
  { postId: "00000000-0000-0000-0001-000000000008", userId: "00000000-0000-0000-0000-000000000106" },
];

type ReportSeed = {
  reporterId: string;
  postId?: string;
  commentId?: string;
  reason: CommunityReportReason;
  details?: string;
  status: "pending" | "resolved" | "dismissed";
  reviewNote?: string;
};

const REPORTS_DATA: ReportSeed[] = [
  { reporterId: "00000000-0000-0000-0000-000000000101", postId: "00000000-0000-0000-0001-000000000009", reason: "spam", status: "resolved", reviewNote: "Bai dang chua noi dung quang cao ve gia mao. Da an bai va canh bao tai khoan." },
  { reporterId: "00000000-0000-0000-0000-000000000104", postId: "00000000-0000-0000-0001-000000000009", reason: "inappropriate_content", details: "Bai nay rao ban ve voi gia khong chinh thong, nghi ngo lua dao.", status: "resolved", reviewNote: "Da xu ly theo bao cao truoc do." },
  { reporterId: "00000000-0000-0000-0000-000000000102", commentId: "00000000-0000-0000-0002-000000000008", reason: "spam", status: "resolved", reviewNote: "Comment rao tour gia. Da an comment va ghi chu tai khoan." },
  { reporterId: "00000000-0000-0000-0000-000000000105", commentId: "00000000-0000-0000-0002-000000000008", reason: "other", details: "Comment nay rao ban tour voi gia rat thap, nghi la lua dao du khach.", status: "dismissed", reviewNote: "Trung voi bao cao da xu ly, dong bao cao nay." },
  { reporterId: "00000000-0000-0000-0000-000000000106", postId: "00000000-0000-0000-0001-000000000003", reason: "misinformation", details: "Bai noi ve Dai Noi 200k nhung thuc te hien tai da tang len 250k. Thong tin gia khong con chinh xac.", status: "pending" },
  { reporterId: "00000000-0000-0000-0000-000000000107", postId: "00000000-0000-0000-0001-000000000005", reason: "other", details: "Bai dang co link den trang web thue xe may tu nhan, khong ro uy tin.", status: "pending" },
  { reporterId: "00000000-0000-0000-0000-000000000103", commentId: "00000000-0000-0000-0002-000000000017", reason: "misinformation", details: "Thong tin ve dem ram Hoi An co the khong chinh xac, khong phai tat ca cac thang deu to chuc.", status: "dismissed", reviewNote: "Xem xet lai: thong tin trong comment dung, dem ram hang thang Hoi An deu co pho den long." },
];

async function seedUsers() {
  await db.insert(profiles).values(DEMO_USERS).onConflictDoNothing({ target: profiles.id });
  const rows = await db.select({ id: profiles.id }).from(profiles).where(inArray(profiles.id, DEMO_USERS.map((u) => u.id)));
  console.log(`✔ demo profiles: ${rows.length}/${DEMO_USERS.length}`);
}

async function seedPosts(locationMap: Map<string, string>, destinationMap: Map<string, string>) {
  const values = POSTS_DATA.map((p) => {
    const locationId = locationMap.get(p.locationSlug);
    if (!locationId) throw new Error(`Khong tim thay locationId cho slug "${p.locationSlug}"`);
    return { id: p.id, userId: p.userId, locationId, title: p.title, content: p.content, rating: p.rating, tripStartDate: p.tripStartDate, tripEndDate: p.tripEndDate, dayCount: p.dayCount, estimatedCost: p.estimatedCost, status: p.status };
  });

  await db.insert(communityPosts).values(values).onConflictDoNothing({ target: communityPosts.id });
  console.log(`✔ community_posts: ${values.length}`);

  const destLinks = POSTS_DATA.flatMap((p) =>
    p.destinationSlugs.map((slug) => {
      const destinationId = destinationMap.get(slug);
      if (!destinationId) throw new Error(`Khong tim thay destinationId cho slug "${slug}"`);
      return { postId: p.id, destinationId };
    }),
  );

  if (destLinks.length > 0) {
    await db.insert(postDestinations).values(destLinks).onConflictDoNothing({ target: [postDestinations.postId, postDestinations.destinationId] });
  }
  console.log(`✔ post_destinations: ${destLinks.length} lien ket`);
}

async function seedComments() {
  for (const c of COMMENTS_DATA) {
    await db.insert(postComments).values({ id: c.id, postId: c.postId, userId: c.userId, parentId: c.parentId ?? null, content: c.content, status: c.status }).onConflictDoNothing({ target: postComments.id });
  }
  console.log(`✔ post_comments: ${COMMENTS_DATA.length}`);
}

async function seedLikes() {
  if (LIKES_DATA.length === 0) return;
  await db.insert(postLikes).values(LIKES_DATA).onConflictDoNothing({ target: [postLikes.postId, postLikes.userId] });
  console.log(`✔ post_likes: ${LIKES_DATA.length}`);
}

async function seedSaves() {
  if (SAVES_DATA.length === 0) return;
  await db.insert(postSaves).values(SAVES_DATA).onConflictDoNothing({ target: [postSaves.postId, postSaves.userId] });
  console.log(`✔ post_saves: ${SAVES_DATA.length}`);
}

async function findAdminProfileId(): Promise<string> {
  const [admin] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.role, "admin")).limit(1);
  if (!admin) throw new Error("Khong tim thay tai khoan admin. Bao cao da xu ly can reviewedBy tro ve admin.");
  return admin.id;
}

async function seedReports(adminId: string) {
  for (const r of REPORTS_DATA) {
    const isResolved = r.status === "resolved" || r.status === "dismissed";
    await db
      .insert(communityReports)
      .values({ reporterId: r.reporterId, postId: r.postId ?? null, commentId: r.commentId ?? null, reason: r.reason, details: r.details ?? null, status: r.status, reviewedBy: isResolved ? adminId : null, reviewNote: r.reviewNote ?? null, reviewedAt: isResolved ? new Date() : null })
      .onConflictDoNothing();
  }
  console.log(`✔ community_reports: ${REPORTS_DATA.length}`);
}

async function main() {
  console.log("Bat dau seed du lieu cong dong...\n");

  const locationRows = await db.select({ id: locations.id, slug: locations.slug }).from(locations);
  const locationMap = new Map(locationRows.map((r) => [r.slug, r.id]));

  if (locationMap.size === 0) {
    throw new Error("Bang locations trong. Hay chay 'npm run db:seed' truoc.");
  }

  const destinationRows = await db.select({ id: destinations.id, slug: destinations.slug }).from(destinations);
  const destinationMap = new Map(destinationRows.map((r) => [r.slug, r.id]));

  const adminId = await findAdminProfileId();

  await seedUsers();
  await seedPosts(locationMap, destinationMap);
  await seedComments();
  await seedLikes();
  await seedSaves();
  await seedReports(adminId);

  console.log("\n Seed cong dong hoan tat.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed that bai:", err);
  process.exit(1);
});
