"use client";

import {
    Globe2,
    Loader2,
} from "lucide-react";
import {
    useLocale,
    useTranslations,
} from "next-intl";
import {
    useRouter,
} from "next/navigation";
import {
    useState,
} from "react";

import {
    isAppLocale,
    type AppLocale,
} from "@/src/i18n/config";

type LanguageSwitcherProps = {
    className?: string;
    compact?: boolean;
};

export function LanguageSwitcher({
    className = "",
    compact = false,
}: LanguageSwitcherProps) {
    const locale =
        useLocale();

    const t =
        useTranslations(
            "Language",
        );

    const router =
        useRouter();

    const [
        switchingTo,
        setSwitchingTo,
    ] =
        useState<AppLocale | null>(
            null,
        );

    const currentLocale:
        AppLocale =
        isAppLocale(locale)
            ? locale
            : "vi";

    async function changeLocale(
        nextLocale:
            AppLocale,
    ) {
        if (
            nextLocale ===
                currentLocale ||
            switchingTo
        ) {
            return;
        }

        setSwitchingTo(
            nextLocale,
        );

        try {
            const response =
                await fetch(
                    "/api/locale",
                    {
                        method:
                            "POST",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body:
                            JSON.stringify(
                                {
                                    locale:
                                        nextLocale,
                                },
                            ),
                    },
                );

            if (!response.ok) {
                throw new Error(
                    "Unable to change language",
                );
            }

            router.refresh();
        } catch (error) {
            console.error(
                "[LANGUAGE SWITCH ERROR]",
                error,
            );
        } finally {
            setSwitchingTo(
                null,
            );
        }
    }

    return (
        <div
            className={`inline-flex items-center gap-1 rounded-full border border-[#ded3c5] bg-white/95 p-1 shadow-sm backdrop-blur ${className}`}
            role="group"
            aria-label={
                t("label")
            }
        >
            {!compact ? (
                <span className="ml-2 mr-1 hidden items-center gap-1.5 text-xs font-bold text-[#667570] sm:inline-flex">
                    <Globe2
                        size={14}
                    />
                    {t(
                        "label",
                    )}
                </span>
            ) : null}

            <LanguageButton
                locale="vi"
                label="VI"
                title={t(
                    "switchToVietnamese",
                )}
                active={
                    currentLocale ===
                    "vi"
                }
                loading={
                    switchingTo ===
                    "vi"
                }
                disabled={
                    switchingTo !==
                    null
                }
                onClick={() =>
                    void changeLocale(
                        "vi",
                    )
                }
            />

            <LanguageButton
                locale="en"
                label="EN"
                title={t(
                    "switchToEnglish",
                )}
                active={
                    currentLocale ===
                    "en"
                }
                loading={
                    switchingTo ===
                    "en"
                }
                disabled={
                    switchingTo !==
                    null
                }
                onClick={() =>
                    void changeLocale(
                        "en",
                    )
                }
            />
        </div>
    );
}

function LanguageButton({
    label,
    title,
    active,
    loading,
    disabled,
    onClick,
}: {
    locale: AppLocale;
    label: string;
    title: string;
    active: boolean;
    loading: boolean;
    disabled: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            title={title}
            aria-pressed={
                active
            }
            disabled={
                disabled
            }
            onClick={
                onClick
            }
            className={`inline-flex h-8 min-w-10 items-center justify-center rounded-full px-2.5 text-xs font-extrabold transition ${
                active
                    ? "bg-[#173a3b] text-white"
                    : "text-[#667570] hover:bg-[#f5eee5]"
            } disabled:cursor-not-allowed disabled:opacity-60`}
        >
            {loading ? (
                <Loader2
                    size={13}
                    className="animate-spin"
                />
            ) : (
                label
            )}
        </button>
    );
}