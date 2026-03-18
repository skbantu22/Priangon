"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Menu, Search, Heart, X, MapPin, User } from "lucide-react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { USER_DASHBOARD, WEBSITE_HOME, WEBSITE_LOGIN } from "@/Route/Websiteroute";
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
    setShowMobileSearch(false); // close search after submit
  };
  

  // Click outside to close mobile search
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

  return (
    <header className="w-full border-b bg-white relative z-50">
      <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
        <div className="flex items-center justify-between py-3 lg:py-4">
          {/* Mobile Menu Button */}
          <button
            className="p-2 lg:hidden"
            onClick={() => setOpenMenu(true)}
            aria-label="Open Menu"
          >
            <Menu size={24} />
          </button>

          {/* Logo */}
          <Link
            href={WEBSITE_HOME}
            className="flex flex-1 items-center justify-center gap-2 lg:flex-none lg:justify-start lg:gap-3"
          >
            <h1 className="text-2xl font-black leading-none tracking-[-0.05em] text-[#0f172a] transition-all duration-500 md:text-4xl">
              PRIYAN<span className="font-extralight text-blue-600">GON</span>
            </h1>
          </Link>

          {/* Mobile Icons */}
          <div className="flex items-center gap-3 lg:hidden relative">
            <button
              className="p-2"
              aria-label="Search"
              onClick={() => setShowMobileSearch(!showMobileSearch)}
            >
              <Search size={22} />
            </button>
            <button className="p-2" aria-label="Wishlist">
              <Heart size={22} />
            </button>
          </div>

          {/* Desktop Navbar */}
          <div className="hidden items-center gap-10 lg:flex">
            <nav className="flex gap-8 text-sm font-semibold uppercase">
              <Link href="#" className="hover:text-gray-500">Men</Link>
              <Link href="#" className="hover:text-gray-500">Women</Link>
              <Link href="#" className="hover:text-gray-500">Combo</Link>
              <Link href="#" className="hover:text-gray-500">Kids</Link>
              <Link href="#" className="hover:text-gray-500">Sports</Link>
            </nav>

            <div className="w-[350px]">
              <SearchBox
                value={query}
                onChange={setQuery}
                onSubmit={handleSearchSubmit}
              />
            </div>

            <div className="flex items-center gap-8 text-xs font-semibold">
              <button className="flex flex-col items-center gap-1 hover:text-gray-500">
                <MapPin size={20} />
                <span>Stores</span>
              </button>

              {!auth ? (
                <Link
                  href={WEBSITE_LOGIN}
                  className="flex flex-col items-center gap-1 hover:text-gray-500"
                >
                  <User size={20} />
                  <span>Profile</span>
                </Link>
              ) : (
                <Link
                  href={USER_DASHBOARD}
                  className="flex flex-col items-center gap-1 hover:text-gray-500"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={auth?.avatar?.url || userIcon.src} />
                  </Avatar>
                  <span>Account</span>
                </Link>
              )}


              <button className="flex flex-col items-center gap-1 hover:text-gray-500">
                <Heart size={20} />
                <span>Wishlist</span>
              </button>

               
              <button className="">
                              <Cart  />

              </button>
              
              

            </div>
          </div>
        </div>
      </div>

      {/* Mobile Search Dropdown */}
      {showMobileSearch && (
        <div
          ref={searchRef}
          className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-96 bg-white shadow-md z-50 lg:hidden"
        >
          <SearchBox
            value={query}
            onChange={setQuery}
            onSubmit={handleSearchSubmit}
            placeholder="Search entire store here..."
            onSelect={() => setShowMobileSearch(false)}
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
            <div className="flex items-center justify-between border-b pb-3">
              <span className="font-bold">Menu</span>
              <button onClick={() => setOpenMenu(false)} aria-label="Close Menu">
                <X size={22} />
              </button>
            </div>
            <nav className="flex flex-col gap-4 pt-4 text-sm font-semibold uppercase">
              <Link href="#" onClick={() => setOpenMenu(false)}>Men</Link>
              <Link href="#" onClick={() => setOpenMenu(false)}>Women</Link>
              <Link href="#" onClick={() => setOpenMenu(false)}>Teens</Link>
              <Link href="#" onClick={() => setOpenMenu(false)}>Kids</Link>
              <Link href="#" onClick={() => setOpenMenu(false)}>Sports</Link>

              {!auth ? (
                <Link href={WEBSITE_LOGIN} onClick={() => setOpenMenu(false)}>Login</Link>
              ) : (
                <Link href={USER_DASHBOARD} onClick={() => setOpenMenu(false)}>My Account</Link>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;