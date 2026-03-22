"use client";
import React from 'react';
import { LifeBuoy, RotateCcw, ShieldCheck } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';

const trustData = [
  {
    icon: <LifeBuoy size={30} strokeWidth={1.2} />,
    title: "Support 24/7",
    desc: "24-Hour Customer Support",
    sub: "We're here to help.",
    delay: "" 
  },
  {
    icon: <RotateCcw size={30} strokeWidth={1.2} />,
    title: "Return Policies",
    desc: "Simply return within 4 days",
    sub: "For an easy exchange.",
    delay: "[animation-delay:300ms]"
  },
  {
    icon: <ShieldCheck size={30} strokeWidth={1.2} />,
    title: "100% Payment Secure",
    desc: "Secure payment with SSL",
    sub: "Your data is protected.",
    delay: "[animation-delay:600ms]"
  }
];

export default function TrustSection() {
  // Mobile Slider logic
  const [emblaRef] = useEmblaCarousel({ 
    align: 'start', 
    containScroll: 'trimSnaps',
    breakpoints: { '(min-width: 1024px)': { active: false } } 
  });

  return (
    <section className="w-full bg-white border-t border-b border-zinc-50  py-2">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="overflow-hidden lg:overflow-visible" ref={emblaRef}>
          <div className="flex lg:grid lg:grid-cols-3 gap-10 lg:gap-0">
            
            {trustData.map((item, idx) => (
              <div 
                key={idx} 
                className="flex-[0_0_100%] min-w-0 lg:flex-1 flex flex-col items-center text-center group"
              >
                {/* ICON WITH SOFT BOUNCE & DELAY */}
                <div className={`mb-6 text-zinc-400 group-hover:text-black transition-colors duration-500 animate-soft-bounce ${item.delay}`}>
                  {item.icon}
                </div>

                {/* TEXT CONTENT */}
                <div className="space-y-1">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-900">
                    {item.title}
                  </h3>
                  <p className="text-[13px] text-zinc-500 font-medium">
                    {item.desc}
                  </p>
                  <p className="text-[11px] text-zinc-400 font-light italic">
                    {item.sub}
                  </p>
                </div>
              </div>
            ))}
            
          </div>
        </div>

        {/* MOBILE INDICATOR DOTS */}
        <div className="flex lg:hidden justify-center gap-2.5 mt-10">
           <div className="w-1.5 h-1.5 rounded-full bg-zinc-900"></div>
           <div className="w-1.5 h-1.5 rounded-full bg-zinc-200"></div>
           <div className="w-1.5 h-1.5 rounded-full bg-zinc-200"></div>
        </div>

      </div>
    </section>
  );
}