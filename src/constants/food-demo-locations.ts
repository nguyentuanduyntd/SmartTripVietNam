export type FoodDiscoveryLocationSource =
    | "gps"
    | "manual"
    | "demo";

export type FoodDemoLocation = {
    id: string;
    label: string;
    locationSlug:
        | "hue"
        | "da-nang"
        | "hoi-an";
    latitude: number;
    longitude: number;
};

/**
 * Các điểm giả lập vị trí để demo chức năng "quán gần đây".
 *
 * Tọa độ lấy từ các destination đã có trong seed SmartTrip,
 * nên không cần Google Maps Platform để chạy demo.
 */
export const FOOD_DEMO_LOCATIONS: FoodDemoLocation[] = [
    {
        id: "demo-da-nang-dragon-bridge",
        label: "Cầu Rồng, Đà Nẵng",
        locationSlug: "da-nang",
        latitude: 16.0611042,
        longitude: 108.2276926,
    },
    {
        id: "demo-da-nang-my-khe",
        label: "Bãi biển Mỹ Khê, Đà Nẵng",
        locationSlug: "da-nang",
        latitude: 16.0616944,
        longitude: 108.2469346,
    },
    {
        id: "demo-hoi-an-old-town",
        label: "Phố cổ Hội An",
        locationSlug: "hoi-an",
        latitude: 15.8783812,
        longitude: 108.3324215,
    },
    {
        id: "demo-hue-imperial-city",
        label: "Đại Nội Huế",
        locationSlug: "hue",
        latitude: 16.469527,
        longitude: 107.577432,
    },
    {
        id: "demo-hue-dong-ba",
        label: "Chợ Đông Ba, Huế",
        locationSlug: "hue",
        latitude: 16.4726507,
        longitude: 107.5884891,
    },
];