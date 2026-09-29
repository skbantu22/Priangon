"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import sbtMark from "@/public/assets/sbt-mark.png";
import { usePathname } from "next/navigation";
import { LuChevronRight } from "react-icons/lu";
import { IoMdClose } from "react-icons/io";
import { useQuery } from "@tanstack/react-query";
import { useSelector, useDispatch } from "react-redux";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { sidebarMenu } from "@/lib/adminappsidebarmenu";
import {
  posShowroomsQueryOptions,
  resolvePosTill,
  usePosShowroomId,
} from "@/lib/posProducts";
import { useLanguage } from "@/hooks/useLanguage";
import { oneLine } from "@/lib/labels";
import { resetOrderNotification } from "@/store/reducer/notificationSlice";

const menuButtonClass =
  "h-12 gap-2.5 rounded-lg px-2.5 text-[15px] font-bold text-white hover:bg-sidebar-accent hover:text-white data-[active=true]:bg-sidebar-primary data-[active=true]:font-bold data-[active=true]:text-white data-[active=true]:shadow-lg data-[active=true]:shadow-black/20 [&>svg]:!size-4";

const ICON_TONE = {
  Dashboard: "bg-[#ff6a1f]",
  "POS (Sales)": "bg-[#00b293]",
  Sales: "bg-[#4429ff]",
  Products: "bg-[#851eec]",
  "Dealer / Wholesaler Orders": "bg-[#0097a7]",
  Warranty: "bg-[#e91e63]",
  Customers: "bg-[#188ae2]",
  Suppliers: "bg-[#f9a825]",
  Purchases: "bg-[#5b2ee0]",
  Inventory: "bg-[#00a38a]",
  Employees: "bg-[#d32f2f]",
  Expenses: "bg-[#ff8a00]",
  Assets: "bg-[#6d4aff]",
  Reports: "bg-[#0091ea]",
  Settings: "bg-[#546e7a]",
  Users: "bg-[#7b1fa2]",
  "System Settings": "bg-[#455a64]",
};

function MenuIcon({ menu }) {
  const Icon = menu.icon;
  const tone = ICON_TONE[menu.title] || "bg-white/20";
  return (
    <span
      className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-white shadow-md shadow-black/25 ${tone}`}
    >
      <Icon className="size-[22px]" />
    </span>
  );
}

// a link may carry a query (Colors is /admin/attributes?slot=color); the path decides
const isPathActive = (pathname, url) => {
  const path = url?.split("?")[0];
  return !!path && path !== "#" && (pathname === path || pathname.startsWith(path + "/"));
};

export default function Appsidebar() {
  const { language } = useLanguage();

  const { toggleSidebar, isMobile } = useSidebar();
  const dispatch = useDispatch();
  const pathname = usePathname();

  const notificationCount = useSelector(
    (state) => state.notification.orderCount,
  );

  const auth = useSelector((state) => state.authStore.auth);
  const user = auth?.data?.user || auth?.user;
  const role = user?.role || "customer";
  const { data: showrooms = [] } = useQuery({
    ...posShowroomsQueryOptions(),
    enabled: !!user,
  });
  const pickedShowroomId = usePosShowroomId();
  const selectedShowroomId = resolvePosTill({
    picked: pickedShowroomId,
    showrooms,
    currentUser: user,
  });
  const selectedShowroom = showrooms.find(
    (s) => String(s._id) === String(selectedShowroomId),
  );
  const isWarehouseUser = selectedShowroomId === "warehouse";
  const branchName = isWarehouseUser ? "Warehouse" : selectedShowroom?.name || "No branch";

  const filteredMenu = sidebarMenu.filter((menu) => {
    if (!menu.roles) return true;
    return menu.roles.includes(role);
  });

  const handleNav = (menuTitle) => {
    if (menuTitle === "Orders") {
      dispatch(resetOrderNotification());
    }

    if (isMobile) toggleSidebar();
  };

  return (
    <Sidebar className="z-50 border-r-0">
      <SidebarHeader className="p-0 border-b border-sidebar-border">
        <div className="flex items-start justify-between gap-2 px-4 py-3">
          <div className="min-w-0 flex-1">
            <Link href="/admin/dashboard" className="flex items-center gap-2.5">
              <span className="relative size-10 shrink-0 overflow-hidden rounded-xl bg-white shadow-lg shadow-black/30">
                <Image src={sbtMark} alt="SB Telecom" fill sizes="40px" className="object-contain p-0.5" priority />
              </span>
              <span className="min-w-0 flex flex-col leading-tight">
                <span className="text-xl font-extrabold tracking-wide text-white">
                  SB <span className="text-[#e0415e]">Telecom</span>
                </span>
                <span className="truncate text-[12px] font-bold text-white/90">
                  {isWarehouseUser ? "Warehouse" : `Sale Center · ${branchName}`}
                </span>
              </span>
            </Link>

            <p className="mt-2 truncate rounded-lg bg-white/10 px-2 py-1.5 text-[12px] font-bold text-white">
              {branchName}
            </p>
          </div>

          <button
            onClick={toggleSidebar}
            type="button"
            className="md:hidden flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-white"
          >
            <IoMdClose />
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup className="p-0">
          <SidebarMenu className="gap-1">
            {filteredMenu.map((menu, index) => {
              const subs = (menu.submenu || []).filter(
                (sub) => !sub.roles || sub.roles.includes(role),
              );
              const hasSubmenu = subs.length > 0;

              const href =
                menu.url?.startsWith("/") && menu.url.length > 1
                  ? menu.url
                  : "/admin";

              const subActive = subs.some((sub) =>
                isPathActive(pathname, sub.url),
              );

              const orderBadge = menu.title === "Orders" &&
                notificationCount > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {notificationCount}
                  </span>
                );

              return (
                <Collapsible
                  key={index}
                  defaultOpen={subActive}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    {hasSubmenu ? (
                      <>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            type="button"
                            isActive={subActive}
                            className={menuButtonClass}
                          >
                            <MenuIcon menu={menu} />
                            <span className="min-w-0 flex-1 truncate">{oneLine(menu.title, menu.bn, language)}</span>
                            {orderBadge}
                            <LuChevronRight className="ml-auto !size-4 opacity-70 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <SidebarMenuSub className="mr-0 mt-1 border-sidebar-border">
                            {subs.map((sub, i) => (
                              <SidebarMenuSubItem key={i}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={pathname === sub.url}
                                  className="h-9 text-[14px] font-bold text-white hover:bg-sidebar-accent hover:text-white data-[active=true]:bg-sidebar-accent data-[active=true]:font-bold data-[active=true]:text-white"
                                >
                                  <Link
                                    href={sub.url}
                                    onClick={() => handleNav(menu.title)}
                                  >
                                    {oneLine(sub.title, sub.bn, language)}
                                    {sub.soon && (
                                      <span className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-sidebar-foreground/70">
                                        Soon
                                      </span>
                                    )}
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </>
                    ) : (
                      <SidebarMenuButton
                        asChild
                        isActive={isPathActive(pathname, menu.url)}
                        className={menuButtonClass}
                      >
                        <Link href={href} onClick={() => handleNav(menu.title)}>
                          <MenuIcon menu={menu} />
                          <span className="min-w-0 flex-1 truncate">{oneLine(menu.title, menu.bn, language)}</span>
                          {orderBadge}
                          {menu.soon && (
                            <span className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-sidebar-foreground/70">
                              Soon
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                </Collapsible>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
