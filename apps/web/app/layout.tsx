import "./globals.css";

export const metadata = {
  title: "The Gung",
  description: "A cooperative poker board game",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-neutral-950 text-white">
        {children}
      </body>
    </html>
  );
}
