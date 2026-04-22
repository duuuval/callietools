// Client-side helper to fire analytics pings via sendBeacon.
// Use on interactive surfaces (calendar page, subscribe buttons).
// Safe to call during page navigation — sendBeacon guarantees the request
// is queued before the browser unloads the page.

export type ClickType =
  | "page_view"
  | "apple"
  | "google_copy"
  | "google_open"
  | "other_download"
  | "share";

export function logClick(calendarId: string, clientType: ClickType): void {
  try {
    const payload = JSON.stringify({ calendarId, clientType });
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/log-click",
        new Blob([payload], { type: "application/json" })
      );
    } else if (typeof fetch !== "undefined") {
      fetch("/api/log-click", {
        method: "POST",
        body: payload,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      }).catch(() => {
        /* swallow */
      });
    }
  } catch {
    /* swallow — analytics must never break the caller */
  }
}
