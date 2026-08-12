export type CommunityImage = {
    id: string;
    postId: string;
    url: string;
    width: number | null;
    height: number | null;
    altText: string | null;
    caption: string | null;
    sortOrder: number;
};

export type CommunityDestination = {
    postId: string;
    id: string;
    name: string;
    address: string | null;
};

export type CommunityAuthor = {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
};

export type CommunityPostCardData = {
    id: string;
    userId: string;
    title: string | null;
    content: string;
    rating: number | null;
    sourceItineraryId: string | null;
    locationId: string | null;
    locationName: string | null;
    tripStartDate: string | null;
    tripEndDate: string | null;
    dayCount: number | null;
    estimatedCost: string | null;
    createdAt: string;
    updatedAt: string;
    author: CommunityAuthor;
    likeCount: number;
    commentCount: number;
    saveCount: number;
    images: CommunityImage[];
    destinations: CommunityDestination[];
    likedByMe: boolean;
    savedByMe: boolean;
};

export type CommunityFeedData = {
    items: CommunityPostCardData[];
    page: number;
    limit: number;
    hasMore: boolean;
};

export type CommunitySnapshotItem = {
    destinationId: string | null;
    destinationName: string | null;
    title: string;
    description: string | null;
    startTime: string | null;
    endTime: string | null;
    sortOrder: number;
    transportMethod: string | null;
    transportNote: string | null;
    estimatedTravelMinutes: number | null;
};

export type CommunitySnapshotCuisine = {
    cuisineId: string | null;
    cuisineName: string;
    sortOrder: number;
    note: string | null;
};

export type CommunitySnapshotMeal = {
    mealType: string;
    startTime: string | null;
    venueName: string | null;
    note: string | null;
    isIncluded: boolean;
    sortOrder: number;
    cuisines: CommunitySnapshotCuisine[];
};

export type CommunitySnapshotDay = {
    dayNumber: number;
    title: string | null;
    description: string | null;
    items: CommunitySnapshotItem[];
    meals: CommunitySnapshotMeal[];
};

export type CommunitySnapshotStay = {
    name: string;
    address: string | null;
    originalCheckInDate: string;
    originalCheckOutDate: string;
    checkInDayOffset: number | null;
    checkOutDayOffset: number | null;
    roomCount: number;
    pricePerRoomNight: string | null;
    note: string | null;
    sortOrder: number;
};

export type CommunityItinerarySnapshot = {
    version: number;
    itinerary: {
        title: string;
        description: string | null;
        coverImageUrl: string | null;
        originalStartDate: string | null;
        startLocationId: string | null;
        startLocationName: string | null;
        meetingPoint: string | null;
        adultCount: number;
        childCount: number;
        roomCount: number;
    };
    days: CommunitySnapshotDay[];
    stays: CommunitySnapshotStay[];
    costs: unknown[];
};

export type CommunityPostDetailData =
    CommunityPostCardData & {
        itinerarySnapshot:
            CommunityItinerarySnapshot | null;
    };

export type CommunityComment = {
    id: string;
    postId: string;
    userId: string;
    parentId: string | null;
    content: string;
    createdAt: string;
    updatedAt: string;
    author: CommunityAuthor;
};

export type CommunityCommentThread =
    CommunityComment & {
        replies: CommunityComment[];
    };

export type ApiPayload<T> = {
    success: boolean;
    message?: string;
    data?: T;
    errors?: Record<string, string[]>;
};

export async function readCommunityApi<T>(
    response: Response,
): Promise<ApiPayload<T>> {
    const contentType =
        response.headers.get("content-type");

    if (
        !contentType?.includes(
            "application/json",
        )
    ) {
        const body =
            await response.text();

        console.error(
            "[COMMUNITY NON JSON RESPONSE]",
            {
                url: response.url,
                status: response.status,
                contentType,
                body: body.slice(0, 500),
            },
        );

        return {
            success: false,
            message:
                response.status === 404
                    ? "Không tìm thấy API Community."
                    : `Server trả về dữ liệu không hợp lệ (${response.status}). Hãy kiểm tra Terminal.`,
        };
    }

    return (await response.json()) as ApiPayload<T>;
}