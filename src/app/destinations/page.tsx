import { Suspense } from "react";
import { DestinationsListPage } from "@/src/components/destinations/DestinationListPage"; 

export const metadata = {
    title: "Điểm đến | SmartTripVietNam",
    description: "Khám phá toàn bộ địa danh tại Huế, Đà Nẵng và Hội An, lọc theo khu vực.",
};

export default function Page(){
    return (
        <Suspense fallback={null} >
            <DestinationsListPage/>
        </Suspense>
    );
}