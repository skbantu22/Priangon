"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Smartphone,
  ReceiptText,
  ShoppingCart,
  BookOpenText,
  Menu,
  UserRound,
  Store,
  X,
} from "lucide-react";
import { ToastContainer } from "react-toastify";
import ProfilePanel from "@/components/ui/Application/Admin/ProfilePanel";
import ThemeProvider from "@/components/ui/Application/Admin/ThemeProvider";
import Themeswitch from "@/components/ui/Application/Admin/Themeswitch";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  PartnerCartProvider,
  usePartnerCart,
} from "@/components/ui/Application/Partner/PartnerCart";
import sbtMark from "@/public/assets/sbt-mark.png";
import { partnerMeQuery } from "@/lib/partnerQueries";
import { posShowroomsQueryOptions } from "@/lib/posProducts";
import { usePartnerBranchId, writePartnerBranch } from "@/lib/partnerBranch";

const NAV = [
  { href: "/partner/products", label: "Products & Stock", sub: "Your price list", icon: Smartphone, tone: "bg-[#851eec]" },
  { href: "/partner/dashboard", label: "Dashboard", sub: "Due, orders and trends", icon: LayoutDashboard, tone: "bg-[#ff6a1f]" },
  { href: "/partner/cart", label: "My Order", sub: "Review and place", icon: ShoppingCart, tone: "bg-[#00b293]" },
  { href: "/partner/orders", label: "Orders & Invoices", sub: "What you bought", icon: ReceiptText, tone: "bg-[#4429ff]" },
  { href: "/partner/statement", label: "Statement", sub: "Paid and due", icon: BookOpenText, tone: "bg-[#188ae2]" },
];

const menuButtonClass =
  "h-14 gap-3 rounded-xl px-2.5 text-[15px] font-bold text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:font-bold data-[active=true]:text-white data-[active=true]:shadow-lg data-[active=true]:shadow-black/20";

// the branch this partner is looking at: their pick, then their own branch,
// then the sale center (that is where the stock sits; the list comes newest first)
function useBranch() {
  const { data: me } = useQuery(partnerMeQuery);
  const { data: showrooms = [] } = useQuery(posShowroomsQueryOptions());
  const picked = usePartnerBranchId();
  const branches = showrooms.filter((row) => row?._id && row.isActive !== false);
  const home =
    me?.showroomId && branches.some((row) => String(row._id) === String(me.showroomId))
      ? String(me.showroomId)
      : "";
  const branchId = branches.some((row) => String(row._id) === picked)
    ? picked
    : home || String(branches.find((row) => row.isSaleCenter)?._id || branches[0]?._id || "");

  useEffect(() => {
    if (branchId && branchId !== picked) writePartnerBranch(branchId);
  }, [branchId, picked]);

  return { me, branches, branchId };
}

const isActive = (pathname, item) => pathname === item.href || pathname.startsWith(`${item.href}/`);

function PartnerSidebar() {
  const pathname = usePathname();
  const cart = usePartnerCart();
  const { me, branches, branchId } = useBranch();
  const { toggleSidebar, isMobile } = useSidebar();
  const branchName = branches.find((row) => String(row._id) === branchId)?.name || "";

  return (
    <Sidebar className="z-50 border-r-0">
      <SidebarHeader className="border-b border-sidebar-border p-0">
        <div className="flex items-start justify-between gap-2 px-4 py-3">
          <div className="min-w-0 flex-1">
            <Link href="/partner/products" className="flex items-center gap-2.5">
              <span className="relative size-10 shrink-0 overflow-hidden rounded-xl bg-white shadow-lg shadow-black/30">
                <Image src={sbtMark} alt="SB Telecom" fill sizes="40px" className="object-contain p-0.5" priority />
              </span>
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="text-xl font-extrabold tracking-wide text-sidebar-foreground">
                  SB <span className="text-[#e0415e]">Telecom</span>
                </span>
                <span className="truncate text-[12px] font-bold text-sidebar-foreground/80">Partner Portal</span>
              </span>
            </Link>

            <div className="mt-3 rounded-xl bg-sidebar-accent px-3 py-2">
              <p className="truncate text-sm font-bold text-sidebar-foreground">{me?.customer?.name || "…"}</p>
              <p className="truncate text-[12px] font-medium text-sidebar-foreground/70">
                {me?.typeLabel || ""}
                {branchName ? ` · ${branchName}` : ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Close menu"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-foreground md:hidden"
          >
            <X className="size-4" />
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup className="p-0">
          <SidebarMenu className="gap-1.5">
            {NAV.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isActive(pathname, item)} className={menuButtonClass}>
                  <Link href={item.href} onClick={() => isMobile && toggleSidebar()}>
                    <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg text-white shadow-md shadow-black/25 ${item.tone}`}>
                      <item.icon className="size-[22px]" />
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate">{item.label}</span>
                      <span className="block truncate text-[11px] font-medium opacity-70">{item.sub}</span>
                    </span>
                    {item.href === "/partner/cart" && cart?.count > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e0415e] px-1 text-[11px] font-bold text-white">
                        {cart.count}
                      </span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function PartnerTopbar() {
  const cart = usePartnerCart();
  const { branches, branchId } = useBranch();
  const { toggleSidebar, open, isMobile } = useSidebar();
  const [profileOpen, setProfileOpen] = useState(false);
  const auth = useSelector((state) => state.authStore.auth);
  const user = auth?.data?.user || auth?.user;

  const offset = open && !isMobile ? "md:ps-[calc(16rem+1.5rem)]" : "md:ps-6";

  return (
    <div
      className={`fixed left-0 top-0 z-30 flex h-16 w-full items-center justify-between gap-3 border-b border-sidebar-border bg-sidebar px-4 text-sidebar-foreground shadow-sm transition-[padding] duration-200 md:pe-6 ${offset}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          title="Toggle menu"
          aria-label="Toggle menu"
          className="flex size-9 items-center justify-center rounded-lg hover:bg-sidebar-accent"
        >
          <Menu className="size-5" />
        </button>
        <span className="hidden text-lg font-extrabold sm:inline md:hidden">
          SB <span className="text-[#e0415e]">Telecom</span>
        </span>
      </div>

      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
        {branches.length > 0 && (
          <label className="flex min-w-0 items-center gap-2 rounded-lg border border-sidebar-border bg-white px-2.5 text-gray-900">
            <Store className="size-4 shrink-0 text-primary" />
            <select
              value={branchId}
              onChange={(event) => writePartnerBranch(event.target.value)}
              aria-label="Branch"
              title="Branch"
              className="h-9 max-w-[140px] bg-transparent text-sm font-bold outline-none sm:max-w-[220px]"
            >
              {branches.map((branch) => (
                <option key={branch._id} value={String(branch._id)}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <Link
          href="/partner/cart"
          aria-label="My Order"
          className="relative flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm font-medium hover:bg-sidebar-accent"
        >
          <ShoppingCart className="size-5" />
          <span className="hidden sm:inline">My Order</span>
          {cart?.count > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e0415e] px-1 text-[11px] font-bold text-white">
              {cart.count}
            </span>
          )}
        </Link>

        <div className="[&_button]:text-sidebar-foreground [&_button:hover]:bg-sidebar-accent [&_button:hover]:text-sidebar-foreground">
          <Themeswitch />
        </div>

        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          aria-label="Profile"
          title={user?.name || "Profile"}
          className="flex size-9 items-center justify-center overflow-hidden rounded-full border border-sidebar-border bg-sidebar-accent text-sidebar-foreground hover:brightness-95"
        >
          {user?.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar} alt="" className="size-full object-cover" />
          ) : (
            <UserRound className="size-5" />
          )}
        </button>
      </div>

      <ProfilePanel open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}

export default function PartnerLayout({ children }) {
  // same purple theme as the admin panel (dialogs are portalled to <body>)
  useEffect(() => {
    document.body.classList.add("admin-theme");
    return () => document.body.classList.remove("admin-theme");
  }, []);

  return (
    <PartnerCartProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <div className="admin-theme bg-background">
          <SidebarProvider>
            <PartnerSidebar />
            <main className="min-w-0 flex-1 overflow-x-hidden">
              <div className="min-h-screen px-3 pb-10 pt-20 sm:px-5 md:px-8">
                <PartnerTopbar />
                {children}
              </div>
            </main>
          </SidebarProvider>
        </div>
        <ToastContainer />
      </ThemeProvider>
    </PartnerCartProvider>
  );
}
