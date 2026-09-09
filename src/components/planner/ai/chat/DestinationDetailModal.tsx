"use client";

import { useEffect, useState } from "react";
import { ExternalLink, MapPin, Sparkles, X, Check } from "lucide-react";
import Link from "next/link";
import type { DestinationCardItem } from "./ai-travel-chat.types";

interface DestinationDetailModalProps {
  destination: DestinationCardItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (destination: DestinationCardItem) => void;
  isSelected?: boolean;
}

export function DestinationDetailModal({
  destination,
  isOpen,
  onClose,
  onSelect,
  isSelected = false,
}: DestinationDetailModalProps) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [destination?.id]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !destination) {
    return null;
  }

  const fallbackImage =
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#173a3b]/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-[24px] border border-[#e7ded1] bg-white shadow-[0_24px_60px_rgba(23,58,59,0.2)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Image */}
        <div className="relative h-52 sm:h-60 w-full overflow-hidden bg-[#e9f0ed]">
          <img
            src={!imgError && destination.imageUrl ? destination.imageUrl : fallbackImage}
            alt={destination.name}
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>

          {/* Location Badge */}
          <div className="absolute bottom-3 left-4 flex items-center gap-1.5 rounded-full bg-[#173a3b]/85 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
            <MapPin size={13} className="text-[#84c8a8]" />
            <span>{destination.locationName}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 flex flex-col gap-3.5">
          <div>
            <h3 className="text-xl font-bold text-[#173a3b]">{destination.name}</h3>
            {destination.address && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-[#637571]">
                <MapPin size={13} className="shrink-0 text-[#96aba4]" />
                <span className="truncate">{destination.address}</span>
              </p>
            )}
          </div>

          {/* Tags */}
          {destination.tags && destination.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {destination.tags.map((tag, idx) => (
                <span
                  key={`${destination.id}-modal-tag-${idx}`}
                  className="rounded-full bg-[#f0f7f4] px-2.5 py-0.5 text-xs font-semibold text-[#356b63] border border-[#bfd1cb]/60"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          <div className="max-h-48 overflow-y-auto rounded-xl bg-[#fffaf1] p-3.5 border border-[#ece4d8] text-sm leading-relaxed text-[#405652]">
            {destination.description}
          </div>

          {/* Actions */}
          <div className="mt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-[#f0e9df]">
            <Link
              href={`/destinations/${destination.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl border border-[#ddd3c6] bg-white px-3.5 py-2 text-xs font-bold text-[#556965] transition hover:border-[#9db5af] hover:text-[#173a3b]"
            >
              <span>Xem trang đầy đủ</span>
              <ExternalLink size={13} />
            </Link>

            <button
              type="button"
              onClick={() => {
                onSelect(destination);
                onClose();
              }}
              className={`inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition shadow-sm ${
                isSelected
                  ? "bg-[#58a482] text-white"
                  : "bg-[#173a3b] text-white hover:bg-[#254f50]"
              }`}
            >
              {isSelected ? (
                <>
                  <Check size={14} />
                  <span>Đã chọn địa điểm này</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Chọn địa điểm này</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
