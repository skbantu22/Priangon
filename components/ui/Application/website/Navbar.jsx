"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Menu,
  Search,
  Heart,
  X,
  MapPin,
  User,
  LogOutIcon,
  Package,
  ChevronDown,
  LayoutGrid,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import logo from "@/public/assets/logo.png";
import Image from "next/image";
import axios from "axios";

import {
  WEBSITE_HOME,
  WEBSITE_LOGIN,
  WEBSITE_REGISTER,
} from "@/Route/Websiteroute";

import Cart from "./cart";
import { Avatar, AvatarImage } from "../../avatar";
import userIcon from "@/public/assets/user.png";
import SearchBox from "../Admin/SearchBox";
import { showToast } from "@/lib/showToast";
import { logout } from "@/store/reducer/authReducer";

// Categories from image_9bc3e1.png
const categories = [
  "MODEST CORD'S SET",
  "BEACH GOWN",
  "LONG DRESS",
  "MIYAKO CORDS SET",
  "MIYAKO ONE PIECS",
  "SHIRT & MIDI SHIRT",
  "MODEST ONE PIECE",
  "COTTON SET TWO PIECE",
  "CORDS SET",
  "VAM",
  "LIP BAM",
];

const Navbar = () => {
  const [query, setQuery] = useState("");
  const [openMenu, setOpenMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showAllCats, setShowAllCats] = useState(false);

  const auth = useSelector((store) => store.authStore.auth);
  const router = useRouter();
  const dispatch = useDispatch();
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  const role = auth?.data?.user?.role;
  const dashboard = role === "admin" ? "/admin/dashboard" : "/my-account";

  const handleLogout = async () => {
    try {
      const { data } = await axios.post("/api/auth/logout");
      if (!data.success) throw new Error(data.message);
      dispatch(logout());
      showToast("success", data.message);
      router.push(WEBSITE_LOGIN);
    } catch (error) {
      showToast("error", error.message);
    }
  };

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
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowAllCats(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const iconItem =
    "flex flex-col items-center justify-center gap-1 text-black hover:text-pink-600 transition-colors duration-200 cursor-pointer";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
        {/* MAIN BAR */}
        <div className="flex items-center justify-between py-2 lg:py-2">
          {/* LEFT: Mobile Menu & Logo Alignment */}
          <div className="flex items-center gap-1 lg:gap-0">
            {/* Mobile Menu Trigger */}
            <button
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              onClick={() => setOpenMenu(true)}
            >
              <Menu size={24} />
            </button>

            {/* LOGO */}
            <Link
              href={WEBSITE_HOME}
              className="flex items-center transition-transform hover:scale-105"
            >
              <Image
                src={logo}
                alt="Minithiland"
                width={65}
                height={65}
                className="w-10 h-10 lg:w-16 lg:h-16 object-contain"
              />
            </Link>

            {/* ✅ NEW: Mobile Mode Thailand Text (Logo-র ঠিক পাশে সুন্দরভাবে এলাইন করা) */}
            <div className="lg:hidden ml-2 flex items-center gap-1 bg-gradient-to-r from-pink-500/10 to-amber-500/10 border border-pink-200/50 px-2 py-0.5 rounded-full">
              <span className="bg-gradient-to-r from-pink-600 to-amber-600 bg-clip-text text-transparent font-black text-[9px] uppercase tracking-wide italic">
                Imported From Thailand
              </span>
            </div>
          </div>

          {/* RIGHT: Mobile Actions */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              className="p-1 hover:bg-gray-50 rounded-full"
            >
              <Search size={22} />
            </button>
            <Link
              href="/wishlist"
              className="p-1 hover:bg-gray-50 rounded-full"
            >
              <Heart size={22} />
            </Link>
          </div>

          {/* DESKTOP CENTER & RIGHT */}
          <div className="hidden lg:flex items-center justify-between flex-1 ml-8">
            {/* ✨ UNIQUE & MODERN UI: DESKTOP THAILAND BADGE */}
            <div className="relative overflow-hidden px-4 py-1.5 rounded-xl bg-zinc-950 shadow-md border border-zinc-800 group transition-all duration-300 hover:border-pink-500/50">
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 via-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center gap-2.5">
                <div className="flex flex-col">
                  <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest leading-none">
                    Authentic Luxury
                  </span>
                  <span className="bg-gradient-to-r from-amber-400 via-pink-400 to-rose-400 bg-clip-text text-transparent font-black text-xs uppercase tracking-wider italic mt-0.5">
                    Imported From Thailand
                  </span>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="w-[380px] mx-4">
              <SearchBox
                value={query}
                onChange={setQuery}
                onSubmit={handleSearchSubmit}
              />
            </div>

            {/* Navigation Icons */}
            <div className="flex items-center gap-7 text-[11px] tracking-wider uppercase font-bold text-gray-700">
              <div className={iconItem}>
                <MapPin size={20} className="text-gray-800" />
                <span>Stores</span>
              </div>

              {!auth ? (
                <Link href={WEBSITE_LOGIN} className={iconItem}>
                  <User size={20} className="text-gray-800" />
                  <span>Profile</span>
                </Link>
              ) : (
                <Link href={dashboard} className={iconItem}>
                  <Avatar className="h-6 w-6 ring-2 ring-pink-500 ring-offset-1">
                    <AvatarImage src={auth?.avatar?.url || userIcon.src} />
                  </Avatar>
                  <span>Account</span>
                </Link>
              )}

              <Link href="/wishlist" className={iconItem}>
                <Heart size={20} className="text-gray-800" />
                <span>Wishlist</span>
              </Link>

              <div className={iconItem}>
                <div className="h-6 w-6 flex items-center justify-center relative">
                  <Cart />
                </div>
                <span>Cart</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE SEARCHBAR */}
      {showMobileSearch && (
        <div
          ref={searchRef}
          className="lg:hidden px-4 pb-4 bg-white border-b animate-in slide-in-from-top duration-200"
        >
          <SearchBox
            value={query}
            onChange={setQuery}
            onSubmit={handleSearchSubmit}
          />
        </div>
      )}

      {/* BLACK CATEGORY BAR */}
      <div className="bg-black text-white border-t border-gray-800 hidden lg:block">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-7 whitespace-nowrap px-8 py-3 min-w-max text-xs uppercase font-bold tracking-wide">
            {categories.map((item, index) => (
              <Link
                key={index}
                href={`/shop?category=${item.toLowerCase().replace(/\s+/g, "-")}`}
                className="relative group duration-300 hover:text-pink-500"
              >
                {item}
                <span className="absolute left-0 -bottom-2 h-[2px] w-0 bg-pink-500 duration-300 group-hover:w-full"></span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      {openMenu && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setOpenMenu(false)}
          />

          <div className="absolute left-0 top-0 h-full w-[310px] bg-white p-5 overflow-y-auto flex flex-col shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2">
                <Image src={logo} alt="Logo" width={45} height={45} />
                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider leading-none">
                    Minithiland
                  </span>
                  <span className="text-pink-600 font-black text-xs uppercase tracking-wide italic mt-0.5">
                    Thailand Hub
                  </span>
                </div>
              </div>
              <button
                onClick={() => setOpenMenu(false)}
                className="p-1 bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            {/* Thailand Flag Badge in Mobile Drawer Sidebar */}
            <div className="mt-5 text-center py-2.5 bg-gradient-to-r from-amber-500/10 to-pink-500/10 rounded-xl border border-pink-100/50">
              <span className="text-pink-600 font-extrabold text-xs uppercase tracking-widest italic">
                Imported From Thailand
              </span>
            </div>

            {/* Mobile Categories Accordion Title */}
            <div className="mt-6 flex items-center gap-2 text-zinc-400 font-bold uppercase text-[10px] tracking-widest border-b pb-2">
              <LayoutGrid size={12} />
              <span>Shop Categories</span>
            </div>

            {/* Dynamic Mobile categories */}
            <div className="flex flex-col gap-3.5 py-4 text-xs font-bold uppercase border-b max-h-[300px] overflow-y-auto scrollbar-hide">
              {categories.map((item, index) => (
                <Link
                  key={index}
                  href={`/shop?category=${item.toLowerCase().replace(/\s+/g, "-")}`}
                  onClick={() => setOpenMenu(false)}
                  className="hover:text-pink-600 duration-150 py-0.5"
                >
                  {item}
                </Link>
              ))}
            </div>

            {/* Mobile Account Profile Context */}
            <div className="flex flex-col gap-4 py-6">
              {!auth ? (
                <>
                  <Link
                    href={WEBSITE_LOGIN}
                    className="flex items-center gap-3 text-sm font-semibold text-gray-700"
                    onClick={() => setOpenMenu(false)}
                  >
                    <User size={18} /> Sign In
                  </Link>
                  <Link
                    href={WEBSITE_REGISTER}
                    className="flex items-center gap-3 text-sm font-semibold text-gray-700"
                    onClick={() => setOpenMenu(false)}
                  >
                    <User size={18} /> Create Account
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href={dashboard}
                    className="flex items-center gap-3 text-sm font-semibold text-gray-700"
                    onClick={() => setOpenMenu(false)}
                  >
                    <User size={18} /> My Account
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setOpenMenu(false);
                    }}
                    className="flex items-center gap-3 text-left text-sm font-semibold text-red-500"
                  >
                    <LogOutIcon size={18} /> Logout
                  </button>
                </>
              )}

              <Link
                href="/wishlist"
                className="flex items-center gap-3 text-sm font-semibold text-gray-700"
                onClick={() => setOpenMenu(false)}
              >
                <Heart size={18} /> Wishlist
              </Link>
              <Link
                href="/track-order"
                className="flex items-center gap-3 text-sm font-semibold text-gray-700"
                onClick={() => setOpenMenu(false)}
              >
                <Package size={18} /> Track Order
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
