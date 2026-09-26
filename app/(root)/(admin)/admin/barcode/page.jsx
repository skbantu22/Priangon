"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { Settings2, Trash2 } from "lucide-react";

import { printLabels } from "@/lib/barcodeLabel";
import { showToast } from "@/lib/showToast";

const BarcodePrintPage = () => {
  const [variants, setVariants] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  // Settings → Barcode Print Settings, and the shop name / address it falls back to
  const [labelSettings, setLabelSettings] = useState({ label: {}, shop: {} });

  useEffect(() => {
    axios
      .get("/api/settings")
      .then(({ data }) => {
        if (!data?.success) return;
        setLabelSettings({
          label: data.data.barcodeLabel || {},
          shop: {
            name: data.data.companyName || "",
            address: data.data.address || "",
          },
        });
      })
      .catch(() => {});
  }, []);

  // FETCH
  useEffect(() => {
    const fetchVariants = async () => {
      try {
        const { data } = await axios.get("/api/product-variant?size=1000");
        if (data?.success) setVariants(data.data || []);
      } catch (err) {
        console.log(err);
      }
    };
    fetchVariants();
  }, []);

  // FILTER
  const filteredVariants = useMemo(() => {
    return variants.filter((v) =>
      `${v.sku} ${v.barcode || ""} ${v.color} ${v.size} ${v.product?.name || ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  }, [search, variants]);

  const isAdded = (id) => selectedItems.some((i) => i.variant._id === id);

  const addVariant = (variant) => {
    if (isAdded(variant._id)) return;
    setSelectedItems((prev) => [...prev, { variant, qty: 1 }]);
  };

  const updateQty = (id, qty) => {
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.variant._id === id ? { ...item, qty: Number(qty) } : item,
      ),
    );
  };

  const removeItem = (id) => {
    setSelectedItems((prev) => prev.filter((i) => i.variant._id !== id));
  };

  // prints at the sticker size set in Barcode Print Settings, with the
  // variant's own barcode (what the POS scans)
  const generateLabels = () => {
    if (!selectedItems.length)
      return showToast("error", "Add products to print first");
    const items = selectedItems.map(({ variant, qty }) => ({
      productName: variant.product?.name || "",
      variant: [variant.color, variant.size]
        .filter((v) => v && v !== "Default" && v !== "Standard")
        .join(" · "),
      barcode: variant.barcode || variant.sku,
      price: variant.sellingPrice,
      mrp: variant.mrp,
      copies: qty,
    }));
    if (!printLabels(items, labelSettings.label, labelSettings.shop))
      showToast("error", "Allow pop-ups to print");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* HEADER */}
      <div className="no-print flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Barcode Print System</h1>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/settings/barcode"
            className="flex items-center gap-1.5 rounded border bg-white px-4 py-2 text-sm hover:bg-gray-50"
          >
            <Settings2 size={16} /> Label settings
          </Link>
          <button
            onClick={generateLabels}
            className="bg-black text-white px-5 py-2 rounded hover:bg-gray-800"
          >
            Print Labels
          </button>
        </div>
      </div>

      {/* SEARCH */}
      <div className="no-print mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search SKU, product, color..."
          className="w-full p-3 border rounded"
        />
      </div>

      {/* PRODUCT TABLE */}
      <div className="no-print bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-white">
            <tr>
              <th className="p-3 text-left">Product</th>
              <th>Color</th>
              <th>Size</th>
              <th>SKU</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredVariants.map((v) => (
              <tr key={v._id} className="border-b hover:bg-gray-50">
                {/* PRODUCT */}
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {v.product?.image ? (
                      <img
                        src={v.product.image}
                        className="w-10 h-10 rounded object-cover border"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded" />
                    )}

                    <div>
                      <div className="font-medium">{v.product?.name}</div>
                      <div className="text-xs text-gray-500">SKU: {v.sku}</div>
                    </div>
                  </div>
                </td>

                <td>{v.color}</td>
                <td>{v.size}</td>
                <td className="font-bold">{v.sku}</td>

                <td>
                  {isAdded(v._id) ? (
                    <span className="text-green-600 text-xs font-semibold">
                      Added
                    </span>
                  ) : (
                    <button
                      onClick={() => addVariant(v)}
                      className="bg-black text-white px-3 py-1 rounded"
                    >
                      Add
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SELECTED ITEMS */}
      {selectedItems.length > 0 && (
        <div className="no-print mt-6 bg-white rounded shadow p-4">
          <h2 className="font-bold mb-3">Selected Items</h2>

          <table className="w-full text-sm">
            <thead className="bg-black text-white">
              <tr>
                <th className="p-2">SKU</th>
                <th>Qty</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {selectedItems.map((item) => (
                <tr key={item.variant._id}>
                  <td className="p-2 font-bold">{item.variant.sku}</td>

                  <td>
                    <input
                      type="number"
                      min={1}
                      value={item.qty}
                      onChange={(e) =>
                        updateQty(item.variant._id, e.target.value)
                      }
                      className="border w-20 p-1 rounded"
                    />
                  </td>

                  <td>
                    <button
                      onClick={() => removeItem(item.variant._id)}
                      className="text-red-500"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BarcodePrintPage;
