"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Compass, MapPin } from "lucide-react";
import type { DestinationCardItem } from "./ai-travel-chat.types";
import { DestinationCardItemView } from "./DestinationCardItemView";
import { DestinationDetailModal } from "./DestinationDetailModal";

interface DestinationChatCardsProps {
  destinations: DestinationCardItem[];
  selectedDestinations?: Array<string | { destinationId: string; destinationName: string }>;
  onSelectDestination: (destination: DestinationCardItem) => void;
  onRejectDestination?: (destination: DestinationCardItem) => void;
}

export function DestinationChatCards({
  destinations,
  selectedDestinations = [],
  onSelectDestination,
  onRejectDestination,
}: DestinationChatCardsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeModalDest, setActiveModalDest] = useState<DestinationCardItem | null>(null);

  // Empty state
  if (!destinations || destinations.length === 0) {
    return (
      <div className="mt-3 flex items-center gap-2.5 rounded-2xl border border-dashed border-[#dcd3c5] bg-[#fffbf4] p-4 text-xs text-[#6e7f7b]">
        <Compass size={18} className="shrink-0 text-[#9bb0aa]" />
        <span>Chưa tìm thấy địa điểm phù hợp với yêu cầu này. Bạn có thể thử mô tả chi tiết hơn nhé.</span>
      </div>
    );
  }

  const isSelected = (dest: DestinationCardItem) =>
    selectedDestinations.some((d) => {
      if (typeof d === "string") {
        return d === dest.name || d === dest.id;
      }
      return d.destinationId === dest.id || d.destinationName === dest.name;
    });

  const initialLimit = 4;
  const displayedDestinations = useMemo(() => {
    if (isExpanded) return destinations;
    return destinations.slice(0, initialLimit);
  }, [destinations, isExpanded]);

  const hasMore = destinations.length > initialLimit;

  const groupedByLocation = useMemo(() => {
    const groups: { locationName: string; items: DestinationCardItem[] }[] = [];
    for (const dest of displayedDestinations) {
      const locName = dest.locationName || "Địa điểm nổi bật";
      let g = groups.find((grp) => grp.locationName === locName);
      if (!g) {
        g = { locationName: locName, items: [] };
        groups.push(g);
      }
      g.items.push(dest);
    }
    return groups;
  }, [displayedDestinations]);

  const shouldShowRegionHeaders = groupedByLocation.length > 1;

  // Exactly 1 card layout (Focused card according to single destination suggestion requirement)
  if (destinations.length === 1) {
    const single = destinations[0];
    return (
      <div className="mt-3.5 w-full max-w-sm sm:max-w-md">
        <DestinationCardItemView
          key={single.id}
          destination={single}
          isSelected={isSelected(single)}
          onSelect={onSelectDestination}
          onReject={onRejectDestination}
          onViewDetail={(item) => setActiveModalDest(item)}
        />
        <DestinationDetailModal
          destination={activeModalDest}
          isOpen={Boolean(activeModalDest)}
          onClose={() => setActiveModalDest(null)}
          onSelect={onSelectDestination}
          isSelected={activeModalDest ? isSelected(activeModalDest) : false}
        />
      </div>
    );
  }

  return (
    <div className="mt-3.5 w-full flex flex-col gap-4">
      {/* Cards list grouped by region if >= 2 regions, otherwise flat */}
      {groupedByLocation.map((group) => (
        <div key={group.locationName} className="flex flex-col gap-2.5">
          {shouldShowRegionHeaders && (
            <div className="flex items-center gap-1.5 px-0.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#173a3b] text-white">
                <MapPin size={11} />
              </span>
              <h5 className="font-bold text-xs uppercase tracking-wider text-[#173a3b]">
                {group.locationName}
              </h5>
              <span className="text-[11px] font-semibold text-[#6a7d78]">
                ({group.items.length})
              </span>
            </div>
          )}

          {/* Grid layout: Desktop max 2 cards, Mobile 1 card, Gap 12px - 16px */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {group.items.map((dest) => (
              <DestinationCardItemView
                key={dest.id}
                destination={dest}
                isSelected={isSelected(dest)}
                onSelect={onSelectDestination}
                onViewDetail={(item) => setActiveModalDest(item)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Xem thêm / Thu gọn button */}
      {hasMore && (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#cfded9] bg-[#f2f8f6] px-4 py-2 text-xs font-extrabold text-[#285d53] shadow-sm transition hover:border-[#86ada3] hover:bg-white hover:text-[#173a3b]"
          >
            {isExpanded ? (
              <>
                <span>Thu gọn</span>
                <ChevronUp size={14} />
              </>
            ) : (
              <>
                <span>Xem thêm địa điểm ({destinations.length - initialLimit})</span>
                <ChevronDown size={14} />
              </>
            )}
          </button>
        </div>
      )}

      {/* Detail Modal */}
      <DestinationDetailModal
        destination={activeModalDest}
        isOpen={Boolean(activeModalDest)}
        onClose={() => setActiveModalDest(null)}
        onSelect={onSelectDestination}
        isSelected={activeModalDest ? isSelected(activeModalDest) : false}
      />
    </div>
  );
}
