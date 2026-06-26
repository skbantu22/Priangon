"use client";

import React from "react";
import { X } from "lucide-react";
import Image from "next/image";
import UploadMedia from "./UploadMedia"; // Path to your existing component

export default function ImageUploadManager({ queryClient, images, setImages }) {
  const removeImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="bg-white p-6 border-2 border-black space-y-4">
      <h3 className="text-xs font-black uppercase text-black tracking-wider">
        Product Gallery Images *
      </h3>

      <div className="flex flex-wrap gap-4 items-start">
        {/* Your Existing Upload Component Built Right In */}
        <div className="flex-shrink-0">
          <UploadMedia
            queryClient={queryClient}
            selectedMedia={images}
            setSelectedMedia={setImages}
            isMultiple={true}
          />
        </div>

        {/* Uploaded Gallery Grid Items Matrix */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {images.map((img, idx) => {
            const displayUrl = img.secure_url || img.url;
            return (
              <div
                key={img._id || idx}
                className="relative border-2 border-black w-[160px] h-[200px] bg-zinc-50 group overflow-hidden"
              >
                <Image
                  src={displayUrl}
                  alt={`gallery-preview-${idx}`}
                  fill
                  className="object-cover"
                />
                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-2 right-2 bg-black text-white p-1 hover:bg-zinc-800 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
