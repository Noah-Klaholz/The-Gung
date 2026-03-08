import { PlayerProvider } from "@/lib/context/playerContext";
import "./globals.css";
import GlobalClickSfx from "./components/GlobalClickSfx";

export const metadata = {
  title: "The Gung",
  description: "A cooperative poker board game",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <GlobalClickSfx />
        <PlayerProvider>{children}</PlayerProvider>
      </body>
    </html>
  );
}