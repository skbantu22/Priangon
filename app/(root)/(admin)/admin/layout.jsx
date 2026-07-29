"use client";

import { usePathname } from "next/navigation";

import GlobalStoreProvider from "@/components/ui/Application/GlobalStoreProvider";
import Appsidebar from "@/components/ui/Application/Admin/Appsidebar";
import ThemeProvider from "@/components/ui/Application/Admin/ThemeProvider";
import Topbar from "@/components/ui/Application/Admin/Topbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ToastContainer } from "react-toastify";
import NetworkStatus from "@/components/ui/Application/Admin/NetworkStatus";

export default function Layout({ children }) {
  const pathname = usePathname();

  const isPos =
    pathname.startsWith("/admin/pos") || pathname.startsWith("/admin/payment");

  return (
    <GlobalStoreProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <NetworkStatus />

        {isPos ? (
          <main className="w-screen h-screen overflow-hidden">{children}</main>
        ) : (
          <SidebarProvider>
            <Appsidebar />

            <main className="border-2 md:w-[calc(100vw-16rem)] w-full">
              <div className="pt-17.5 md:px-8 px-5 min-h-[calc(100vh-40px)] pb-10">
                <Topbar />
                {children}
              </div>
            </main>
          </SidebarProvider>
        )}

        <ToastContainer />
      </ThemeProvider>
    </GlobalStoreProvider>
  );
}
