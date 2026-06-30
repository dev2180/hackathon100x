import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Outfit } from "next/font/google";
import { DynamicBackground } from "@/components/DynamicBackground";
import { CustomCursor } from "@/components/CustomCursor";
import { GtaLoader } from "@/components/GtaLoader";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Track C — Diagnostic",
  description:
    "Reads a mid-build AI builder's intake and returns the one real bottleneck as a falsifiable prediction — or refuses.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: { colorPrimary: "#5fa324", colorBackground: "#0a0a0a" },
      }}
    >
      <html lang="en" className={`h-full antialiased ${outfit.variable}`} suppressHydrationWarning>
        <body className="min-h-full font-sans text-[#e7e7ef]">
          <GtaLoader />
          <DynamicBackground />
          <CustomCursor />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
