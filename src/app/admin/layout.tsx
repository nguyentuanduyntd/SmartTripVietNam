import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { AdminSidebar } from "@/src/components/layout/AdminSidebar";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600"],
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-plex-sans",
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500"],
});

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${fraunces.variable} ${plexSans.variable} ${plexMono.variable} flex min-h-screen bg-admin-paper font-sans text-admin-ink`}
      style={
        {
          "--font-sans": "var(--font-plex-sans)",
          "--font-mono": "var(--font-plex-mono)",
        } as React.CSSProperties
      }
    >
      <AdminSidebar />
      <main className="flex-1 px-10 py-8">{children}</main>
    </div>
  );
}