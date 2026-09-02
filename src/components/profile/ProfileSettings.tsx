"use client";

import {
    Camera,
    CheckCircle2,
    Loader2,
    LockKeyhole,
    Mail,
    Save,
    ShieldCheck,
    Trash2,
    UserRound,
    XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
    type ChangeEvent,
    type FormEvent,
    useRef,
    useState,
} from "react";

type ProfileSettingsProps = {
    initialFullName: string;
    email: string;
    initialAvatarUrl: string | null;
    role: "user" | "admin";
};

type ApiPayload<T> = {
    success: boolean;
    message?: string;
    data?: T;
    errors?: Record<
        string,
        string[]
    >;
};

type UpdatedProfile = {
    fullName: string | null;
    avatarUrl: string | null;
};

type UpdatedAvatar = {
    avatarUrl: string | null;
};

const MAX_AVATAR_SIZE =
    5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
]);

function normalizeFullName(
    value: string,
) {
    return value
        .trim()
        .replace(/\s+/g, " ");
}

function getInitials(name: string) {
    const words = name
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (words.length === 0) {
        return "U";
    }

    if (words.length === 1) {
        return words[0]
            .slice(0, 1)
            .toUpperCase();
    }

    return `${words[0][0]}${
        words[words.length - 1][0]
    }`.toUpperCase();
}

function notifyHeaderProfileUpdated(
    detail: {
        fullName?: string;
        avatarUrl?: string | null;
        role?: "user" | "admin";
    },
) {
    window.dispatchEvent(
        new CustomEvent(
            "smarttrip:profile-updated",
            { detail },
        ),
    );
}

export function ProfileSettings({
    initialFullName,
    email,
    initialAvatarUrl,
    role,
}: ProfileSettingsProps) {
    const router = useRouter();
    const fileInputRef =
        useRef<HTMLInputElement>(
            null,
        );

    const [fullName, setFullName] =
        useState(initialFullName);
    const [savedFullName, setSavedFullName] =
        useState(initialFullName);
    const [avatarUrl, setAvatarUrl] =
        useState(initialAvatarUrl);
    const [avatarPreview, setAvatarPreview] =
        useState<string | null>(null);
    const [isSaving, setIsSaving] =
        useState(false);
    const [isAvatarBusy, setIsAvatarBusy] =
        useState(false);
    const [message, setMessage] =
        useState<{
            type: "success" | "error";
            text: string;
        } | null>(null);

    const normalizedName =
        normalizeFullName(fullName);
    const hasNameChanged =
        normalizedName !==
        savedFullName;
    const displayedAvatar =
        avatarPreview ?? avatarUrl;
    const initials = getInitials(
        normalizedName || email,
    );

    function validateName() {
        if (
            normalizedName.length < 2
        ) {
            return "Họ và tên phải có ít nhất 2 ký tự.";
        }

        if (
            normalizedName.length > 80
        ) {
            return "Họ và tên không được vượt quá 80 ký tự.";
        }

        if (
            !/[\p{L}\p{N}]/u.test(
                normalizedName,
            )
        ) {
            return "Họ và tên phải chứa chữ cái hoặc chữ số.";
        }

        return null;
    }

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (isSaving) {
            return;
        }

        const validationError =
            validateName();

        if (validationError) {
            setMessage({
                type: "error",
                text: validationError,
            });
            return;
        }

        if (!hasNameChanged) {
            setMessage({
                type: "success",
                text: "Thông tin hiện tại không có thay đổi.",
            });
            return;
        }

        setIsSaving(true);
        setMessage(null);

        try {
            const response = await fetch(
                "/api/profile",
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        fullName:
                            normalizedName,
                    }),
                },
            );

            const payload =
                (await response.json()) as ApiPayload<UpdatedProfile>;

            if (
                !response.ok ||
                !payload.success ||
                !payload.data
            ) {
                throw new Error(
                    payload.errors
                        ?.fullName?.[0] ??
                        payload.message ??
                        "Chưa thể cập nhật thông tin.",
                );
            }

            const nextFullName =
                payload.data.fullName ??
                normalizedName;

            setFullName(nextFullName);
            setSavedFullName(
                nextFullName,
            );
            setMessage({
                type: "success",
                text:
                    payload.message ??
                    "Cập nhật thông tin thành công.",
            });

            notifyHeaderProfileUpdated({
                fullName: nextFullName,
                role,
            });
            router.refresh();
        } catch (error) {
            setMessage({
                type: "error",
                text:
                    error instanceof Error
                        ? error.message
                        : "Chưa thể cập nhật thông tin.",
            });
        } finally {
            setIsSaving(false);
        }
    }

    async function handleAvatarChange(
        event: ChangeEvent<HTMLInputElement>,
    ) {
        const file =
            event.target.files?.[0];

        event.target.value = "";

        if (!file || isAvatarBusy) {
            return;
        }

        if (
            !ALLOWED_AVATAR_TYPES.has(
                file.type,
            )
        ) {
            setMessage({
                type: "error",
                text: "Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc AVIF.",
            });
            return;
        }

        if (file.size > MAX_AVATAR_SIZE) {
            setMessage({
                type: "error",
                text: "Ảnh đại diện không được vượt quá 5MB.",
            });
            return;
        }

        const previewUrl =
            URL.createObjectURL(file);

        setAvatarPreview(previewUrl);
        setIsAvatarBusy(true);
        setMessage(null);

        try {
            const formData =
                new FormData();
            formData.set(
                "avatar",
                file,
            );

            const response = await fetch(
                "/profile/avatar",
                {
                    method: "POST",
                    body: formData,
                },
            );

            const payload =
                (await response.json()) as ApiPayload<UpdatedAvatar>;

            if (
                !response.ok ||
                !payload.success ||
                !payload.data
            ) {
                throw new Error(
                    payload.message ??
                        "Chưa thể cập nhật ảnh đại diện.",
                );
            }

            setAvatarUrl(
                payload.data.avatarUrl,
            );
            setMessage({
                type: "success",
                text:
                    payload.message ??
                    "Cập nhật ảnh đại diện thành công.",
            });

            notifyHeaderProfileUpdated({
                avatarUrl:
                    payload.data.avatarUrl,
                role,
            });
            router.refresh();
        } catch (error) {
            setMessage({
                type: "error",
                text:
                    error instanceof Error
                        ? error.message
                        : "Chưa thể cập nhật ảnh đại diện.",
            });
        } finally {
            URL.revokeObjectURL(
                previewUrl,
            );
            setAvatarPreview(null);
            setIsAvatarBusy(false);
        }
    }

    async function handleRemoveAvatar() {
        if (
            !avatarUrl ||
            isAvatarBusy
        ) {
            return;
        }

        setIsAvatarBusy(true);
        setMessage(null);

        try {
            const response = await fetch(
                "/profile/avatar",
                {
                    method: "DELETE",
                },
            );

            const payload =
                (await response.json()) as ApiPayload<UpdatedAvatar>;

            if (
                !response.ok ||
                !payload.success
            ) {
                throw new Error(
                    payload.message ??
                        "Chưa thể xóa ảnh đại diện.",
                );
            }

            setAvatarUrl(null);
            setMessage({
                type: "success",
                text:
                    payload.message ??
                    "Đã xóa ảnh đại diện.",
            });

            notifyHeaderProfileUpdated({
                avatarUrl: null,
                role,
            });
            router.refresh();
        } catch (error) {
            setMessage({
                type: "error",
                text:
                    error instanceof Error
                        ? error.message
                        : "Chưa thể xóa ảnh đại diện.",
            });
        } finally {
            setIsAvatarBusy(false);
        }
    }

    return (
        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="rounded-[30px] border border-[#e1d6c6] bg-[#fffaf3] p-6 shadow-[0_18px_55px_rgba(23,58,59,0.08)] sm:p-8">
                <div className="text-center">
                    <div className="relative mx-auto h-36 w-36">
                        {displayedAvatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={displayedAvatar}
                                alt={`Ảnh đại diện của ${normalizedName}`}
                                className="h-full w-full rounded-full object-cover ring-4 ring-white shadow-[0_16px_38px_rgba(23,58,59,0.18)]"
                            />
                        ) : (
                            <div className="grid h-full w-full place-items-center rounded-full bg-[#0f615d] text-4xl font-semibold text-white ring-4 ring-white shadow-[0_16px_38px_rgba(23,58,59,0.18)]">
                                {initials}
                            </div>
                        )}

                        <span className="absolute bottom-1 right-1 grid h-11 w-11 place-items-center rounded-full border-4 border-[#fffaf3] bg-[#f3bd59] text-[#173a3b]">
                            {isAvatarBusy ? (
                                <Loader2
                                    size={18}
                                    className="animate-spin"
                                />
                            ) : (
                                <Camera
                                    size={18}
                                />
                            )}
                        </span>
                    </div>

                    <h2 className="mt-6 font-display text-3xl font-semibold text-[#173a3b]">
                        {normalizedName}
                    </h2>
                    <p className="mt-1 break-all text-sm text-[#71807c]">
                        {email}
                    </p>

                    <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#e4f0ed] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#2f7773]">
                        <ShieldCheck
                            size={13}
                        />
                        {role === "admin"
                            ? "Quản trị viên"
                            : "Thành viên"}
                    </span>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    onChange={
                        handleAvatarChange
                    }
                    className="sr-only"
                    aria-label="Chọn ảnh đại diện mới"
                />

                <div className="mt-7 grid gap-2">
                    <button
                        type="button"
                        onClick={() =>
                            fileInputRef.current?.click()
                        }
                        disabled={
                            isAvatarBusy
                        }
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#173a3b] px-4 text-sm font-bold text-white transition hover:bg-[#214c4b] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Camera size={16} />
                        {avatarUrl
                            ? "Đổi ảnh đại diện"
                            : "Tải ảnh đại diện"}
                    </button>

                    {avatarUrl ? (
                        <button
                            type="button"
                            onClick={() =>
                                void handleRemoveAvatar()
                            }
                            disabled={
                                isAvatarBusy
                            }
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#edc8be] bg-[#fff5f1] px-4 text-sm font-bold text-[#c65343] transition hover:bg-[#ffebe5] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Trash2
                                size={16}
                            />
                            Xóa ảnh
                        </button>
                    ) : null}
                </div>

                <p className="mt-4 text-center text-xs leading-5 text-[#87918e]">
                    JPEG, PNG, WebP hoặc AVIF. Dung lượng tối đa 5MB.
                </p>
            </aside>

            <form
                onSubmit={handleSubmit}
                className="rounded-[30px] border border-[#e1d6c6] bg-[#fffaf3] p-6 shadow-[0_18px_55px_rgba(23,58,59,0.08)] sm:p-8 lg:p-10"
            >
                <div className="flex items-start gap-4 border-b border-[#e9dfd2] pb-6">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#e4f0ed] text-[#2f7773]">
                        <UserRound size={21} />
                    </span>
                    <div>
                        <h2 className="font-display text-3xl font-semibold text-[#173a3b]">
                            Thông tin cơ bản
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-[#71807c]">
                            Chỉnh sửa tên hiển thị và ảnh đại diện cho tài khoản của bạn.
                        </p>
                    </div>
                </div>

                <div className="mt-7 grid gap-6">
                    <label className="block">
                        <span className="text-sm font-bold text-[#294748]">
                            Họ và tên
                        </span>
                        <div className="relative mt-2">
                            <UserRound
                                size={18}
                                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#7b8a86]"
                            />
                            <input
                                value={fullName}
                                onChange={(event) => {
                                    setFullName(
                                        event.target
                                            .value,
                                    );
                                    setMessage(null);
                                }}
                                maxLength={80}
                                autoComplete="name"
                                className="h-13 w-full rounded-2xl border border-[#d9cdbc] bg-white pl-12 pr-4 text-sm font-semibold text-[#294748] outline-none transition focus:border-[#71a9a3] focus:ring-4 focus:ring-[#71a9a3]/10"
                            />
                        </div>
                        <span className="mt-1.5 block text-xs text-[#87918e]">
                            Tên này sẽ hiển thị trên bài viết, bình luận và lịch trình của bạn.
                        </span>
                    </label>

                    <label className="block">
                        <span className="text-sm font-bold text-[#294748]">
                            Email
                        </span>
                        <div className="relative mt-2">
                            <Mail
                                size={18}
                                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#7b8a86]"
                            />
                            <input
                                value={email}
                                readOnly
                                aria-readonly="true"
                                className="h-13 w-full cursor-not-allowed rounded-2xl border border-[#e0d7ca] bg-[#f3eee5] pl-12 pr-12 text-sm font-semibold text-[#687773] outline-none"
                            />
                            <LockKeyhole
                                size={16}
                                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#9aa29f]"
                            />
                        </div>
                        <span className="mt-1.5 block text-xs text-[#87918e]">
                            Email dùng để đăng nhập nên chưa thể chỉnh tại biểu mẫu này.
                        </span>
                    </label>
                </div>

                {message ? (
                    <div
                        role="status"
                        aria-live="polite"
                        className={`mt-6 flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                            message.type ===
                            "success"
                                ? "border-[#b9d9d2] bg-[#edf7f4] text-[#28635f]"
                                : "border-[#edc8be] bg-[#fff4ef] text-[#a44e40]"
                        }`}
                    >
                        {message.type ===
                        "success" ? (
                            <CheckCircle2
                                size={18}
                                className="mt-0.5 shrink-0"
                            />
                        ) : (
                            <XCircle
                                size={18}
                                className="mt-0.5 shrink-0"
                            />
                        )}
                        {message.text}
                    </div>
                ) : null}

                <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#e9dfd2] pt-6 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={() => {
                            setFullName(
                                savedFullName,
                            );
                            setMessage(null);
                        }}
                        disabled={
                            !hasNameChanged ||
                            isSaving
                        }
                        className="min-h-11 rounded-xl border border-[#d8cdbc] bg-white px-5 text-sm font-bold text-[#5f706c] transition hover:bg-[#f7f2e9] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Hoàn tác
                    </button>

                    <button
                        type="submit"
                        disabled={
                            !hasNameChanged ||
                            isSaving
                        }
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#f25f4b] px-5 text-sm font-extrabold text-white transition hover:bg-[#df503f] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSaving ? (
                            <Loader2
                                size={17}
                                className="animate-spin"
                            />
                        ) : (
                            <Save size={17} />
                        )}
                        {isSaving
                            ? "Đang lưu..."
                            : "Lưu thay đổi"}
                    </button>
                </div>
            </form>
        </div>
    );
}
