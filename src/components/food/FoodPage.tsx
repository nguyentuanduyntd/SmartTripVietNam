import { FoodDiscoveryPanel } from "@/src/components/home/FoodDiscoveryPanel";
import { HomeFooter } from "@/src/components/home/HomeFooter";
import { HomeHeader } from "@/src/components/home/HomeHeader";

export function FoodPage() {
    return (
        <main className="min-h-screen overflow-x-hidden bg-[#fffaf1] text-[#173a3b]">
            <HomeHeader />

            <FoodDiscoveryPanel />

            <HomeFooter />
        </main>
    );
}
