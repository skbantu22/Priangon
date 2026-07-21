"use client";

import React from "react";
import Link from "next/link";
import { LuChevronRight } from "react-icons/lu";
import { IoMdClose } from "react-icons/io";
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

import { Button } from "../../button";
import { sidebarMenu } from "@/lib/adminappsidebarmenu";
import { resetOrderNotification } from "@/store/reducer/notificationSlice";

export default function Appsidebar() {
  const { toggleSidebar, isMobile } = useSidebar();
  const dispatch = useDispatch();

  const notificationCount = useSelector(
    (state) => state.notification.orderCount,
  );

  // Redux auth
  const auth = useSelector((state) => state.authStore.auth);

  // ✅ Correct role path
  const role = auth?.data?.user?.role || "customer";

  // Filter menu by role
  const filteredMenu = sidebarMenu.filter((menu) => {
    if (!menu.roles) return true;
    return menu.roles.includes(role);
  });

  console.log("AUTH =>", auth);
  console.log("ROLE =>", role);
  console.log("FILTERED =>", filteredMenu);

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
          <h1 className="text-2xl md:text-3xl font-black tracking-wider">
            <span className="bg-gradient-to-r from-primary via-pink-500 to-orange-500 bg-clip-text text-transparent">
              MiniThailand
            </span>
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
            {filteredMenu.map((menu, index) => {
              const hasSubmenu =
                Array.isArray(menu.submenu) && menu.submenu.length > 0;

              const href =
                menu.url?.startsWith("/") && menu.url.length > 1
                  ? menu.url
                  : "/admin";

              return (
                <Collapsible key={index} className="group/collapsible">
                  <SidebarMenuItem>
                    {hasSubmenu ? (
                      <>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            type="button"
                            className="flex items-center gap-2"
                          >
                            <menu.icon />
                            <span>{menu.title}</span>

                            {menu.title === "Orders" &&
                              notificationCount > 0 && (
                                <div className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                                  {notificationCount}
                                </div>
                              )}

                            <LuChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {menu.submenu
                              .filter((sub) => {
                                if (!sub.roles) return true;
                                return sub.roles.includes(role);
                              })
                              .map((sub, i) => (
                                <SidebarMenuSubItem key={i}>
                                  <SidebarMenuSubButton asChild>
                                    <Link
                                      href={sub.url}
                                      onClick={() => handleNav(menu.title)}
                                    >
                                      {sub.title}
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
                        className="flex items-center gap-2"
                      >
                        <Link href={href} onClick={() => handleNav(menu.title)}>
                          <menu.icon />
                          <span>{menu.title}</span>
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

      <SidebarFooter />
    </Sidebar>
  );
}
