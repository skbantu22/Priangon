"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
<<<<<<< HEAD
import { Menu, Search, Heart, X, MapPin, User, LogOutIcon } from "lucide-react";
=======
import {
  Menu,
  Search,
  Heart,
  X,
  MapPin,
  User,
  LogOutIcon,
  Package,
} from "lucide-react";
>>>>>>> baf7251 (Update admin UI, navbar, media model, assets and dependencies)
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import logo from "@/public/assets/logo.png";
import Image from "next/image";
import axios from "axios";

import {
  USER_DASHBOARD,
  WEBSITE_HOME,
  WEBSITE_LOGIN,
  WEBSITE_REGISTER,
} from "@/Route/Websiteroute";

import Cart from "./cart";
import { Avatar, AvatarImage } from "../../avatar";
import userIcon from "@/public/assets/user.png";
import SearchBox from "../Admin/SearchBox";
<<<<<<< HEAD
import { Package, LogOut } from "lucide-react";
import { showToast } from "@/lib/showToast";
import { logout } from "@/store/reducer/authReducer";

import axios from "axios";
=======
import { showToast } from "@/lib/showToast";
import { logout } from "@/store/reducer/authReducer";
>>>>>>> baf7251 (Update admin UI, navbar, media model, assets and dependencies)

const Navbar = () => {
  const [query, setQuery] = useState("");
  const [openMenu, setOpenMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const auth = useSelector((store) => store.authStore.auth);

  console.log("Auth in Navbar:", auth);
  const router = useRouter();
  const dispatch = useDispatch();
  const searchRef = useRef(null);
  const dispatch = useDispatch();

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
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const iconItem =
    "flex flex-col items-center justify-center gap-1 text-black hover:text-gray-500 cursor-pointer";

  return (
<<<<<<< HEAD
    <header className="sticky top-0 z-60 w-full border-b bg-white transition-shadow">
=======
    <header className="sticky top-0 z-50 w-full border-b bg-white">
>>>>>>> baf7251 (Update admin UI, navbar, media model, assets and dependencies)
      <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
        {/* MAIN BAR */}
        <div className="flex items-center justify-between py-3 lg:py-4">
<<<<<<< HEAD
          {/* Mobile Menu */}
          <button className="p-2 lg:hidden" onClick={() => setOpenMenu(true)}>
=======
          {/* Mobile Menu Button */}
          <button className="lg:hidden p-2" onClick={() => setOpenMenu(true)}>
>>>>>>> baf7251 (Update admin UI, navbar, media model, assets and dependencies)
            <Menu size={24} />
          </button>

          {/* LOGO (FIXED - NO GAP) */}
          <Link href={WEBSITE_HOME} className="flex items-center">
            <Image
              src={logo}
              alt="Minithiland"
              width={55}
              height={55}
              className=""
              priority
            />
          </Link>

          {/* Mobile Icons */}
          <div className="flex items-center gap-3 lg:hidden">
            <button onClick={() => setShowMobileSearch(!showMobileSearch)}>
              <Search size={22} />
            </button>
            <Heart size={22} />
          </div>

          {/* DESKTOP MENU */}
          <div className="hidden lg:flex items-center gap-10">
<<<<<<< HEAD
            {/* Menu */}
=======
            {/* Nav Links */}
>>>>>>> baf7251 (Update admin UI, navbar, media model, assets and dependencies)
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
<<<<<<< HEAD
              {/* Store */}
=======
>>>>>>> baf7251 (Update admin UI, navbar, media model, assets and dependencies)
              <div className={iconItem}>
                <MapPin size={20} />
                <span>Stores</span>
              </div>

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

              <div className={iconItem}>
                <Heart size={20} />
                <span>Wishlist</span>
              </div>

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

      {/* MOBILE SEARCH */}
      {showMobileSearch && (
        <div
          ref={searchRef}
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[90%] bg-white shadow-lg z-50 lg:hidden"
        >
          <SearchBox
            value={query}
            onChange={setQuery}
            onSubmit={handleSearchSubmit}
          />
        </div>
      )}

<<<<<<< HEAD
      {/* Mobile Menu */}

=======
      {/* MOBILE MENU */}
>>>>>>> baf7251 (Update admin UI, navbar, media model, assets and dependencies)
      {openMenu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpenMenu(false)}
          />

          {/* Sidebar */}
<<<<<<< HEAD
          <div className="absolute left-0 top-0 h-full w-[280px] bg-white p-4 shadow-lg flex flex-col">
=======
          <div className="absolute left-0 top-0 h-full w-[280px] bg-white p-4 flex flex-col">
>>>>>>> baf7251 (Update admin UI, navbar, media model, assets and dependencies)
            {/* Header */}
            <div className="flex justify-between items-center border-b pb-3">
              <span className="font-bold text-lg">Menu</span>
              <button onClick={() => setOpenMenu(false)}>
                <X size={22} />
              </button>
            </div>

            {/* Main Menu */}
            <nav className="flex flex-col gap-4 pt-4 text-sm font-semibold uppercase border-b pb-4">
              <Link href="#" onClick={() => setOpenMenu(false)}>
                Men
              </Link>
              <Link href="#" onClick={() => setOpenMenu(false)}>
                Women
              </Link>
              <Link href="#" onClick={() => setOpenMenu(false)}>
                Teens
              </Link>
              <Link href="#" onClick={() => setOpenMenu(false)}>
                Kids
              </Link>
              <Link href="#" onClick={() => setOpenMenu(false)}>
                Sports
              </Link>
            </nav>

            {/* User Section */}
=======
            {/* Links */}
            <nav className="flex flex-col gap-4 pt-4 text-sm font-semibold uppercase border-b pb-4">
              <Link href="#">Men</Link>
              <Link href="#">Women</Link>
              <Link href="#">Teens</Link>
              <Link href="#">Kids</Link>
              <Link href="#">Sports</Link>
            </nav>

            {/* USER SECTION */}
>>>>>>> baf7251 (Update admin UI, navbar, media model, assets and dependencies)
            <div className="flex flex-col gap-4 pt-4 text-sm">
              {!auth ? (
                <>
                  <Link
                    href={WEBSITE_LOGIN}
<<<<<<< HEAD
                    onClick={() => setOpenMenu(false)}
=======
>>>>>>> baf7251 (Update admin UI, navbar, media model, assets and dependencies)
                    className="flex items-center gap-2"
                  >
                    <User size={18} /> Sign In
                  </Link>

                  <Link
                    href={WEBSITE_REGISTER}
<<<<<<< HEAD
                    onClick={() => setOpenMenu(false)}
=======
>>>>>>> baf7251 (Update admin UI, navbar, media model, assets and dependencies)
                    className="flex items-center gap-2"
                  >
                    <User size={18} /> Create Account
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href={USER_DASHBOARD}
<<<<<<< HEAD
                    onClick={() => setOpenMenu(false)}
=======
>>>>>>> baf7251 (Update admin UI, navbar, media model, assets and dependencies)
                    className="flex items-center gap-2"
                  >
                    <User size={18} /> My Account
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-left"
                  >
                    <LogOutIcon size={18} /> Logout
                  </button>
                </>
              )}

<<<<<<< HEAD
              {/* Always visible */}
              <Link
                href="/wishlist"
                onClick={() => setOpenMenu(false)}
                className="flex items-center gap-2"
              >
                <Heart size={18} /> My Wishlist
              </Link>

              <Link
                href="/track-order"
                onClick={() => setOpenMenu(false)}
                className="flex items-center gap-2"
              >
=======
              <Link href="/wishlist" className="flex items-center gap-2">
                <Heart size={18} /> My Wishlist
              </Link>

              <Link href="/track-order" className="flex items-center gap-2">
>>>>>>> baf7251 (Update admin UI, navbar, media model, assets and dependencies)
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
