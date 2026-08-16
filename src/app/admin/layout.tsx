import { AdminSidebar } from "@/src/components/layout/AdminSidebar";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div
            className="flex min-h-screen bg-admin-paper font-sans text-admin-ink"
            style={
                {
                    "--font-sans":
                        '"IBM Plex Sans", "Segoe UI", Arial, sans-serif',

                    "--font-mono":
                        '"IBM Plex Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace',

                    "--font-fraunces":
                        '"Fraunces", Georgia, "Times New Roman", serif',
                } as React.CSSProperties
            }
        >
            <AdminSidebar />

            <main className="flex-1 px-10 py-8">
                {children}
            </main>
        </div>
    );
}