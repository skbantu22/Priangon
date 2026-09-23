"use client";

import { useState } from "react";
import { MessageSquareText, Phone, X } from "lucide-react";

// Support number (Call + WhatsApp). Set NEXT_PUBLIC_SUPPORT_PHONE to change it.
const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE || "8801706126663";

const WhatsAppIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.32l-.34-.2-3.56.93.95-3.47-.22-.36a9.38 9.38 0 0 1-1.44-5.01c0-5.19 4.23-9.41 9.43-9.41 2.52 0 4.88.98 6.66 2.76a9.35 9.35 0 0 1 2.76 6.66c0 5.19-4.23 9.42-9.43 9.42m8.02-17.44A11.26 11.26 0 0 0 12.05.75C5.8.75.72 5.83.72 12.08c0 2 .52 3.95 1.52 5.66L.62 23.25l5.64-1.48a11.3 11.3 0 0 0 5.78 1.57h.01c6.25 0 11.33-5.08 11.34-11.33 0-3.03-1.18-5.87-3.32-8.01" />
  </svg>
);

// Floating support: a hint card ("call / WhatsApp for support") and a round
// button that opens Call + WhatsApp. The hint can be closed.
export default function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [hintHidden, setHintHidden] = useState(false);
  const hideHint = () => setHintHidden(true);

  const localNumber = `0${SUPPORT_PHONE.replace(/^880?/, "")}`;

  return (
    <div className="fixed right-4 bottom-4 z-[60] flex items-end gap-3 print:hidden">
      {!hintHidden && !open && (
        <div className="relative mb-1.5 hidden rounded-xl bg-[#1d1745] px-4 py-2.5 text-center text-white shadow-xl shadow-black/25 sm:block">
          <button
            type="button"
            onClick={hideHint}
            className="absolute -top-2.5 -right-2.5 flex size-6 items-center justify-center rounded-full bg-white text-gray-700 shadow ring-1 ring-black/10 hover:text-black"
            aria-label="Hide"
          >
            <X className="size-3.5" />
          </button>
          <p className="text-[13px] font-medium leading-tight">সাপোর্ট এর জন্যে</p>
          <p className="text-[14px] font-semibold leading-tight">Call/WhatsApp করুন 👉</p>
        </div>
      )}

      <div className="relative">
        {open && (
          <div className="absolute right-0 bottom-16 w-64 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-[#1b1436]">
            <div className="bg-gradient-to-r from-[#24135f] to-[#5b2ee0] px-4 py-3 text-white">
              <p className="text-sm font-semibold">SB Telecom Support</p>
              <p className="text-xs text-white/80">আমরা সাহায্য করতে প্রস্তুত</p>
            </div>
            <div className="space-y-2 p-3">
              <a
                href={`tel:+${SUPPORT_PHONE}`}
                className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-[#5b2ee0]/10 text-[#5b2ee0]">
                  <Phone className="size-4" />
                </span>
                <span className="text-sm">
                  <span className="block font-semibold text-gray-900 dark:text-white">Call</span>
                  <span className="text-xs text-gray-500 dark:text-gray-300">{localNumber}</span>
                </span>
              </a>
              <a
                href={`https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent("Hello SB Telecom, I need help.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-[#25d366]/15 text-[#128c4b]">
                  <WhatsAppIcon className="size-4.5" />
                </span>
                <span className="text-sm">
                  <span className="block font-semibold text-gray-900 dark:text-white">WhatsApp</span>
                  <span className="text-xs text-gray-500 dark:text-gray-300">Chat with us</span>
                </span>
              </a>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex size-14 items-center justify-center rounded-full bg-[#24135f] text-white shadow-xl shadow-[#24135f]/40 ring-4 ring-white transition hover:scale-105 dark:ring-[#0f0b1f]"
          aria-label={open ? "Close support" : "Support"}
          aria-expanded={open}
        >
          {open ? <X className="size-6" /> : <MessageSquareText className="size-6" />}
        </button>
      </div>
    </div>
  );
}
