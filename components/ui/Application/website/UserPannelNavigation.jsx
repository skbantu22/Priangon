"use client";

import {
  USER_PROFILE,
  USER_DASHBOARD,
  USER_ORDER,
  WEBSITE_LOGIN,
  USER_WISHLIST,
} from "@/Route/Websiteroute";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React from "react";
import { useDispatch } from "react-redux";
import { Button } from "../../button";
import { showToast } from "@/lib/showToast";
import axios from "axios";
import { logout } from "@/store/reducer/authReducer";

const UserPanelNavigation = () => {
  const pathname = usePathname();
  const dispatch = useDispatch();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const { data: logoutResponse } = await axios.post("/api/auth/logout");

      if (!logoutResponse.success) {
        throw new Error(logoutResponse.message);
      }

      dispatch(logout());
      showToast("success", logoutResponse.message);

      router.push(WEBSITE_LOGIN);
    } catch (error) {
      showToast("error", error.message);
    }
  };

  return (
    <div className="border shadow-sm p-4 rounded">
      <ul>
        <li className="mb-2">
          <Link
            href={USER_DASHBOARD}
            className={`block p-3 text-sm rounded
        hover:bg-primary hover:text-white
        ${pathname.startsWith(USER_DASHBOARD) ? "bg-primary text-white" : ""}`}
          >
            Dashboard
          </Link>
        </li>

        <li className="mb-2">
          <Link
            href={USER_PROFILE}
            className={`block p-3 text-sm rounded
        hover:bg-primary hover:text-white
        ${pathname.startsWith(USER_PROFILE) ? "bg-primary text-white" : ""}`}
          >
            Profile
          </Link>
        </li>

        <li className="mb-2">
          <Link
            href={USER_ORDER}
            className={`block p-3 text-sm rounded
        hover:bg-primary hover:text-white
        ${pathname.startsWith(USER_ORDER) ? "bg-primary text-white" : ""}`}
          >
            Orders
          </Link>
        </li>

        <li className="mb-2">
          <Link
            href={USER_WISHLIST}
            className={`block p-3 text-sm rounded
        hover:bg-primary hover:text-white
        ${pathname.startsWith(USER_WISHLIST) ? "bg-primary text-white" : ""}`}
          >
            Favourite Item
          </Link>
        </li>

        <li className="mb-2">
          <Button
            type="button"
            onClick={handleLogout}
            variant="destructive"
            className="w-full"
          >
            Logout
          </Button>
        </li>
      </ul>
    </div>
  );
};

export default UserPanelNavigation;
