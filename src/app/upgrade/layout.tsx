import "../../globals.css";
import { Header } from "@/components/Header";

export default function UpgradeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="main">{children}</main>
    </>
  );
}
