import { cache } from "react";
import { MapPin } from "lucide-react";

import { buildGoogleMapsSearchHref } from "@/src/lib/google-maps";
import { findDestinationMapPointById } from "@/src/repositories/destination-map.repository";

/**
 * Cache trong cùng một lần render server.
 *
 * Nếu nhiều nơi gọi cùng destinationId
 * thì không query database lặp lại không cần thiết.
 */
const getDestinationMapPoint = cache(
    findDestinationMapPointById,
);

type PlannerGoogleMapsPlaceProps = {
    /**
     * destinationId thường có ở activity
     * được copy từ bảng destinations.
     */
    destinationId?: string | null;

    /**
     * Tên hiển thị trên giao diện.
     */
    label: string;

    /**
     * Chuỗi dùng để tìm Google Maps khi
     * không có latitude / longitude.
     *
     * Ví dụ:
     * - Cầu Rồng
     * - Quán Mì Quảng Bà Mua
     * - Hilton Đà Nẵng, 50 Bạch Đằng...
     */
    query?: string | null;

    /**
     * Dòng phụ.
     *
     * Chủ yếu dùng cho địa chỉ khách sạn.
     */
    subtitle?: string | null;
};

/**
 * Hiển thị:
 *
 * 📍 Tên địa điểm
 * [Xem trên Google Maps]
 *
 * Cả tên địa điểm và button đều click được.
 */
export async function PlannerGoogleMapsPlace({
    destinationId,
    label,
    query,
    subtitle,
}: PlannerGoogleMapsPlaceProps) {
    /**
     * Activity có destinationId thì lấy
     * latitude / longitude từ bảng destinations.
     *
     * Meal và Stay thường không có destinationId
     * nên sẽ search bằng tên / địa chỉ.
     */
    const destination = destinationId
        ? await getDestinationMapPoint(
              destinationId,
          )
        : null;

    /**
     * Nếu destination còn tồn tại:
     * ưu tiên tọa độ.
     *
     * Nếu không có tọa độ:
     * ưu tiên address.
     *
     * Nếu không có address:
     * dùng query được truyền vào.
     */
    const mapHref = buildGoogleMapsSearchHref({
        latitude: destination?.latitude,
        longitude: destination?.longitude,

        query:
            destination?.address ??
            query ??
            destination?.name ??
            label,
    });

    /**
     * Trường hợp hoàn toàn không có dữ liệu
     * để search Google Maps thì chỉ hiển thị text.
     */
    if (!mapHref) {
        return (
            <div className="mt-1">
                <p className="flex items-start gap-1.5 text-sm text-[#6d7a77]">
                    <MapPin
                        size={14}
                        className="mt-0.5 shrink-0"
                    />

                    <span>{label}</span>
                </p>

                {subtitle ? (
                    <p className="mt-1 pl-5 text-xs leading-5 text-[#7b8784]">
                        {subtitle}
                    </p>
                ) : null}
            </div>
        );
    }

    return (
        <div className="mt-1">
            {/* Tên địa điểm cũng click được */}
            <a
                href={mapHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-start gap-1.5 text-sm font-medium text-[#55716d] transition hover:text-[#173a3b] hover:underline"
                title={`Mở ${label} trên Google Maps`}
            >
                <MapPin
                    size={14}
                    className="mt-0.5 shrink-0"
                />

                <span>{label}</span>
            </a>

            {/* Địa chỉ phụ, dùng cho lưu trú */}
            {subtitle ? (
                <p className="mt-1 pl-5 text-xs leading-5 text-[#7b8784]">
                    {subtitle}
                </p>
            ) : null}

            {/* Button Google Maps */}
            <div>
                <a
                    href={mapHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="
                        mt-2
                        inline-flex
                        items-center
                        gap-1.5
                        rounded-full
                        border
                        border-[#bfd4ce]
                        bg-[#edf7f4]
                        px-3
                        py-1.5
                        text-xs
                        font-bold
                        text-[#2f6864]
                        transition
                        hover:border-[#8fb6ae]
                        hover:bg-[#deeee9]
                    "
                    aria-label={`Xem ${label} trên Google Maps`}
                >
                    <MapPin size={14} />

                    Xem trên Google Maps
                </a>
            </div>
        </div>
    );
}