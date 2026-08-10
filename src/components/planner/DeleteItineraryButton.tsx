"use client";

import {
    Loader2,
    Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type DeleteItineraryButtonProps = {
    itineraryId: string;
    title: string;
};

export function DeleteItineraryButton({
    itineraryId,
    title,
}: DeleteItineraryButtonProps) {
    const router = useRouter();

    const [isDeleting, setIsDeleting] =
        useState(false);

    async function handleDelete() {
        const confirmed = window.confirm(
            `Bạn có chắc muốn xóa lịch trình "${title}"?\n\nHành động này không thể hoàn tác.`,
        );

        if (!confirmed) {
            return;
        }

        try {
            setIsDeleting(true);

            const response = await fetch(
                `/api/itineraries/${itineraryId}`,
                {
                    method: "DELETE",
                },
            );

            const result =
                await response
                    .json()
                    .catch(() => null);

            if (!response.ok) {
                alert(
                    result?.message ??
                        "Không thể xóa lịch trình.",
                );
                return;
            }

            router.refresh();
        } catch {
            alert(
                "Đã xảy ra lỗi khi xóa lịch trình.",
            );
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label={`Xóa lịch trình ${title}`}
            title="Xóa lịch trình"
            className="
                absolute right-4 top-4 z-20
                flex h-10 w-10
                items-center justify-center
                rounded-full
                border border-white/80
                bg-white/90
                text-[#c94f43]
                shadow-md
                backdrop-blur
                transition
                hover:scale-105
                hover:bg-[#fff1ee]
                disabled:cursor-not-allowed
                disabled:opacity-60
            "
        >
            {isDeleting ? (
                <Loader2
                    size={18}
                    className="animate-spin"
                />
            ) : (
                <Trash2 size={18} />
            )}
        </button>
    );
}