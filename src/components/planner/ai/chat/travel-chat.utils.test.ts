import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    buildPlannerRequestFromConversation,
    createChatId,
    createInitialConversationState,
    createWelcomeMessages,
    findLocationLabel,
    formatCurrency,
    isConversationReady,
    readPlannerApiResponse,
} from "@/src/components/planner/ai/chat/travel-chat.utils";
import type {
    PlannerConversationState,
} from "@/src/components/planner/ai/chat/ai-travel-chat.types";
import {
    formatOptionalVnd,
} from "@/src/lib/formatters";

function createCompleteState(
    overrides: Partial<PlannerConversationState> = {},
): PlannerConversationState {
    return {
        ...createInitialConversationState(),
        locationId: "location-da-nang",
        startDate: "2026-09-10",
        dayCount: 3,
        adultCount: 2,
        ...overrides,
    };
}

describe("travel-chat.utils", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    describe("createChatId", () => {
        it("tạo id bằng crypto.randomUUID khi trình duyệt hỗ trợ", () => {
            const randomUuidSpy = vi
                .spyOn(globalThis.crypto, "randomUUID")
                .mockReturnValue(
                    "11111111-1111-4111-8111-111111111111",
                );

            expect(createChatId()).toBe(
                "msg-11111111-1111-4111-8111-111111111111",
            );
            expect(createChatId("assistant")).toBe(
                "assistant-11111111-1111-4111-8111-111111111111",
            );
            expect(randomUuidSpy).toHaveBeenCalledTimes(2);
        });

        it("fallback sang timestamp và random khi không có crypto", () => {
            vi.stubGlobal("crypto", undefined);
            vi.spyOn(Date, "now").mockReturnValue(1000);
            vi.spyOn(Math, "random").mockReturnValue(0.5);

            expect(createChatId("chat")).toBe("chat-1000-i");
        });
    });

    it("tạo trạng thái hội thoại ban đầu", () => {
        expect(createInitialConversationState()).toEqual({
            childCount: 0,
            childAges: [],
            roomCount: 1,
            lodgingPreference: "any",
            lodgingRequirements: [],
            pace: "balanced",
            interests: [],
        });
    });

    it("tạo welcome message và quick replies", () => {
        vi.spyOn(Date, "now").mockReturnValue(123456);

        const messages = createWelcomeMessages();
        const message = messages[0];

        expect(messages).toHaveLength(1);
        expect(message).toEqual(
            expect.objectContaining({
                id: "assistant-welcome",
                role: "assistant",
                type: "text",
                createdAt: 123456,
            }),
        );
        expect(message.content).toContain("SmartTrip AI");

        if (
            message.role !== "assistant" ||
            message.type !== "text"
        ) {
            throw new Error("Expected assistant text message");
        }

        expect(message.quickReplies).toHaveLength(3);
        expect(message.quickReplies).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    action: "send",
                }),
            ]),
        );
    });

    describe("isConversationReady", () => {
        it("trả true khi có đủ thông tin bắt buộc", () => {
            expect(
                isConversationReady(createCompleteState()),
            ).toBe(true);
        });

        it.each([
            ["locationId", { locationId: undefined }],
            ["startDate", { startDate: undefined }],
            ["dayCount", { dayCount: undefined }],
            ["dayCount=0", { dayCount: 0 }],
            ["adultCount", { adultCount: undefined }],
            ["adultCount=0", { adultCount: 0 }],
        ])("trả false khi thiếu %s", (_, overrides) => {
            expect(
                isConversationReady(
                    createCompleteState(overrides),
                ),
            ).toBe(false);
        });
    });

    describe("buildPlannerRequestFromConversation", () => {
        it("trả null khi hội thoại chưa đủ dữ liệu", () => {
            expect(
                buildPlannerRequestFromConversation(
                    createInitialConversationState(),
                ),
            ).toBeNull();
        });

        it("tạo request đầy đủ và trim note", () => {
            const request = buildPlannerRequestFromConversation(
                createCompleteState({
                    childCount: 1,
                    roomCount: 2,
                    budget: 3000000,
                    pace: "relaxed",
                    interests: ["Ẩm thực", "Biển"],
                    note: "  Ưu tiên địa điểm ít đông  ",
                }),
            );

            expect(request).toEqual({
                locationId: "location-da-nang",
                startDate: "2026-09-10",
                dayCount: 3,
                adultCount: 2,
                childCount: 1,
                roomCount: 2,
                budget: 3000000,
                pace: "relaxed",
                interests: ["Ẩm thực", "Biển"],
                note: "Ưu tiên địa điểm ít đông",
            });
        });

        it("dùng interest mặc định và bỏ budget/note rỗng", () => {
            const request = buildPlannerRequestFromConversation(
                createCompleteState({
                    budget: 0,
                    interests: [],
                    note: "   ",
                }),
            );

            expect(request).toEqual({
                locationId: "location-da-nang",
                startDate: "2026-09-10",
                dayCount: 3,
                adultCount: 2,
                childCount: 0,
                roomCount: 1,
                pace: "balanced",
                interests: ["Trải nghiệm địa phương"],
            });
            expect(request).not.toHaveProperty("budget");
            expect(request).not.toHaveProperty("note");
        });
    });

    describe("findLocationLabel", () => {
        const locations = [
            {
                id: "location-da-nang",
                name: "Đà Nẵng",
                slug: "da-nang",
            },
            {
                id: "location-hue",
                name: "Huế",
                slug: "hue",
            },
        ];

        it("ưu tiên locationName trong hội thoại", () => {
            expect(
                findLocationLabel(
                    createCompleteState({
                        locationName: "Đà Nẵng mở rộng",
                    }),
                    locations,
                ),
            ).toBe("Đà Nẵng mở rộng");
        });

        it("tìm tên từ danh sách bằng locationId", () => {
            expect(
                findLocationLabel(
                    createCompleteState(),
                    locations,
                ),
            ).toBe("Đà Nẵng");
        });

        it("trả null khi không tìm thấy địa điểm", () => {
            expect(
                findLocationLabel(
                    createCompleteState({
                        locationId: "unknown",
                    }),
                    locations,
                ),
            ).toBeNull();
        });
    });

    describe("formatCurrency", () => {
        it("trả null khi không có ngân sách", () => {
            expect(formatCurrency()).toBeNull();
            expect(formatCurrency(0)).toBeNull();
        });

        it("định dạng ngân sách VND", () => {
            expect(formatCurrency(3000000)).toBe(
                formatOptionalVnd(3000000),
            );
        });
    });

    describe("readPlannerApiResponse", () => {
        it("đọc JSON response hợp lệ", async () => {
            const response = new Response(
                JSON.stringify({
                    success: true,
                    data: {
                        reply: "Xin chào",
                    },
                }),
                {
                    status: 200,
                    headers: {
                        "content-type":
                            "application/json; charset=utf-8",
                    },
                },
            );

            await expect(
                readPlannerApiResponse<{
                    reply: string;
                }>(response),
            ).resolves.toEqual({
                success: true,
                data: {
                    reply: "Xin chào",
                },
            });
        });

        it("trả lỗi chuẩn hóa và log khi response không phải JSON", async () => {
            const consoleErrorSpy = vi
                .spyOn(console, "error")
                .mockImplementation(() => undefined);
            const longHtml = "x".repeat(600);
            const response = new Response(longHtml, {
                status: 502,
                headers: {
                    "content-type": "text/html",
                },
            });

            await expect(
                readPlannerApiResponse(response),
            ).resolves.toEqual({
                success: false,
                message:
                    "Server trả về dữ liệu không hợp lệ (502).",
            });
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "[TRAVEL CHAT NON JSON RESPONSE]",
                {
                    status: 502,
                    url: "",
                    body: "x".repeat(500),
                },
            );
        });

        it("xem response không có content-type là non-JSON", async () => {
            vi.spyOn(console, "error").mockImplementation(
                () => undefined,
            );
            const response = new Response("Service unavailable", {
                status: 503,
            });

            await expect(
                readPlannerApiResponse(response),
            ).resolves.toEqual({
                success: false,
                message:
                    "Server trả về dữ liệu không hợp lệ (503).",
            });
        });

        it("truyền lỗi parse lên trên khi content-type JSON nhưng body hỏng", async () => {
            const response = new Response("{invalid-json", {
                headers: {
                    "content-type": "application/json",
                },
            });

            await expect(
                readPlannerApiResponse(response),
            ).rejects.toBeInstanceOf(SyntaxError);
        });
    });
});
