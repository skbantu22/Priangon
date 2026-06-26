"use client";

import React, { useRef, useState } from "react";
import axios from "axios";
import Image from "next/image";
import { Upload, Loader2 } from "lucide-react";
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

        console.log("UPLOAD RESPONSE", data);

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

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple={isMultiple}
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={handleUpload}
      />

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
