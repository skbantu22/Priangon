"use client";

import React from "react";
import Link from "next/link";
import { LuChevronRight } from "react-icons/lu";
import { IoMdClose } from "react-icons/io";

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
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

import { sidebarMenu } from "@/lib/adminappsidebarmenu";
import { Button } from "../../button";
import { useSelector, useDispatch } from "react-redux";

import { resetOrderNotification } from "@/store/reducer/notificationSlice";
export default function Appsidebar() {
  const { toggleSidebar, isMobile } = useSidebar();

  const dispatch = useDispatch();

  const notificationCount = useSelector(
    (state) => state.notification.orderCount,
  );

  // ✅ Close only on mobile after navigation
  const handleNav = (menuTitle) => {
    if (menuTitle === "Orders") {
      dispatch(resetOrderNotification());
    }

    if (isMobile) toggleSidebar();
  };
  return (
    <Sidebar className="z-50">
      <SidebarHeader className="border-b h-14 p-0">
        <div className="flex justify-between items-center px-4">
          <h1 className="text-xl font-bold tracking-wide text-primary">
            Priangon
          </h1>

          <Button
            onClick={toggleSidebar}
            type="button"
            size="icon"
            className="md:hidden"
          >
            <IoMdClose />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {sidebarMenu.map((menu, index) => {
              const hasSubmenu =
                Array.isArray(menu?.submenu) && menu.submenu.length > 0;

              const isValidHref =
                typeof menu?.url === "string" &&
                menu.url.startsWith("/") &&
                menu.url.length > 1;

              const href = isValidHref ? menu.url : "/admin";

              return (
                <Collapsible key={index} className="group/collapsible">
                  <SidebarMenuItem>
                    {hasSubmenu ? (
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          type="button"
                          className="flex items-center gap-2"
                        >
                          <menu.icon />
                          <span>{menu.title}</span>
                          {menu.title === "Orders" && notificationCount > 0 && (
                            <div className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                              {notificationCount}
                            </div>
                          )}
                          <LuChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                    ) : (
                      <SidebarMenuButton
                        asChild
                        className="flex items-center gap-2"
                      >
                        <Link href={href} onClick={() => handleNav(menu.title)}>
                          <menu.icon />
                          <span>{menu.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    )}

                    {hasSubmenu && (
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {menu.submenu.map((sub, subIndex) => {
                            const subValid =
                              typeof sub?.url === "string" &&
                              sub.url.startsWith("/") &&
                              sub.url.length > 1;

                            const subHref = subValid ? sub.url : "/admin";

                            return (
                              <SidebarMenuSubItem key={subIndex}>
                                <SidebarMenuSubButton asChild>
                                  <Link
                                    href={subHref}
                                    onClick={() => handleNav(menu.title)}
                                  >
                                    {sub.title}
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    )}
                  </SidebarMenuItem>
                </Collapsible>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter />
    </Sidebar>
  );
}
