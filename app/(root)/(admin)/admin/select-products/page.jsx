"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import axios from "axios";

import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/hooks/useProducts";

export default function ShowroomVariantAssign() {
  const [search, setSearch] = useState("");
  const [showroomId, setShowroomId] = useState("showroom1");

  // IMPORTANT STRUCTURE:
  // {
  //   productId: [{ variantId, stock }]
  // }
  const [selectedVariants, setSelectedVariants] = useState({});

  const [openProduct, setOpenProduct] = useState(null);
  const [saving, setSaving] = useState(false);

  const observerRef = useRef(null);

  // ---------------- PRODUCTS ----------------
  const { data, fetchNextPage, hasNextPage, isLoading } = useProducts(
    search,
    showroomId,
  );

  const products = useMemo(() => {
    return data?.pages?.flat() || [];
  }, [data]);

  // ---------------- LOAD SELECTED ----------------
  useEffect(() => {
    const loadSelected = async () => {
      const res = await axios.get(
        `/api/showroom-product-variants/get?showroomId=${showroomId}`,
      );

      const mapped = {};

      (res.data.data || []).forEach((item) => {
        mapped[item.productId] = (item.variants || []).map((v) => ({
          variantId: String(v.variantId || v),
          stock: Number(v.stock || 0),
        }));
      });

      setSelectedVariants(mapped);
    };

    loadSelected();
  }, [showroomId]);

  // ---------------- INFINITE SCROLL ----------------
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage) {
        fetchNextPage();
      }
    });

    if (observerRef.current) observer.observe(observerRef.current);

    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage]);

  // ---------------- TOGGLE VARIANT ----------------
  const toggleVariant = (productId, variantId) => {
    setSelectedVariants((prev) => {
      const list = prev[productId] || [];

      const exists = list.find((v) => v.variantId === variantId);

      return {
        ...prev,
        [productId]: exists
          ? list.filter((v) => v.variantId !== variantId)
          : [...list, { variantId, stock: "" }],
      };
    });
  };

  // ---------------- UPDATE STOCK ----------------
  const updateStock = (productId, variantId, value) => {
    setSelectedVariants((prev) => ({
      ...prev,
      [productId]: (prev[productId] || []).map((v) =>
        v.variantId === variantId ? { ...v, stock: Number(value) } : v,
      ),
    }));
  };

  // ---------------- SAVE ----------------
  const handleSave = async () => {
    try {
      setSaving(true);

      await axios.post("/api/showroom-product-variants/save", {
        showroomId,

        data: Object.entries(selectedVariants).map(([productId, variants]) => ({
          productId,

          variants: variants.map((v) => ({
            variantId: v.variantId,
            stock: Number(v.stock || 0),
          })),
        })),
      });

      alert("Saved Successfully");
    } catch (err) {
      console.log(err);
      alert("Save Failed");
    } finally {
      setSaving(false);
    }
  };

  // ---------------- RIGHT PANEL ----------------
  const selectedSummary = useMemo(() => {
    return products
      .map((p) => {
        const selected = selectedVariants[p._id] || [];

        const variants = (p.variants || [])
          .filter((v) => selected.some((x) => x.variantId === v._id))
          .map((v) => {
            const match = selected.find((x) => x.variantId === v._id);

            return {
              ...v,
              stock: match?.stock || 0,
            };
          });

        if (variants.length === 0) return null;

        return { ...p, variants };
      })
      .filter(Boolean);
  }, [products, selectedVariants]);

  // ---------------- UI ----------------
  return (
    <div className="grid grid-cols-12 gap-4 p-4 bg-gray-100 min-h-screen">
      {/* LEFT */}
      <div className="col-span-8 bg-white rounded-2xl p-4">
        {/* TOP BAR */}
        <div className="flex gap-3 mb-4 items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="border p-2 rounded w-[220px]"
          />

          <select
            value={showroomId}
            onChange={(e) => setShowroomId(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="showroom1">Showroom 1</option>
            <option value="showroom2">Showroom 2</option>
          </select>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>

        {/* PRODUCTS */}
        {isLoading ? (
          <div className="grid grid-cols-4 gap-3">
            {Array(8)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  className="h-40 bg-gray-200 animate-pulse rounded"
                />
              ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-3">
              {products.map((p) => {
                const count = selectedVariants[p._id]?.length || 0;

                return (
                  <Card
                    key={p._id}
                    onClick={() => setOpenProduct(p)}
                    className="cursor-pointer"
                  >
                    <div className="relative h-36">
                      <Image
                        src={p?.media?.[0]?.secure_url || "/placeholder.png"}
                        fill
                        className="object-contain"
                        alt=""
                      />
                    </div>

                    <CardHeader>
                      <div className="flex justify-between">
                        <span className="text-sm font-semibold">{p.name}</span>

                        {count > 0 && (
                          <span className="bg-green-500 text-white text-xs px-2 rounded">
                            {count}
                          </span>
                        )}
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>

            <div ref={observerRef} className="h-10" />
          </>
        )}
      </div>

      {/* RIGHT */}
      <div className="col-span-4 bg-white rounded-2xl p-4 h-[95vh] overflow-y-auto">
        <h2 className="font-bold mb-3">Selected Variants</h2>

        {selectedSummary.length === 0 ? (
          <p className="text-gray-400">No selection</p>
        ) : (
          selectedSummary.map((p) => (
            <div key={p._id} className="border p-2 rounded mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Image
                  src={p.media?.[0]?.secure_url || "/placeholder.png"}
                  width={40}
                  height={40}
                  className="rounded"
                  alt=""
                />
                <div className="text-sm font-bold">{p.name}</div>
              </div>

              {p.variants.map((v) => {
                const selected = selectedVariants[p._id]?.find(
                  (x) => x.variantId === v._id,
                );

                return (
                  <div
                    key={v._id}
                    className="flex justify-between items-center text-xs bg-gray-100 p-2 mt-1 rounded"
                  >
                    <div>
                      <div>
                        {v.color} - {v.size}
                      </div>

                      {selected && (
                        <input
                          type="number"
                          min="0"
                          value={selected.stock}
                          onChange={(e) =>
                            updateStock(p._id, v._id, e.target.value)
                          }
                          className="border mt-1 p-1 w-20 text-xs"
                        />
                      )}
                    </div>

                    <button
                      onClick={() => toggleVariant(p._id, v._id)}
                      className="text-red-500"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* MODAL */}
      {openProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-[420px] p-4 rounded">
            <h2 className="font-bold mb-3">{openProduct.name}</h2>

            {openProduct.variants.map((v) => {
              const selected = selectedVariants?.[openProduct._id]?.find(
                (x) => x.variantId === v._id,
              );

              return (
                <div
                  key={v._id}
                  className={`p-2 border mb-2 rounded ${
                    selected ? "bg-green-100" : ""
                  }`}
                >
                  <div className="flex justify-between">
                    <span>
                      {v.color} - {v.size}
                    </span>

                    <button
                      onClick={() => toggleVariant(openProduct._id, v._id)}
                      className="text-xs border px-2 py-1 rounded"
                    >
                      {selected ? "Remove" : "Select"}
                    </button>
                  </div>

                  {selected && (
                    <input
                      type="number"
                      min="0"
                      value={selected.stock}
                      onChange={(e) =>
                        updateStock(openProduct._id, v._id, e.target.value)
                      }
                      className="border mt-2 p-1 w-full"
                      placeholder="Stock"
                    />
                  )}
                </div>
              );
            })}

            <Button
              className="w-full mt-3"
              onClick={() => setOpenProduct(null)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
