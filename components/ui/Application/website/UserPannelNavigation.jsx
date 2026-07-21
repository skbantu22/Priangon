"use client";

import { useState } from "react";
import {
  USER_PROFILE,
  USER_DASHBOARD,
  USER_ORDER,
  WEBSITE_LOGIN,
  USER_STOCK_CHECK,
  USER_WISHLIST,
} from "@/Route/Websiteroute";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import axios from "axios";

import { logout } from "@/store/reducer/authReducer";
import { showToast } from "@/lib/showToast";
import { Button } from "../../button";

import {
  LayoutDashboard,
  User,
  Package,
  ScanSearch,
  Heart,
  Menu,
  X,
  LogOut,
} from "lucide-react";

const menus = [
  {
    title: "Dashboard",
    href: USER_DASHBOARD,
    icon: LayoutDashboard,
  },
  {
    title: "Profile",
    href: USER_PROFILE,
    icon: User,
  },
  {
    title: "Orders",
    href: USER_ORDER,
    icon: Package,
  },
  {
    title: "Stock Check",
    href: USER_STOCK_CHECK,
    icon: ScanSearch,
  },
  {
    title: "Favourite Item",
    href: USER_WISHLIST,
    icon: Heart,
  },
];

export default function UserPanelNavigation() {
  const pathname = usePathname();
  const dispatch = useDispatch();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      setIsOpen(false);
      const { data } = await axios.post("/api/auth/logout");

      if (!data.success) {
        throw new Error(data.message);
      }

      dispatch(logout());
      showToast("success", data.message);

      router.push(WEBSITE_LOGIN);
    } catch (error) {
      showToast("error", error?.message || "Logout failed");
    }
  };

  const MenuItems = () => (
    <ul className="flex flex-col gap-2 w-full">
      {menus.map((item) => {
        const isActive = pathname === item.href;

        return (
          <li key={item.href} className="w-full">
            <Link
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3.5 w-full rounded-xl px-4 py-3.5 transition-all font-medium text-sm ${
                isActive
                  ? "bg-black text-white shadow-sm"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="truncate">{item.title}</span>
            </Link>
          </li>
        );
      })}

      <li className="pt-4 w-full border-t mt-2">
        <Button
          type="button"
          variant="destructive"
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-medium"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Logout</span>
        </Button>
      </li>
    </ul>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block border rounded-2xl shadow-sm bg-white p-4 sticky top-24 w-full">
        <MenuItems />
      </div>

      {/* Mobile Trigger Button (Clean & Overflow Free) */}
      <div className="lg:hidden mb-5 w-full">
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-between px-4 py-3.5 border rounded-xl shadow-sm bg-white text-gray-800 hover:bg-gray-50 transition-all font-medium"
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-gray-100 rounded-lg text-gray-700">
              <Menu className="w-5 h-5" />
            </div>
            <span className="text-base font-semibold">My Account Menu</span>
          </div>
          <span className="text-xs bg-black text-white px-3 py-1.5 rounded-lg font-medium">
            Menu
          </span>
        </button>

        {/* Custom Mobile Drawer Overlay & Content */}
        {isOpen && (
          <div className="fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
              onClick={() => setIsOpen(false)}
            />

            {/* Drawer Box */}
            <div className="relative w-[85%] max-w-[320px] bg-white h-full shadow-2xl z-10 flex flex-col p-5 animate-in slide-in-from-left duration-300">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b mb-4">
                <h2 className="text-xl font-bold text-gray-900">My Account</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Links */}
              <div className="flex-1 overflow-y-auto">
                <MenuItems />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
