"use client";

import React, { useRef, useState } from "react";
import axios from "axios";
import Image from "next/image";
import { Upload, Loader2, Star, Trash2, Plus } from "lucide-react";
import { showToast } from "@/lib/showToast";

const UploadMedia = ({
  queryClient,
  selectedMedia = [],
  setSelectedMedia,
  isMultiple = true,
}) => {
  const fileInputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);

    if (!files.length) return;

    try {
      setUploading(true);
      setProgress(0);

      const uploadedItems = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        const { data } = await axios.post("/api/media/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },

          onUploadProgress: (event) => {
            const percent = Math.round((event.loaded * 100) / event.total);

            setProgress(percent);
          },
        });

        if (!data.success) {
          throw new Error(data.message || "Upload failed");
        }

        const media = data.media;

        uploadedItems.push({
          _id: media._id,
          secure_url: media.secure_url,
          url: media.secure_url,
        });
      }

      if (setSelectedMedia) {
        if (isMultiple) {
          setSelectedMedia((prev) => [...prev, ...uploadedItems]);
        } else {
          setSelectedMedia(uploadedItems);
        }
      }

      await queryClient?.invalidateQueries({
        queryKey: ["MediaModal"],
      });

      await queryClient?.invalidateQueries({
        queryKey: ["media-data"],
      });

      showToast("success", "Image uploaded successfully");

      setProgress(100);

      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 500);

      e.target.value = "";
    } catch (error) {
      console.error(error);

      setUploading(false);

      showToast(
        "error",
        error?.response?.data?.message || error?.message || "Upload failed",
      );
    }
  };

  const previewImage =
    selectedMedia?.[0]?.secure_url || selectedMedia?.[0]?.url;

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      multiple={isMultiple}
      accept="image/png,image/jpeg,image/jpg,image/webp"
      className="hidden"
      onChange={handleUpload}
    />
  );

  // A form that keeps the picked photos (the product form) gets a gallery:
  // every photo with Remove (and Make main when several are allowed), and
  // a tile to add more, or to change the one photo. The media library page,
  // which only uploads, keeps the single tile below.
  if (setSelectedMedia && selectedMedia) {
    const remove = (index) => setSelectedMedia((prev) => prev.filter((_, i) => i !== index));
    const makeMain = (index) =>
      setSelectedMedia((prev) => [prev[index], ...prev.filter((_, i) => i !== index)]);

    return (
      <div className="flex flex-wrap gap-3">
        {fileInput}

        {selectedMedia.map((item, index) => (
          <div
            key={item._id || index}
            className="group relative size-[130px] overflow-hidden rounded-lg border bg-white dark:border-border"
          >
            <Image src={item.secure_url || item.url} alt={`Photo ${index + 1}`} fill sizes="130px" className="object-cover" />
            {index === 0 && (
              <span className="absolute left-1.5 top-1.5 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                Main
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5">
              {isMultiple && index > 0 && (
                <button
                  type="button"
                  onClick={() => makeMain(index)}
                  title="Make main photo"
                  aria-label={`Make photo ${index + 1} the main photo`}
                  className="flex size-7 items-center justify-center rounded bg-white/90 text-amber-600 hover:bg-white"
                >
                  <Star size={14} />
                </button>
              )}
              <button
                type="button"
                onClick={() => remove(index)}
                title="Remove photo"
                aria-label={`Remove photo ${index + 1}`}
                className="flex size-7 items-center justify-center rounded bg-red-600 text-white hover:bg-red-700"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => !uploading && fileInputRef.current?.click()}
          className="relative flex size-[130px] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-lg border-2 border-dashed border-orange-400 bg-white text-sm font-medium text-gray-600 hover:bg-orange-50 dark:bg-card dark:text-gray-300"
        >
          {uploading ? (
            <>
              <Loader2 className="size-6 animate-spin" />
              <span className="text-xs">{progress}%</span>
            </>
          ) : (
            <>
              {selectedMedia.length ? <Plus size={24} /> : <Upload size={24} />}
              {!selectedMedia.length ? "Upload Image" : isMultiple ? "Add more" : "Change"}
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <>
      {fileInput}

      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        className="
          relative
          w-[160px]
          h-[200px]
          border-2
          border-dashed
          border-orange-400
          rounded-xl
          overflow-hidden
          cursor-pointer
          bg-white
          flex
          items-center
          justify-center
        "
      >
        {previewImage ? (
          <Image
            src={previewImage}
            alt="Preview"
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={32} />
            <span className="text-sm font-medium">Upload Image</span>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />

            <div className="w-28 h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>

            <p className="mt-3 text-sm font-semibold">{progress}%</p>
          </div>
        )}
      </div>
    </>
  );
};

export default UploadMedia;
