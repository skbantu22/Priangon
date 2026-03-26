import GlobalStoreProvider from "@/components/ui/Application/GlobalStoreProvider";
import Footer from "@/components/ui/Application/website/Footer";
import Header from "@/components/ui/Application/website/Header";
import MobileBottomNav from "@/components/ui/Application/website/MobileBottomNav";
import Navbar from "@/components/ui/Application/website/Navbar";

import { Jost } from "next/font/google";
import React from "react";
import { ToastContainer } from "react-toastify";

// Import MetaPixel from lib
import MetaPixel from "@/lib/MetaPixel";
import { connectDB } from "@/lib/databaseconnection";
// ✅ আপনার ইমপোর্ট করা মডেলের নাম অনুযায়ী এটি ব্যবহার করুন
import FBTrackingSetting from "@/models/FbTrackingSetting.model";

export const metadata = {
  title: {
    default: "Prianon | Premium Design",
    template: "%s | Prianon",
  },
  description: "Premium fashion and modern design experience",
};

const jost = Jost({
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  subsets: ["latin"],
  variable: "--font-jost",
});

const Layout = async ({ children }) => {
  await connectDB();

  // ✅ ডাটাবেস থেকে সেটিংস আনা হচ্ছে
  let settings = await FBTrackingSetting.findOne().lean();

  if (!settings) {
    const newSettings = await FBTrackingSetting.create({
      meta: { enabled: true, pixelId: "", accessToken: "", testEventCode: "" },
    });
    settings = JSON.parse(JSON.stringify(newSettings));
  }

  // ✅ ডাটাবেসের জটিল অবজেক্টকে প্লেইন অবজেক্টে রূপান্তর (Error এড়াতে)
  const plainSettings = JSON.parse(JSON.stringify(settings));

  // ✅ সার্ভার টার্মিনালে ডাটা চেক করার জন্য
  console.log("--- Meta Settings From DB ---");

  console.log("-----------------------------");

  return (
    <GlobalStoreProvider>
      <div className={jost.className}>
        {/* ✅ এখন plainSettings পাস করুন */}
        <MetaPixel settings={plainSettings} />

        <Header />
        <main>{children}</main>
        <ToastContainer />
        <Footer />
        <MobileBottomNav />
      </div>
    </GlobalStoreProvider>
  );
};

export default Layout;
