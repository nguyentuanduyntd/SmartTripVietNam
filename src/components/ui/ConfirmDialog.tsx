"use client";

import { TriangleAlert } from "lucide-react";

type ConfirmDialogProps = {
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

export function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel = "Xác nhận xóa",
    cancelLabel = "Hủy",
    danger = true,
    loading = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps){ 
    if (!open ) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-admin-ink/40 px-4"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
        >
            <div className="w-full max-w-sm rounded-lg border border-admin-line bg-admin-paper-card p-5 shadow-xl">
                <div className="flex items-start gap-3">
                {danger && (
                    <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-admin-seal-light text-admin-seal">
                    <TriangleAlert size={18} strokeWidth={1.75} />
                    </span>
                )}
                <div>
                    <h2
                    id="confirm-dialog-title"
                    className="font-display text-base font-medium text-admin-ink"
                    >
                    {title}
                    </h2>
                    <p className="mt-1 text-sm text-admin-muted">{description}</p>
                </div>
                </div>

                <div className="mt-5 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="rounded-md border border-admin-line px-3 py-1.5 text-sm font-medium text-admin-ink hover:bg-admin-paper disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className="rounded-md border border-admin-seal bg-admin-seal px-3 py-1.5 text-sm font-medium text-admin-seal-light hover:opacity-90 disabled:opacity-50"
                    >
                        {loading ? "Đang xóa…" : confirmLabel}
                    </button>
                </div>
            </div>
        </div>   
    );
} 