"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  LayoutDashboard,
  Smartphone,
  ReceiptText,
  ShoppingCart,
  LogOut,
} from "lucide-react";
import { ToastContainer } from "react-toastify";
import { logout } from "@/store/reducer/authReducer";
import { showToast } from "@/lib/showToast";
import {
  PartnerCartProvider,
  usePartnerCart,
} from "@/components/ui/Application/Partner/PartnerCart";
import sbtMark from "@/public/assets/sbt-mark.png";
import { partnerMeQuery } from "@/lib/partnerQueries";

const NAV = [
  { href: "/partner", label: "Dashboard", icon: LayoutDashboard },
  { href: "/partner/products", label: "Products & Stock", icon: Smartphone },
  { href: "/partner/orders", label: "Orders & Invoices", icon: ReceiptText },
];

function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const cart = usePartnerCart();
  const { data: me } = useQuery(partnerMeQuery);

  const signOut = async () => {
    try {
      await axios.post("/api/auth/logout");
    } catch {
      // cookie may already be gone: still clear the local session
    }
    dispatch(logout());
    showToast("success", "Logged out");
    router.push("/auth/login");
  };

  const active = (href) =>
    href === "/partner" ? pathname === href : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 bg-sidebar text-white shadow-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link href="/partner" className="flex shrink-0 items-center gap-2.5">
          <span className="relative size-10 overflow-hidden rounded-xl bg-white">
            <Image src={sbtMark} alt="SB Telecom" fill sizes="40px" className="object-contain p-0.5" />
          </span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-lg font-extrabold">
              SB <span className="text-[#e0415e]">Telecom</span>
            </span>
            <span className="block text-[11px] text-white/70">Partner Portal</span>
          </span>
        </Link>

        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none]">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition ${
                active(href) ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10"
              }`}
            >
              <Icon className="size-4" />
              <span className="hidden md:inline">{label}</span>
            </Link>
          ))}
        </nav>

        <Link
          href="/partner/cart"
          className={`relative flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
            active("/partner/cart") ? "bg-white text-primary" : "bg-white/10 hover:bg-white/20"
          }`}
        >
          <ShoppingCart className="size-5" />
          <span className="hidden sm:inline">My Order</span>
          {cart?.count > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e0415e] px-1 text-[11px] font-bold text-white">
              {cart.count}
            </span>
          )}
        </Link>

        <div className="hidden text-right leading-tight lg:block">
          <p className="text-sm font-semibold">{me?.customer?.name || "…"}</p>
          <p className="text-[11px] text-white/70">{me?.typeLabel}</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          title="Log out"
          className="flex size-10 items-center justify-center rounded-lg hover:bg-white/10"
        >
          <LogOut className="size-5" />
        </button>
      </div>
    </header>
  );
}

export default function PartnerLayout({ children }) {
  // same purple theme as the admin panel (dialogs are portalled to <body>)
  useEffect(() => {
    document.body.classList.add("admin-theme");
    return () => document.body.classList.remove("admin-theme");
  }, []);

  return (
    <PartnerCartProvider>
      <div className="admin-theme min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </div>
      <ToastContainer />
    </PartnerCartProvider>
  );
}
