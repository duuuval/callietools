import { notFound } from "next/navigation";
import {
  checkOutreachToken,
  getHomeBaseData,
  todayLocal,
} from "@/lib/outreach";
import HomeBaseClient from "./HomeBaseClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Outreach",
  robots: { index: false, follow: false },
};

interface Props {
  params: { token: string };
}

export default async function OutreachHomePage({ params }: Props) {
  if (!checkOutreachToken(params.token)) {
    notFound();
  }

  const data = await getHomeBaseData();
  const today = todayLocal();

  return <HomeBaseClient token={params.token} today={today} data={data} />;
}
