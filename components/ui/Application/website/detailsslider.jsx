"use client";

import React, { useEffect, useState, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import SimilarProductBox from "./SimilarProductBox";

const DetailsSlider = ({ products = [] }) => {
  // 1. Prepare data first
  const displayProducts = products.slice(0, 10);
  const [scrollAmount, setScrollAmount] = useState(2);

  // 2. KEEP THIS HOOK SIMPLE.
  // Do NOT pass [scrollAmount] or [products] here.
  // The second argument must be an empty array [] or a constant list of plugins.
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: "start",
      duration: 30,
      slidesToScroll: 2, // Initial default
      containScroll: false,
    },
    [],
  ); // <--- Keep this empty or constant to avoid the "Size Changed" error

  // 3. Handle Resize
  useEffect(() => {
    const handleResize = () => {
      setScrollAmount(window.innerWidth >= 1024 ? 4 : 2);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 4. Update Embla behavior when scrollAmount or products change
  // This is the safe way to update without breaking React's hook rules
  useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit({
        slidesToScroll: scrollAmount,
        loop: displayProducts.length >= scrollAmount,
      });
    }
  }, [emblaApi, scrollAmount]); // Length of this array is ALWAYS 2 now.

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState([]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(
    () => emblaApi && emblaApi.scrollPrev(),
    [emblaApi],
  );
  const scrollNext = useCallback(
    () => emblaApi && emblaApi.scrollNext(),
    [emblaApi],
  );
  const scrollTo = useCallback(
    (index) => emblaApi && emblaApi.scrollTo(index),
    [emblaApi],
  );

  if (displayProducts.length === 0) return null;

  const arrowStyle = `
    absolute top-[35%] -translate-y-1/2 z-30
    w-8 h-8 md:w-8 md:h-8 bg-[#212121] text-white 
    flex items-center justify-center transition-all duration-500 
    hover:bg-red-600 active:bg-red-600  shadow-lg
  `;

  return (
    <div className="relative w-full group/slider">
      <div className="overflow-hidden py-10 -my-10" ref={emblaRef}>
        <div className="flex -ml-4">
          {displayProducts.map((p, i) => (
            <div
              key={`${p._id}-${i}`}
              className="flex-[0_0_50%] md:flex-[0_0_33.33%] lg:flex-[0_0_25%] pl-4 relative select-none"
            >
              <div className="transition-all duration-300 hover:z-50">
                <SimilarProductBox
                  product={p}
                  allVariants={p.allVariants || []}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={scrollPrev} className={`${arrowStyle} left-0`}>
        <span className="text-2xl md:text-4xl font-thin scale-y-125 mb-1">
          ‹
        </span>
      </button>

      <button onClick={scrollNext} className={`${arrowStyle} right-0`}>
        <span className="text-2xl md:text-4xl font-thin scale-y-125 mb-1">
          ›
        </span>
      </button>

      <div className="flex justify-center items-center gap-2 mt-12 mb-4">
        {scrollSnaps.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className={`transition-all duration-300 h-1.5 rounded-full ${
              index === selectedIndex ? "w-8 bg-[#212121]" : "w-2 bg-gray-400"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default DetailsSlider;
