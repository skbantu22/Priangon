import "./globals.css";

import { Toaster } from "sonner";

import GlobalStoreProvider from "@/components/ui/Application/GlobalStoreProvider";
import PosPrefetch from "@/components/ui/Application/PosPrefetch";
import ServiceWorker from "@/components/ui/Application/ServiceWorker";
import SupportChannels from "@/components/ui/Application/website/SupportChannels";

// Fonts come from Google in the browser, not at build time: next/font/google
// fetched them during `next build`, and on the VPS Google answered with font
// links Turbopack could not read, which failed the build.
const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Hind+Siliguri:wght@400;500;600;700&family=Geist+Mono&family=Assistant:wght@400;500;600;700;800&family=Noto+Sans+Bengali:wght@400;500;600;700&family=Roboto:wght@400;500;700&display=swap";

export const metadata = {
  title: {
    default: "SB Telecom",
    template: "%s | SB Telecom",
  },
  description: "SB Telecom: Global Connectivity Solutions",

  // what Android and iOS read when the app is added to the home screen
  applicationName: "SB Telecom",
  appleWebApp: {
    capable: true,
    title: "SB Telecom",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  themeColor: "#00801a",
  width: "device-width",
  initialScale: 1,
  // the app fills the screen under the notch once installed
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS_URL} />
      </head>
      <body className="antialiased">
        <GlobalStoreProvider>
          <PosPrefetch />
          {children}
        </GlobalStoreProvider>

        <SupportChannels />
        <ServiceWorker />

        {/* Toast Notifications */}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
