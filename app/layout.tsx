import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ninjo Prompt Analyzer",
  description: "Analyze and improve your Ninjo self-serve prompts with AI-powered insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
