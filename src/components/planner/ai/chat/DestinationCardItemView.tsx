"use client";

import { useState } from "react";
import { Check, Eye, MapPin, Plus } from "lucide-react";
import type { DestinationCardItem } from "./ai-travel-chat.types";

interface DestinationCardItemViewProps {
  destination: DestinationCardItem;
  isSelected?: boolean;
  onSelect: (destination: DestinationCardItem) => void;
  onReject?: (destination: DestinationCardItem) => void;
  onViewDetail: (destination: DestinationCardItem) => void;
}

export function DestinationCardItemView({
  destination,
  isSelected = false,
  onSelect,
  onReject,
  onViewDetail,
}: DestinationCardItemViewProps) {
  const [imgError, setImgError] = useState(false);

  const fallbackImage =
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80";

  const displayTags = (destination.tags ?? []).slice(0, 3);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[20px] border border-[#e7ded1] bg-white shadow-[0_4px_16px_rgba(23,58,59,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#bfd1cb] hover:shadow-[0_8px_24px_rgba(23,58,59,0.1)]">
      {/* Thumbnail */}
      <div className="relative h-40 sm:h-44 w-full overflow-hidden bg-[#e9f0ed]">
        <img
          src={!imgError && destination.imageUrl ? destination.imageUrl : fallbackImage}
          alt={destination.name}
          onError={() => setImgError(true)}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

        {/* Location badge on image */}
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-full bg-[#173a3b]/85 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-md">
          <MapPin size={11} className="text-[#84c8a8] shrink-0" />
          <span>{destination.locationName}</span>
        </div>

        {/* Detail view trigger */}
        <button
          type="button"
          onClick={() => onViewDetail(destination)}
          className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-black/70 backdrop-blur-md transition"
          title="Xem chi tiết điểm đến"
        >
          <Eye size={12} />
          <span>Chi tiết</span>
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        {/* Name */}
        <h4
          className="font-bold text-base text-[#173a3b] line-clamp-1 leading-snug group-hover:text-[#285d53] transition-colors"
          title={destination.name}
        >
          {destination.name}
        </h4>

        {/* Tags */}
        {displayTags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {displayTags.map((tag, idx) => (
              <span
                key={`${destination.id}-tag-${idx}`}
                className="rounded-full bg-[#f0f7f4] px-2.5 py-0.5 text-[11px] font-semibold text-[#356b63] border border-[#bfd1cb]/60"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#526661]">
          {destination.description || `Địa điểm trải nghiệm tuyệt vời tại ${destination.locationName}.`}
        </p>

        {/* Spacer */}
        <div className="flex-1 min-h-3" />

        {/* Action Buttons: "Chọn địa điểm này" & "Gợi ý địa điểm khác" */}
        <div className="mt-3 grid grid-cols-2 gap-2 pt-2.5 border-t border-[#f4eee6]">
          {onReject && (
            <button
              type="button"
              onClick={() => onReject(destination)}
              className="inline-flex items-center justify-center gap-1 rounded-xl border border-[#ddd3c6] bg-white px-3 py-2 text-xs font-bold text-[#5c6e6a] transition hover:border-[#b8a994] hover:bg-[#faf6f0] hover:text-[#173a3b]"
              title="Tìm gợi ý địa điểm khác"
            >
              <span>Gợi ý địa điểm khác</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onSelect(destination)}
            className={`inline-flex items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-bold transition shadow-sm ${
              !onReject ? "col-span-2" : ""
            } ${
              isSelected
                ? "bg-[#58a482] text-white"
                : "bg-[#173a3b] text-white hover:bg-[#254f50]"
            }`}
            title="Chọn địa điểm này vào chuyến đi"
          >
            {isSelected ? (
              <>
                <Check size={14} className="shrink-0" />
                <span>Đã chọn</span>
              </>
            ) : (
              <>
                <Plus size={14} className="shrink-0" />
                <span>Chọn địa điểm này</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
