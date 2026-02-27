import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ghar Ka Doodh - Premium Milk Tracker",
  description: "Track your daily milk consumption and payments with ease.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
