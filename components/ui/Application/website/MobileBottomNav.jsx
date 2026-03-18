"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  LayoutGrid,
  ShoppingCart,
  MessageCircle,
  User,
} from "lucide-react";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/category", label: "Category", icon: LayoutGrid },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/login", label: "Login", icon: User },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
      {/* iPhone safe-area */}
      <div className="pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-14">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active =
              pathname === t.href ||
              pathname.startsWith(t.href + "/");

            return (
              <Link
                key={t.href}
                href={t.href}
                className={`relative flex flex-col items-center justify-center gap-1 text-[10px] transition-all duration-200 ${
                  active
                    ? "text-blue-600"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                <Icon
                  size={active ? 24 : 22}
                  strokeWidth={active ? 2.5 : 2}
                  className="transition-all duration-200"
                />
                <span
                  className={`leading-none ${
                    active ? "font-medium" : ""
                  }`}
                >
                  {t.label}
                </span>

                {/* Active indicator (Fabrilife touch) */}
                {active && (
                  <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-blue-600" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
