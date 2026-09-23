"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LuChevronRight } from "react-icons/lu";
import { IoMdClose } from "react-icons/io";
import { IoPhonePortraitOutline, IoCartOutline } from "react-icons/io5";
import { useSelector, useDispatch } from "react-redux";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
import { resetOrderNotification } from "@/store/reducer/notificationSlice";

const menuButtonClass =
  "h-10 gap-3 rounded-lg px-3 text-[14px] font-medium text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-white data-[active=true]:bg-sidebar-primary data-[active=true]:text-white data-[active=true]:shadow-lg data-[active=true]:shadow-black/20 [&>svg]:size-[18px]";

const isPathActive = (pathname, url) =>
  !!url && url !== "#" && (pathname === url || pathname.startsWith(url + "/"));

export default function Appsidebar() {
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

  const initials = (user?.name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Sidebar className="z-50 border-r-0">
      <SidebarHeader className="h-16 p-0 border-b border-sidebar-border">
        <div className="flex h-full items-center justify-between px-4">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c4dff] to-[#5b2ee0] text-white shadow-lg shadow-black/30">
              <IoPhonePortraitOutline className="size-5" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-xl font-extrabold tracking-wide text-white">
                Mobi<span className="text-[#a78bfa]">Zone</span>
              </span>
              <span className="text-[11px] text-sidebar-foreground/70">
                Mobiles &amp; Accessories
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
                            <span>{menu.title}</span>
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
                                    {sub.title}
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
                          <span>{menu.title}</span>
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

      <SidebarFooter className="p-3">
        <div className="rounded-xl bg-gradient-to-br from-[#5b2ee0] to-[#3b1c9e] p-3 text-white shadow-lg shadow-black/30">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-bold">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {user?.name || "Guest"}
              </p>
              <p className="text-[11px] capitalize text-white/70">{role}</p>
            </div>
          </div>

          <Link
            href="/admin/pos"
            onClick={() => handleNav("POS")}
            className="mt-3 flex h-9 items-center justify-center gap-2 rounded-lg bg-white text-sm font-semibold text-[#3b1c9e] transition hover:bg-white/90"
          >
            <IoCartOutline className="size-4" />
            Open POS
          </Link>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
