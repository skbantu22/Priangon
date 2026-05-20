"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import axios from "axios";

import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/hooks/useProducts";

export default function ShowroomVariantAssign() {
  const [search, setSearch] = useState("");

  const [showrooms, setShowrooms] = useState([]);
  const [showroomId, setShowroomId] = useState("");

  const [selectedVariants, setSelectedVariants] = useState({});
  const [openProduct, setOpenProduct] = useState(null);

  const [saving, setSaving] = useState(false);

  const observerRef = useRef(null);

  // ---------------- LOAD SHOWROOMS ----------------
  useEffect(() => {
    const fetchShowrooms = async () => {
      try {
        const res = await axios.get("/api/showrooms");

        setShowrooms(res.data.showrooms || []);
      } catch (err) {
        console.log(err);
      }
    };

    fetchShowrooms();
  }, []);

  // ---------------- RESET ----------------
  useEffect(() => {
    if (!showroomId) return;

    setSelectedVariants({});
    setOpenProduct(null);
  }, [showroomId]);

  // ---------------- PRODUCTS ----------------
  const { data, fetchNextPage, hasNextPage, isLoading } = useProducts(
    search,
    showroomId,
  );

  const products = useMemo(() => {
    return data?.pages?.flat() || [];
  }, [data]);

  // ---------------- LOAD SHOWROOM STOCK ----------------
  useEffect(() => {
    const loadShowroomStock = async () => {
      if (!showroomId) return;

      try {
        const res = await axios.get(
          `/api/showroom-stock?showroomId=${showroomId}`,
        );

        const mapped = {};

        (res.data.data || []).forEach((item) => {
          if (!mapped[item.productId]) {
            mapped[item.productId] = [];
          }

          mapped[item.productId].push({
            variantId: String(item.variantId),
            stock: Number(item.stock || 0),
          });
        });

        setSelectedVariants(mapped);
      } catch (err) {
        console.log(err);
      }
    };

    loadShowroomStock();
  }, [showroomId]);

  // ---------------- INFINITE SCROLL ----------------
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && showroomId) {
        fetchNextPage();
      }
    });

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage, showroomId]);

  // ---------------- TOGGLE VARIANT ----------------
  const toggleVariant = (productId, variantId) => {
    setSelectedVariants((prev) => {
      const list = prev[productId] || [];

      const exists = list.find((v) => v.variantId === variantId);

      return {
        ...prev,
        [productId]: exists
          ? list.filter((v) => v.variantId !== variantId)
          : [...list, { variantId, stock: 1 }],
      };
    });
  };

  // ---------------- UPDATE STOCK ----------------
  const updateStock = (productId, variantId, value) => {
    setSelectedVariants((prev) => ({
      ...prev,

      [productId]: (prev[productId] || []).map((v) =>
        v.variantId === variantId
          ? {
              ...v,
              stock: Number(value),
            }
          : v,
      ),
    }));
  };

  // ---------------- SAVE ----------------
  const handleSave = async () => {
    if (!showroomId) {
      alert("Select showroom first");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        showroomId,

        data: Object.entries(selectedVariants).map(([productId, variants]) => ({
          productId,

          variants: variants
            .filter((v) => Number(v.stock) > 0)
            .map((v) => ({
              variantId: v.variantId,
              stock: Number(v.stock),
            })),
        })),
      };

      await axios.post("/api/stock/allocate-to-showroom", payload);

      alert("Stock allocated successfully");
    } catch (err) {
      console.log(err);

      alert(err?.response?.data?.message || "Save Failed");
    } finally {
      setSaving(false);
    }
  };

  // ---------------- SUMMARY ----------------
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

        if (!variants.length) return null;

        return {
          ...p,
          variants,
        };
      })
      .filter(Boolean);
  }, [products, selectedVariants]);

  // ---------------- UI ----------------
  return (
    <div className="grid grid-cols-12 gap-4 p-4 bg-gray-100 min-h-screen">
      {/* LEFT */}
      <div className="col-span-8 bg-white rounded-2xl p-4">
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
            <option value="">Select Showroom</option>

            {showrooms.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>

          <Button onClick={handleSave} disabled={!showroomId || saving}>
            {saving ? "Saving..." : "Allocate Stock"}
          </Button>
        </div>

        {!showroomId ? (
          <p>Please select showroom</p>
        ) : isLoading ? (
          <p>Loading...</p>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-3">
              {products.map((p) => {
                const count = selectedVariants[p._id]?.length || 0;

                return (
                  <Card
                    key={p._id}
                    className="cursor-pointer"
                    onClick={() => setOpenProduct(p)}
                  >
                    <div className="relative h-36">
                      <Image
                        src={p?.media?.[0]?.secure_url || "/placeholder.png"}
                        fill
                        alt=""
                        className="object-contain"
                      />
                    </div>

                    <CardHeader>
                      <div className="flex justify-between items-center">
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
        <h2 className="font-bold mb-3">Allocated Variants</h2>

        {!showroomId ? (
          <p>Select showroom first</p>
        ) : selectedSummary.length === 0 ? (
          <p>No variants selected</p>
        ) : (
          selectedSummary.map((p) => (
            <div key={p._id} className="border p-2 rounded mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Image
                  src={p.media?.[0]?.secure_url || "/placeholder.png"}
                  width={40}
                  height={40}
                  alt=""
                  className="rounded"
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
                    className="bg-gray-100 p-2 rounded mt-1 flex justify-between items-center"
                  >
                    <div>
                      <div className="text-xs">
                        {v.color} - {v.size}
                      </div>

                      {selected && (
                        <input
                          type="number"
                          min={1}
                          value={selected.stock}
                          onChange={(e) =>
                            updateStock(p._id, v._id, e.target.value)
                          }
                          className="border mt-1 p-1 w-24 text-xs"
                        />
                      )}
                    </div>

                    <button
                      onClick={() => toggleVariant(p._id, v._id)}
                      className="text-red-500 text-sm"
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
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white p-4 rounded w-[420px]">
            <h2 className="font-bold mb-3">{openProduct.name}</h2>

            {openProduct.variants.map((v) => {
              const selected = selectedVariants?.[openProduct._id]?.find(
                (x) => x.variantId === v._id,
              );

              return (
                <div
                  key={v._id}
                  className={`border p-2 rounded mb-2 ${
                    selected ? "bg-green-100" : ""
                  }`}
                >
                  <div className="flex justify-between">
                    <span>
                      {v.color} - {v.size}
                    </span>

                    <button
                      onClick={() => toggleVariant(openProduct._id, v._id)}
                      className="border px-2 py-1 rounded text-xs"
                    >
                      {selected ? "Remove" : "Select"}
                    </button>
                  </div>

                  {selected && (
                    <input
                      type="number"
                      min={1}
                      value={selected.stock}
                      onChange={(e) =>
                        updateStock(openProduct._id, v._id, e.target.value)
                      }
                      className="border p-1 mt-2 w-full"
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
