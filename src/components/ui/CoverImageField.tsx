"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
} from "react";

import {
    ImagePlus,
    Trash2,
} from "lucide-react";

import {
    FormField,
} from "@/src/components/ui/FormField";

const MAX_FILE_SIZE =
    5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
] as const;

const ACCEPTED_IMAGE_TYPES =
    ALLOWED_IMAGE_TYPES.join(
        ",",
    );

export type CoverImageController = {
    coverFile: File | null;
    previewUrl: string | null;
    removeCover: boolean;
    imageError: string | null;

    handleCoverChange: (
        event: ChangeEvent<HTMLInputElement>,
    ) => void;
    handleRemoveCover: () => void;
};

export function useCoverImageField(
    initialImageUrl?:
        | string
        | null,
): CoverImageController {
    const initialImageUrlRef =
        useRef(
            initialImageUrl ??
                null,
        );

    const objectUrlRef =
        useRef<
            string | null
        >(null);

    const [
        coverFile,
        setCoverFile,
    ] = useState<File | null>(
        null,
    );

    const [
        previewUrl,
        setPreviewUrl,
    ] = useState<
        string | null
    >(
        initialImageUrl ??
            null,
    );

    const [
        removeCover,
        setRemoveCover,
    ] = useState(false);

    const [
        imageError,
        setImageError,
    ] = useState<
        string | null
    >(null);

    const revokeObjectUrl =
        useCallback(() => {
            if (
                !objectUrlRef.current
            ) {
                return;
            }

            URL.revokeObjectURL(
                objectUrlRef.current,
            );

            objectUrlRef.current =
                null;
        }, []);

    useEffect(() => {
        return () => {
            revokeObjectUrl();
        };
    }, [revokeObjectUrl]);

    const handleCoverChange =
        useCallback(
            (
                event: ChangeEvent<HTMLInputElement>,
            ) => {
                const file =
                    event.target
                        .files?.[0];

                /* Cho phép chọn lại đúng file vừa chọn. */
                event.target.value =
                    "";

                if (!file) {
                    return;
                }

                if (
                    !ALLOWED_IMAGE_TYPES.includes(
                        file.type as (typeof ALLOWED_IMAGE_TYPES)[number],
                    )
                ) {
                    setImageError(
                        "Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc AVIF",
                    );

                    return;
                }

                if (
                    file.size >
                    MAX_FILE_SIZE
                ) {
                    setImageError(
                        "Kích thước ảnh không được vượt quá 5MB",
                    );

                    return;
                }

                revokeObjectUrl();

                const objectUrl =
                    URL.createObjectURL(
                        file,
                    );

                objectUrlRef.current =
                    objectUrl;

                setCoverFile(
                    file,
                );
                setPreviewUrl(
                    objectUrl,
                );
                setRemoveCover(
                    false,
                );
                setImageError(
                    null,
                );
            },
            [revokeObjectUrl],
        );

    const handleRemoveCover =
        useCallback(() => {
            revokeObjectUrl();

            setCoverFile(
                null,
            );
            setPreviewUrl(
                null,
            );
            setImageError(
                null,
            );
            setRemoveCover(
                Boolean(
                    initialImageUrlRef.current,
                ),
            );
        }, [revokeObjectUrl]);

    return {
        coverFile,
        previewUrl,
        removeCover,
        imageError,
        handleCoverChange,
        handleRemoveCover,
    };
}

type CoverImageFieldProps = {
    inputId: string;
    imageAlt: string;
    controller: CoverImageController;

    label?: string;
    disabled?: boolean;
};

export function CoverImageField({
    inputId,
    imageAlt,
    controller,
    label = "Ảnh bìa",
    disabled = false,
}: CoverImageFieldProps) {
    const {
        coverFile,
        previewUrl,
        imageError,
        handleCoverChange,
        handleRemoveCover,
    } = controller;

    return (
        <FormField
            label={label}
            error={imageError}
        >
            {previewUrl ? (
                <div className="relative overflow-hidden rounded-lg border border-admin-line bg-admin-paper">
                    {/* Hỗ trợ URL từ server và blob URL dùng để preview. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={previewUrl}
                        alt={imageAlt}
                        className="h-48 w-full object-cover"
                    />

                    <button
                        type="button"
                        onClick={
                            handleRemoveCover
                        }
                        disabled={
                            disabled
                        }
                        className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-md bg-black/70 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Trash2
                            size={14}
                        />
                        Xóa ảnh
                    </button>
                </div>
            ) : (
                <label
                    htmlFor={
                        inputId
                    }
                    className={`flex h-40 flex-col items-center justify-center rounded-lg border border-dashed border-admin-line bg-admin-paper text-admin-muted transition ${
                        disabled
                            ? "cursor-not-allowed opacity-60"
                            : "cursor-pointer hover:border-admin-gold hover:text-admin-ink"
                    }`}
                >
                    <ImagePlus
                        size={28}
                    />

                    <span className="mt-2 text-sm font-medium">
                        Chọn ảnh bìa
                    </span>

                    <span className="mt-1 text-xs">
                        JPEG, PNG,
                        WebP, AVIF —
                        tối đa 5MB
                    </span>
                </label>
            )}

            <input
                id={inputId}
                type="file"
                accept={
                    ACCEPTED_IMAGE_TYPES
                }
                disabled={disabled}
                onChange={
                    handleCoverChange
                }
                className="hidden"
            />

            {previewUrl ? (
                <label
                    htmlFor={
                        inputId
                    }
                    className={`mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-admin-gold ${
                        disabled
                            ? "cursor-not-allowed opacity-60"
                            : "cursor-pointer hover:underline"
                    }`}
                >
                    <ImagePlus
                        size={15}
                    />
                    Chọn ảnh khác
                </label>
            ) : null}

            {coverFile ? (
                <p className="mt-1 break-all text-xs text-admin-muted">
                    Đã chọn:{" "}
                    {coverFile.name}
                </p>
            ) : null}
        </FormField>
    );
}