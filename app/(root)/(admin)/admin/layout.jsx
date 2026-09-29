"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import Appsidebar from "@/components/ui/Application/Admin/Appsidebar";
import ThemeProvider from "@/components/ui/Application/Admin/ThemeProvider";
import Topbar from "@/components/ui/Application/Admin/Topbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ToastContainer } from "react-toastify";
import NetworkStatus from "@/components/ui/Application/Admin/NetworkStatus";
import { adminLargePrintShellClass, isAdminLargePrintPath } from "@/lib/adminLargePrint";

export default function Layout({ children }) {
  const pathname = usePathname();

  const isPos =
    pathname.startsWith("/admin/pos") || pathname.startsWith("/admin/payment");

  const isLargePrint = isAdminLargePrintPath(pathname);

  // Dialogs and dropdowns are portalled to <body>, so the admin theme
  // has to live there too (the wrapper div below covers the first paint).
  useEffect(() => {
    if (isLargePrint) {
      document.body.classList.remove("admin-theme");
      return () => document.body.classList.remove("admin-theme");
    }
    document.body.classList.add("admin-theme");
    return () => document.body.classList.remove("admin-theme");
  }, [isLargePrint]);

  // the store / query cache come from the root layout: a second provider here
  // would restore the whole saved cache again every time admin opens
  return (
    <>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <NetworkStatus />

        {isLargePrint ? (
          <div className={adminLargePrintShellClass} style={{ background: "#d6d6d6" }}>
            {children}
          </div>
        ) : (
        <div className="admin-theme bg-background">
          <SidebarProvider>
            <Appsidebar />

            {isPos ? (
              // POS has its own top bar and fills the screen
              <main className="flex-1 min-w-0 h-dvh overflow-hidden">
                {children}
              </main>
            ) : (
              <main className="min-w-0 flex-1 overflow-x-hidden">
                <div className="min-h-[calc(100vh-40px)] px-3 pb-10 pt-20 sm:px-5 md:px-8">
                  <Topbar />
                  {children}
                </div>
              </main>
            )}
          </SidebarProvider>
        </div>
        )}

        <ToastContainer />
      </ThemeProvider>
    </>
  );
}
