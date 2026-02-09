import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from '@/components/providers/ThemeProvider';

export const metadata: Metadata = {
  title: "Nazaré",
  description: "Analyze and improve your Ninjo self-serve prompts with AI-powered insights",
  icons: {
    icon: "/images/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
