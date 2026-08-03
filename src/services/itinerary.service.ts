import "server-only";

import {
    clonePublishedTourToItinerary,
    findUserItineraryById,
} from "@/src/repositories/itinerary.repository";
import type { CloneTourToItineraryRequest } from "@/src/db/schema/itinerary.schema";

export class ItineraryServiceError extends Error {
    constructor(
        message: string,
        public readonly status: 400 | 404 | 409,
        public readonly errors?: Record<string, string[]>,
    ) {
        super(message);
        this.name = "ItineraryServiceError";
    }
}

function notFound(message: string): never {
    throw new ItineraryServiceError(message, 404);
}

/**
 * Sao chép một tour mẫu đã được xuất bản thành hành trình
 * cá nhân thuộc tài khoản hiện tại.
 *
 * userId phải lấy từ phiên đăng nhập phía server,
 * tuyệt đối không nhận từ request body.
 */
export async function cloneTourToItineraryService(
    input: CloneTourToItineraryRequest,
    userId: string,
) {
    const result = await clonePublishedTourToItinerary({
        userId,
        sourceTourId: input.sourceTourId,
        title: input.title,
        startDate: input.startDate,
        adultCount: input.adultCount,
        childCount: input.childCount,
        roomCount: input.roomCount,
    });

    /*
     * Repository trả về null khi:
     *
     * - Tour không tồn tại.
     * - Tour chưa được publish.
     * - Tour đã bị ẩn.
     *
     * Các trường hợp đều trả cùng một lỗi 404 để không làm lộ
     * trạng thái nội bộ của tour.
     */
    if (!result) {
        notFound("Không tìm thấy tour mẫu");
    }

    return {
        id: result.itinerary.id,
        title: result.itinerary.title,
        status: result.itinerary.status,
        source: result.itinerary.source,
        sourceTourId: result.itinerary.sourceTourId,
        startDate: result.itinerary.startDate,
        adultCount: result.itinerary.adultCount,
        childCount: result.itinerary.childCount,
        roomCount: result.itinerary.roomCount,
        copied: result.copied,
    };
}

/**
 * Đọc thông tin cơ bản của một hành trình cá nhân.
 *
 * Repository bắt buộc kiểm tra đồng thời itineraryId và userId,
 * nên người dùng không thể đọc hành trình của tài khoản khác.
 */
export async function getUserItineraryByIdService(
    itineraryId: string,
    userId: string,
) {
    const itinerary = await findUserItineraryById(
        itineraryId,
        userId,
    );

    /*
     * Trả 404 thay vì 403 để không xác nhận cho người dùng biết
     * một itinerary ID của tài khoản khác có tồn tại hay không.
     */
    if (!itinerary) {
        notFound("Không tìm thấy hành trình");
    }

    return itinerary;
}