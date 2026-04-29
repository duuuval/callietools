import { notFound } from "next/navigation";
import {
  checkOutreachToken,
  getContactPageData,
  todayLocal,
} from "@/lib/outreach";
import ContactClient from "./ContactClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Outreach — Contact",
  robots: { index: false, follow: false },
};

interface Props {
  params: { token: string; handle: string };
}

export default async function ContactDetailPage({ params }: Props) {
  if (!checkOutreachToken(params.token)) {
    notFound();
  }

  const data = await getContactPageData(decodeURIComponent(params.handle));
  if (!data) {
    notFound();
  }

  const today = todayLocal();
  return <ContactClient token={params.token} today={today} data={data} />;
}
