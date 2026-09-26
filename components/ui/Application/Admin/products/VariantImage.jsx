"use client";

import { useRef, useState } from "react";
import axios from "axios";
import { ImagePlus, Loader2, X } from "lucide-react";

import { showToast } from "@/lib/showToast";

/**
 * One optional photo for a variant row: click to upload, × to remove.
 * `value` is { _id, url } or null; the variant stores the media id.
 */
export default function VariantImage({ value, onChange }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) return showToast("error", "Choose an image file");

    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const { data } = await axios.post("/api/media/upload", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (!data?.success) throw new Error(data?.message || "Upload failed");
      onChange({ _id: data.media._id, url: data.media.secure_url });
    } catch (error) {
      showToast("error", error?.response?.data?.message || error.message || "Upload failed");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="relative size-[44px] shrink-0">
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => upload(e.target.files?.[0])}
        aria-label="Variant photo"
      />
      <button
        type="button"
        onClick={() => !busy && input.current?.click()}
        title={value ? "Change photo" : "Add photo (optional)"}
        className="flex size-full items-center justify-center overflow-hidden border border-dashed border-[#c5ccd3] bg-white text-[#8a939c] hover:border-[#188ae2] hover:text-[#188ae2] dark:border-border dark:bg-card"
      >
        {busy ? (
          <Loader2 size={16} className="animate-spin" />
        ) : value?.url ? (
          // an uploaded photo's own URL, shown small
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value.url} alt="" className="size-full object-cover" />
        ) : (
          <ImagePlus size={18} strokeWidth={1.6} />
        )}
      </button>
      {value && !busy && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute -right-1.5 -top-1.5 flex size-[18px] items-center justify-center rounded-full bg-[#f05252] text-white shadow"
          aria-label="Remove photo"
        >
          <X size={11} />
        </button>
      )}
    </div>
  );
}
