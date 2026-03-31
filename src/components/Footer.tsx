import Link from "next/link";

export function Footer() {
  return (
    <footer className="siteFooter">
      <div className="container footerInner">
        <div className="footerLeft">
          <div className="footerBrand">Callie</div>
          <div className="footerMini">
            Your school calendar, synced ✨
          </div>
        </div>

        <div className="footerRight">
          <a className="footerLink" href="mailto:hello@callietools.com">
            hello@callietools.com
          </a>
          <span className="footerDot">•</span>
          <a
            className="footerLink"
            href="https://www.buymeacoffee.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Buy Callie a Coffee
          </a>
        </div>
      </div>
    </footer>
  );
}
