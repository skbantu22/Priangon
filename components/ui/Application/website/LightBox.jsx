import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, Maximize, Share2 } from 'lucide-react';

const LightBox = ({ images, activeIndex, onClose, onNext, onPrev, onSelect }) => {
  const [isZoomed, setIsZoomed] = useState(false);

  // Function to handle the native share API
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Product Image',
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  // Toggle Fullscreen mode
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col select-none transition-all duration-300">
      {/* 1. Header Tools - Functional Icons */}
      <div className="flex justify-between items-center p-4 text-white bg-black/50 z-20">
        <div className="text-[13px] font-medium tracking-widest">
          {activeIndex + 1} / {images.length}
        </div>
        <div className="flex gap-6 items-center">
          <ZoomIn 
            size={22} 
            onClick={() => setIsZoomed(!isZoomed)}
            className={`cursor-pointer transition-colors ${isZoomed ? 'text-blue-400' : 'hover:text-gray-400'}`} 
          />
          <Maximize 
            size={20} 
            onClick={toggleFullScreen}
            className="cursor-pointer hover:text-gray-400" 
          />
          <Share2 
            size={20} 
            onClick={handleShare}
            className="cursor-pointer hover:text-gray-400" 
          />
          <button 
            onClick={onClose} 
            className="ml-4 p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={28} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* 2. Main Image Area - Navigation and Zoom Logic */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {/* Navigation Arrows - Hidden if zoomed in */}
        {!isZoomed && (
          <>
            <button 
              onClick={(e) => { e.stopPropagation(); onPrev(); }} 
              className="absolute left-6 z-20 p-3 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-all"
            >
              <ChevronLeft size={40} strokeWidth={1} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onNext(); }} 
              className="absolute right-6 z-20 p-3 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-all"
            >
              <ChevronRight size={40} strokeWidth={1} />
            </button>
          </>
        )}
        
        {/* The Main Image */}
        <div 
          className={`transition-transform duration-300 ease-in-out ${isZoomed ? 'scale-150 cursor-zoom-out' : 'scale-100 cursor-zoom-in'}`}
          onClick={() => setIsZoomed(!isZoomed)}
        >
          <img 
            src={images[activeIndex]?.secure_url} 
            className="max-h-[80vh] max-w-[95vw] object-contain shadow-2xl"
            alt="Product view"
          />
        </div>
      </div>

      {/* 3. Footer Thumbnails - Matching your exact screenshot style */}
      <div className="h-32 bg-black/80 flex justify-center items-center gap-3 px-4 pb-6 overflow-x-auto no-scrollbar z-10">
        {images.map((img, i) => (
          <button 
            key={i}
            onClick={() => {
              setIsZoomed(false);
              onSelect(i); // This updates the state in the parent ProductGallery
            }}
            className={`relative h-20 aspect-[3/4] shrink-0 overflow-hidden border-2 transition-all duration-200 ${
              i === activeIndex ? 'border-white opacity-100 scale-105' : 'border-transparent opacity-40 hover:opacity-70'
            }`}
          >
            <img 
              src={img.secure_url}
              className="w-full h-full object-cover"
              alt={`Gallery thumb ${i}`}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default LightBox;