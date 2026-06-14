"use client";

import { useState } from "react";
import axios from "axios";
import { X, ImagePlus } from "lucide-react";
import Image from "next/image";

export default function EditVariantModal({
  isOpen,
  setIsOpen,
  editingVariant,
  setEditingVariant,
  refresh,
}) {
  const [loading, setLoading] = useState(false);

  if (!isOpen || !editingVariant) return null;

  const updateField = (key, value) => {
    setEditingVariant((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // ➕ ADD IMAGE
  const addImage = (img) => {
    updateField("media", [...(editingVariant.media || []), img]);
  };

  // ❌ REMOVE IMAGE
  const removeImage = (id) => {
    updateField(
      "media",
      (editingVariant.media || []).filter((m) => m._id !== id),
    );
  };

  const handleUpdate = async () => {
    try {
      setLoading(true);

      const payload = {
        sku: editingVariant.sku,
        color: editingVariant.color,
        size: editingVariant.size,
        mrp: Number(editingVariant.mrp),
        sellingPrice: Number(editingVariant.sellingPrice),
        stock: Number(editingVariant.stock),
        media: (editingVariant.media || []).map((m) => m._id),
      };

      await axios.put(
        `/api/product-variant/update/${editingVariant._id}`,
        payload,
      );

      await refresh?.();
      setIsOpen(false);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-lg p-6 space-y-4 relative">
        {/* CLOSE */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-3 right-3"
        >
          <X />
        </button>

        <h2 className="text-xl font-bold">Edit Variant</h2>

        {/* SKU */}
        <input
          className="border p-2 w-full"
          value={editingVariant.sku || ""}
          onChange={(e) => updateField("sku", e.target.value)}
          placeholder="SKU"
        />

        {/* COLOR + SIZE */}
        <div className="grid grid-cols-2 gap-2">
          <input
            className="border p-2"
            value={editingVariant.color || ""}
            onChange={(e) => updateField("color", e.target.value)}
            placeholder="Color"
          />

          <input
            className="border p-2"
            value={editingVariant.size || ""}
            onChange={(e) => updateField("size", e.target.value)}
            placeholder="Size"
          />
        </div>

        {/* STOCK */}
        <input
          className="border p-2 w-full"
          type="number"
          value={editingVariant.stock ?? ""}
          onChange={(e) => updateField("stock", e.target.value)}
          placeholder="Stock"
        />

        {/* IMAGE GRID */}
        <div>
          <p className="text-xs font-bold mb-2">Images</p>

          <div className="grid grid-cols-4 gap-2">
            {(editingVariant.media || []).map((m) => (
              <div key={m._id} className="relative w-full h-20 border">
                <Image
                  src={m.secure_url}
                  fill
                  className="object-cover"
                  alt="variant"
                />

                <button
                  onClick={() => removeImage(m._id)}
                  className="absolute top-1 right-1 bg-black text-white p-1"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>

          {/* ADD IMAGE (placeholder button) */}
          <button
            type="button"
            className="mt-2 flex items-center gap-2 text-xs font-bold border px-3 py-2"
            onClick={() => {
              // replace this with your MediaModal if needed
              alert("Connect Media Modal here");
            }}
          >
            <ImagePlus size={14} /> Add Image
          </button>
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-2 pt-3">
          <button onClick={() => setIsOpen(false)} className="px-4 py-2 border">
            Cancel
          </button>

          <button
            onClick={handleUpdate}
            disabled={loading}
            className="px-4 py-2 bg-black text-white"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
