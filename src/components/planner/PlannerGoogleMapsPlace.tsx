import { cache } from "react";
import { MapPin } from "lucide-react";

import { buildGoogleMapsSearchHref } from "@/src/lib/google-maps";
import { findDestinationMapPointById } from "@/src/repositories/destination-map.repository";

const getDestinationMapPoint = cache(findDestinationMapPointById);

type PlannerGoogleMapsPlaceProps = {
  destinationId?: string | null;

  label: string;

  query?: string | null;

  subtitle?: string | null;
};

export async function PlannerGoogleMapsPlace({ destinationId, label, query, subtitle }: PlannerGoogleMapsPlaceProps) {
  const destination = destinationId ? await getDestinationMapPoint(destinationId) : null;

  const mapHref = buildGoogleMapsSearchHref({
    latitude: destination?.latitude,
    longitude: destination?.longitude,

    query: destination?.address ?? query ?? destination?.name ?? label,
  });

  if (!mapHref) {
    return (
      <div className="mt-1">
        <p className="flex items-start gap-1.5 text-sm text-[#6d7a77]">
          <MapPin size={14} className="mt-0.5 shrink-0" />

          <span>{label}</span>
        </p>

        {subtitle ? <p className="mt-1 pl-5 text-xs leading-5 text-[#7b8784]">{subtitle}</p> : null}
      </div>
    );
  }

  return (
    <div className="mt-1">
      {}
      <a
        href={mapHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-start gap-1.5 text-sm font-medium text-[#55716d] transition hover:text-[#173a3b] hover:underline"
        title={`Mở ${label} trên Google Maps`}
      >
        <MapPin size={14} className="mt-0.5 shrink-0" />

        <span>{label}</span>
      </a>

      {}
      {subtitle ? <p className="mt-1 pl-5 text-xs leading-5 text-[#7b8784]">{subtitle}</p> : null}

      {}
      <div>
        <a
          href={mapHref}
          target="_blank"
          rel="noopener noreferrer"
          className="
                        mt-2
                        inline-flex
                        items-center
                        gap-1.5
                        rounded-full
                        border
                        border-[#bfd4ce]
                        bg-[#edf7f4]
                        px-3
                        py-1.5
                        text-xs
                        font-bold
                        text-[#2f6864]
                        transition
                        hover:border-[#8fb6ae]
                        hover:bg-[#deeee9]
                    "
          aria-label={`Xem ${label} trên Google Maps`}
        >
          <MapPin size={14} />
          Xem trên Google Maps
        </a>
      </div>
    </div>
  );
}
