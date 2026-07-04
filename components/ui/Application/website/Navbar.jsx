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
} from "lucide-react";
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
import { showToast } from "@/lib/showToast";
import { logout } from "@/store/reducer/authReducer";

const Navbar = () => {
  const [query, setQuery] = useState("");
  const [openMenu, setOpenMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const auth = useSelector((store) => store.authStore.auth);
  const router = useRouter();
  const dispatch = useDispatch();
  const searchRef = useRef(null);

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
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
        <div className="flex h-14 lg:h-20 items-center justify-between">
          {/* Mobile Menu */}
          <button
            className="lg:hidden rounded-md p-2 hover:bg-gray-100 transition"
            onClick={() => setOpenMenu(true)}
          >
            <Menu size={22} />
          </button>

          {/* Logo */}
          <Link href={WEBSITE_HOME} className="flex items-center">
            <Image
              src={logo}
              alt="Minithiland"
              width={44}
              height={44}
              className="h-11 w-11 lg:h-14 lg:w-14 object-contain"
              priority
            />
          </Link>

          {/* Mobile Right Icons */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              className="rounded-md p-2 hover:bg-gray-100 transition"
            >
              <Search size={20} />
            </button>

            <button className="rounded-md p-2 hover:bg-gray-100 transition">
              <Heart size={20} />
            </button>

            <div className="rounded-md p-2 hover:bg-gray-100 transition">
              <Cart />
            </div>
          </div>

          {/* Desktop */}
          <div className="hidden lg:flex items-center gap-10">
            <nav className="flex items-center gap-8 text-[13px] font-semibold uppercase tracking-wide">
              <Link href="/shop">Our Products</Link>
              <Link href="#">New Arrival</Link>
              <Link href="#">Videos</Link>
              <Link href="#">Reviews</Link>
              <Link href="#">Contact</Link>
            </nav>

            <div className="w-[340px]">
              <SearchBox
                value={query}
                onChange={setQuery}
                onSubmit={handleSearchSubmit}
              />
            </div>

            <div className="flex items-center gap-7 text-xs font-semibold">
              <div className={iconItem}>
                <MapPin size={20} />
                <span>Outlets</span>
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

      {/* Mobile Search */}
      {showMobileSearch && (
        <div
          ref={searchRef}
          className="absolute left-1/2 top-full z-50 mt-2 w-[94%] -translate-x-1/2 rounded-xl border bg-white p-3 shadow-xl lg:hidden"
        >
          <SearchBox
            value={query}
            onChange={setQuery}
            onSubmit={handleSearchSubmit}
          />
        </div>
      )}

      {/* Mobile Sidebar */}
      {openMenu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpenMenu(false)}
          />

          <div className="absolute left-0 top-0 h-full w-[270px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-4">
              <span className="text-lg font-bold">Menu</span>

              <button
                onClick={() => setOpenMenu(false)}
                className="rounded-md p-2 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex flex-col border-b p-4 text-sm font-semibold uppercase">
              <Link className="rounded-lg px-2 py-3 hover:bg-gray-100" href="#">
                Men
              </Link>

              <Link className="rounded-lg px-2 py-3 hover:bg-gray-100" href="#">
                Women
              </Link>

              <Link className="rounded-lg px-2 py-3 hover:bg-gray-100" href="#">
                Teens
              </Link>

              <Link className="rounded-lg px-2 py-3 hover:bg-gray-100" href="#">
                Kids
              </Link>

              <Link className="rounded-lg px-2 py-3 hover:bg-gray-100" href="#">
                Sports
              </Link>
            </nav>

            <div className="flex flex-col gap-1 p-4 text-sm">
              {/* Keep your existing auth links here */}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
