import React, { useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import LightBox from './LightBox'; 

const ProductGallery = ({ galleryMedia = [], productName }) => {
  const [activeImg, setActiveImg] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true,
    align: 'start',
    containScroll: 'trimSnaps'
  });

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setActiveImg(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    emblaApi.reInit();
    return () => {
      if (emblaApi) emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  const nextImg = (e) => {
    e.stopPropagation();
    emblaApi?.scrollNext();
  };
  
  const prevImg = (e) => {
    e.stopPropagation();
    emblaApi?.scrollPrev();
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 w-full h-auto">
      
      {/* 1. THUMBNAILS SECTION (Now visible on mobile below main image) */}
      <div className="order-2 md:order-1 flex flex-row md:flex-col gap-3 overflow-x-auto md:overflow-y-auto no-scrollbar md:w-20 shrink-0 py-2 md:py-0">
        {galleryMedia.map((m, idx) => (
          <div
            key={idx}
            onClick={() => emblaApi?.scrollTo(idx)}
            className={`cursor-pointer border transition-all duration-200 aspect-[3/4] w-16 md:w-full shrink-0 overflow-hidden ${
              activeImg === idx ? "border-black" : "border-transparent opacity-70 hover:opacity-100"
            }`}
          >
            <img src={m?.secure_url} alt="thumb" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>

      {/* 2. MAIN VIEWPORT */}
      <div className="order-1 md:order-2 flex-1 relative group bg-[#f6f6f6] overflow-hidden aspect-[3/4] w-full min-h-[400px] md:min-h-0">
        
        <div className="overflow-hidden h-full w-full" ref={emblaRef}>
          <div className="flex h-full w-full">
            {galleryMedia.map((m, idx) => (
              <div 
                key={idx} 
                className="relative flex-[0_0_100%] min-w-0 h-full cursor-zoom-in"
                onClick={() => setIsOpen(true)}
              >
                <img 
                  src={m?.secure_url} 
                  className="w-full h-full object-cover md:object-contain" 
                  alt={`${productName} ${idx}`} 
                />
              </div>
            ))}
          </div>
        </div>

        {/* --- UPDATED BUTTONS: Visible on mobile, hover effect on desktop --- */}
        <button 
          onClick={prevImg}
          className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full border border-black/10 flex items-center justify-center bg-white/70 md:bg-white/50 transition-all md:opacity-0 md:group-hover:opacity-100 hover:bg-[#ff0000] hover:text-white hover:border-[#ff0000] z-10"
        >
          <ChevronLeft size={18} className="md:w-5 md:h-5" />
        </button>

        <button 
          onClick={nextImg}
          className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full border border-black/10 flex items-center justify-center bg-white/70 md:bg-white/50 transition-all md:opacity-0 md:group-hover:opacity-100 hover:bg-[#ff0000] hover:text-white hover:border-[#ff0000] z-10"
        >
          <ChevronRight size={18} className="md:w-5 md:h-5" />
        </button>
        {/* ----------------------------------------------------------------- */}

        {/* CLICK TO ENLARGE PILL */}
        <div 
          onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
          className="absolute bottom-6 right-6 bg-white flex items-center justify-center h-10 md:h-12 rounded-full shadow-lg border border-gray-100 cursor-pointer transition-all duration-500 hover:bg-[#ff0000] group/pill px-3 md:hover:px-6 w-auto overflow-hidden z-10"
        >
          <div className="flex items-center gap-0 md:group-hover/pill:gap-3 transition-all duration-500">
             <span className="text-[12px] md:text-[13px] font-medium text-white max-w-0 opacity-0 md:group-hover/pill:max-w-[120px] md:group-hover/pill:opacity-100 transition-all duration-500 whitespace-nowrap overflow-hidden">
              Click to enlarge
            </span>
            <Maximize2 size={18} className="text-gray-800 group-hover/pill:text-white transition-colors duration-300" />
          </div>
        </div>

        <div className="absolute top-6 left-6 text-[11px] font-bold tracking-widest text-gray-500 uppercase pointer-events-none">
          {activeImg + 1} / {galleryMedia.length}
        </div>
      </div>

      {/* LIGHTBOX MODAL */}
      {isOpen && (
        <LightBox 
          images={galleryMedia}
          activeIndex={activeImg}
          onClose={() => setIsOpen(false)}
          onNext={() => emblaApi?.scrollNext()}
          onPrev={() => emblaApi?.scrollPrev()}
          onSelect={(idx) => emblaApi?.scrollTo(idx)}
        />
      )}
    </div>
  );
};

export default ProductGallery;