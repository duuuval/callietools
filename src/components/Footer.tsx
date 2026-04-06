import Link from "next/link";

export function Footer() {
  return (
    <footer className="siteFooter">
      <div className="container footerInner">
        <div className="footerLeft">
          <div className="footerBrand">Callie</div>
          <div className="footerMini">
            Your events, on everyone&apos;s phone&nbsp;✨
          </div>
        </div>

        <div className="footerRight">
          <a className="footerLink" href="mailto:hello@callietools.com">
            hello@callietools.com
          </a>
          <span className="footerDot">•</span>
          <span className="footerLink footerUpgrade">
            Want your own logo and colors?{" "}
            <a href="mailto:hello@callietools.com?subject=Callie%20Paid%20Upgrade">
              Make it yours — $10/mo
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
