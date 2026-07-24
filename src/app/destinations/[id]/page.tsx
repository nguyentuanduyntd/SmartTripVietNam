import { DestinationDetailPage } from "@/src/components/destinations/DestinatinDetailPage";

type PageProps = {params: Promise<{id: string}>};

export default async function Page({params}: PageProps){
    const {id} = await params;
    return <DestinationDetailPage id={id} />;
}