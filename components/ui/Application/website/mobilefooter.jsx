"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Plus, Minus } from "lucide-react";

const footerData = [
  { 
    title: "Get in touch", 
    links: [{ label: "Contact Us", href: "/contact" }] 
  },
  { 
    title: "Policies", 
    links: [
      { label: "Mission & Vision", href: "/mission" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Return/Exchange & Refund", href: "/returns" },
      { label: "Shipping Policy", href: "/shipping" },
      { label: "Terms & Conditions", href: "/terms" },
    ] 
  },
  { 
    title: "Quick Link", 
    links: [
      { label: "Home", href: "/" }, 
      { label: "Shop", href: "/shop" }, 
      { label: "Sitemap", href: "/pages/sitemap" }
    ] 
  },
  { 
    title: "Newsletter Signup", 
    links: [{ label: "Subscribe to our emails", href: "#" }] 
  },
];

// Types removed for .jsx compatibility
const FooterSection = ({ title, links }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-zinc-800 lg:border-none">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-5 text-left focus:outline-none lg:cursor-default lg:py-0"
      >
        <span className="text-[15px] font-bold uppercase tracking-wider text-white">
          {title}
        </span>
        <span className="lg:hidden text-zinc-400">
          {isOpen ? <Minus size={18} /> : <Plus size={18} />}
        </span>
      </button>

      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-96 pb-5" : "max-h-0"} lg:max-h-none lg:block lg:mt-6`}>
        <ul className="space-y-3">
          {links.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className="text-zinc-400 hover:text-white transition-colors text-[14px] font-medium"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default function MobileFooter() {
  const [isBouncing, setIsBouncing] = useState(false);

  const handleLogoClick = () => {
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 600);
  };

  return (
    <footer className="bg-[#0f0f0f] text-white pt-16 pb-8 px-6 lg:px-16 border-t border-zinc-900">
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-12">
          <div 
            onClick={handleLogoClick}
            className={`inline-block cursor-pointer select-none transition-transform duration-500 ${isBouncing ? "animate-bounce" : ""}`}
          >
            <h2 className="text-3xl font-black italic tracking-tighter">KLOTHEN.</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-x-12">
          {footerData.map((section) => (
            <FooterSection 
              key={section.title} 
              title={section.title} 
              links={section.links} 
            />
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-zinc-900 text-center text-zinc-600 text-[11px]">
          © {new Date().getFullYear()} KLOTHEN SHOP. POWERED BY NEXT.JS
        </div>
      </div>
    </footer>
  );
}