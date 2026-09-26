"use client";

import { useRef } from "react";
import { ImagePlus, RefreshCw, Trash2 } from "lucide-react";

import { showToast } from "@/lib/showToast";

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * The product's one photo. A picked file stays in the browser as a
 * preview (`{ file, url }`) and is only uploaded when the product is
 * saved, so a photo that is changed or never saved leaves nothing behind.
 * A saved photo is `{ _id, url }`.
 */
export default function ProductPhoto({ photo, setPhoto }) {
  const input = useRef(null);

  const pick = (file) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return showToast("error", "Use a PNG, JPG or WEBP image");
    if (file.size > MAX_BYTES) return showToast("error", "The image must be 5 MB or smaller");
    if (photo?.file) URL.revokeObjectURL(photo.url);
    setPhoto({ file, url: URL.createObjectURL(file) });
  };

  const remove = () => {
    if (photo?.file) URL.revokeObjectURL(photo.url);
    setPhoto(null);
  };

  return (
    <div className="flex items-end gap-3">
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        aria-label="Product photo"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {photo ? (
        <div className="relative size-[130px] overflow-hidden rounded-lg border bg-white dark:border-border">
          {/* a local preview or a saved photo's own URL */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt="Product photo" className="size-full object-cover" />
          {photo.file && (
            <span className="absolute left-1.5 top-1.5 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              Saves with product
            </span>
          )}
          <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5">
            <button
              type="button"
              onClick={() => input.current?.click()}
              title="Change photo"
              aria-label="Change photo"
              className="flex size-7 items-center justify-center rounded bg-white/90 text-[#188ae2] hover:bg-white"
            >
              <RefreshCw size={14} />
            </button>
            <button
              type="button"
              onClick={remove}
              title="Remove photo"
              aria-label="Remove photo"
              className="flex size-7 items-center justify-center rounded bg-red-600 text-white hover:bg-red-700"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex size-[130px] flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-orange-400 bg-white text-sm font-medium text-gray-600 hover:bg-orange-50 dark:bg-card dark:text-gray-300"
        >
          <ImagePlus size={24} />
          Upload Image
        </button>
      )}
      <p className="text-[12px] text-muted-foreground">PNG, JPG or WEBP, up to 5 MB. Uploaded when you save.</p>
    </div>
  );
}
