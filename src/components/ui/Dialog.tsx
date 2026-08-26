"use client";

import {useEffect,useId,type ReactNode,} from "react";
import { X } from "lucide-react";

type DialogSize = | "sm" | "md" | "lg" | "xl" | "2xl";

type DialogProps = {
    open: boolean;
    title: ReactNode;
    children: ReactNode;
    onClose: () => void;
    description?: ReactNode;
    footer?: ReactNode;
    size?: DialogSize;
    closeLabel?: string;
    closeOnBackdrop?: boolean;
    closeOnEscape?: boolean;
    closeDisabled?: boolean;
    backdropClassName?: string;
    panelClassName?: string;
    bodyClassName?: string;
};

const SIZE_CLASS_NAMES: Record<DialogSize,string> = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-xl",
    xl: "max-w-2xl",
    "2xl": "max-w-4xl",
};

export function Dialog({
    open,
    title,
    children,
    onClose,
    description,
    footer,
    size = "lg",
    closeLabel = "Đóng",
    closeOnBackdrop = true,
    closeOnEscape = true,
    closeDisabled = false,
    backdropClassName = "",
    panelClassName = "",
    bodyClassName = "",
}: DialogProps) {
    const generatedId =
        useId();

    const titleId =
        `${generatedId}-title`;

    const descriptionId =
        description
            ? `${generatedId}-description`
            : undefined;

    useEffect(() => {
        if (!open) {
            return;
        }

        const previousOverflow =
            document.body.style.overflow;

        function handleKeyDown(
            event: KeyboardEvent,
        ) {
            if (
                event.key === "Escape" &&
                closeOnEscape &&
                !closeDisabled
            ) {
                onClose();
            }
        }

        document.body.style.overflow =
            "hidden";

        document.addEventListener(
            "keydown",
            handleKeyDown,
        );

        return () => {
            document.body.style.overflow =
                previousOverflow;

            document.removeEventListener(
                "keydown",
                handleKeyDown,
            );
        };
    }, [
        closeDisabled,
        closeOnEscape,
        onClose,
        open,
    ]);

    if (!open) {
        return null;
    }

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 ${backdropClassName}`}
            role="presentation"
            onMouseDown={(event) => {
                if (
                    event.target ===
                        event.currentTarget &&
                    closeOnBackdrop &&
                    !closeDisabled
                ) {
                    onClose();
                }
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby={
                    titleId
                }
                aria-describedby={
                    descriptionId
                }
                className={`max-h-[90vh] w-full overflow-y-auto rounded-xl border border-admin-line bg-admin-paper-card shadow-2xl ${SIZE_CLASS_NAMES[size]} ${panelClassName}`}
                onMouseDown={(event) =>
                    event.stopPropagation()
                }
            >
                <header className="flex items-start justify-between gap-4 border-b border-admin-line px-6 py-5">
                    <div className="min-w-0">
                        <h2
                            id={titleId}
                            className="font-display text-2xl font-semibold text-admin-ink"
                        >
                            {title}
                        </h2>

                        {description ? (
                            <div
                                id={
                                    descriptionId
                                }
                                className="mt-1.5 text-sm leading-6 text-admin-muted"
                            >
                                {
                                    description
                                }
                            </div>
                        ) : null}
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={
                            closeDisabled
                        }
                        aria-label={
                            closeLabel
                        }
                        className="shrink-0 rounded-md p-1 text-admin-muted transition hover:bg-admin-paper hover:text-admin-ink disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <X size={20} />
                    </button>
                </header>

                <div
                    className={`px-6 py-5 ${bodyClassName}`}
                >
                    {children}
                </div>

                {footer ? (
                    <footer className="flex justify-end gap-2 border-t border-admin-line px-6 py-4">
                        {footer}
                    </footer>
                ) : null}
            </section>
        </div>
    );
}
