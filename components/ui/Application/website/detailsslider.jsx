import React, { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import SimilarProductBox from "./SimilarProductBox";

const DetailsSlider = ({ products = [] }) => {
  console.log("Products:", products);
  const [emblaRef, embla] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = () => embla && embla.scrollPrev();
  const scrollNext = () => embla && embla.scrollNext();

  useEffect(() => {
    if (!embla) return;

    const onSelect = () => {
      setSelectedIndex(embla.selectedScrollSnap());
    };

    embla.on("select", onSelect);

    return () => {
      embla.off("select", onSelect);
    };
  }, [embla]);

  return (
    <div className="relative">
      {/* Embla Viewport */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-6">
          {products.length > 0 ? (
            products.map((p) => (
              <div
                key={p._id}
                className="flex-shrink-0 w-[180px] sm:w-[220px] md:w-[280px] transition-transform hover:scale-105"
              >
                <SimilarProductBox
                  product={p}
                  allVariants={p.allVariants || []}
                />
              </div>
            ))
          ) : (
            <p className="text-center text-gray-400 w-full">
              No similar products found.
            </p>
          )}
        </div>
      </div>

      {/* Left Arrow */}
      <button
        onClick={scrollPrev}
        className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-gray-400 bg-white text-gray-700 text-xl hover:bg-red-500 hover:text-white hover:border-red-500 z-10"
      >
        ‹
      </button>

      {/* Right Arrow */}
      <button
        onClick={scrollNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-gray-400 bg-white text-gray-700 text-xl hover:bg-red-500 hover:text-white hover:border-red-500 z-10"
      >
        ›
      </button>

      {/* Dots (Mobile Only) */}
<div className="flex justify-center gap-2 mt-4 md:hidden">
  {products.map((_, index) => (
    <button
      key={index}
      onClick={() => embla && embla.scrollTo(index)}
      className={`transition-all duration-300 rounded-full ${
        index === selectedIndex
          ? "w-6 h-2 bg-black"
          : "w-2 h-2 bg-gray-300"
      }`}
    />
  ))}
</div>
    </div>
  );
};

export default DetailsSlider;