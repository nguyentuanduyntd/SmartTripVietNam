"use client";

import {
    ArrowRight,
    Bot,
    Loader2,
    MapPin,
    Plus,
    Send,
    Sparkles,
    X,
} from "lucide-react";
import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

export type FoodAiRestaurantContext = {
    id: string;
    name: string;
    address?: string | null;
    priceMin?: number | null;
    priceMax?: number | null;
    rating?: number | null;
    source?: "demo" | "manual" | "google_places";
    googleMapsUrl?: string | null;
    cuisines: Array<{
        id: string;
        name: string;
        slug: string;
    }>;
};

type DialogMessage = {
    role: "user" | "assistant";
    content: string;
};

type FoodContextResponse = {
    entity: {
        type: "restaurant";
        id: string;
        name: string;
        address: string;
        locationName: string;
        source: "demo" | "manual" | "google_places";
    };
    answer: string;
    quickReplies: Array<{
        label: string;
        question: string;
    }>;
    plannerPrompt: string;
    generatedBy: "gemini" | "fallback";
    disclaimer: string;
};

type ApiPayload<T> = {
    success: boolean;
    message?: string;
    data?: T;
};

function buildMapsUrl(
    restaurant: FoodAiRestaurantContext,
) {
    if (restaurant.googleMapsUrl) {
        return restaurant.googleMapsUrl;
    }

    const params = new URLSearchParams({
        api: "1",
        query: [
            restaurant.name,
            restaurant.address,
        ]
            .filter(Boolean)
            .join(" "),
    });

    return `https://www.google.com/maps/search/?${params.toString()}`;
}

export function FoodContextAiDialog({
    restaurant,
    onClose,
}: {
    restaurant: FoodAiRestaurantContext | null;
    onClose: () => void;
}) {
    const [messages, setMessages] =
        useState<DialogMessage[]>([]);
    const [draft, setDraft] = useState("");
    const [isLoading, setIsLoading] =
        useState(false);
    const [error, setError] =
        useState<string | null>(null);
    const [lastResult, setLastResult] =
        useState<FoodContextResponse | null>(
            null,
        );
    const scrollRef =
        useRef<HTMLDivElement | null>(
            null,
        );

    const starterQuestions = useMemo(
        () => [
            "Quán này có phù hợp nếu tôi đi cùng trẻ 5 tuổi không?",
            "Ở đây nên ưu tiên thử món nào?",
            "Khoảng ngân sách cho một người là bao nhiêu?",
        ],
        [],
    );

    useEffect(() => {
        if (!restaurant) {
            return;
        }

        setMessages([]);
        setDraft("");
        setError(null);
        setLastResult(null);
    }, [restaurant?.id]);

    useEffect(() => {
        const element = scrollRef.current;
        if (!element) {
            return;
        }

        element.scrollTo({
            top: element.scrollHeight,
            behavior: "smooth",
        });
    }, [messages, isLoading]);

    if (!restaurant) {
        return null;
    }

    async function ask(
        overrideQuestion?: string,
    ) {
        const question = (
            overrideQuestion ?? draft
        ).trim();

        if (
            !question ||
            isLoading ||
            !restaurant
        ) {
            return;
        }

        const userMessage: DialogMessage = {
            role: "user",
            content: question,
        };

        const nextMessages = [
            ...messages,
            userMessage,
        ];

        setMessages(nextMessages);
        setDraft("");
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(
                "/api/ai/food/context",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        entityType:
                            "restaurant",
                        entityId:
                            restaurant.id,
                        question,
                        history: messages
                            .slice(-6)
                            .map((message) => ({
                                role:
                                    message.role,
                                content:
                                    message.content,
                            })),
                    }),
                },
            );

            const payload =
                (await response.json()) as ApiPayload<FoodContextResponse>;

            if (
                !response.ok ||
                !payload.success ||
                !payload.data
            ) {
                throw new Error(
                    payload.message ??
                        "SmartTrip AI chưa thể trả lời lúc này.",
                );
            }

            setLastResult(payload.data);
            setMessages((current) => [
                ...current,
                {
                    role: "assistant",
                    content:
                        payload.data!.answer,
                },
            ]);
        } catch (askError) {
            console.error(
                "[FOOD CONTEXT AI UI ERROR]",
                askError,
            );
            setError(
                askError instanceof Error
                    ? askError.message
                    : "SmartTrip AI chưa thể trả lời lúc này.",
            );
        } finally {
            setIsLoading(false);
        }
    }

    function addToPlanner() {
        /**
         * `restaurant` là prop nullable. Dù component đã return null ở phía trên,
         * callback này có thể được gọi ở một thời điểm khác nên TypeScript không
         * giữ narrowing xuyên qua function boundary. Narrow lại ngay tại đây.
         */
        const currentRestaurant =
            restaurant;

        if (!currentRestaurant) {
            return;
        }

        const fallbackPrompt = [
            `Mình muốn thêm một bữa ăn tại ${currentRestaurant.name} vào lịch trình SmartTrip.`,
            currentRestaurant.address
                ? `Địa chỉ: ${currentRestaurant.address}.`
                : null,
            currentRestaurant.cuisines.length
                ? `Món liên quan: ${currentRestaurant.cuisines
                      .map(
                          (item) =>
                              item.name,
                      )
                      .join(", ")}.`
                : null,
            "Hãy sắp vào thời điểm hợp lý; nếu chưa đủ thông tin chuyến đi thì hỏi mình trước.",
        ]
            .filter(Boolean)
            .join(" ");

        const prompt =
            lastResult?.plannerPrompt ??
            fallbackPrompt;

        window.location.href = `/planner/ai?foodPrompt=${encodeURIComponent(
            prompt,
        )}`;
    }

    return (
        <div
            className="fixed inset-0 z-[200] flex items-end justify-center bg-[#102f30]/45 p-0 backdrop-blur-[3px] sm:items-center sm:p-5"
            onMouseDown={(event) => {
                if (
                    event.target ===
                    event.currentTarget
                ) {
                    onClose();
                }
            }}
        >
            <div className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[30px] border border-white/80 bg-[#fffaf1] shadow-[0_30px_100px_rgba(12,40,40,.3)] sm:max-h-[82dvh] sm:rounded-[32px]">
                <div className="shrink-0 border-b border-[#e6ddd0] bg-white/90 px-5 py-4 backdrop-blur sm:px-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#173a3b] text-white">
                                <Sparkles size={19} />
                            </span>
                            <div className="min-w-0">
                                <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#d85b48]">
                                    SmartTrip AI · Ẩm thực
                                </p>
                                <h3 className="mt-1 truncate font-display text-xl font-semibold text-[#173a3b] sm:text-2xl">
                                    {restaurant.name}
                                </h3>
                                {restaurant.address ? (
                                    <p className="mt-1 flex items-center gap-1 text-xs text-[#71807c]">
                                        <MapPin size={12} />
                                        <span className="truncate">
                                            {restaurant.address}
                                        </span>
                                    </p>
                                ) : null}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#ddd3c6] bg-white text-[#687873] hover:bg-[#f5efe7]"
                            aria-label="Đóng"
                        >
                            <X size={17} />
                        </button>
                    </div>
                </div>

                <div
                    ref={scrollRef}
                    className="min-h-0 flex-1 overflow-y-auto bg-[#f7f2ea] px-4 py-5 sm:px-6"
                >
                    {messages.length === 0 ? (
                        <div className="rounded-[24px] border border-[#dce7e2] bg-white px-5 py-5">
                            <div className="flex items-start gap-3">
                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#173a3b] text-white">
                                    <Bot size={16} />
                                </span>
                                <div>
                                    <p className="text-sm font-extrabold text-[#315f5f]">
                                        Hỏi mình về quán này
                                    </p>
                                    <p className="mt-1 text-sm leading-6 text-[#667873]">
                                        Mình chỉ dùng dữ liệu SmartTrip của quán và các món liên quan. Nếu dữ liệu chưa đủ, mình sẽ nói rõ thay vì đoán.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {starterQuestions.map(
                                    (question) => (
                                        <button
                                            key={question}
                                            type="button"
                                            onClick={() =>
                                                void ask(
                                                    question,
                                                )
                                            }
                                            className="rounded-full border border-[#c8dad4] bg-[#eff7f4] px-3 py-2 text-xs font-bold text-[#3d7169] hover:bg-white"
                                        >
                                            {question}
                                        </button>
                                    ),
                                )}
                            </div>
                        </div>
                    ) : null}

                    <div className="space-y-4">
                        {messages.map(
                            (message, index) =>
                                message.role ===
                                "user" ? (
                                    <div
                                        key={`${message.role}-${index}`}
                                        className="flex justify-end"
                                    >
                                        <div className="max-w-[85%] rounded-[22px] rounded-br-[7px] bg-[#173a3b] px-4 py-3 text-sm leading-6 text-white">
                                            {message.content}
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        key={`${message.role}-${index}`}
                                        className="flex items-start gap-2.5"
                                    >
                                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#173a3b] text-white">
                                            <Bot size={14} />
                                        </span>
                                        <div className="max-w-[88%] rounded-[22px] rounded-tl-[7px] border border-[#e0d8cc] bg-white px-4 py-3 text-sm leading-6 text-[#405652]">
                                            {message.content}
                                        </div>
                                    </div>
                                ),
                        )}

                        {isLoading ? (
                            <div className="flex items-start gap-2.5">
                                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#173a3b] text-white">
                                    <Bot size={14} />
                                </span>
                                <div className="inline-flex items-center gap-2 rounded-[22px] rounded-tl-[7px] border border-[#dce7e2] bg-white px-4 py-3 text-xs font-bold text-[#5c746e]">
                                    <Loader2
                                        size={14}
                                        className="animate-spin"
                                    />
                                    Đang đọc context quán…
                                </div>
                            </div>
                        ) : null}
                    </div>

                    {lastResult?.quickReplies?.length ? (
                        <div className="mt-4 flex flex-wrap gap-2 pl-10">
                            {lastResult.quickReplies.map(
                                (item) => (
                                    <button
                                        key={item.label}
                                        type="button"
                                        disabled={isLoading}
                                        onClick={() =>
                                            void ask(
                                                item.question,
                                            )
                                        }
                                        className="rounded-full border border-[#c8dad4] bg-[#eff7f4] px-3 py-2 text-xs font-bold text-[#3d7169] hover:bg-white disabled:opacity-50"
                                    >
                                        {item.label}
                                    </button>
                                ),
                            )}
                        </div>
                    ) : null}

                    {error ? (
                        <div className="mt-4 rounded-2xl border border-[#ecc8be] bg-[#fff3ee] px-4 py-3 text-sm text-[#984c3d]">
                            {error}
                        </div>
                    ) : null}

                    {lastResult?.disclaimer ? (
                        <p className="mt-4 text-[11px] leading-5 text-[#8a9491]">
                            {lastResult.disclaimer}
                        </p>
                    ) : null}
                </div>

                <div className="shrink-0 border-t border-[#e4dbce] bg-white px-4 py-4 sm:px-6">
                    <div className="mb-3 flex flex-wrap gap-2">
                        <a
                            href={buildMapsUrl(
                                restaurant,
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full border border-[#cbdad5] bg-[#f2f8f5] px-3.5 py-2 text-xs font-extrabold text-[#3d7169]"
                        >
                            <MapPin size={13} />
                            Mở Maps
                        </a>
                        <button
                            type="button"
                            onClick={addToPlanner}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#d85b48] px-3.5 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-[#c94f40]"
                        >
                            <Plus size={13} />
                            Thêm vào lịch trình
                            <ArrowRight size={13} />
                        </button>
                    </div>

                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            void ask();
                        }}
                        className="flex items-end gap-2 rounded-[22px] border border-[#d9d0c4] bg-white p-2 pl-4 shadow-sm focus-within:border-[#78a49b]"
                    >
                        <textarea
                            rows={1}
                            maxLength={700}
                            value={draft}
                            onChange={(event) =>
                                setDraft(
                                    event.target.value,
                                )
                            }
                            onKeyDown={(event) => {
                                if (
                                    event.key ===
                                        "Enter" &&
                                    !event.shiftKey
                                ) {
                                    event.preventDefault();
                                    void ask();
                                }
                            }}
                            placeholder="Hỏi SmartTrip AI về quán này…"
                            className="max-h-24 min-h-10 flex-1 resize-none bg-transparent py-2 text-sm leading-6 text-[#173a3b] outline-none placeholder:text-[#98a19f]"
                        />
                        <button
                            type="submit"
                            disabled={
                                !draft.trim() ||
                                isLoading
                            }
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#173a3b] text-white disabled:bg-[#c9d1ce]"
                            aria-label="Gửi câu hỏi"
                        >
                            {isLoading ? (
                                <Loader2
                                    size={16}
                                    className="animate-spin"
                                />
                            ) : (
                                <Send size={16} />
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}