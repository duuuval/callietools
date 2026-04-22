"use client";

import { logClick } from "@/lib/log-click";

interface Props {
  webcalIcs: string;
  calendarId: string;
}

export function AppleSubscribeButton({ webcalIcs, calendarId }: Props) {
  return (
    
      className="btn btnPrimary"
      href={webcalIcs}
      rel="noopener"
      onClick={() => logClick(calendarId, "apple")}
    >
      Sync to Apple Calendar
    </a>
  );
}
