"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ArrowRight, Check, Store, Warehouse } from "lucide-react";
import sbtMark from "@/public/assets/sbt-mark.png";

const STEPS = [
  { key: "from", icon: Warehouse },
  { key: "move", icon: ArrowRight },
  { key: "to", icon: Store },
  { key: "ready", icon: Check },
];

export default function BranchSwitchScreen({ from, to, onDone }) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const dur = 1500;
    let raf = 0;
    let finish;
    const tick = (now) => {
      const next = Math.min(100, ((now - start) / dur) * 100);
      setPct(next);
      if (next < 100) raf = requestAnimationFrame(tick);
      else finish = setTimeout(onDone, 280);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(finish);
    };
  }, [from, to, onDone]);

  const labels = [from, "Moving", to, "Ready"];
  const shown = Math.round(pct);

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#f7f6f3] px-4">
      <div className="w-full max-w-[420px] rounded-[28px] border border-black/5 bg-white px-8 py-9 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <span className="mx-auto flex size-[72px] items-center justify-center rounded-2xl bg-white shadow-[0_0_0_8px_rgba(224,65,94,0.08),0_10px_30px_rgba(224,65,94,0.18)]">
          <span className="relative size-12">
            <Image src={sbtMark} alt="SB Telecom" fill sizes="48px" className="object-contain" priority />
          </span>
        </span>

        <h2 className="mt-5 text-[22px] font-bold tracking-tight text-[#1a1a1a]">Switching branch</h2>
        <p className="mt-1 text-sm text-[#8b8b8b]">{from} to {to}</p>

        <div className="mt-5 flex items-center gap-2">
          <div className="flex w-[92px] shrink-0 flex-col items-center gap-1 rounded-2xl bg-[#fff1ea] px-2 py-2.5">
            <Warehouse className="size-5 text-[#ff6a1f]" />
            <span className="w-full truncate text-[11px] font-bold text-[#1a1a1a]">{from}</span>
          </div>
          <div className="relative h-8 min-w-0 flex-1">
            <span className="absolute top-1/2 right-0 left-0 -translate-y-1/2 border-t-2 border-dashed border-[#e10600]/45" />
            <span className="trip-dot absolute top-1/2 flex size-3.5 -translate-y-1/2 items-center justify-center rounded-full bg-[#e10600] shadow-[0_0_0_4px_rgba(225,6,0,0.15)]">
              <ArrowRight className="size-2.5 text-white" />
            </span>
          </div>
          <div className="flex w-[92px] shrink-0 flex-col items-center gap-1 rounded-2xl bg-[#e8f8ee] px-2 py-2.5">
            <Store className="size-5 text-[#1aa34a]" />
            <span className="w-full truncate text-[11px] font-bold text-[#1a1a1a]">{to}</span>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between text-sm font-semibold">
          <span className="truncate text-[#3a3a3a]">{from} to {to}</span>
          <span className="text-[#e10600]">{shown}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e6e6e6]">
          <div className="h-full rounded-full bg-[#e10600]" style={{ width: `${shown}%` }} />
        </div>

        <div className="mt-7 grid grid-cols-4 gap-2">
          {STEPS.map((step, i) => {
            const on = pct >= i * 25;
            const Icon = step.icon;
            return (
              <div key={step.key} className="flex flex-col items-center gap-1.5">
                <span
                  className={`flex size-11 items-center justify-center rounded-full ${
                    on ? "bg-[#e8f8ee] text-[#1aa34a]" : "bg-[#f3f3f3] text-[#b0b0b0]"
                  }`}
                >
                  <Icon className="size-5" />
                </span>
                <span className={`max-w-full truncate text-[11px] font-semibold ${on ? "text-[#1aa34a]" : "text-[#b0b0b0]"}`}>
                  {labels[i]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
