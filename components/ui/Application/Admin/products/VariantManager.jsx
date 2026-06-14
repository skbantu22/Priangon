"use client";

import { ChevronLeft, Plus, Trash2, Edit2 } from "lucide-react";
import { useState } from "react";

import AddVariantModal from "./modals/AddVariantModal";
import EditVariantModal from "./modals/VariantManager";

export default function VariantManager({ product, back }) {
  const [openAdd, setOpenAdd] = useState(false);

  const [openEdit, setOpenEdit] = useState(false);

  const [selectedVariant, setSelectedVariant] = useState(null);

  return (
    <div
      className="
max-w-[1200px]
mx-auto
px-4
md:px-6
py-6
"
    >
      {/* HEADER */}

      <div
        className="
flex
justify-between
items-center
mb-6
"
      >
        <div>
          <h1
            className="
text-2xl
font-black
uppercase
"
          >
            {product.name}
          </h1>

          <p
            className="
text-xs
font-bold
uppercase
text-zinc-500
"
          >
            Manage Variants
          </p>
        </div>

        <button
          onClick={back}
          className="
flex
items-center
gap-2
text-xs
font-black
uppercase
"
        >
          <ChevronLeft size={18} />
          Back
        </button>
      </div>

      <div
        className="
bg-white
border-2
border-black
"
      >
        <table className="w-full">
          <thead>
            <tr
              className="
bg-black
text-white
text-xs
uppercase
font-black
"
            >
              <th className="p-4 text-left">SKU</th>

              <th>Color</th>

              <th>Size</th>

              <th>Price</th>

              <th>Stock</th>

              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {product.variants?.map((variant) => (
              <tr
                key={variant._id}
                className="
border-b
text-sm
font-bold
"
              >
                <td className="p-4">{variant.sku}</td>

                <td>{variant.color || "-"}</td>

                <td>{variant.size || "-"}</td>

                <td>৳ {variant.sellingPrice}</td>

                <td>{variant.stock}</td>

                <td>
                  <div
                    className="
flex
justify-center
gap-3
"
                  >
                    <button
                      onClick={() => {
                        setSelectedVariant(variant);

                        setOpenEdit(true);
                      }}
                    >
                      <Edit2 size={17} />
                    </button>

                    <button className="text-red-600">
                      <Trash2 size={17} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={() => setOpenAdd(true)}
        className="
mt-6
bg-black
text-white
px-8
h-12
flex
items-center
gap-2
text-xs
font-black
uppercase
"
      >
        <Plus size={18} />
        Add Variant
      </button>

      {openAdd && (
        <AddVariantModal product={product} close={() => setOpenAdd(false)} />
      )}

      {openEdit && (
        <EditVariantModal
          variant={selectedVariant}
          close={() => setOpenEdit(false)}
        />
      )}
    </div>
  );
}
