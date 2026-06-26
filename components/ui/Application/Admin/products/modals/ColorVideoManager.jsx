"use client";

import React from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { sizes } from "@/lib/utils";
import Image from "next/image";
import UploadMedia from "../../uploadmedia"; // আপনার সঠিক ফাইল পাথ নিশ্চিত করুন

export default function ColorVideoManager({
  selectedSize,
  setSelectedSize,
  selectedColors,
  setSelectedColors,
  videoLinks,
  setVideoLinks,
  colorPool = [],

  onGenerate,
  colorImages, // VariantManager থেকে আসা স্টেট অবজেক্ট {}
  setColorImages, // VariantManager থেকে আসা স্টেট সেটার
  queryClient,
}) {
  const handleColorSelect = (color) => {
    if (!color) return;
    if (!selectedColors.includes(color)) {
      setSelectedColors([...selectedColors, color]);
      setVideoLinks((prev) => ({ ...prev, [color]: [""] }));
      setColorImages((prev) => ({ ...prev, [color]: [] }));
    }
  };

  const removeColor = (color) => {
    setSelectedColors(selectedColors.filter((c) => c !== color));

    const updatedLinks = { ...videoLinks };
    delete updatedLinks[color];
    setVideoLinks(updatedLinks);

    const updatedImgs = { ...colorImages };
    delete updatedImgs[color];
    setColorImages(updatedImgs);
  };

  const addVideoLinkField = (color) => {
    setVideoLinks((prev) => ({
      ...prev,
      [color]: [...(prev[color] || []), ""],
    }));
  };

  const removeVideoLinkField = (color, index) => {
    setVideoLinks((prev) => {
      const current = [...prev[color]];
      current.splice(index, 1);
      return { ...prev, [color]: current };
    });
  };

  const updateVideoLinkValue = (color, index, value) => {
    setVideoLinks((prev) => {
      const current = [...prev[color]];
      current[index] = value;
      return { ...prev, [color]: current };
    });
  };

  const removeColorImage = (color, imgIdx) => {
    setColorImages((prev) => ({
      ...prev,
      [color]: (prev[color] || []).filter((_, idx) => idx !== imgIdx),
    }));
  };

  return (
    <div className="bg-white p-6 border-2 border-black space-y-6 font-sans">
      {/* 🎨 প্রতিটি কালারের জন্য ইমেজ আপলোড ও ভিডিও লিংক রো (স্ক্রিনশটের লেআউট অনুসারে) */}
      <div className="space-y-4">
        {selectedColors.map((color) => (
          <div
            key={color}
            className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start border-b border-zinc-100 pb-4"
          >
            {/* ১. কালার ডিসপ্লে বক্স (৩ কলাম) */}
            <div className="md:col-span-3">
              <label className="text-[10px] font-black uppercase text-gray-700 block mb-1">
                Colors *
              </label>
              <div className="flex items-center justify-between h-10 border border-black px-3 bg-white">
                <span className="text-sm font-medium">{color}</span>
              </div>
            </div>

            {/* ২. চমত্কার ছোট ইমেজ আপলোডার বাটন ও প্রিভিউ এরিয়া (৪ কলাম) */}
            <div className="md:col-span-4">
              <label className="text-[10px] font-black uppercase text-gray-700 block mb-1">
                Variant Images
              </label>
              <div className="flex flex-wrap gap-2 items-center min-h-[40px]">
                {/* স্ক্রিনশটের মতো ড্যাশড ছোট প্লাস আইকন আপলোডার */}
                <div className="w-10 h-10 border border-dashed border-zinc-400 hover:bg-zinc-50 flex items-center justify-center cursor-pointer relative overflow-hidden">
                  <UploadMedia
                    queryClient={queryClient}
                    selectedMedia={colorImages[color] || []}
                    setSelectedMedia={(updater) => {
                      setColorImages((prev) => {
                        const currentList = prev[color] || [];
                        const updatedList =
                          typeof updater === "function"
                            ? updater(currentList)
                            : updater;
                        return { ...prev, [color]: updatedList };
                      });
                    }}
                    isMultiple={true}
                  />
                  {/* আপলোড মিডিয়া কাস্টমাইজ না করা থাকলে এর উপরে একটি প্লাস আইকন লেয়ার দিয়ে দেওয়া হলো */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-zinc-500 bg-white group-hover:bg-zinc-50">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>

                {/* আপলোড করা ছোট ইমেজের থাম্বনেইল বা প্রিভিউ */}
                <div className="flex flex-wrap gap-1.5">
                  {(colorImages[color] || []).map((img, imgIdx) => (
                    <div
                      key={img._id || imgIdx}
                      className="relative w-10 h-10 border border-black bg-white group rounded-none overflow-hidden"
                    >
                      <Image
                        src={img.secure_url || img.url}
                        alt="color-preview"
                        fill
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeColorImage(color, imgIdx)}
                        className="absolute inset-0 bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ৩. ভিডিও লিংক ইনপুট ও পাশে ছোট প্লাস বাটন একসাথে (৫ কলাম) */}
            <div className="md:col-span-5 space-y-2">
              {(videoLinks[color] || []).map((link, idx) => (
                <div
                  key={`${color}-vid-${idx}`}
                  className="flex items-end gap-2"
                >
                  <div className="flex-1">
                    <label className="text-[10px] font-black uppercase text-gray-700 block mb-1">
                      Video Link {idx > 0 && `#${idx + 1}`}
                    </label>
                    <Input
                      placeholder="Enter video link here"
                      value={link}
                      onChange={(e) =>
                        updateVideoLinkValue(color, idx, e.target.value)
                      }
                      className="h-10 border-black rounded-none bg-white"
                    />
                  </div>

                  {/* প্রথম লিংকের সাথে আরেকটি ভিডিও ফিল্ড যোগ করার প্লাস বাটন */}
                  {idx === 0 ? (
                    <button
                      type="button"
                      onClick={() => addVideoLinkField(color)}
                      className="p-2.5 border border-dashed border-zinc-400 text-gray-600 hover:bg-zinc-50 h-10"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  ) : (
                    // এক্সট্রা লিংকের জন্য ডিলিট বাটন
                    <button
                      type="button"
                      onClick={() => removeVideoLinkField(color, idx)}
                      className="p-2.5 bg-zinc-100 border border-black text-black hover:bg-zinc-200 h-10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ⚙️ নিচের ড্রপডাউন এবং ভ্যারিয়েন্ট জেনারেট সেকশন */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t-2 border-black items-end">
        <div>
          <label className="text-[10px] font-black uppercase text-gray-700 block mb-1">
            Size *
          </label>
          <select
            className="w-full h-10 border border-black px-3 text-sm bg-white focus:outline-none"
            value={selectedSize}
            onChange={(e) => setSelectedSize(e.target.value)}
          >
            <option value="">Select Size Option</option>
            {sizes.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-[10px] font-black uppercase text-gray-700 block mb-1">
            Color *
          </label>
          <div className="border border-black min-h-10 p-1 flex flex-wrap gap-1 items-center bg-white">
            {selectedColors.map((color) => (
              <span
                key={color}
                className="bg-black text-white text-xs font-black uppercase px-2 py-1 flex items-center gap-1"
              >
                {color}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => removeColor(color)}
                />
              </span>
            ))}
            <select
              className="flex-1 border-none text-sm bg-transparent outline-none min-w-[120px]"
              onChange={(e) => handleColorSelect(e.target.value)}
              value=""
            >
              <option value="" disabled>
                Select Colors...
              </option>

              {colorPool
                ?.filter((color) => !selectedColors.includes(color.name))
                .map((color) => (
                  <option key={color._id} value={color.name}>
                    {color.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onGenerate}
          className="bg-black hover:bg-zinc-800 text-white text-xs font-black tracking-widest uppercase py-3 px-6 transition"
        >
          Generate Variant
        </button>
      </div>
    </div>
  );
}
