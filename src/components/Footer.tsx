import Link from "next/link";
export function Footer() {
  return (
    <footer className="siteFooter">
      <div className="container footerInner">
        <div className="footerRow">
          <div className="footerLeft">
            <div className="footerBrand">Callie</div>
            <div className="footerMini">
              Your events, on everyone&apos;s phone&nbsp;✨
            </div>
          </div>
          <a className="footerLink" href="mailto:hello@callietools.com">
            hello@callietools.com
          </a>
        </div>
        <div className="footerRow">
          <span className="footerUpgrade">
            Want your own logo and colors on your calendar page?{" "}
            <Link href="/upgrade">Make it yours &mdash; $10/mo</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
