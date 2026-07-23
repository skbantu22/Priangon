import GlobalStoreProvider from "@/components/ui/Application/GlobalStoreProvider";
import Appsidebar from "@/components/ui/Application/Admin/Appsidebar";
import ThemeProvider from "@/components/ui/Application/Admin/ThemeProvider";
import Topbar from "@/components/ui/Application/Admin/Topbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ToastContainer } from "react-toastify";

export default function Layout({ children }) {
  return (
    <GlobalStoreProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <SidebarProvider>
          <Appsidebar />
          <main className="border-2 md:w-[calc(100vw-16rem)] w-full">
            <div className="pt-17.5 md:px-8 px-5 min-h-[calc(100vh-40px)] pb-10">
              <Topbar />
              {children}
            </div>

            <div className="border-t h-[40px] flex justify-center items-center bg-gray-50 dark:bg-background text-sm">
              © 2025 Developer. All Rights Reserved.
            </div>
          </main>
        </SidebarProvider>

        <ToastContainer />
      </ThemeProvider>
    </GlobalStoreProvider>
  );
}
