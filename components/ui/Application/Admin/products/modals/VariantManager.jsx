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

  const [bulkData, setBulkData] = useState({
    purchasePrice: "",
    sellingPrice: "",
    discountPercent: "",
    discountAmount: "",
    afterDiscount: "",
    openingStock: "",
    openingStockPurchasePrice: "",
  });

  // =============================
  // PRICE AUTO SET
  // =============================
  useEffect(() => {
    const mrp = Number(productMrp || 0);
    const sale = Number(productSellingPrice || 0);

    const discountPercent =
      mrp > 0 ? Math.round(((mrp - sale) / mrp) * 100) : 0;

    const discountAmount = mrp - sale;

    setBulkData((prev) => ({
      ...prev,
      purchasePrice: mrp,
      sellingPrice: sale,
      discountPercent,
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
      console.log(err);
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

          // Calculate missing values if not stored in DB
          const discountAmount =
            item.discountAmount ??
            Math.round((sellingPrice * discountPercentage) / 100);

          const afterDiscount =
            item.afterDiscount ?? Math.round(sellingPrice - discountAmount);

          return {
            ...item,
            id: item._id || item.id,
            mrp,
            sellingPrice,
            discountPercentage,
            discountAmount,
            afterDiscount,
            stock: item.stock ?? 0,
          };
        });

        setVariantsList(normalizedData);
      }
    } catch (error) {
      console.log("Load variants error:", error);
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
        id: `temp-${Date.now()}-${index}`, // explicit temporary tag
        isNew: true,
        sortIndex: index + 1,
        sizeColor: `${selectedSize} - ${color}`,
        color,
        size: selectedSize,
        sku: `SKU-${selectedSize}-${color
          .replace(/\s+/g, "")
          .toUpperCase()}-${Date.now().toString().slice(-4)}`,
        barcode: Math.floor(10000000 + Math.random() * 90000000).toString(),
        stock: 0,
        variantImage: imgs[0]?.secure_url || imgs[0]?.url || "",
        media: imgs,
        purchasePrice: mrp,
        sellingPrice: salePrice,
        discountPercent,
        discountAmount,
        afterDiscount: salePrice,
        openingStock: bulkData.openingStock || 0,
        openingStockPurchasePrice: bulkData.openingStockPurchasePrice || 0,
      };
    });

    // Merge existing persisted variants instead of replacing them wholesale
    setVariantsList((prev) => [...prev, ...generated]);
    showToast("success", "Variants Appended to Grid");
  };

  // =============================
  // APPLY BULK SETTINGS
  // =============================
  const handleApplyToAll = (data) => {
    setVariantsList((prev) => {
      const updated = prev.map((row) => ({
        ...row,
        purchasePrice:
          data.purchasePrice !== "" ? Number(data.purchasePrice) : row.mrp,

        sellingPrice:
          data.sellingPrice !== ""
            ? Number(data.sellingPrice)
            : row.sellingPrice,

        discountPercent:
          data.discountPercent !== ""
            ? Number(data.discountPercent)
            : row.discountPercent,

        discountAmount:
          data.discountAmount !== ""
            ? Number(data.discountAmount)
            : row.discountAmount,

        afterDiscount:
          data.afterDiscount !== ""
            ? Number(data.afterDiscount)
            : row.afterDiscount,

        openingStock:
          data.openingStock !== ""
            ? Number(data.openingStock)
            : row.openingStock,

        openingStockPurchasePrice:
          data.openingStockPurchasePrice !== ""
            ? Number(data.openingStockPurchasePrice)
            : row.openingStockPurchasePrice,
      }));

      console.log("Updated Variants:", updated);

      return updated;
    });

    showToast("success", "Applied to all variants");
  };

  // =============================
  // INLINE ACTIONS: DELETE VARIANT
  // =============================
  const handleDeleteVariant = async (variantId, isNew) => {
    if (isNew || String(variantId).startsWith("temp-")) {
      // Unsaved local variant: remove directly from UI state
      setVariantsList((prev) => prev.filter((v) => v.id !== variantId));
      showToast("success", "Unsaved variant removed");
      return;
    }

    try {
      // Persisted variant: delete from the database directly
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
          // Reassign primary image to next available file if primary was deleted
          variantImage:
            filteredMedia[0]?.secure_url || filteredMedia[0]?.url || "",
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

      // New variants (not yet saved)
      const newVariants = variantsList.filter(
        (v) => String(v.id).startsWith("temp-") || v.isNew,
      );

      // Existing variants (already in DB)
      const existingVariants = variantsList.filter(
        (v) => !String(v.id).startsWith("temp-") && !v.isNew,
      );

      // Create new variants
      if (newVariants.length) {
        await axios.post("/api/product-variant/create", {
          productId,
          variants: newVariants,
          videos: videoLinks,
        });
      }

      // Update existing variants
      if (existingVariants.length) {
        await axios.put("/api/product-variant/update", {
          variants: existingVariants,
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
  console.log("variantsList", variantsList);
  console.log("Total Variants:", variantsList.length);

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
