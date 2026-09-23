"use client";

import { useEffect } from "react";
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

  // Dialogs and dropdowns are portalled to <body>, so the admin theme
  // has to live there too (the wrapper div below covers the first paint).
  useEffect(() => {
    document.body.classList.add("admin-theme");
    return () => document.body.classList.remove("admin-theme");
  }, []);

  return (
    <GlobalStoreProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <NetworkStatus />

        <div className="admin-theme bg-background">
          <SidebarProvider>
            <Appsidebar />

            {isPos ? (
              // POS has its own top bar and fills the screen
              <main className="flex-1 min-w-0 h-screen overflow-hidden">
                {children}
              </main>
            ) : (
              <main className="flex-1 min-w-0">
                <div className="pt-20 md:px-8 px-5 min-h-[calc(100vh-40px)] pb-10">
                  <Topbar />
                  {children}
                </div>
              </main>
            )}
          </SidebarProvider>
        </div>

        <ToastContainer />
      </ThemeProvider>
    </GlobalStoreProvider>
  );
}
