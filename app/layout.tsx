import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Predictry — search every prediction market at once",
  description:
    "One search bar for Polymarket, Kalshi, and more. Find predictions in plain English, see cross-platform prices, and spot arbitrage.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
  </html>
  );
}
