import type {
    Metadata,
} from "next";
import {
    Be_Vietnam_Pro,
    Cormorant_Garamond,
} from "next/font/google";
import {
    NextIntlClientProvider,
} from "next-intl";
import {
    getLocale,
    getMessages,
    getTranslations,
} from "next-intl/server";

import { ScrollToTopButton } from "@/src/components/common/ScrollToTopButton";

import "./globals.css";

const bodyFont =
    Be_Vietnam_Pro({
        variable:
            "--font-body",
        subsets: [
            "latin",
            "vietnamese",
        ],
        weight: [
            "400",
            "500",
            "600",
            "700",
        ],
        display:
            "swap",
    });

const displayFont =
    Cormorant_Garamond({
        variable:
            "--font-display",
        subsets: [
            "latin",
            "vietnamese",
        ],
        weight: [
            "500",
            "600",
            "700",
        ],
        style: [
            "normal",
            "italic",
        ],
        display:
            "swap",
    });

export async function generateMetadata(): Promise<Metadata> {
    const t =
        await getTranslations(
            "Metadata",
        );

    const title =
        t("title");

    return {
        title: {
            default:
                title,
            template:
                `%s | ${title}`,
        },
        description:
            t(
                "description",
            ),
    };
}

export default async function RootLayout({
    children,
}: Readonly<{
    children:
        React.ReactNode;
}>) {
    const [
        locale,
        messages,
    ] =
        await Promise.all([
            getLocale(),
            getMessages(),
        ]);

    return (
        <html
            lang={locale}
            data-scroll-behavior="smooth"
            className={`${bodyFont.variable} ${displayFont.variable}`}
        >
            <body>
                <NextIntlClientProvider
                    locale={
                        locale
                    }
                    messages={
                        messages
                    }
                >
                    {children}
                    <ScrollToTopButton />
                </NextIntlClientProvider>
            </body>
        </html>
    );
}