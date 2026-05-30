"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  Share2,
} from "lucide-react";

const LightBox = ({
  images = [],
  activeIndex = 0,
  onClose,
  onNext,
  onPrev,
  onSelect,
}) => {
  const [isZoomed, setIsZoomed] = useState(false);

  // ================= NORMALIZE IMAGES =================
  const normalizedImages = images.map((img) =>
    typeof img === "string" ? img : img?.secure_url,
  );

  // ================= ESC KEY CLOSE =================
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();

      if (e.key === "ArrowRight") {
        onNext?.();
      }

      if (e.key === "ArrowLeft") {
        onPrev?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, onNext, onPrev]);

  // ================= SHARE =================
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Product",
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Link copied!");
      }
    } catch (err) {
      console.log(err);
    }
  };

  // ================= FULLSCREEN =================
  const toggleFullScreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.log(err);
    }
  };

  // ================= SAFETY =================
  const currentImage = normalizedImages[activeIndex];

  if (!currentImage) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-black flex flex-col">
      {/* ================= HEADER ================= */}
      <div className="h-16 shrink-0 flex items-center justify-between px-4 md:px-6 bg-black/60 backdrop-blur-md border-b border-white/10">
        <div className="text-white text-sm tracking-wider font-medium">
          {activeIndex + 1} / {normalizedImages.length}
        </div>

        <div className="flex items-center gap-2 md:gap-4 text-white">
          {/* Zoom */}
          <button
            type="button"
            onClick={() => setIsZoomed((prev) => !prev)}
            className="p-2 rounded-full hover:bg-white/10 transition"
          >
            {isZoomed ? <ZoomOut size={20} /> : <ZoomIn size={20} />}
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={toggleFullScreen}
            className="p-2 rounded-full hover:bg-white/10 transition"
          >
            <Maximize size={19} />
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={handleShare}
            className="p-2 rounded-full hover:bg-white/10 transition"
          >
            <Share2 size={19} />
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-red-500 transition"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* ================= MAIN IMAGE ================= */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {/* LEFT */}
        {!isZoomed && (
          <button
            type="button"
            onClick={() => onPrev?.()}
            className="absolute left-3 md:left-6 z-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white hover:text-black transition"
          >
            <ChevronLeft size={28} />
          </button>
        )}

        {/* IMAGE */}
        <div
          onClick={() => setIsZoomed((prev) => !prev)}
          className={`transition-transform duration-300 ${
            isZoomed ? "scale-150 cursor-zoom-out" : "scale-100 cursor-zoom-in"
          }`}
        >
          <img
            src={currentImage}
            alt={`product-${activeIndex}`}
            className="max-h-[82vh] max-w-[95vw] object-contain"
          />
        </div>

        {/* RIGHT */}
        {!isZoomed && (
          <button
            type="button"
            onClick={() => onNext?.()}
            className="absolute right-3 md:right-6 z-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white hover:text-black transition"
          >
            <ChevronRight size={28} />
          </button>
        )}
      </div>

      {/* ================= THUMBNAILS ================= */}
      <div className="h-28 md:h-32 shrink-0 bg-black/90 border-t border-white/10">
        <div className="h-full flex items-center justify-center gap-3 overflow-x-auto no-scrollbar px-4">
          {normalizedImages.map((img, idx) => {
            const isActive = idx === activeIndex;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setIsZoomed(false);
                  onSelect?.(idx);
                }}
                className={`
                  relative shrink-0 
                  h-20 md:h-24 
                  aspect-[3/4] 
                  overflow-hidden 
                  rounded-md
                  border transition-all duration-300
                  ${
                    isActive
                      ? "border-white scale-105 opacity-100"
                      : "border-white/10 opacity-40 hover:opacity-80"
                  }
                `}
              >
                <img
                  src={img}
                  alt={`thumb-${idx}`}
                  className="w-full h-full object-cover"
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LightBox;
