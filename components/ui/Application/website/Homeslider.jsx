"use client";

import React, { useState, useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import ProductBox from "./ProductBox";

const HomeSlider = ({ products = [] }) => {
  // Limit to 10 products so the dots don't get too crowded
  const displayProducts = products.slice(0, 50);

  const [scrollAmount, setScrollAmount] = useState(2);

  useEffect(() => {
    const handleResize = () => {
      // lg breakpoint (1024px): scroll 5 | Mobile: scroll 2
      setScrollAmount(window.innerWidth >= 1024 ? 5 : 2);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    slidesToScroll: scrollAmount,
    duration: 30,
    friction: 0.75,
  });

  const [isTouched, setIsTouched] = useState(false);
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

  if (!displayProducts.length) return null;

  const arrowBaseStyle = `
    pointer-events-auto w-7 md:w-8 h-7 md:h-8 bg-[#212121] text-white 
    flex items-center justify-center transition-all duration-500 
    hover:bg-red-600 z-30
  `;

  const visibilityClass = isTouched
    ? "opacity-100"
    : "opacity-0 group-hover/slider:opacity-100 lg:opacity-100";

  return (
    <div
      className="relative w-full max-w-[1500px] mx-auto group/slider"
      onTouchStart={() => setIsTouched(true)}
    >
      {/* Viewport */}
      <div className="overflow-hidden py-2" ref={emblaRef}>
        <div className="flex -ml-4">
          {displayProducts.map((p, index) => (
            <div
              key={`${p._id}-${index}`}
              className="flex-[0_0_50%] md:flex-[0_0_33.33%] lg:flex-[0_0_20%] pl-2 md:pl-4 select-none"
            >
              <div className="relative group/card h-full transition-all duration-500 hover:z-20">
                <ProductBox product={p} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* NAVIGATION */}
      <div className="absolute top-[27%] md:top-[35%] left-0 right-0 flex justify-between items-center pointer-events-none px-0">
        <button
          onClick={scrollPrev}
          className={`${arrowBaseStyle} ${visibilityClass}`}
        >
          <span className="text-2xl md:text-3xl font-thin scale-y-120 mb-1">
            ‹
          </span>
        </button>
        <button
          onClick={scrollNext}
          className={`${arrowBaseStyle} ${visibilityClass}`}
        >
          <span className="text-2xl md:text-3xl font-thin scale-y-120 mb-1">
            ›
          </span>
        </button>
      </div>

      {/* PAGINATION DOTS */}
      <div className="flex justify-center items-center space-x-2 mt-2 md:hidden">
        {scrollSnaps.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className={`transition-all duration-300 h-1.5 rounded-sm ${
              index === selectedIndex ? "w-8 bg-[#212121]" : "w-2 bg-gray-400"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default HomeSlider;
