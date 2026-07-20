"use client";

import useFetch from "@/hooks/useFetch";
import {
  ADMIN_CATEGORY_SHOW,
  ADMIN_PRODUCT_SHOW,
} from "@/Route/Adminpannelroute";

import Link from "next/link";

import { BiCategory, BiPackage, BiCart, BiUser } from "react-icons/bi";

const cards = [
  {
    title: "Categories",
    key: "category",
    href: ADMIN_CATEGORY_SHOW,
    icon: BiCategory,
    color: "bg-emerald-500",
    border: "border-emerald-500",
  },
  {
    title: "Products",
    key: "product",
    href: ADMIN_PRODUCT_SHOW,
    icon: BiPackage,
    color: "bg-blue-500",
    border: "border-blue-500",
  },
  {
    title: "Orders",
    key: "order",
    href: "#",
    icon: BiCart,
    color: "bg-orange-500",
    border: "border-orange-500",
  },
  {
    title: "Customers",
    key: "customer",
    href: "#",
    icon: BiUser,
    color: "bg-violet-500",
    border: "border-violet-500",
  },
];

export default function CountOverview() {
  const { data: countData, loading } = useFetch("/api/dashboard/admin/count");

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Link key={card.key} href={card.href}>
            <div
              className={`
                bg-white
                border
                ${card.border}
                border-l-4
                rounded-xl
                p-4
                shadow-sm
                hover:shadow-lg
                transition-all
                duration-300
                hover:-translate-y-1
                flex
                items-center
                justify-between
              `}
            >
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  {card.title}
                </p>

                {loading ? (
                  <div className="mt-3 h-8 w-16 rounded bg-gray-200 animate-pulse" />
                ) : (
                  <h2 className="mt-2 text-2xl font-bold text-gray-800">
                    {countData?.data?.[card.key] ?? 0}
                  </h2>
                )}
              </div>

              <div
                className={`
                  w-14
                  h-14
                  rounded-xl
                  ${card.color}
                  text-white
                  flex
                  items-center
                  justify-center
                  text-2xl
                  shadow
                `}
              >
                <Icon />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
