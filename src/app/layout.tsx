import type { Metadata } from "next";
import { Be_Vietnam_Pro, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const bodyFont = Be_Vietnam_Pro({
    variable: "--font-body",
    subsets: ["latin", "vietnamese"],
    weight: ["400", "500", "600", "700"],
    display: "swap",
});

const displayFont = Cormorant_Garamond({
    variable: "--font-display",
    subsets: ["latin", "vietnamese"],
    weight: ["500", "600", "700"],
    style: ["normal", "italic"],
    display: "swap",
});

export const metadata: Metadata = {
    title: {
        default: "Rực Rỡ Miền Trung",
        template: "%s | Rực Rỡ Miền Trung",
    },
    description:
        "Khám phá Huế, Đà Nẵng và Hội An qua địa danh, ẩm thực, câu chuyện cộng đồng và hành trình cá nhân hóa.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="vi"
            className={`${bodyFont.variable} ${displayFont.variable}`}
        >
            <body>{children}</body>
        </html>
    );
}