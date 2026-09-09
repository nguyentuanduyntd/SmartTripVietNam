"use client";

export function DestinationCardsSkeleton() {
  return (
    <div className="mt-3.5 w-full grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 animate-pulse">
      {[1, 2].map((i) => (
        <div
          key={`skeleton-${i}`}
          className="flex h-64 flex-col overflow-hidden rounded-[16px] border border-[#e7ded1] bg-white p-3.5"
        >
          <div className="h-36 w-full rounded-xl bg-[#e9f0ed]" />
          <div className="mt-3 h-4 w-3/4 rounded bg-[#e9f0ed]" />
          <div className="mt-2 h-3 w-1/2 rounded bg-[#e9f0ed]" />
          <div className="mt-auto flex gap-2 pt-3 border-t border-[#f4eee6]">
            <div className="h-7 flex-1 rounded-xl bg-[#e9f0ed]" />
            <div className="h-7 flex-1 rounded-xl bg-[#e9f0ed]" />
          </div>
        </div>
      ))}
    </div>
  );
}
