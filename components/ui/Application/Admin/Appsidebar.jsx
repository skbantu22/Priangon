"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import sbtMark from "@/public/assets/sbt-mark.png";
import { usePathname } from "next/navigation";
import { LuChevronRight } from "react-icons/lu";
import { IoMdClose } from "react-icons/io";
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
import { useLanguage } from "@/hooks/useLanguage";
import { oneLine } from "@/lib/labels";
import { resetOrderNotification } from "@/store/reducer/notificationSlice";

const menuButtonClass =
  "h-10 gap-3 rounded-lg px-3 text-[14px] font-medium text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-white data-[active=true]:bg-sidebar-primary data-[active=true]:text-white data-[active=true]:shadow-lg data-[active=true]:shadow-black/20 [&>svg]:size-[18px]";

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
      <SidebarHeader className="h-16 p-0 border-b border-sidebar-border">
        <div className="flex h-full items-center justify-between px-4">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5">
            <span className="relative size-10 shrink-0 overflow-hidden rounded-xl bg-white shadow-lg shadow-black/30">
              <Image src={sbtMark} alt="SB Telecom" fill sizes="40px" className="object-contain p-0.5" priority />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-xl font-extrabold tracking-wide text-white">
                SB <span className="text-[#e0415e]">Telecom</span>
              </span>
              <span className="text-[11px] text-sidebar-foreground/70">
                Global Connectivity Solutions
              </span>
            </span>
          </Link>

          <button
            onClick={toggleSidebar}
            type="button"
            className="md:hidden flex size-8 items-center justify-center rounded-lg bg-sidebar-accent text-white"
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
                            <menu.icon />
                            <span>{oneLine(menu.title, menu.bn, language)}</span>
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
                                  className="h-8 text-[13px] text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-white data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-white"
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
                          <menu.icon />
                          <span>{oneLine(menu.title, menu.bn, language)}</span>
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
