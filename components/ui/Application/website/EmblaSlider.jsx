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
  const scrollTo = useCallback(
    (index) => emblaApi?.scrollTo(index),
    [emblaApi],
  );

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
    // ... inside the return ...
    <div className="overflow-hidden" ref={emblaRef}>
      {/* Add 'flex' and 'touch-pan-y' for better mobile feel */}
      <div className="flex touch-pan-y ml-[-1rem]">
        {displayBanners.map((banner, index) => (
          /* Change: flex-none (flex: 0 0 100%) ensures the slide stays full width.
         Change: Added padding-left (pl-4) to create a gap between slides 
         without breaking the carousel offset math.
      */
          <div
            className="flex-none w-full pl-4 min-w-0"
            key={banner._id || index}
          >
            <div className="relative w-full overflow-hidden rounded-xl">
              {" "}
              {/* Added rounded for style */}
              {/* Skeleton */}
              {!loadedImages[index] && (
                <div className="absolute inset-0 animate-pulse bg-gray-200 z-10" />
              )}
              {/* Mobile Image Container */}
              <div className="block md:hidden relative aspect-[16/9]">
                <Image
                  src={banner?.mobileImage?.secure_url || DEFAULT_IMAGE}
                  alt={banner.name || "Banner"}
                  fill
                  className="object-cover transition-opacity duration-500"
                  style={{ opacity: loadedImages[index] ? 1 : 0 }}
                  priority={index === 0}
                  onLoad={() =>
                    setLoadedImages((prev) => ({ ...prev, [index]: true }))
                  }
                />
              </div>
              {/* Desktop Image Container */}
              <div className="hidden md:block relative h-[250px] md:h-[400px] lg:h-[500px]">
                <Image
                  src={banner?.pcImage?.secure_url || DEFAULT_IMAGE}
                  alt={banner.name || "Banner"}
                  fill
                  className="object-cover transition-opacity duration-500"
                  style={{ opacity: loadedImages[index] ? 1 : 0 }}
                  priority={index === 0}
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
  );
};

export default EmblaSlider;
