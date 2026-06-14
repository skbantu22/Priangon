"use client";

import { useState } from "react";
import axios from "axios";
import Image from "next/image";
import { X, LayoutGrid, UploadCloud } from "lucide-react";

import MediaModal from "@/components/ui/Application/Admin/MediaModel";
import UploadMedia from "@/components/ui/Application/Admin/uploadmedia";
import { sizes } from "@/lib/utils";

export default function AddVariantModal({ productId, close, refresh }) {
  const [loading, setLoading] = useState(false);
  const [openMedia, setOpenMedia] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState([]);

  const [form, setForm] = useState({
    color: "",
    size: "",
    stock: 0,
    isActive: true,
  });

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const payload = {
        product: productId,
        color: form.color?.trim() || null,
        size: form.size,
        stock: Number(form.stock),
        media: selectedMedia.map((m) => m._id),
        isActive: form.isActive,
      };

      const { data } = await axios.post("/api/product-variant/create", payload);

      if (data.success) {
        await refresh?.();
        close();
      }
    } catch (error) {
      console.log("Variant save error:", error.response?.data || error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <form
          onSubmit={handleSubmit}
          className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* HEADER */}
          <div className="bg-black text-white px-5 py-3 flex justify-between">
            <h2 className="text-sm font-bold uppercase">Add Variant</h2>
            <button type="button" onClick={close}>
              <X />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* COLOR + SIZE + STOCK */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase">Color</label>
                <input
                  value={form.color}
                  onChange={(e) => updateField("color", e.target.value)}
                  className="w-full border p-2 rounded-lg mt-1"
                  placeholder="Red / Blue"
                />
              </div>

              {/* SIZE FROM UTILS */}
              <div>
                <label className="text-[10px] font-bold uppercase">Size</label>

                <select
                  value={form.size}
                  onChange={(e) => updateField("size", e.target.value)}
                  className="w-full border p-2 rounded-lg mt-1"
                >
                  <option value="">Select size</option>
                  {sizes.map((s) => (
                    <option key={s.value || s} value={s.value || s}>
                      {s.label || s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase">Stock</label>
                <input
                  type="number"
                  value={form.stock}
                  onChange={(e) => updateField("stock", e.target.value)}
                  className="w-full border p-2 rounded-lg mt-1"
                  placeholder="0"
                />
              </div>

              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => updateField("isActive", e.target.checked)}
                />
                <span className="text-xs font-bold uppercase">Active</span>
              </div>
            </div>

            {/* MEDIA SECTION */}
            <div>
              <label className="text-[10px] font-bold uppercase flex items-center gap-1 mb-2">
                Images
              </label>

              <div className="grid grid-cols-5 gap-2">
                {selectedMedia.map((m) => (
                  <div
                    key={m._id}
                    className="relative aspect-square border rounded-lg overflow-hidden"
                  >
                    <Image
                      src={m.secure_url || m.url}
                      fill
                      className="object-cover"
                      alt="variant"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedMedia((p) =>
                          p.filter((x) => x._id !== m._id),
                        )
                      }
                      className="absolute top-1 right-1 bg-black text-white p-1 rounded"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setOpenMedia(true)}
                  className="border border-dashed rounded-lg flex items-center justify-center"
                >
                  <LayoutGrid />
                </button>
              </div>

              {/* SAME STYLE AS YOUR PRODUCT PAGE */}
              <div className="mt-3 flex justify-between items-center border-t pt-3">
                <p className="text-[10px] font-bold uppercase opacity-50">
                  Quick Upload:
                </p>

                <UploadMedia isMultiple={true} queryClient={undefined} />
              </div>
            </div>

            {/* ACTIONS */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={close}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>

              <button
                disabled={loading}
                className="px-5 py-2 bg-black text-white rounded-lg"
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </form>
      </div>

      <MediaModal
        open={openMedia}
        setOpen={setOpenMedia}
        selectedMedia={selectedMedia}
        setSelectedMedia={setSelectedMedia}
        isMultiple={true}
      />
    </>
  );
}
