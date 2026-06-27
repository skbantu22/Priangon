"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { showToast } from "@/lib/showToast";

import BulkSettings from "./BulkSettings";
import ColorVideoManager from "./ColorVideoManager";
import VariantTable from "./VariantTable";

export default function VariantManager({
  productId,
  queryClient,
  productMrp,
  productSellingPrice,
}) {
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColors, setSelectedColors] = useState([]);
  const [videoLinks, setVideoLinks] = useState({});
  const [colorImages, setColorImages] = useState({});
  const [variantsList, setVariantsList] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [colorPool, setColorPool] = useState([]);

  // Managed to match schema fields + UI tracking aids
  const [bulkData, setBulkData] = useState({
    mrp: "",
    sellingPrice: "",
    discountPercentage: "",
    discountAmount: "", // UI only helper
    afterDiscount: "", // UI only helper
    stock: "",
  });

  // =============================
  // PRICE AUTO SET (SCHEMA SYNC)
  // =============================
  useEffect(() => {
    const mrp = Number(productMrp || 0);
    const sale = Number(productSellingPrice || 0);

    const discountPercentage =
      mrp > 0 ? Math.round(((mrp - sale) / mrp) * 100) : 0;

    const discountAmount = mrp - sale;

    setBulkData((prev) => ({
      ...prev,
      mrp: mrp,
      sellingPrice: sale,
      discountPercentage,
      discountAmount,
      afterDiscount: sale,
    }));
  }, [productMrp, productSellingPrice]);

  // =============================
  // LOAD COLORS
  // =============================
  useEffect(() => {
    fetchColors();
  }, []);

  const fetchColors = async () => {
    try {
      const { data } = await axios.get("/api/color");
      if (data?.success) {
        setColorPool(data.data);
      }
    } catch (err) {
      console.error("Fetch colors error:", err);
    }
  };

  // =============================
  // LOAD VARIANTS FROM DB
  // =============================
  const fetchVariants = useCallback(async () => {
    if (!productId) return;

    try {
      const { data } = await axios.get(
        `/api/product-variant/find?productId=${productId}`,
      );

      if (data?.success) {
        const normalizedData = data.data.map((item) => {
          const mrp = Number(item.mrp ?? 0);
          const sellingPrice = Number(item.sellingPrice ?? 0);
          const discountPercentage = Number(item.discountPercentage ?? 0);

          // Calculate virtual UI parameters dynamically
          const discountAmount = mrp - sellingPrice;
          const afterDiscount = sellingPrice;

          return {
            ...item,
            id: item._id || item.id,
            mrp,
            sellingPrice,
            discountPercentage,
            discountAmount,
            afterDiscount,
            stock: item.stock ?? 0,
            priceSource: item.priceSource || "PRODUCT",
          };
        });

        setVariantsList(normalizedData);
      }
    } catch (error) {
      console.error("Load variants error:", error);
    }
  }, [productId]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  // =============================
  // GENERATE VARIANTS (UI ONLY)
  // =============================
  const handleGenerateVariants = () => {
    if (!selectedSize || !selectedColors.length) {
      showToast("error", "Select Size and Colors first!");
      return;
    }

    for (const color of selectedColors) {
      if (!colorImages[color] || colorImages[color].length === 0) {
        showToast("error", `Upload image for color ${color}`);
        return;
      }
    }

    const mrp = Number(productMrp || 0);
    const salePrice = Number(productSellingPrice || 0);

    const discountAmount = mrp - salePrice;
    const discountPercent =
      mrp > 0 ? Math.round(((mrp - salePrice) / mrp) * 100) : 0;

    const generated = selectedColors.map((color, index) => {
      const imgs = colorImages[color] || [];

      return {
        id: `temp-${Date.now()}-${index}`,
        isNew: true,
        product: productId,
        color,
        size: selectedSize,
        sku: `SKU-${selectedSize}-${color
          .replace(/\s+/g, "")
          .toUpperCase()}-${Date.now().toString().slice(-4)}`,
        barcode: Math.floor(10000000 + Math.random() * 90000000).toString(),
        stock: Number(bulkData.stock) || 0,
        media: imgs,
        mrp,
        sellingPrice: salePrice,
        priceSource: "PRODUCT",
        isActive: true,

        // UI Helpers kept local for grid display equations
        discountPercentage: discountPercent,
        discountAmount,
        afterDiscount: salePrice,
      };
    });

    setVariantsList((prev) => [...prev, ...generated]);
    showToast("success", "Variants Appended to Grid");
  };

  // =============================
  // APPLY BULK SETTINGS (FIXED FOR REACT RE-RENDER)
  // =============================
  const handleApplyToAll = (data) => {
    setVariantsList((prev) => {
      const updated = prev.map((row) => {
        // 1. Handle purchase/MRP pricing
        const incomingMrp =
          data.purchasePrice !== undefined && data.purchasePrice !== ""
            ? data.purchasePrice
            : data.mrp;

        // 2. SAFETY FIX FOR STOCK:
        // This maps 'openingStock', 'stockCount', or 'stock' directly to your state.
        const incomingStock =
          data.stock !== undefined && data.stock !== ""
            ? data.stock
            : data.openingStock !== undefined && data.openingStock !== ""
              ? data.openingStock
              : data.stockCount;

        const updatedRow = {
          ...row,
          mrp:
            incomingMrp !== undefined && incomingMrp !== ""
              ? Number(incomingMrp)
              : row.mrp,
          sellingPrice:
            data.sellingPrice !== "" && data.sellingPrice !== undefined
              ? Number(data.sellingPrice)
              : row.sellingPrice,

          // CRITICAL LINE: Assign the normalized stock configuration safely
          stock:
            incomingStock !== "" && incomingStock !== undefined
              ? Number(incomingStock)
              : row.stock,

          priceSource:
            incomingMrp !== "" || data.sellingPrice !== ""
              ? "CUSTOM"
              : row.priceSource,
        };

        // 3. Recalculate working UI fields for visual consistency
        const calculatedMrp = Number(updatedRow.mrp) || 0;
        const calculatedSelling = Number(updatedRow.sellingPrice) || 0;

        updatedRow.discountAmount = calculatedMrp - calculatedSelling;
        updatedRow.discountPercentage =
          calculatedMrp > 0
            ? Math.round(
                ((calculatedMrp - calculatedSelling) / calculatedMrp) * 100,
              )
            : 0;
        updatedRow.afterDiscount = calculatedSelling;

        return updatedRow;
      });

      return [...updated];
    });

    if (typeof showToast === "function") {
      showToast("success", "Applied to all variants");
    }
  };
  // =============================
  // INLINE ACTIONS: DELETE VARIANT
  // =============================
  const handleDeleteVariant = async (variantId, isNew) => {
    if (isNew || String(variantId).startsWith("temp-")) {
      setVariantsList((prev) => prev.filter((v) => v.id !== variantId));
      showToast("success", "Unsaved variant removed");
      return;
    }

    try {
      const { data } = await axios.delete(
        `/api/product-variant/delete/${variantId}`,
      );
      if (data?.success) {
        showToast("success", "Variant deleted from database");
        setVariantsList((prev) => prev.filter((v) => v.id !== variantId));
      }
    } catch (error) {
      showToast("error", error?.response?.data?.message || "Deletion failed");
    }
  };

  // =============================
  // INLINE ACTIONS: REMOVE IMAGE
  // =============================
  const handleRemoveVariantImage = (variantId, mediaIdToRemove) => {
    setVariantsList((prev) =>
      prev.map((variant) => {
        if (variant.id !== variantId) return variant;

        const filteredMedia = (variant.media || []).filter(
          (m) => m._id !== mediaIdToRemove,
        );

        return {
          ...variant,
          media: filteredMedia,
        };
      }),
    );
  };

  // =============================
  // SAVE / UPDATE LIFECYCLE
  // =============================
  const handleSaveVariants = async () => {
    try {
      setIsSaving(true);

      const newVariants = variantsList.filter(
        (v) => String(v.id).startsWith("temp-") || v.isNew,
      );

      const existingVariants = variantsList.filter(
        (v) => !String(v.id).startsWith("temp-") && !v.isNew,
      );

      // Cleans UI parameters out of payload array right before transmission to matching schema fields
      const sanitizePayload = (variantsArray) =>
        variantsArray.map(
          ({ discountAmount, afterDiscount, id, isNew, ...schemaFields }) =>
            schemaFields,
        );

      // Create new variants
      if (newVariants.length) {
        await axios.post("/api/product-variant/create", {
          productId,
          variants: sanitizePayload(newVariants),
          videos: videoLinks,
        });
      }

      // Update existing variants
      if (existingVariants.length) {
        await axios.put("/api/product-variant/update", {
          variants: sanitizePayload(existingVariants),
        });
      }

      showToast("success", "Variants saved successfully!");
      await fetchVariants();
    } catch (error) {
      showToast("error", error?.response?.data?.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 mt-10 max-w-[1200px] mx-auto px-4">
      <ColorVideoManager
        selectedSize={selectedSize}
        setSelectedSize={setSelectedSize}
        selectedColors={selectedColors}
        setSelectedColors={setSelectedColors}
        videoLinks={videoLinks}
        setVideoLinks={setVideoLinks}
        colorImages={colorImages}
        setColorImages={setColorImages}
        colorPool={colorPool}
        onGenerate={handleGenerateVariants}
        queryClient={queryClient}
      />

      <BulkSettings
        bulkData={bulkData}
        setBulkData={setBulkData}
        onApplyAll={handleApplyToAll}
      />

      <VariantTable
        variantsList={variantsList}
        setVariantsList={setVariantsList}
        colorImages={colorImages}
        onSave={handleSaveVariants}
        onDelete={handleDeleteVariant}
        onRemoveImage={handleRemoveVariantImage}
        isSaving={isSaving}
        colorPool={colorPool}
      />
    </div>
  );
}
