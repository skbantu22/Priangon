"use client";

import Image from "next/image";

export default function ProductStockCard({
  product,
  variants,
  isExpanded,
  toggleProduct,
  showrooms,
  editedStock,
  handleQtyChange,
  handleSyncProductFamily,
}) {
  const totalWarehouseStock = variants.reduce(
    (acc, curr) => acc + curr.stock,
    0,
  );

  return (
    <div className="bg-zinc-100 border border-[#cbd5e1] overflow-hidden">
      {/* Header */}
      <div
        onClick={() => toggleProduct(product._id)}
        className="p-4 flex justify-between cursor-pointer"
      >
        <div className="flex gap-4 items-center">
          {product.media?.[0]?.secure_url && (
            <div className="w-12 h-16 relative">
              <Image
                src={product.media[0].secure_url}
                alt=""
                fill
                className="object-cover"
              />
            </div>
          )}

          <div>
            <h2 className="font-bold">{product.name}</h2>
            <p>{variants.length} Variants</p>
          </div>
        </div>

        <div>
          <p>Warehouse: {totalWarehouseStock}</p>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSyncProductFamily(product._id);
            }}
            className="bg-green-600 px-3 py-2 rounded"
          >
            Save Group
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4">
          {variants.map((vItem) => (
            <div key={vItem._id} className="border p-3 mb-3 rounded bg-white">
              <h3 className="font-semibold">
                {vItem.variantId?.color} - {vItem.variantId?.size}
              </h3>

              <p>Warehouse Stock: {vItem.stock}</p>

              {showrooms.map((showroom) => {
                const cellKey = `${vItem._id}_${showroom.showroom}`;

                return (
                  <div key={cellKey} className="flex justify-between mt-2">
                    <span>{showroom.showroom}</span>

                    <input
                      type="number"
                      value={editedStock[cellKey] || ""}
                      onChange={(e) =>
                        handleQtyChange(
                          vItem._id,
                          showroom.showroom,
                          e.target.value,
                        )
                      }
                      className="border px-2 py-1"
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
