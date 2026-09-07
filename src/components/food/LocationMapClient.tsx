"use client";

import dynamic from "next/dynamic";

// Leaflet phải được import hoàn toàn ở phía client, không SSR.
// Bọc LocationMap trong next/dynamic với ssr: false để tránh lỗi
// "document is not defined" và icon path bị hỏng khi server render.
const LocationMapNoSSR = dynamic(
  () => import("./LocationMap").then((mod) => mod.LocationMap),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full min-h-[360px] place-items-center rounded-[28px] bg-[#102f30] sm:min-h-[420px] lg:min-h-[460px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-[#f3bd59]" />
      </div>
    ),
  },
);

export { LocationMapNoSSR as LocationMap };
