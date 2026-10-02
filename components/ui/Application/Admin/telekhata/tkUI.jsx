"use client";

import { ArrowLeft, Check, Minus, Plus } from "lucide-react";

// The look of the khata app: yellow app bar, blue action bars, grey cards.

// The phone app's type: Roboto for English and numbers, Noto Sans Bengali for Bangla
export const TK_FONT = { fontFamily: '"Roboto", "Noto Sans Bengali", "Hind Siliguri", system-ui, sans-serif' };

export const YELLOW = "#fdc82f";
export const BLUE = "#1b56d8";
export const RED = "#d9453c";
export const GREEN = "#2e9b4a";

export const blueBtn = "bg-[#1b56d8] text-white";

export function PdfIcon({ className = "size-9" }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
      <path d="M9 3h16l8 8v22a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z" stroke="#1b56d8" strokeWidth="2.4" />
      <path d="M25 3v8h8" stroke="#1b56d8" strokeWidth="2.4" />
      <path d="M19.5 12v10m0 0-4-4m4 4 4-4" stroke="#1b56d8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <text x="12" y="32" fontSize="8.5" fontWeight="800" fill="#1b56d8" fontFamily="Arial">
        PDF
      </text>
    </svg>
  );
}

export function HelpIcon({ className = "size-9" }) {
  return (
    <span className={`flex items-center justify-center rounded-full bg-[#1b56d8] text-[20px] font-bold text-white ${className}`}>?</span>
  );
}

export function DotsIcon() {
  return (
    <span className="flex h-9 w-7 flex-col items-center justify-center gap-[5px]" aria-hidden="true">
      <i className="block size-[5px] rounded-full bg-[#1b56d8]" />
      <i className="block size-[5px] rounded-full bg-[#1b56d8]" />
      <i className="block size-[5px] rounded-full bg-[#1b56d8]" />
    </span>
  );
}

// Yellow top bar: back arrow, title, and whatever icons the screen needs
export function AppBar({ title, onBack, children }) {
  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 px-3 py-3 shadow-[0_2px_4px_rgba(0,0,0,0.12)]" style={{ background: YELLOW }}>
      {onBack && (
        <button type="button" onClick={onBack} className="flex size-9 items-center justify-center rounded-full text-[#111] hover:bg-black/10" aria-label="ফিরে যান">
          <ArrowLeft className="size-6" strokeWidth={2.6} />
        </button>
      )}
      <h1 className="m-0 flex-1 text-[19px] font-medium text-[#111]">{title}</h1>
      <div className="flex items-center gap-3">{children}</div>
    </div>
  );
}

// Round on/off switch like the app's
export function Switch({ on, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-[22px] w-[46px] shrink-0 rounded-full transition disabled:opacity-60 ${on ? "bg-[#1b56d8]" : "bg-[#bdbdbd]"}`}
    >
      <span className={`absolute top-[-1px] size-6 rounded-full bg-white shadow transition-all ${on ? "left-[24px]" : "left-0"}`} />
    </button>
  );
}

// Bottom sheet (slides over the screen, dark backdrop)
export function BottomSheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55" onClick={onClose}>
      <div className="w-full max-w-xl rounded-t-xl bg-white p-4 pb-6 dark:bg-card" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="m-0 text-[17px] font-medium">{title}</h2>
          <button type="button" onClick={onClose} aria-label="বন্ধ করুন" className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-[#111] text-[16px] leading-none">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Page shell that keeps the content in a phone-width column
// Telekhata runs full screen like the phone app: it covers the admin top bar and menu
export function Screen({ children, className = "" }) {
  return (
    <div className="fixed inset-0 z-[45] overflow-y-auto bg-[#e9e9e9]" style={TK_FONT}>
      <div className={`relative mx-auto min-h-full max-w-xl bg-white shadow-xl dark:bg-background ${className}`}>{children}</div>
    </div>
  );
}

// Selectable product card: blue tint + side bar, a check on the picture, and a quantity stepper
export function PickCard({ on, qty, onToggle, onStep, image, children }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border-2 shadow-[0_2px_4px_rgba(0,0,0,0.14)] transition-all duration-200 ${
        on ? "border-[#1b56d8] bg-[#eaf1ff]" : "border-transparent bg-[#efefef]"
      }`}
    >
      {on && <span className="absolute inset-y-0 left-0 w-1.5 bg-[#1b56d8]" />}
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-4 p-3.5 text-left active:scale-[0.99]">
        <span className="relative shrink-0">
          {image}
          <span
            className={`absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full border-2 border-white bg-[#1b56d8] text-white shadow transition-transform duration-200 ${
              on ? "scale-100" : "scale-0"
            }`}
          >
            <Check className="size-3.5" strokeWidth={3.2} />
          </span>
        </span>
        <div className="min-w-0 flex-1">{children}</div>
      </button>
      {on && (
        <div className="flex items-center justify-between border-t border-[#1b56d8]/20 bg-white/70 px-3.5 py-2">
          <span className="text-[13px] font-medium text-[#1b56d8]">নির্বাচিত</span>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => onStep(-1)} className="flex size-9 items-center justify-center rounded-full bg-white text-[#1b56d8] shadow ring-1 ring-[#1b56d8]/30" aria-label="কমান">
              <Minus className="size-4" strokeWidth={3} />
            </button>
            <span className="min-w-7 text-center text-[18px] font-bold text-[#111]">{Number(qty || 1).toLocaleString("bn-BD")}</span>
            <button type="button" onClick={() => onStep(1)} className="flex size-9 items-center justify-center rounded-full bg-[#1b56d8] text-white shadow" aria-label="বাড়ান">
              <Plus className="size-4" strokeWidth={3} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
