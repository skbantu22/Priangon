"use client";

import React, { useState } from "react";
import Link from "next/link";
import { RiMenu4Fill } from "react-icons/ri";
import { IoSearch, IoCartOutline } from "react-icons/io5";
import Themeswitch from "./Themeswitch";
import UserDropDown from "./UserDropDown";
import SearchModel from "./SearchModel";
import AdminMobileSearch from "./AdminMobileSearch";
import { useSidebar } from "@/components/ui/sidebar";

const Topbar = () => {
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
          Mobi<span className="text-[#a78bfa]">Zone</span>
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

        <div className="[&_button]:text-white [&_button:hover]:bg-white/10 [&_button:hover]:text-white">
          <Themeswitch />
        </div>

        <UserDropDown showDetails />
      </div>
    </div>
  );
};

export default Topbar;
