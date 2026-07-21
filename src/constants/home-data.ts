import type { LucideIcon } from "lucide-react";
import {Bike, Camera,Coffee, Compass,Landmark,Map,Mountain,Palmtree,Sparkles,Sun,Utensils,Waves,} from "lucide-react";

export type CityId = "hue" | "da-nang" | "hoi-an";

export interface HomeCity {
    id: CityId;
    name: string;
    eyebrow: string;
    headline: string;
    description: string;
    image: string;
    imageAlt: string;
    accent: string;
    softAccent: string;
    icon: LucideIcon;
    href: string;
}

export interface DestinationCardData {
    name: string;
    city: CityId;
    cityLabel: string;
    category: string;
    description: string;
    image: string;
    imageAlt: string;
    href: string;
}

export interface CuisineCardData {
    name: string;
    city: string;
    price: string;
    description: string;
    image: string;
    imageAlt: string;
    href: string;
}

export interface JourneyCardData {
    duration: string;
    title: string;
    description: string;
    stops: string[];
    image: string;
    imageAlt: string;
    tone: "coral" | "teal" | "gold";
}

export interface StoryCardData {
    title: string;
    location: string;
    author: string;
    image: string;
    imageAlt: string;
    size: "large" | "small";
}

/*
 * Thay các chuỗi bên dưới bằng public_id thật
 * trong Cloudinary của bạn.
 *
 * Ví dụ:
 * smart-trip-vietnam/destinations/covers/abc123xyz
 *
 * Bạn cũng có thể dán URL Cloudinary đầy đủ.
 */
export const HOME_MEDIA = {
    heroHue: "https://res.cloudinary.com/dgwehj5d0/image/upload/v1784618702/pexels-triduhi-youtuber-27418881_ibgfn2.jpg",
    heroDaNang: "https://res.cloudinary.com/dgwehj5d0/image/upload/v1784618994/pexels-quang-nguyen-vinh-222549-2162471_sfohas.jpg",
    heroHoiAn: "https://res.cloudinary.com/dgwehj5d0/image/upload/v1784618961/hero_-_hoi_an.original_1_ax19ay.jpg",

    hueOverview: "smart-trip-vietnam/home/cities/hue",
    daNangOverview: "smart-trip-vietnam/home/cities/da-nang",
    hoiAnOverview: "smart-trip-vietnam/home/cities/hoi-an",

    imperialCity:
        "smart-trip-vietnam/home/destinations/imperial-city-hue",
    thienMu:
        "smart-trip-vietnam/home/destinations/thien-mu-pagoda",
    myKhe:
        "smart-trip-vietnam/home/destinations/my-khe-beach",
    dragonBridge:
        "smart-trip-vietnam/home/destinations/dragon-bridge",
    hoiAnAncientTown:
        "smart-trip-vietnam/home/destinations/hoi-an-ancient-town",
    chamIsland:
        "smart-trip-vietnam/home/destinations/cham-island",

    bunBoHue:
        "smart-trip-vietnam/home/cuisines/bun-bo-hue",
    miQuang:
        "smart-trip-vietnam/home/cuisines/mi-quang",
    caoLau:
        "smart-trip-vietnam/home/cuisines/cao-lau",
    comGaHoiAn:
        "smart-trip-vietnam/home/cuisines/com-ga-hoi-an",

    journeyHeritage:
        "smart-trip-vietnam/home/journeys/heritage",
    journeyCoast:
        "smart-trip-vietnam/home/journeys/coast",
    journeyThreeCities:
        "smart-trip-vietnam/home/journeys/three-cities",

    storyLantern:
        "smart-trip-vietnam/home/stories/lantern-night",
    storyHue:
        "smart-trip-vietnam/home/stories/hue-morning",
    storyBeach:
        "smart-trip-vietnam/home/stories/da-nang-beach",
} as const;

export const HOME_CITIES: HomeCity[] = [
    {
        id: "hue",
        name: "Huế",
        eyebrow: "Cố đô trầm mặc",
        headline:
            "Chạm vào nhịp sống chậm bên dòng Hương Giang",
        description:
            "Đi qua những mái ngói rêu phong, lăng tẩm cổ kính và một nền ẩm thực tinh tế được gìn giữ qua nhiều thế hệ.",
        image: HOME_MEDIA.heroHue,
        imageAlt:
            "Khung cảnh Huế bên sông Hương vào lúc bình minh",
        accent: "#ed6a5a",
        softAccent: "#fbe3dc",
        icon: Landmark,
        href: "/destinations?location=hue",
    },
    {
        id: "da-nang",
        name: "Đà Nẵng",
        eyebrow: "Thành phố biển rực rỡ",
        headline:
            "Đón nắng mới giữa biển xanh và nhịp phố hiện đại",
        description:
            "Một điểm dừng trẻ trung với bãi biển dài, những cây cầu biểu tượng và thiên nhiên mở ra ngay bên thềm thành phố.",
        image: HOME_MEDIA.heroDaNang,
        imageAlt:
            "Đà Nẵng nhìn từ sông Hàn trong ánh nắng sớm",
        accent: "#2f8f8b",
        softAccent: "#dcefeb",
        icon: Waves,
        href: "/destinations?location=da-nang",
    },
    {
        id: "hoi-an",
        name: "Hội An",
        eyebrow: "Phố di sản dịu dàng",
        headline:
            "Lạc bước trong phố đèn lồng và những câu chuyện cũ",
        description:
            "Những căn nhà vàng, con ngõ nhỏ và nhịp chèo thuyền trên sông Hoài tạo nên một Hội An thân thuộc mà khó quên.",
        image: HOME_MEDIA.heroHoiAn,
        imageAlt:
            "Phố cổ Hội An rực sáng bên sông Hoài",
        accent: "#d8a52f",
        softAccent: "#f8edcc",
        icon: Sun,
        href: "/destinations?location=hoi-an",
    },
];

export const CITY_EDITORIAL = [
    {
        city: "Huế",
        kicker: "Di sản & chiều sâu",
        title:
            "Một miền ký ức được kể bằng kiến trúc, âm nhạc và vị cay nồng.",
        image: HOME_MEDIA.hueOverview,
        imageAlt: "Kiến trúc cung đình Huế",
        icon: Landmark,
        stat: "07 điểm di sản",
    },
    {
        city: "Đà Nẵng",
        kicker: "Biển & năng lượng",
        title:
            "Từ bình minh Mỹ Khê đến ánh đèn bên bờ sông Hàn.",
        image: HOME_MEDIA.daNangOverview,
        imageAlt: "Bờ biển và thành phố Đà Nẵng",
        icon: Waves,
        stat: "06 trải nghiệm nổi bật",
    },
    {
        city: "Hội An",
        kicker: "Phố cổ & làng nghề",
        title:
            "Chậm lại giữa những mái nhà vàng và bàn tay của người thợ thủ công.",
        image: HOME_MEDIA.hoiAnOverview,
        imageAlt: "Phố cổ Hội An với đèn lồng",
        icon: Palmtree,
        stat: "06 điểm văn hóa",
    },
] as const;

export const FEATURED_DESTINATIONS: DestinationCardData[] = [
    {
        name: "Đại Nội Huế",
        city: "hue",
        cityLabel: "Huế",
        category: "Di tích lịch sử",
        description:
            "Quần thể cung điện cổ của triều Nguyễn giữa lòng cố đô.",
        image: HOME_MEDIA.imperialCity,
        imageAlt: "Cổng Ngọ Môn của Đại Nội Huế",
        href: "/destinations/hoang-thanh-hue",
    },
    {
        name: "Chùa Thiên Mụ",
        city: "hue",
        cityLabel: "Huế",
        category: "Tâm linh",
        description:
            "Biểu tượng bên bờ sông Hương với tháp Phước Duyên bảy tầng.",
        image: HOME_MEDIA.thienMu,
        imageAlt: "Tháp Phước Duyên tại chùa Thiên Mụ",
        href: "/destinations/chua-thien-mu",
    },
    {
        name: "Bãi biển Mỹ Khê",
        city: "da-nang",
        cityLabel: "Đà Nẵng",
        category: "Biển",
        description:
            "Dải cát trắng dài, nước êm và bình minh trong trẻo.",
        image: HOME_MEDIA.myKhe,
        imageAlt: "Bãi biển Mỹ Khê ở Đà Nẵng",
        href: "/destinations/bai-bien-my-khe",
    },
    {
        name: "Cầu Rồng",
        city: "da-nang",
        cityLabel: "Đà Nẵng",
        category: "Biểu tượng thành phố",
        description:
            "Cây cầu rực sáng bên sông Hàn với màn phun lửa cuối tuần.",
        image: HOME_MEDIA.dragonBridge,
        imageAlt: "Cầu Rồng Đà Nẵng vào ban đêm",
        href: "/destinations/cau-rong",
    },
    {
        name: "Phố cổ Hội An",
        city: "hoi-an",
        cityLabel: "Hội An",
        category: "Di sản văn hóa",
        description:
            "Những căn nhà vàng và phố đèn lồng bên sông Hoài.",
        image: HOME_MEDIA.hoiAnAncientTown,
        imageAlt: "Phố cổ Hội An trong ánh đèn lồng",
        href: "/destinations/pho-co-hoi-an",
    },
    {
        name: "Cù Lao Chàm",
        city: "hoi-an",
        cityLabel: "Hội An",
        category: "Thiên nhiên",
        description:
            "Cụm đảo xanh với bãi biển và hệ sinh thái san hô đa dạng.",
        image: HOME_MEDIA.chamIsland,
        imageAlt: "Biển xanh tại Cù Lao Chàm",
        href: "/destinations/cu-lao-cham",
    },
];

export const CUISINES: CuisineCardData[] = [
    {
        name: "Bún bò Huế",
        city: "Huế",
        price: "Từ 35.000đ",
        description:
            "Nước dùng thơm sả, vị mắm ruốc và chút cay đặc trưng xứ Huế.",
        image: HOME_MEDIA.bunBoHue,
        imageAlt: "Tô bún bò Huế",
        href: "/cuisines/bun-bo-hue",
    },
    {
        name: "Mì Quảng",
        city: "Đà Nẵng · Quảng Nam",
        price: "Từ 30.000đ",
        description:
            "Sợi mì vàng, nước dùng đậm, rau sống và bánh tráng nướng giòn.",
        image: HOME_MEDIA.miQuang,
        imageAlt: "Tô mì Quảng",
        href: "/cuisines/mi-quang",
    },
    {
        name: "Cao lầu",
        city: "Hội An",
        price: "Từ 35.000đ",
        description:
            "Sợi mì dai, thịt xá xíu và rau Trà Quế trong một hương vị rất riêng.",
        image: HOME_MEDIA.caoLau,
        imageAlt: "Tô cao lầu Hội An",
        href: "/cuisines/cao-lau",
    },
    {
        name: "Cơm gà Hội An",
        city: "Hội An",
        price: "Từ 35.000đ",
        description:
            "Cơm vàng thơm, gà xé, rau răm và nước sốt đậm đà.",
        image: HOME_MEDIA.comGaHoiAn,
        imageAlt: "Đĩa cơm gà Hội An",
        href: "/cuisines/com-ga-hoi-an",
    },
];

export const JOURNEYS: JourneyCardData[] = [
    {
        duration: "01 ngày",
        title: "Một ngày chạm Huế",
        description:
            "Đi qua di sản, thưởng trà bên sông và kết thúc bằng bữa tối đậm vị cố đô.",
        stops: [
            "Đại Nội",
            "Chùa Thiên Mụ",
            "Chợ Đông Ba",
        ],
        image: HOME_MEDIA.journeyHeritage,
        imageAlt: "Hành trình khám phá di sản Huế",
        tone: "coral",
    },
    {
        duration: "02 ngày",
        title: "Biển xanh và nhịp phố",
        description:
            "Kết hợp biển Mỹ Khê, bán đảo Sơn Trà và một đêm ngắm sông Hàn lên đèn.",
        stops: [
            "Mỹ Khê",
            "Sơn Trà",
            "Cầu Rồng",
        ],
        image: HOME_MEDIA.journeyCoast,
        imageAlt: "Hành trình khám phá biển Đà Nẵng",
        tone: "teal",
    },
    {
        duration: "05 ngày",
        title: "Ba thành phố, một miền thương nhớ",
        description:
            "Hành trình trọn vẹn nối Huế, Đà Nẵng và Hội An theo nhịp đi vừa đủ chậm.",
        stops: [
            "Huế",
            "Đà Nẵng",
            "Hội An",
        ],
        image: HOME_MEDIA.journeyThreeCities,
        imageAlt:
            "Hành trình xuyên Huế Đà Nẵng Hội An",
        tone: "gold",
    },
];

export const STORIES: StoryCardData[] = [
    {
        title: "Một đêm theo ánh đèn lồng",
        location: "Hội An",
        author: "Minh Anh",
        image: HOME_MEDIA.storyLantern,
        imageAlt: "Đèn lồng Hội An về đêm",
        size: "large",
    },
    {
        title: "Buổi sớm nghe Huế thức giấc",
        location: "Huế",
        author: "Tuấn Khang",
        image: HOME_MEDIA.storyHue,
        imageAlt: "Buổi sáng bình yên ở Huế",
        size: "small",
    },
    {
        title: "Một ngày chỉ có biển và gió",
        location: "Đà Nẵng",
        author: "Hà My",
        image: HOME_MEDIA.storyBeach,
        imageAlt: "Trải nghiệm trên biển Đà Nẵng",
        size: "small",
    },
];

export const EXPERIENCE_ITEMS = [
    {
        icon: Bike,
        label: "Đạp xe làng quê",
        detail: "Trà Quế · Cẩm Thanh",
    },
    {
        icon: Coffee,
        label: "Cà phê ven sông",
        detail: "Hương Giang · sông Hàn",
    },
    {
        icon: Camera,
        label: "Săn khoảnh khắc",
        detail: "Bình minh · phố đèn lồng",
    },
    {
        icon: Utensils,
        label: "Ăn như người bản địa",
        detail: "Chợ · quán nhỏ · gánh hàng",
    },
] as const;

export const NAV_ITEMS = [
    {
        label: "Khám phá",
        href: "#kham-pha",
    },
    {
        label: "Điểm đến",
        href: "#diem-den",
    },
    {
        label: "Ẩm thực",
        href: "#am-thuc",
    },
    {
        label: "Hành trình",
        href: "#hanh-trinh",
    },
    {
        label: "Trải nghiệm",
        href: "#trai-nghiem",
    },
] as const;

export const BRAND_FEATURES = [
    {
        icon: Compass,
        label: "Gợi ý đúng sở thích",
    },
    {
        icon: Map,
        label: "Lịch trình trực quan",
    },
    {
        icon: Mountain,
        label: "Dữ liệu địa phương",
    },
    {
        icon: Sparkles,
        label: "Trợ lý AI cá nhân hóa",
    },
] as const;