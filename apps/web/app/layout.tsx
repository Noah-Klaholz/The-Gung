import type { Metadata, Viewport } from "next";
import { PlayerProvider } from "@/lib/context/playerContext";
import "./globals.css";
import GlobalClickSfx from "./components/GlobalClickSfx";

export const metadata: Metadata = {
  title: "The Gung",
  description: "A cooperative poker board game",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        <GlobalClickSfx />
        <PlayerProvider>{children}</PlayerProvider>
      </body>
    </html>
  );
}