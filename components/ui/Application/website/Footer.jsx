"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Plus, Minus, MapPinned, PhoneCall, MailOpen } from "lucide-react";

const footerData = [
  {
    title: "Contact Us",
    links: [
      {
        label: "📍 House 25, Road 10, Sector 4, Uttara, Dhaka",
        href: "#",
      },
      {
        label: "📞 01400209876",
        href: "tel:01400209876",
      },
      {
        label: "✉️ minithailand@gmail.com",
        href: "mailto:minithailand@gmail.com",
      },
    ],
  },
  {
    title: "Policies",
    links: [
      { label: "Track Order", href: "/track-order" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Return/Exchange & Refund", href: "/returns" },
      { label: "Shipping Policy", href: "/shipping" },
      { label: "Terms & Conditions", href: "/terms" },
    ],
  },
  {
    title: "Quick Link",
    links: [
      { label: "Home", href: "/" },
      { label: "Shop", href: "/shop" },
      { label: "Sitemap", href: "/pages/sitemap" },
    ],
  },
  {
    title: "Newsletter Signup",
    links: [{ label: "Subscribe to our emails", href: "#" }],
  },
];

const FooterSection = ({ title, links }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-zinc-800/40 lg:border-none mt-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-3.5 text-left focus:outline-none lg:cursor-default lg:py-0"
      >
        <span className="text-[13px] md:text-lg font-bold uppercase tracking-[0.1em] text-white">
          {title}
        </span>
        <span className="lg:hidden text-zinc-500">
          {isOpen ? <Minus size={14} /> : <Plus size={14} />}
        </span>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-96 pb-5" : "max-h-0"
        } lg:max-h-none lg:block lg:mt-5`}
      >
        {title === "Contact Us" ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 text-zinc-400 text-[13px]">
              <MapPinned size={18} className="text-red-600 mt-0.5 shrink-0" />
              <span>House 25, Road 10, Sector 4, Uttara, Dhaka</span>
            </div>

            <a
              href="tel:01400209876"
              className="flex items-center gap-3 text-zinc-400 hover:text-red-600 transition-colors text-[13px]"
            >
              <PhoneCall size={18} className="text-red-600 shrink-0" />
              <span>01400209876</span>
            </a>

            <a
              href="mailto:minithailand@gmail.com"
              className="flex items-center gap-3 text-zinc-400 hover:text-red-600 transition-colors text-[13px]"
            >
              <MailOpen size={18} className="text-red-600 shrink-0" />
              <span>minithailand@gmail.com</span>
            </a>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {links.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="text-zinc-400 hover:text-red-600 transition-colors duration-200 text-[13px]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default function MobileFooter() {
  return (
    <div className="mt-1 lg:mt-5">
      <footer className="bg-[#0a0a0a] text-white pt-10 pb-8 px-6 lg:px-16 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto">
          {/* Main Links Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-x-12">
            {footerData.map((section) => (
              <FooterSection
                key={section.title}
                title={section.title}
                links={section.links}
              />
            ))}
          </div>

          {/* Credits Section */}
        </div>
      </footer>
      <div className="w-full border-t border-gray-100 ">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-gray-500 text-[13px] leading-relaxed">
            Copyright © 2026{" "}
            <span className="text-red-600 font-bold uppercase">Priangon</span>{" "}
            all reserved SKb Antu.
            <br />
            Powered by{" "}
            <span className="text-red-600 font-bold uppercase">
              Ecommarce Solution BD 01619421979
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
