"use client";

import {
    useState,
    type FormEvent,
} from "react";

import {
    CoverImageField,
    useCoverImageField,
} from "@/src/components/ui/CoverImageField";
import {
    Dialog,
} from "@/src/components/ui/Dialog";
import {
    FormField,
    TextArea,
    TextInput,
} from "@/src/components/ui/FormField";
import type {
    Cuisine,
    CuisineInput,
} from "@/src/lib/api-client/cuisines";
import type {
    Destination,
} from "@/src/lib/api-client/destinations";

export type CuisineFormSubmitData = {
    input: CuisineInput;
    coverFile: File | null;
    removeCover: boolean;
};

type CuisineFormDialogProps = {
    open: boolean;
    destinations: Destination[];
    initialValue: Cuisine | null;
    submitting: boolean;
    fieldErrors?: Record<
        string,
        string[]
    >;
    onSubmit: (
        data: CuisineFormSubmitData,
    ) => void | Promise<void>;
    onClose: () => void;
};

type CuisineFormState = {
    name: string;
    nameEn: string;
    description: string;
    descriptionEn: string;
    avgPrice: string;
    destinationIds: string[];
};

const EMPTY_FORM: CuisineFormState = {
    name: "",
    nameEn: "",
    description: "",
    descriptionEn: "",
    avgPrice: "",
    destinationIds: [],
};

function createInitialForm(
    initialValue: Cuisine | null,
): CuisineFormState {
    if (!initialValue) {
        return {
            ...EMPTY_FORM,
            destinationIds: [],
        };
    }

    return {
        name:
            initialValue.name,
        nameEn:
            initialValue.nameEn ??
            "",
        description:
            initialValue.description ??
            "",
        descriptionEn:
            initialValue.descriptionEn ??
            "",
        avgPrice:
            initialValue.avgPrice !==
            null
                ? String(
                      initialValue.avgPrice,
                  )
                : "",
        destinationIds:
            initialValue.destinations.map(
                (
                    destination,
                ) =>
                    destination.id,
            ),
    };
}

export function CuisineFormDialog({
    open,
    destinations,
    initialValue,
    submitting,
    fieldErrors,
    onSubmit,
    onClose,
}: CuisineFormDialogProps) {
    const [form, setForm] =
        useState<CuisineFormState>(
            () =>
                createInitialForm(
                    initialValue,
                ),
        );

    const coverImage =
        useCoverImageField(
            initialValue
                ?.coverImageUrl,
        );

    function updateField<
        Key extends keyof CuisineFormState,
    >(
        key: Key,
        value: CuisineFormState[Key],
    ) {
        setForm(
            (current) => ({
                ...current,
                [key]: value,
            }),
        );
    }

    function toggleDestination(
        id: string,
    ) {
        setForm(
            (current) => ({
                ...current,
                destinationIds:
                    current.destinationIds.includes(
                        id,
                    )
                        ? current.destinationIds.filter(
                              (
                                  value,
                              ) =>
                                  value !==
                                  id,
                          )
                        : [
                              ...current.destinationIds,
                              id,
                          ],
            }),
        );
    }

    function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        const trimmedPrice =
            form.avgPrice.trim();

        void onSubmit({
            input: {
                name:
                    form.name,
                nameEn:
                    form.nameEn ||
                    null,
                description:
                    form.description ||
                    null,
                descriptionEn:
                    form.descriptionEn ||
                    null,
                avgPrice:
                    trimmedPrice
                        ? Number(
                              trimmedPrice,
                          )
                        : null,
                destinationIds:
                    form.destinationIds,
            },
            coverFile:
                coverImage.coverFile,
            removeCover:
                coverImage.removeCover,
        });
    }

    const submitLabel =
        submitting
            ? coverImage.coverFile
                ? "Đang upload ảnh…"
                : "Đang lưu…"
            : initialValue
              ? "Lưu thay đổi"
              : "Tạo món ăn";

    return (
        <Dialog
            open={open}
            title={
                initialValue
                    ? "Sửa món ăn"
                    : "Thêm món ăn mới"
            }
            size="lg"
            onClose={onClose}
            closeDisabled={
                submitting
            }
            footer={
                <>
                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        disabled={
                            submitting
                        }
                        className="rounded-md border border-admin-line px-3 py-1.5 text-sm font-medium text-admin-ink transition hover:bg-admin-paper disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Hủy
                    </button>

                    <button
                        type="submit"
                        form="cuisine-form"
                        disabled={
                            submitting ||
                            Boolean(
                                coverImage.imageError,
                            )
                        }
                        className="rounded-md border border-admin-gold bg-admin-gold px-3 py-1.5 text-sm font-medium text-admin-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitLabel}
                    </button>
                </>
            }
        >
            <form
                id="cuisine-form"
                className="space-y-4"
                onSubmit={
                    handleSubmit
                }
            >
                <FormField
                    htmlFor="cuisine-name"
                    label="Tên món ăn"
                    required
                    error={
                        fieldErrors
                            ?.name
                    }
                >
                    <TextInput
                        id="cuisine-name"
                        value={form.name}
                        required
                        disabled={
                            submitting
                        }
                        invalid={Boolean(
                            fieldErrors
                                ?.name
                                ?.length,
                        )}
                        placeholder="Bún bò Huế"
                        onChange={(
                            event,
                        ) =>
                            updateField(
                                "name",
                                event.target
                                    .value,
                            )
                        }
                    />
                </FormField>

                <FormField
                    htmlFor="cuisine-name-en"
                    label="Tên tiếng Anh"
                >
                    <TextInput
                        id="cuisine-name-en"
                        value={
                            form.nameEn
                        }
                        disabled={
                            submitting
                        }
                        placeholder="Hue-style Beef Noodle Soup"
                        onChange={(
                            event,
                        ) =>
                            updateField(
                                "nameEn",
                                event.target
                                    .value,
                            )
                        }
                    />
                </FormField>

                <FormField
                    htmlFor="cuisine-avg-price"
                    label="Giá tham khảo (VNĐ)"
                    error={
                        fieldErrors
                            ?.avgPrice
                    }
                >
                    <TextInput
                        id="cuisine-avg-price"
                        type="number"
                        min={0}
                        step={1000}
                        value={
                            form.avgPrice
                        }
                        disabled={
                            submitting
                        }
                        invalid={Boolean(
                            fieldErrors
                                ?.avgPrice
                                ?.length,
                        )}
                        placeholder="35000"
                        onChange={(
                            event,
                        ) =>
                            updateField(
                                "avgPrice",
                                event.target
                                    .value,
                            )
                        }
                    />
                </FormField>

                <FormField
                    htmlFor="cuisine-description"
                    label="Mô tả"
                >
                    <TextArea
                        id="cuisine-description"
                        rows={4}
                        value={
                            form.description
                        }
                        disabled={
                            submitting
                        }
                        onChange={(
                            event,
                        ) =>
                            updateField(
                                "description",
                                event.target
                                    .value,
                            )
                        }
                    />
                </FormField>

                <FormField
                    label="Địa danh liên quan"
                    error={
                        fieldErrors
                            ?.destinationIds
                    }
                >
                    <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-md border border-admin-line bg-admin-paper p-2.5">
                        {destinations.length ===
                        0 ? (
                            <span className="text-xs text-admin-muted">
                                Chưa có địa
                                danh nào
                            </span>
                        ) : null}

                        {destinations.map(
                            (
                                destination,
                            ) => {
                                const checked =
                                    form.destinationIds.includes(
                                        destination.id,
                                    );

                                return (
                                    <button
                                        key={
                                            destination.id
                                        }
                                        type="button"
                                        disabled={
                                            submitting
                                        }
                                        onClick={() =>
                                            toggleDestination(
                                                destination.id,
                                            )
                                        }
                                        aria-pressed={
                                            checked
                                        }
                                        className={`rounded-full border px-2.5 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                            checked
                                                ? "border-admin-gold bg-admin-gold/15 text-admin-ink"
                                                : "border-admin-line text-admin-muted hover:border-admin-gold hover:text-admin-ink"
                                        }`}
                                    >
                                        {
                                            destination.name
                                        }
                                    </button>
                                );
                            },
                        )}
                    </div>
                </FormField>

                <CoverImageField
                    inputId="cuisine-cover"
                    imageAlt="Ảnh bìa món ăn"
                    controller={
                        coverImage
                    }
                    disabled={
                        submitting
                    }
                />
            </form>
        </Dialog>
    );
}
