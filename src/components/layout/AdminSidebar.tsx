"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {MapPin,Utensils,Route,BookImage,MessageSquare,BarChart3,Settings,} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "Nội dung",
    items: [
      { href: "/admin/destinations", label: "Địa danh", icon: MapPin },
      { href: "/admin/cuisines", label: "Ẩm thực", icon: Utensils },
      { href: "/admin/tours", label: "Tour mẫu", icon: Route },
    ],
  },
  {
    label: "Cộng đồng",
    items: [
      { href: "/admin/stories", label: "Story", icon: BookImage },
      { href: "/admin/comments", label: "Bình luận", icon: MessageSquare },
    ],
  },
  {
    label: "Hệ thống",
    items: [
      { href: "/admin/stats", label: "Thống kê", icon: BarChart3 },
      { href: "/admin/settings", label: "Cấu hình", icon: Settings },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="h-screen w-60 flex-shrink-0 overflow-y-auto bg-admin-indigo px-4 py-7 text-[#C8CDD3]">
      <div className="mb-6 flex items-center gap-2.5 border-b border-white/10 pb-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-admin-seal font-display text-base font-semibold text-admin-seal-light">
          S
        </div>
        <div>
          <p className="font-display text-sm font-medium text-[#F4F2EA]">
            SmartTrip
          </p>
          <p className="text-[11px] text-[#7C8894]">Sổ bộ quản trị</p>
        </div>
      </div>

      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="mb-5">
          <p className="mb-2 ml-2.5 text-[11px] font-medium uppercase tracking-wide text-[#7C8894]">
            {group.label}
          </p>
          {group.items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mb-0.5 flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] ${
                  isActive
                    ? "bg-admin-gold/15 text-admin-gold-light shadow-[inset_3px_0_0_var(--admin-gold)]"
                    : "text-[#C8CDD3] hover:bg-white/5"
                }`}
              >
                <Icon size={17} strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}