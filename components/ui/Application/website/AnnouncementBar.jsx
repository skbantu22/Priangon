"use client";

import React, { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight } from "lucide-react";

const announcements = [
  "New collection available now",
  "New arrivals every week",
];

export default function AnnouncementBar() {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: "center",
    },
    [
      Autoplay({
        delay: 4000,
        stopOnInteraction: false,
      }),
    ],
  );

  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    emblaApi.on("select", onSelect);
    onSelect();

    return () => emblaApi.off("select", onSelect);
  }, [emblaApi, onSelect]);

  return (
    <div className="bg-black text-white h-10">
      <div className="max-w-2xl mx-auto h-full flex items-center justify-center gap-4 px-4">
        {/* Left Arrow */}
        <button
          onClick={() => emblaApi?.scrollPrev()}
          className="flex-shrink-0 hover:opacity-70 transition"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Slider */}
        <div className="overflow-hidden flex-1" ref={emblaRef}>
          <div className="flex">
            {announcements.map((text, index) => (
              <div
                key={index}
                className="flex-[0_0_100%] flex items-center justify-center"
              >
                <span className="text-xs md:text-sm tracking-widest font-medium text-center">
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => emblaApi?.scrollNext()}
          className="flex-shrink-0 hover:opacity-70 transition"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
