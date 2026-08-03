import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EV Trip Planner",
  description: "Intelligent EV trip planning and charging assistance system",
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
