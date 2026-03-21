"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { useRouter, usePathname } from "next/navigation";
import { Home, MessageCircle, User } from "lucide-react";
import Cart from "@/components/ui/Application/website/cart";
import { Avatar, AvatarImage } from "../../avatar";
import userIcon from "@/public/assets/user.png";
import SearchBox from "../Admin/SearchBox";
import { USER_DASHBOARD, WEBSITE_LOGIN } from "@/Route/Websiteroute";

export default function MobileBottomNav() {
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();
  const auth = useSelector((store) => store.authStore.auth);

  const handleSearchSubmit = () => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    router.push(`/shop?${params.toString()}`);
    setShowMobileSearch(false);
  };

  // Close search when clicking outside
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

  const isActive = (href) => pathname === href || pathname.startsWith(href + "/");
  const navItem = "flex flex-col items-center justify-center text-[11px] gap-[2px] transition";

  return (
    <>
      {/* Mobile Search Dropdown */}
      {showMobileSearch && (
        <div
          ref={searchRef}
          className="fixed inset-x-4 top-0 z-50 mt-14 bg-white p-2 shadow-md rounded-md"
        >
          <SearchBox
            value={query}
            onChange={setQuery}
            onSubmit={handleSearchSubmit}
            placeholder="Search entire store..."
          />
        </div>
      )}

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
        <div className="pb-[env(safe-area-inset-bottom)]">
          <div className="flex justify-around items-center h-14">
            
            {/* Home */}
            <Link
              href="/"
              className={`${navItem} ${isActive("/") ? "text-black" : "text-gray-500"}`}
            >
              <Home size={isActive("/") ? 24 : 22} />
              <span>Home</span>
            </Link>

            {/* Cart */}
            <div className={navItem}>
              <Cart active={isActive("/cart")} />
              <span>Cart</span>
            </div>

            {/* Search */}
            <button
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              className={navItem}
            >
              <MessageCircle size={22} />
              <span>Search</span>
            </button>

            {/* Account */}
            {!auth ? (
              <Link href={WEBSITE_LOGIN} className={navItem}>
                <User size={22} />
                <span>Profile</span>
              </Link>
            ) : (
              <Link href={USER_DASHBOARD} className={navItem}>
                <Avatar className="h-5 w-5">
                  <AvatarImage src={auth?.avatar?.url || userIcon.src} />
                </Avatar>
                <span>Account</span>
              </Link>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}