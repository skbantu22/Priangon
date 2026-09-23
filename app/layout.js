import { Geist_Mono, Hind_Siliguri, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

import GlobalStoreProvider from "@/components/ui/Application/GlobalStoreProvider";
import PosPrefetch from "@/components/ui/Application/PosPrefetch";
import SupportChannels from "@/components/ui/Application/website/SupportChannels";

// English / numbers
const fontEn = Plus_Jakarta_Sans({
  variable: "--font-en",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

// Bangla text and the ৳ sign (the browser takes these glyphs from here)
const fontBn = Hind_Siliguri({
  variable: "--font-bn",
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "SB Telecom",
    template: "%s | SB Telecom",
  },
  description: "SB Telecom: Global Connectivity Solutions",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${fontEn.variable} ${fontBn.variable} ${geistMono.variable} antialiased`}
      >
        <GlobalStoreProvider>
          <PosPrefetch />
          {children}
        </GlobalStoreProvider>

        <SupportChannels />

        {/* Toast Notifications */}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
