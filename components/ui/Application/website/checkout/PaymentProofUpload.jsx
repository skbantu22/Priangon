"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import UploadMedia from "@/components/ui/Application/Admin/uploadmedia";
import MediaModal from "../../Admin/MediaModel";
import { Trash2, Edit3 } from "lucide-react";

export default function PaymentProofPicker({
  value,
  onChange,
  disabled = false,
}) {
  const queryClient = useQueryClient();

  const [preview, setPreview] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState([]);

  // sync from parent
  useEffect(() => {
    setPreview(value || "");
  }, [value]);

  // ================= SELECT FROM MODAL =================
  const handleSelectFromModal = (items) => {
    const file = items?.[0];
    const url = file?.secure_url || file?.url;

    if (!url) return;

    setSelectedMedia(items);
    setPreview(url);
    onChange?.(url);
    setOpen(false);
  };

  // ================= DELETE IMAGE =================
  const handleRemove = () => {
    setPreview("");
    setSelectedMedia([]);
    onChange?.(null);
  };

  return (
    <div className="w-full max-w-sm space-y-3">
      {/* TITLE */}
      <p className="text-[11px] font-bold uppercase text-gray-500">
        Upload Payment Proof
      </p>

      {/* UPLOAD */}
      <UploadMedia
        isMultiple={false}
        queryClient={queryClient}
        disabled={disabled}
        onSelect={(media) => {
          const file = media?.[0];
          const url = file?.secure_url || file?.url;

          if (!url) return;

          setPreview(url);
          onChange?.(url);
        }}
      />

      {/* MEDIA LIBRARY */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full py-2 text-xs font-medium border rounded-md 
                   hover:bg-black hover:text-white transition"
      >
        Choose from Media Library
      </button>

      {/* PREVIEW */}
      <div className="border rounded-md p-2 bg-gray-50 relative">
        {preview ? (
          <>
            <img
              src={preview}
              className="w-full h-40 object-cover rounded-md border"
            />

            {/* ACTION BUTTONS */}
            <div className="absolute top-2 right-2 flex gap-2">
              {/* edit / replace */}
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="p-1.5 bg-white border rounded-md hover:bg-gray-100"
              >
                <Edit3 className="w-4 h-4" />
              </button>

              {/* delete */}
              <button
                type="button"
                onClick={handleRemove}
                className="p-1.5 bg-white border rounded-md hover:bg-red-100"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </>
        ) : (
          <div className="w-full h-40 flex items-center justify-center text-xs text-gray-400 border rounded-md bg-white">
            No image selected
          </div>
        )}
      </div>

      {/* MEDIA MODAL */}
      <MediaModal
        open={open}
        setOpen={setOpen}
        selectedMedia={selectedMedia}
        setSelectedMedia={handleSelectFromModal}
        isMultiple={false}
      />
    </div>
  );
}
