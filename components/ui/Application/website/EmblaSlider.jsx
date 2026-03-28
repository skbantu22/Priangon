"use client";

import React, { useState, useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay"; // Install this: npm install embla-carousel-autoplay
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const fetchBanners = async () => {
  const { data } = await axios.get("/api/banner/get");
  if (!data.success) throw new Error("Failed to fetch banners");
  return data?.data || [];
};

const EmblaSlider = () => {
  // ✅ Autoplay Plugin is much safer than manual setInterval
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 4000, stopOnInteraction: false }),
  ]);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState({});

  const DEFAULT_IMAGE = "/assets/banner1.png";

  const {
    data: banners,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["banners"],
    queryFn: fetchBanners,
    staleTime: 1000 * 60 * 5,
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

  // ✅ Defensive check: Ensure we always have an array
  const displayBanners =
    Array.isArray(banners) && banners.length > 0 ? banners : fallbackBanners;

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  // If there's an error but no fallback, we return null to avoid crashing
  if (isError && !fallbackBanners) return null;

  return (
    <div className="relative group w-full overflow-hidden">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex touch-pan-y ml-[-1rem]">
          {displayBanners.map((banner, index) => (
            <div
              className="flex-none w-full pl-4 min-w-0"
              key={banner?._id || `banner-${index}`}
            >
              <div className="relative w-full overflow-hidden bg-gray-100">
                {!loadedImages[index] && (
                  <div className="absolute inset-0 animate-pulse bg-gray-200 z-10" />
                )}

                {/* Mobile Image */}
                <div className="block md:hidden relative aspect-[16/9]">
                  <Image
                    src={banner?.mobileImage?.secure_url || DEFAULT_IMAGE}
                    alt={banner?.name || "Banner"}
                    fill
                    sizes="100vw"
                    className={`object-cover transition-opacity duration-700 ${loadedImages[index] ? "opacity-100" : "opacity-0"}`}
                    priority={index === 0}
                    onLoadingComplete={() =>
                      setLoadedImages((prev) => ({ ...prev, [index]: true }))
                    }
                  />
                </div>

                {/* Desktop Image */}
                <div className="hidden md:block relative h-[250px] md:h-[400px] lg:h-[500px]">
                  <Image
                    src={banner?.pcImage?.secure_url || DEFAULT_IMAGE}
                    alt={banner?.name || "Banner"}
                    fill
                    sizes="100vw"
                    className={`object-cover transition-opacity duration-700 ${loadedImages[index] ? "opacity-100" : "opacity-0"}`}
                    priority={index === 0}
                    onLoadingComplete={() =>
                      setLoadedImages((prev) => ({ ...prev, [index]: true }))
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ... Navigation Arrows and Dots ... */}
    </div>
  );
};

export default EmblaSlider;
