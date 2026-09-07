import type { Metadata } from "next";

import { Database } from "lucide-react";
import { redirect } from "next/navigation";
import { AiPlannerBuilder } from "@/src/components/planner/ai/AiPlannerBuilder";
import { getCurrentUser } from "@/src/lib/auth/get-current-user";
import { findAiPlannerLocationList } from "@/src/repositories/location-list.repository";

export const metadata: Metadata = {
  title: "Lập hành trình với AI",

  description: "Trò chuyện với SmartTrip AI để xây dựng hành trình du lịch cá nhân hóa.",
};

export const dynamic = "force-dynamic";

export default async function AiPlannerPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?next=%2Fplanner%2Fai");
  }

  const locations = await findAiPlannerLocationList();

  return (
    <main className="h-dvh overflow-hidden bg-[#f4efe6] p-2 text-[#173a3b] sm:p-3 lg:p-4">
      <div className="h-full w-full">
        {locations.length > 0 ? (
          <AiPlannerBuilder locations={locations} />
        ) : (
          <section className="flex h-full items-center justify-center">
            <div className="w-full max-w-xl rounded-[30px] border border-dashed border-[#d2c4b3] bg-[#fffaf1] px-6 py-14 text-center shadow-[0_20px_60px_rgba(23,58,59,0.08)]">
              <Database size={36} className="mx-auto text-[#6f8e88]" />
              <h1 className="mt-4 font-display text-2xl font-semibold">Chưa có dữ liệu RAG</h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#6c7976]">
                SmartTrip AI cần dữ liệu điểm đến và ẩm thực trước khi có thể xây dựng hành trình.
              </p>
              <code className="mt-5 inline-block rounded-xl bg-[#173a3b] px-4 py-2 text-sm text-white">
                npm run rag:ingest
              </code>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
