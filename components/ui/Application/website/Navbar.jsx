"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Menu, Search, Heart, X, MapPin, User } from "lucide-react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import {
  USER_DASHBOARD,
  WEBSITE_HOME,
  WEBSITE_LOGIN,
} from "@/Route/Websiteroute";
import Cart from "./cart";
import { Avatar, AvatarImage } from "../../avatar";
import userIcon from "@/public/assets/user.png";
import SearchBox from "../Admin/SearchBox";

const Navbar = () => {
  const [query, setQuery] = useState("");
  const [openMenu, setOpenMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const auth = useSelector((store) => store.authStore.auth);
  const router = useRouter();
  const searchRef = useRef(null);

  const handleSearchSubmit = () => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    router.push(`/shop?${params.toString()}`);
    setShowMobileSearch(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowMobileSearch(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const iconItem =
    "flex flex-col items-center justify-center gap-1 text-black hover:text-gray-500 cursor-pointer";

  return (
   
<header className="sticky top-0 z-60 w-full border-b bg-white transition-shadow">

      <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
        <div className="flex items-center justify-between py-3 lg:py-4">
          
          {/* Mobile Menu */}
          <button
            className="p-2 lg:hidden"
            onClick={() => setOpenMenu(true)}
          >
            <Menu size={24} />
          </button>

          {/* Logo */}
          <Link
            href={WEBSITE_HOME}
            className="flex flex-1 justify-center lg:flex-none lg:justify-start"
          >
            <h1 className="text-2xl md:text-4xl font-black tracking-[-0.05em] text-[#0f172a]">
              PRIYAN<span className="font-extralight text-blue-600">GON</span>
            </h1>
          </Link>

          {/* Mobile Icons */}
          <div className="flex items-center gap-3 lg:hidden">
            <button onClick={() => setShowMobileSearch(!showMobileSearch)}>
              <Search size={22} />
            </button>
            <button>
              <Heart size={22} />
            </button>
          </div>

          {/* Desktop */}
          <div className="hidden lg:flex items-center gap-10">
            
            {/* Menu */}
            <nav className="flex gap-8 text-sm font-semibold uppercase">
              <Link href="#">Men</Link>
              <Link href="#">Women</Link>
              <Link href="#">Combo</Link>
              <Link href="#">Kids</Link>
              <Link href="#">Accessories</Link>
            </nav>

            {/* Search */}
            <div className="w-[350px]">
              <SearchBox
                value={query}
                onChange={setQuery}
                onSubmit={handleSearchSubmit}
              />
            </div>

            {/* Icons */}
            <div className="flex items-center gap-8 text-xs font-semibold">

              {/* Store */}
              <div className={iconItem}>
                <MapPin size={20} />
                <span>Stores</span>
              </div>

              {/* Account */}
              {!auth ? (
                <Link href={WEBSITE_LOGIN} className={iconItem}>
                  <User size={20} />
                  <span>Profile</span>
                </Link>
              ) : (
                <Link href={USER_DASHBOARD} className={iconItem}>
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={auth?.avatar?.url || userIcon.src} />
                  </Avatar>
                  <span>Account</span>
                </Link>
              )}

              {/* Wishlist */}
              <div className={iconItem}>
                <Heart size={20} />
                <span>Wishlist</span>
              </div>

              {/* Cart ✅ FIXED */}
              <div className={iconItem}>
                <div className="h-6 w-6 flex items-center justify-center">
                  <Cart />
                </div>
                <span>Cart</span>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Mobile Search */}
      {showMobileSearch && (
        <div
          ref={searchRef}
          className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-96 bg-white shadow-md z-50 lg:hidden"
        >
          <SearchBox
            value={query}
            onChange={setQuery}
            onSubmit={handleSearchSubmit}
          />
        </div>
      )}

      {/* Mobile Menu */}
      {openMenu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpenMenu(false)}
          />
          <div className="absolute left-0 top-0 h-full w-[280px] bg-white p-4 shadow-lg">
            <div className="flex justify-between border-b pb-3">
              <span className="font-bold">Menu</span>
              <button onClick={() => setOpenMenu(false)}>
                <X size={22} />
              </button>
            </div>

            <nav className="flex flex-col gap-4 pt-4 text-sm font-semibold uppercase">
              <Link href="#">Men</Link>
              <Link href="#">Women</Link>
              <Link href="#">Teens</Link>
              <Link href="#">Kids</Link>
              <Link href="#">Sports</Link>

              {!auth ? (
                <Link href={WEBSITE_LOGIN}>Login</Link>
              ) : (
                <Link href={USER_DASHBOARD}>My Account</Link>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;