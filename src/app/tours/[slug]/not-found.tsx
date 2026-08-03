import Link from "next/link";
import { ArrowLeft, Route } from "lucide-react";

import { HomeFooter } from "@/src/components/home/HomeFooter";
import { HomeHeader } from "@/src/components/home/HomeHeader";

export default function NotFound() {
    return (
        <main className="min-h-screen bg-[#fffaf1] text-[#173a3b]">
            <HomeHeader />

            <section className="mx-auto flex min-h-[72vh] max-w-2xl flex-col items-center justify-center px-5 pb-20 pt-36 text-center sm:px-8">
                <span className="grid h-20 w-20 place-items-center rounded-[28px] bg-[#f25f4b]/10 text-[#f25f4b]">
                    <Route size={38} strokeWidth={1.6} />
                </span>

                <p className="mt-8 text-xs font-bold uppercase tracking-[0.24em] text-[#d85b48]">
                    Hành trình không tồn tại
                </p>

                <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">
                    Không tìm thấy tour này
                </h1>

                <p className="mt-5 max-w-xl leading-7 text-[#66716e]">
                    Hành trình có thể đã bị ẩn, chưa được xuất bản hoặc đường
                    dẫn không còn chính xác.
                </p>

                <Link
                    href="/#hanh-trinh"
                    className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#173a3b] px-6 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#20494a]"
                >
                    <ArrowLeft size={17} />
                    Xem các hành trình khác
                </Link>
            </section>

            <HomeFooter />
        </main>
    );
}