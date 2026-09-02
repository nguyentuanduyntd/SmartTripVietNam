"use client";

import {
    Crosshair,
    MapPin,
    Navigation,
} from "lucide-react";
import {
    useEffect,
    useRef,
    useState,
} from "react";

type LocationMapProps = {
    latitude: number;
    longitude: number;
    label: string;

    gpsLatitude?: number | null;
    gpsLongitude?: number | null;

    onSelectLocation: (
        latitude: number,
        longitude: number,
    ) => void;
};

export function LocationMap({
    latitude,
    longitude,
    label,
    gpsLatitude,
    gpsLongitude,
    onSelectLocation,
}: LocationMapProps) {
    const containerRef =
        useRef<HTMLDivElement | null>(
            null,
        );

    const mapRef =
        useRef<
            import("leaflet").Map | null
        >(null);

    const [isMapReady, setIsMapReady] =
        useState(false);

    const leafletRef =
        useRef<
            typeof import("leaflet") | null
        >(null);

    const selectedMarkerRef =
        useRef<
            import("leaflet").Marker | null
        >(null);

    const gpsMarkerRef =
        useRef<
            import("leaflet").Marker | null
        >(null);

    const onSelectLocationRef =
        useRef(onSelectLocation);

    const initialLocationRef =
        useRef({
            latitude,
            longitude,
        });

    useEffect(() => {
        onSelectLocationRef.current =
            onSelectLocation;
    }, [onSelectLocation]);

    /*
     * Khởi tạo Leaflet duy nhất một lần.
     *
     * Import Leaflet bên trong useEffect để tránh
     * lỗi "window is not defined" khi Next.js render server.
     */
    useEffect(() => {
        let cancelled = false;

        async function initializeMap() {
            if (
                !containerRef.current ||
                mapRef.current
            ) {
                return;
            }

            const L =
                await import("leaflet");

            if (
                cancelled ||
                !containerRef.current
            ) {
                return;
            }

            leafletRef.current = L;

            const initial =
                initialLocationRef.current;

            const map = L.map(
                containerRef.current,
                {
                    zoomControl: false,
                    attributionControl:
                        true,
                },
            ).setView(
                [
                    initial.latitude,
                    initial.longitude,
                ],
                15,
            );

            L.tileLayer(
                "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                {
                    maxZoom: 19,
                    attribution:
                        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                },
            ).addTo(map);

            L.control
                .zoom({
                    position:
                        "bottomright",
                })
                .addTo(map);

            map.on(
                "click",
                (event) => {
                    const {
                        lat,
                        lng,
                    } = event.latlng;

                    onSelectLocationRef.current(
                        lat,
                        lng,
                    );
                },
            );

            mapRef.current = map;
            setIsMapReady(true);

            /*
             * Khi component nằm trong grid/layout responsive,
             * Leaflet đôi lúc tính sai kích thước ở frame đầu.
             */
            window.setTimeout(
                () => {
                    map.invalidateSize();
                },
                100,
            );
        }

        void initializeMap();

        return () => {
            cancelled = true;

            selectedMarkerRef.current =
                null;
            gpsMarkerRef.current =
                null;

            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current =
                    null;
            }

            leafletRef.current =
                null;
        };
    }, []);

    /*
     * Marker màu vàng:
     * vị trí user đang CHỌN để tìm restaurant.
     */
    useEffect(() => {
        const L =
            leafletRef.current;
        const map =
            mapRef.current;

        if (!isMapReady || !L || !map) {
            return;
        }

        const overlapsGps =
            gpsLatitude != null &&
            gpsLongitude != null &&
            Math.abs(
                latitude - gpsLatitude,
            ) < 0.000001 &&
            Math.abs(
                longitude - gpsLongitude,
            ) < 0.000001;

        if (overlapsGps) {
            selectedMarkerRef.current?.remove();
            selectedMarkerRef.current =
                null;
            return;
        }

        const selectedIcon =
            L.divIcon({
                className:
                    "smarttrip-selected-marker",
                html: `
                    <div
                        style="
                            position: relative;
                            width: 48px;
                            height: 58px;
                            display: flex;
                            align-items: flex-start;
                            justify-content: center;
                        "
                    >
                        <div
                            style="
                                width: 42px;
                                height: 42px;
                                border-radius: 14px 14px 14px 3px;
                                transform: rotate(-45deg);
                                background: #f3bd59;
                                border: 3px solid #fffaf1;
                                box-shadow: 0 10px 30px rgba(0,0,0,.28);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            "
                        >
                            <div
                                style="
                                    width: 11px;
                                    height: 11px;
                                    border-radius: 999px;
                                    background: #173a3b;
                                "
                            ></div>
                        </div>
                    </div>
                `,
                iconSize: [
                    48,
                    58,
                ],
                iconAnchor: [
                    24,
                    50,
                ],
            });

        const position: [
            number,
            number,
        ] = [
            latitude,
            longitude,
        ];

        if (
            selectedMarkerRef.current
        ) {
            selectedMarkerRef.current.setLatLng(
                position,
            );
        } else {
            selectedMarkerRef.current =
                L.marker(position, {
                    icon: selectedIcon,
                    zIndexOffset:
                        1000,
                })
                    .addTo(map)
                    .bindTooltip(
                        "Vị trí tìm kiếm",
                        {
                            permanent:
                                false,
                            direction:
                                "top",
                            offset: [
                                0,
                                -42,
                            ],
                        },
                    );
        }
    }, [
        latitude,
        longitude,
        gpsLatitude,
        gpsLongitude,
        isMapReady,
    ]);

    /*
     * Chấm xanh:
     * vị trí GPS thật của thiết bị.
     *
     * Sau này user click sang một nơi khác,
     * chấm GPS vẫn đứng nguyên để phân biệt:
     *
     * - Bạn đang ở đâu
     * - Bạn muốn tìm quán ở đâu
     */
    useEffect(() => {
        const L =
            leafletRef.current;
        const map =
            mapRef.current;

        if (!isMapReady || !L || !map) {
            return;
        }

        if (
            gpsLatitude == null ||
            gpsLongitude == null
        ) {
            if (
                gpsMarkerRef.current
            ) {
                gpsMarkerRef.current.remove();
                gpsMarkerRef.current =
                    null;
            }

            return;
        }

        const gpsIcon =
            L.divIcon({
                className:
                    "smarttrip-gps-marker",
                html: `
                    <div
                        style="
                            position: relative;
                            width: 34px;
                            height: 34px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        "
                    >
                        <div
                            style="
                                position: absolute;
                                width: 34px;
                                height: 34px;
                                border-radius: 999px;
                                background: rgba(74, 163, 156, .22);
                            "
                        ></div>

                        <div
                            style="
                                position: absolute;
                                width: 18px;
                                height: 18px;
                                border-radius: 999px;
                                background: #4aa39c;
                                border: 4px solid #ffffff;
                                box-shadow: 0 5px 18px rgba(0,0,0,.22);
                            "
                        ></div>
                    </div>
                `,
                iconSize: [
                    34,
                    34,
                ],
                iconAnchor: [
                    17,
                    17,
                ],
            });

        const position: [
            number,
            number,
        ] = [
            gpsLatitude,
            gpsLongitude,
        ];

        if (gpsMarkerRef.current) {
            gpsMarkerRef.current.setLatLng(
                position,
            );
        } else {
            gpsMarkerRef.current =
                L.marker(position, {
                    icon: gpsIcon,
                    zIndexOffset:
                        500,
                })
                    .addTo(map)
                    .bindTooltip(
                        "Vị trí GPS của bạn",
                        {
                            direction:
                                "top",
                        },
                    );
        }
    }, [
        gpsLatitude,
        gpsLongitude,
        isMapReady,
    ]);

    /*
     * Khi GPS hoặc điểm chọn trên bản đồ thay đổi,
     * đưa camera về vị trí đó.
     *
     * Không recreate map.
     */
    useEffect(() => {
        const map =
            mapRef.current;

        if (!isMapReady || !map) {
            return;
        }

        const center =
            map.getCenter();

        const distance =
            Math.abs(
                center.lat -
                    latitude,
            ) +
            Math.abs(
                center.lng -
                    longitude,
            );

        /*
         * Nếu chỉ click gần trong cùng vùng bản đồ
         * thì không flyTo liên tục gây khó chịu.
         */
        if (distance > 0.01) {
            map.flyTo(
                [
                    latitude,
                    longitude,
                ],
                Math.max(
                    map.getZoom(),
                    15,
                ),
                {
                    duration: 0.8,
                },
            );
        }
    }, [
        latitude,
        longitude,
        isMapReady,
    ]);

    function focusSelectedLocation() {
        mapRef.current?.flyTo(
            [
                latitude,
                longitude,
            ],
            16,
            {
                duration: 0.7,
            },
        );
    }

    function focusGpsLocation() {
        if (
            gpsLatitude == null ||
            gpsLongitude == null
        ) {
            return;
        }

        mapRef.current?.flyTo(
            [
                gpsLatitude,
                gpsLongitude,
            ],
            16,
            {
                duration: 0.7,
            },
        );
    }

    const isSelectedGps =
        gpsLatitude != null &&
        gpsLongitude != null &&
        Math.abs(
            latitude - gpsLatitude,
        ) < 0.000001 &&
        Math.abs(
            longitude - gpsLongitude,
        ) < 0.000001;

    return (
        <div className="relative h-full min-h-[360px] w-full overflow-hidden rounded-[28px] border border-white/10 bg-[#102f30] sm:min-h-[420px] lg:min-h-[460px]">
            <div
                ref={containerRef}
                className="absolute inset-0 z-0"
            />

            {/* Gradient giúp map hòa với theme SmartTrip */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-[400] h-24 bg-gradient-to-b from-[#102f30]/40 to-transparent" />

            {/* Thông tin vị trí đang chọn */}
            <div className="pointer-events-none absolute left-4 right-4 top-4 z-[500] flex items-start justify-between gap-3">
                <div className="pointer-events-auto max-w-[75%] rounded-2xl border border-white/15 bg-[#102f30]/90 px-3 py-2.5 shadow-xl backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f3bd59] text-[#173a3b]">
                            <MapPin
                                size={17}
                            />
                        </span>

                        <div className="min-w-0">
                            <p className="truncate text-sm font-extrabold text-white">
                                {label}
                            </p>
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={
                        focusSelectedLocation
                    }
                    aria-label="Đưa bản đồ về vị trí đang chọn"
                    title="Về vị trí đang chọn"
                    className="pointer-events-auto grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/15 bg-[#102f30]/90 text-[#f3bd59] shadow-xl backdrop-blur-md transition hover:bg-[#173f40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                    <Crosshair
                        size={18}
                    />
                </button>
            </div>

            {/* Nút về GPS */}
            {gpsLatitude != null &&
            gpsLongitude != null &&
            !isSelectedGps ? (
                <button
                    type="button"
                    onClick={
                        focusGpsLocation
                    }
                    aria-label="Đưa bản đồ về vị trí GPS của tôi"
                    className="absolute bottom-5 left-4 z-[500] inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#102f30]/90 px-4 py-2.5 text-xs font-extrabold text-white shadow-xl backdrop-blur-md transition hover:bg-[#173f40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                    <Navigation
                        size={14}
                        className="text-[#55b7ae]"
                    />
                    Vị trí của tôi
                </button>
            ) : null}

        </div>
    );
}
