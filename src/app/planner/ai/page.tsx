import type {Metadata,} from "next";
import Link from "next/link";
import {ArrowLeft,Database,Sparkles,} from "lucide-react";
import {redirect,} from "next/navigation";
import {AiPlannerBuilder,} from "@/src/components/planner/ai/AiPlannerBuilder";
import {HomeHeader,} from "@/src/components/home/HomeHeader";
import {getCurrentUser,} from "@/src/lib/auth/get-current-user";
import {findAiPlannerLocationList,} from "@/src/repositories/location-list.repository";

export const metadata: Metadata = {
    title:
        "Lập hành trình với AI",

    description:
        "Tạo hành trình du lịch cá nhân hóa bằng AI và RAG.",
};

/**
 * Đây là trang riêng theo tài khoản.
 */
export const dynamic =
    "force-dynamic";

export default async function AiPlannerPage() {
    /* ---------------------------------------------------------------------- */
    /* Auth                                                                   */
    /* ---------------------------------------------------------------------- */

    const user =
        await getCurrentUser();

    if (!user) {
        redirect(
            "/auth/login?next=%2Fplanner%2Fai",
        );
    }

    /* ---------------------------------------------------------------------- */
    /* Locations đã có RAG                                                    */
    /* ---------------------------------------------------------------------- */

    const locations =
        await findAiPlannerLocationList();

    /* ---------------------------------------------------------------------- */
    /* UI                                                                     */
    /* ---------------------------------------------------------------------- */

    return (
        <>
            <HomeHeader />

            <main className="min-h-screen bg-[#f4efe6] px-4 pb-20 pt-28 text-[#173a3b] sm:px-6 sm:pt-32 lg:px-8 lg:pt-36">
                <div className="mx-auto w-full max-w-7xl">
                    {/* Back */}
                    <Link
                        href="/planner"
                        className="inline-flex items-center gap-2 text-sm font-bold text-[#526c68] transition hover:text-[#173a3b]"
                    >
                        <ArrowLeft
                            size={
                                17
                            }
                        />

                        Lịch trình
                        của tôi
                    </Link>

                    {/* Hero */}
                    <section className="relative mt-6 overflow-hidden rounded-[34px] border border-white/80 bg-[#fffaf1] px-6 py-9 shadow-[0_24px_80px_rgba(23,58,59,0.10)] sm:px-9 lg:px-12 lg:py-12">
                        {/* Decorations */}

                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#dcebe7] blur-3xl"
                        />

                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -bottom-32 left-[35%] h-64 w-64 rounded-full bg-[#f8d6cb] blur-3xl"
                        />

                        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
                            <div className="max-w-3xl">
                                <div className="inline-flex items-center gap-2 rounded-full bg-[#fff0ed] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.17em] text-[#d85b48]">
                                    <Sparkles
                                        size={
                                            15
                                        }
                                    />

                                    AI Travel
                                    Planner
                                </div>

                                <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-5xl lg:text-6xl">
                                    Hành trình
                                    dành riêng
                                    cho bạn
                                </h1>

                                <p className="mt-5 max-w-2xl text-sm leading-7 text-[#667572] sm:text-base">
                                    Chọn điểm
                                    đến, thời
                                    gian, ngân
                                    sách và sở
                                    thích. AI
                                    sẽ sử dụng
                                    dữ liệu du
                                    lịch trong
                                    SmartTripVietNam
                                    để xây dựng
                                    lịch trình
                                    phù hợp.
                                </p>
                            </div>

                            <div className="flex max-w-sm items-start gap-3 rounded-[24px] border border-[#c9ddd8] bg-[#edf7f4] px-5 py-4">
                                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#173a3b] text-white">
                                    <Database
                                        size={
                                            20
                                        }
                                    />
                                </span>

                                <div>
                                    <p className="text-sm font-extrabold">
                                        RAG
                                        Knowledge
                                        Base
                                    </p>

                                    <p className="mt-1 text-xs leading-5 text-[#667a76]">
                                        AI chỉ
                                        sử dụng
                                        địa điểm
                                        và ẩm
                                        thực đã
                                        retrieval
                                        từ dữ
                                        liệu của
                                        hệ thống.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Builder */}

                    {locations.length >
                    0 ? (
                        <AiPlannerBuilder
                            locations={
                                locations
                            }
                        />
                    ) : (
                        <section className="mt-8 rounded-[30px] border border-dashed border-[#d2c4b3] bg-[#fffaf1] px-6 py-14 text-center">
                            <Database
                                size={
                                    36
                                }
                                className="mx-auto text-[#6f8e88]"
                            />

                            <h2 className="mt-4 font-display text-2xl font-semibold">
                                Chưa có
                                dữ liệu
                                RAG
                            </h2>

                            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#6c7976]">
                                Hãy chạy
                                quá trình
                                ingest
                                embeddings
                                trước khi
                                sử dụng AI
                                Planner.
                            </p>

                            <code className="mt-5 inline-block rounded-xl bg-[#173a3b] px-4 py-2 text-sm text-white">
                                npm run
                                rag:ingest
                            </code>
                        </section>
                    )}
                </div>
            </main>
        </>
    );
}