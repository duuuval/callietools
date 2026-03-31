import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container">
      <div className="card" style={{ textAlign: "center", padding: "48px 26px" }}>
        <h1 style={{ fontSize: 28, margin: "0 0 12px" }}>
          Calendar not found
        </h1>
        <p className="helper" style={{ marginBottom: 18 }}>
          We couldn&apos;t find a calendar at this address. It may have been
          removed or the link might be incorrect.
        </p>
        <Link className="btn btnPrimary" href="/">
          Browse available calendars
        </Link>
      </div>
    </div>
  );
}
