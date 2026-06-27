"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { sizes } from "@/lib/utils";

export default function VariantTable({
  variantsList,
  setVariantsList,
  onSave,
  isSaving,
  onDelete,
  colorPool,
}) {
  const handleRowChange = (id, field, rawValue) => {
    setVariantsList((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;

        const value = rawValue === "" ? "" : rawValue;

        const updatedRow = {
          ...row,
          [field]:
            rawValue === "" || ["barcode", "color", "size"].includes(field)
              ? value
              : Number(rawValue),
        };

        if (["mrp", "sellingPrice", "discountPercentage"].includes(field)) {
          updatedRow.priceSource = "CUSTOM";
        }

        const currentMrp = Number(updatedRow.mrp) || 0;
        const currentSelling = Number(updatedRow.sellingPrice) || 0;
        const currentPercentage = Number(updatedRow.discountPercentage) || 0;
        const currentAmt = Number(updatedRow.discountAmount) || 0;

        if (field === "mrp" || field === "sellingPrice") {
          updatedRow.discountAmount = currentMrp - currentSelling;
          updatedRow.discountPercentage =
            currentMrp > 0
              ? Math.round(((currentMrp - currentSelling) / currentMrp) * 100)
              : 0;
          updatedRow.afterDiscount = currentSelling;
        } else if (field === "discountPercentage") {
          updatedRow.discountAmount = Math.round(
            (currentMrp * currentPercentage) / 100,
          );
          updatedRow.sellingPrice = currentMrp - updatedRow.discountAmount;
          updatedRow.afterDiscount = updatedRow.sellingPrice;
        } else if (field === "discountAmount") {
          updatedRow.sellingPrice = currentMrp - currentAmt;
          updatedRow.afterDiscount = updatedRow.sellingPrice;
          updatedRow.discountPercentage =
            currentMrp > 0 ? Math.round((currentAmt / currentMrp) * 100) : 0;
        } else if (field === "afterDiscount") {
          updatedRow.sellingPrice = Number(updatedRow.afterDiscount) || 0;
          updatedRow.discountAmount = currentMrp - updatedRow.sellingPrice;
          updatedRow.discountPercentage =
            currentMrp > 0
              ? Math.round(
                  ((currentMrp - updatedRow.sellingPrice) / currentMrp) * 100,
                )
              : 0;
        }

        return updatedRow;
      }),
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border-2 border-black overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-zinc-100 border-b-2 border-black text-black font-black uppercase tracking-wider">
              <th className="p-3 w-16 border-r border-black">SL No</th>
              <th className="p-3 w-48 border-r border-black">
                Size - Color Combo
              </th>
              <th className="p-3 w-32 border-r border-black text-red-600">
                Barcode *
              </th>
              <th className="p-3 w-28 border-r border-black text-red-600">
                MRP (Purchase) *
              </th>
              <th className="p-3 w-28 border-r border-black text-red-600">
                Sale Price *
              </th>
              <th className="p-3 w-24 border-r border-black">Disc (%)</th>
              <th className="p-3 w-28 border-r border-black">Disc Amt</th>
              <th className="p-3 w-28 border-r border-black">Final Price</th>
              <th className="p-3 w-24 border-r border-black">Stock Count</th>
              <th className="p-3 w-20 border-l border-black text-center">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {variantsList.map((variant, index) => (
              <tr
                key={variant.id}
                className="border-b border-zinc-300 hover:bg-zinc-50"
              >
                <td className="p-2 border-r border-zinc-200 text-center font-bold">
                  {index + 1}
                </td>

                {/* SIZE + COLOR */}
                <td className="p-2 border-r border-zinc-200">
                  <div className="flex gap-2">
                    <select
                      className="h-8 w-full border border-zinc-400 rounded-none px-2 bg-white"
                      value={variant.size || ""}
                      onChange={(e) =>
                        handleRowChange(variant.id, "size", e.target.value)
                      }
                    >
                      <option value="" disabled>
                        Select Size
                      </option>
                      {sizes.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>

                    <select
                      className="h-8 w-full border border-zinc-400 rounded-none px-2 bg-white"
                      value={variant.color || ""}
                      onChange={(e) =>
                        handleRowChange(variant.id, "color", e.target.value)
                      }
                    >
                      <option value="" disabled>
                        Select Color
                      </option>
                      {colorPool.map((item) => (
                        <option key={item._id} value={item.name}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>

                {/* BARCODE */}
                <td className="p-2 border-r border-zinc-200">
                  <Input
                    className="h-8 rounded-none border-zinc-400"
                    value={variant.barcode || ""}
                    onChange={(e) =>
                      handleRowChange(variant.id, "barcode", e.target.value)
                    }
                  />
                </td>

                {/* MRP INPUT */}
                <td className="p-2 border-r border-zinc-200">
                  <Input
                    type="number"
                    className="h-8 rounded-none border-zinc-400 font-bold"
                    value={variant.mrp ?? ""}
                    onChange={(e) =>
                      handleRowChange(variant.id, "mrp", e.target.value)
                    }
                  />
                </td>

                {/* SALE PRICE */}
                <td className="p-2 border-r border-zinc-200">
                  <Input
                    type="number"
                    className="h-8 rounded-none border-zinc-400 text-blue-600 font-bold"
                    value={variant.sellingPrice ?? ""}
                    onChange={(e) =>
                      handleRowChange(
                        variant.id,
                        "sellingPrice",
                        e.target.value,
                      )
                    }
                  />
                </td>

                {/* DISCOUNT % */}
                <td className="p-2 border-r border-zinc-200">
                  <Input
                    type="number"
                    className="h-8 rounded-none border-zinc-400"
                    value={variant.discountPercentage ?? ""}
                    onChange={(e) =>
                      handleRowChange(
                        variant.id,
                        "discountPercentage",
                        e.target.value,
                      )
                    }
                  />
                </td>

                {/* DISCOUNT AMOUNT */}
                <td className="p-2 border-r border-zinc-200">
                  <Input
                    type="number"
                    className="h-8 rounded-none border-zinc-400"
                    value={variant.discountAmount ?? ""}
                    onChange={(e) =>
                      handleRowChange(
                        variant.id,
                        "discountAmount",
                        e.target.value,
                      )
                    }
                  />
                </td>

                {/* FINAL PRICE */}
                <td className="p-2 border-r border-zinc-200">
                  <Input
                    type="number"
                    className="h-8 rounded-none border-zinc-400 bg-zinc-50"
                    value={variant.afterDiscount ?? ""}
                    onChange={(e) =>
                      handleRowChange(
                        variant.id,
                        "afterDiscount",
                        e.target.value,
                      )
                    }
                  />
                </td>

                {/* STOCK */}
                <td className="p-2">
                  <Input
                    type="number"
                    className="h-8 rounded-none border-zinc-400"
                    // Modified fallback context rendering safely
                    value={
                      variant.stock !== undefined && variant.stock !== null
                        ? variant.stock
                        : ""
                    }
                    onChange={(e) =>
                      handleRowChange(variant.id, "stock", e.target.value)
                    }
                  />
                </td>

                {/* ACTION */}
                <td className="p-2 border-l border-zinc-200 text-center">
                  <button
                    type="button"
                    onClick={() => onDelete?.(variant.id, variant.isNew)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-[11px] rounded"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          disabled={isSaving}
          onClick={onSave}
          className="bg-black hover:bg-zinc-900 disabled:bg-zinc-400 text-white font-black tracking-widest text-xs px-10 py-4 uppercase transition"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
