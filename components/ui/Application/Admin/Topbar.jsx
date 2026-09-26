"use client";

import React, { useState } from "react";
import Link from "next/link";
import { RiMenu4Fill } from "react-icons/ri";
import { IoSearch, IoCartOutline } from "react-icons/io5";
import Themeswitch from "./Themeswitch";
import ProfilePanel from "./ProfilePanel";
import { IoPersonCircleOutline } from "react-icons/io5";
import SearchModel from "./SearchModel";
import AdminMobileSearch from "./AdminMobileSearch";
import NotificationBell from "./NotificationBell";
import { useSidebar } from "@/components/ui/sidebar";

const Topbar = () => {
  const [profileOpen, setProfileOpen] = useState(false);

  const { toggleSidebar, open, isMobile } = useSidebar();
  const [searchOpen, setSearchOpen] = useState(false);

  const offset = open && !isMobile ? "md:ps-[calc(16rem+1.5rem)]" : "md:ps-6";

  return (
    <div
      className={`fixed h-16 w-full top-0 left-0 z-30 ${offset} md:pe-6 px-4 flex justify-between items-center gap-4 bg-sidebar text-white shadow-md transition-[padding] duration-200`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={toggleSidebar}
          className="flex size-9 items-center justify-center rounded-lg hover:bg-white/10"
          title="Toggle menu"
        >
          <RiMenu4Fill className="size-5" />
        </button>

        <span className="md:hidden text-lg font-extrabold">
          SB <span className="text-[#f06a8a]">Telecom</span>
        </span>

        {/* Desktop search opens the existing search modal */}
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="hidden md:flex h-10 w-[420px] max-w-[40vw] items-center overflow-hidden rounded-lg bg-white text-left text-sm text-gray-400"
        >
          <span className="flex flex-1 items-center gap-2 px-3">
            <IoSearch className="size-4" />
            Search products, orders, customers...
          </span>
          <span className="flex h-full w-11 items-center justify-center bg-primary text-white">
            <IoSearch className="size-5" />
          </span>
        </button>
        <SearchModel open={searchOpen} setOpen={setSearchOpen} />
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <Link
          href="/admin/pos"
          className="hidden sm:flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium hover:bg-white/10"
        >
          <IoCartOutline className="size-5" />
          POS
        </Link>

        <div className="md:hidden [&_button]:text-white">
          <AdminMobileSearch />
        </div>

        <NotificationBell />

        <div className="[&_button]:text-white [&_button:hover]:bg-white/10 [&_button:hover]:text-white">
          <Themeswitch />
        </div>

        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          aria-label="Account"
          className="flex size-9 items-center justify-center rounded-full text-white hover:bg-white/10"
        >
          <IoPersonCircleOutline className="size-7" />
        </button>
      </div>

      <ProfilePanel open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
};

export default Topbar;
