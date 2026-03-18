"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Mail,
  Phone,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  Music2,
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#5f5f5f] text-white">
      <div className="mx-auto w-full max-w-[1400px] px-4 md:px-8 py-10">
        {/* GRID: 3 columns on desktop, stack on mobile */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3 lg:gap-16">
          {/* LEFT */}
          <div className="space-y-6">
            {/* Logo */}
            <div className="flex items-start gap-3">
              {/* Replace with your logo */}
              <div className="relative h-10 w-10">
                {/* If you have an actual logo image, use it:
                  <Image src="/logo.svg" alt="Logo" fill className="object-contain" />
                */}
                <div className="h-10 w-10 rounded bg-white/10 flex items-center justify-center">
                  <div className="h-6 w-6 rotate-45 border-2 border-white/70" />
                </div>
              </div>
            </div>

            {/* Links */}
            <ul className="space-y-2 text-sm text-white/90">
              <li>
                <Link className="hover:text-white" href="#">
                  About Fabrilife
                </Link>
              </li>
              <li>
                <Link className="hover:text-white" href="/terms-and-condition">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link className="hover:text-white" href="#">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link className="hover:text-white" href="#">
                  Cancellation &amp; Return Policy
                </Link>
              </li>
              <li>
                <Link className="hover:text-white" href="#">
                  FAQs
                </Link>
              </li>
              <li>
                <Link className="hover:text-white" href="#">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* MIDDLE */}
          <div className="space-y-8">
            {/* Newsletter */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold tracking-wide">
                <Mail className="h-4 w-4 text-orange-400" />
                <span>GET SPECIAL DISCOUNTS IN YOUR INBOX</span>
              </div>

              <div className="flex w-full items-center gap-3 border-b border-white/30 pb-2">
                <input
                  type="email"
                  placeholder="Enter email to get offers, discounts and more."
                  className="w-full bg-transparent text-sm placeholder:text-white/50 outline-none"
                />
                <button className="shrink-0 rounded bg-[#f0b24a] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                  Subscribe
                </button>
              </div>
            </div>

            {/* Help */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold tracking-wide">
                <Phone className="h-4 w-4 text-orange-400" />
                <span>FOR ANY HELP YOU MAY CALL US AT</span>
              </div>

              <div className="text-sm text-white/80">+8801799488476</div>
              <div className="text-sm font-semibold text-white/90">
                Customer Service
              </div>
              <p className="text-sm text-white/70">
                Track your order or get help returning an order
              </p>
            </div>
          </div>

          {/* RIGHT */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-wide">
              <span className="text-orange-400">✔</span>
              <span>FOLLOW US</span>
            </div>

            <p className="max-w-sm text-sm text-white/80">
              Stay updated on our latest arrivals, exclusive promotions and
              events.
            </p>

            {/* Social Icons */}
            <div className="flex flex-wrap items-center gap-5 text-white">
              <Link href="#" aria-label="Instagram" className="hover:opacity-80">
                <Instagram className="h-5 w-5" />
              </Link>
              <Link href="#" aria-label="TikTok" className="hover:opacity-80">
                <Music2 className="h-5 w-5" />
              </Link>
              <Link href="#" aria-label="Facebook" className="hover:opacity-80">
                <Facebook className="h-5 w-5" />
              </Link>
              <Link href="#" aria-label="X" className="hover:opacity-80">
                <Twitter className="h-5 w-5" />
              </Link>
              <Link href="#" aria-label="Pinterest" className="hover:opacity-80">
                {/* simple P icon */}
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/60 text-[11px] font-bold">
                  P
                </span>
              </Link>
              <Link href="#" aria-label="YouTube" className="hover:opacity-80">
                <Youtube className="h-5 w-5" />
              </Link>
            </div>

            {/* Facebook Like Box (UI mock) */}
            <div className="w-full max-w-[420px] rounded-xl bg-white/95 p-4 text-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-bold">
                  f
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold">Priangone</div>
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">
                      ✓
                    </span>
                    <button className="ml-auto rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                      Follow
                    </button>
                  </div>
                  <div className="text-xs text-slate-600">
                    902K followers • 1 following
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Floating chat button */}
      <button
        aria-label="Chat"
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#2aa7ff] text-white shadow-lg hover:opacity-90"
      >
        {/* simple chat bubble */}
        <span className="text-lg">💬</span>
      </button>
    </footer>
  );
}
