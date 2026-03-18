"use client";

import React, { useState, useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

// Fetch function
const fetchBanners = async () => {
  const { data } = await axios.get("/api/banner/get");
  if (!data.success) throw new Error("Failed to fetch banners");
  return data.data;
};

const EmblaSlider = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState({});
  const [isHovered, setIsHovered] = useState(false);

  const DEFAULT_IMAGE = "/assets/banner1.png";

  // ✅ TanStack Query
  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["banners"],
    queryFn: fetchBanners,
    staleTime: 1000 * 60 * 5, // 5 min cache
    refetchOnWindowFocus: false,
  });

  const fallbackBanners = [
    {
      _id: "fallback-1",
      name: "Default Banner",
      mobileImage: { secure_url: DEFAULT_IMAGE },
      pcImage: { secure_url: DEFAULT_IMAGE },
    },
  ];

  const displayBanners = isLoading ? fallbackBanners : banners;

  // Embla controls
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index) => emblaApi?.scrollTo(index), [emblaApi]);

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

  // Autoplay
  useEffect(() => {
    if (!emblaApi || isHovered) return;
    const interval = setInterval(() => emblaApi.scrollNext(), 4000);
    return () => clearInterval(interval);
  }, [emblaApi, isHovered]);

  return (
    <div
      className="relative w-full overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {displayBanners.map((banner, index) => (
            <div className="flex-shrink-0 w-full" key={banner._id || index}>
              <div className="relative w-full">

                {/* ✅ Skeleton / progressive loading */}
                {!loadedImages[index] && (
                  <div className="absolute inset-0 animate-pulse bg-gray-300 z-10" />
                )}

                {/* Mobile */}
                <div className="block md:hidden relative w-full aspect-[16/9] p-2">
                  <Image
                    src={banner?.mobileImage?.secure_url || DEFAULT_IMAGE}
                    alt={banner.name || "Banner"}
                    fill
                    className="object-cover"
                    priority={index === 0} // only first image gets priority
                    onLoad={() =>
                      setLoadedImages((prev) => ({ ...prev, [index]: true }))
                    }
                  />
                </div>

                {/* Desktop */}
                <div className="hidden md:block relative w-full h-[250px] md:h-[400px] lg:h-[500px]">
                  <Image
                    src={banner?.pcImage?.secure_url || DEFAULT_IMAGE}
                    alt={banner.name || "Banner"}
                    fill
                    className="object-cover"
                    priority={index === 0} // only first image gets priority
                    onLoad={() =>
                      setLoadedImages((prev) => ({ ...prev, [index]: true }))
                    }
                  />
                </div>

              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Arrows */}
      <button
        onClick={scrollPrev}
        className="hidden md:block absolute left-4 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white rounded-full p-2 shadow z-20"
      >
        ◀
      </button>

      <button
        onClick={scrollNext}
        className="hidden md:block absolute right-4 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white rounded-full p-2 shadow z-20"
      >
        ▶
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm z-20">
        {displayBanners.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className={`transition-all duration-300 rounded-full ${
              selectedIndex === index ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default EmblaSlider;