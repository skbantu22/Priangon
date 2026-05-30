import React, { useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import LightBox from "./LightBox";

const ProductGallery = ({
  galleryMedia = [],
  productName,
  activeIndex,
  setActiveIndex,
  onNext,
  onPrev,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    containScroll: "trimSnaps",
  });

  // Embla স্লাইড পরিবর্তন হলে প্যারেন্টের state আপডেট করার লজিক
  const onSelect = useCallback(() => {
    if (!emblaApi || typeof setActiveIndex !== "function") return;
    setActiveIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi, setActiveIndex]);

  useEffect(() => {
    if (!emblaApi) return;

    emblaApi.on("select", onSelect);
    onSelect(); // Initial sync

    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  // প্যারেন্ট থেকে activeIndex চেঞ্জ হলে (কালার/সাইজ ক্লিকে) Embla স্লাইডার মুভ করার লজিক
  useEffect(() => {
    if (!emblaApi || activeIndex === undefined) return;
    if (emblaApi.selectedScrollSnap() !== activeIndex) {
      emblaApi.scrollTo(activeIndex);
    }
  }, [emblaApi, activeIndex]);

  const scrollTo = (index) => {
    if (!emblaApi) return;
    emblaApi.scrollTo(index);
  };

  const nextImg = (e) => {
    e?.stopPropagation?.();

    if (typeof onNext === "function") {
      onNext();
    } else {
      emblaApi?.scrollNext();
    }
  };

  const prevImg = (e) => {
    e?.stopPropagation?.();

    if (typeof onPrev === "function") {
      onPrev();
    } else {
      emblaApi?.scrollPrev();
    }
  };

  // activeImg ভেরিয়েবল ব্যাকওয়ার্ড কম্পাটিবিলিটির জন্য প্রপ্স বা লোকাল স্টেট থেকে ডিফাইন করা
  const currentActiveIdx = activeIndex !== undefined ? activeIndex : 0;
  useEffect(() => {
    console.log("galleryMedia:", galleryMedia);
    console.log("productName:", productName);
    console.log("activeIndex:", activeIndex);
  }, [galleryMedia, productName, activeIndex]);
  return (
    <div className="flex flex-col md:flex-row gap-4 w-full">
      {/* ================= THUMBNAILS ================= */}
      <div className="order-2 md:order-1 flex md:flex-col flex-row gap-3 overflow-x-auto md:overflow-y-auto no-scrollbar md:w-20">
        {galleryMedia.map((m, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => scrollTo(idx)}
            className={`relative shrink-0 w-16 md:w-full aspect-[3/4] overflow-hidden border transition-all duration-200
              ${
                currentActiveIdx === idx
                  ? "border-black shadow-sm"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
          >
            <img
              src={m?.secure_url || m}
              alt={`thumb-${idx}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* ================= MAIN IMAGE ================= */}
      <div className="order-1 md:order-2 flex-1 relative bg-white">
        {/* viewport */}
        <div className="overflow-hidden aspect-[3/4] w-full" ref={emblaRef}>
          <div className="flex h-full">
            {galleryMedia.map((m, idx) => (
              <div
                key={idx}
                className="flex-[0_0_100%] relative h-full cursor-zoom-in"
                onClick={() => setIsOpen(true)}
              >
                <img
                  src={m?.secure_url || m}
                  alt={`${productName || "product"}-${idx}`}
                  className="w-full h-full object-contain"
                />
              </div>
            ))}
          </div>
        </div>

        {/* LEFT BUTTON */}
        <button
          type="button"
          onClick={prevImg}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow flex items-center justify-center hover:bg-red-500 hover:text-white transition z-10"
        >
          <ChevronLeft size={18} />
        </button>

        {/* RIGHT BUTTON */}
        <button
          type="button"
          onClick={nextImg}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow flex items-center justify-center hover:bg-red-500 hover:text-white transition z-10"
        >
          <ChevronRight size={18} />
        </button>

        {/* COUNTER */}
        <div className="absolute top-3 left-3 text-xs bg-white px-2 py-1 rounded shadow z-10 font-medium">
          {currentActiveIdx + 1} / {galleryMedia.length}
        </div>
      </div>

      {/* ================= LIGHTBOX ================= */}
      {isOpen && (
        <LightBox
          images={galleryMedia}
          activeIndex={currentActiveIdx}
          onClose={() => setIsOpen(false)}
          onNext={nextImg}
          onPrev={prevImg}
          onSelect={(idx) => scrollTo(idx)}
        />
      )}
    </div>
  );
};

export default ProductGallery;
