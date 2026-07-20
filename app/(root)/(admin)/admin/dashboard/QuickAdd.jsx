"use client";

import Link from "next/link";

import { BiCategory, BiImage, BiPurchaseTag } from "react-icons/bi";

import { IoShirtOutline } from "react-icons/io5";
import { MdOutlineAddPhotoAlternate } from "react-icons/md";

import {
  ADMIN_CATEGORY_ADD,
  ADMIN_MEDIA_SHOW,
  ADMIN_PRODUCT_ADD,
} from "@/Route/Adminpannelroute";

const actions = [
  {
    title: "Add Category",
    href: ADMIN_CATEGORY_ADD,
    icon: BiCategory,
    bg: "from-emerald-500 to-green-600",
  },
  {
    title: "Add Product",
    href: ADMIN_PRODUCT_ADD,
    icon: IoShirtOutline,
    bg: "from-blue-500 to-indigo-600",
  },
  {
    title: "Add Coupon",
    href: "#",
    icon: BiPurchaseTag,
    bg: "from-orange-500 to-red-500",
  },
  {
    title: "Upload Media",
    href: ADMIN_MEDIA_SHOW,
    icon: MdOutlineAddPhotoAlternate,
    bg: "from-violet-500 to-purple-600",
  },
];

export default function QuickAdd() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
      {actions.map((item) => {
        const Icon = item.icon;

        return (
          <Link key={item.title} href={item.href}>
            <div
              className={`
                bg-gradient-to-r
                ${item.bg}
                rounded-xl
                p-4
                shadow-md
                hover:shadow-xl
                hover:-translate-y-1
                transition-all
                duration-300
                flex
                items-center
                justify-between
                text-white
              `}
            >
              <div>
                <p className="text-sm opacity-90">Quick Action</p>

                <h3 className="font-semibold text-lg mt-1">{item.title}</h3>
              </div>

              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl">
                <Icon />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
