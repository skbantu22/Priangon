"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import ProductForm from "@/components/ui/Application/Admin/products/ProductForm";
import { ADMIN_PRODUCT_SHOW } from "@/Route/Adminpannelroute";
import { readPosShowroom, useOpeningStockTill } from "@/lib/posProducts";
import { showToast } from "@/lib/showToast";

export default function AddProduct() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const till = useOpeningStockTill();
  const [saving, setSaving] = useState(false);
  // Keep the newly created product while its variants are being saved. If
  // that request fails, the user can retry without creating a duplicate.
  const [pendingProduct, setPendingProduct] = useState(null);

  const save = async (values, simpleItem, variants) => {
    let productWasCreated = !!pendingProduct;
    setSaving(true);
    try {
      let created = pendingProduct;
      if (!created) {
        const { data } = await axios.post("/api/product/create", values);
        created = data?.data;

        if (!data?.success || !created?._id) {
          showToast("error", data?.message || "Could not save product");
          return { success: false, productCreated: false };
        }
        setPendingProduct(created);
        productWasCreated = true;
      }

      // a simple product sells as one "Default" item; a variant product
      // brings the lines typed in on the form
      const lines =
        values.productType === "simple"
          ? [{ color: "Default", size: "Standard", barcode: simpleItem.barcode, stock: Number(simpleItem.stock) || 0 }]
          : variants;
      if (lines.length) {
        const branchId = readPosShowroom() || till.id;
        const { data } = await axios.post("/api/product-variant/create", {
          productId: created._id,
          location: branchId,
          variants: lines,
        });
        if (!data?.success) throw new Error(data?.message || "Could not save variants");
      }

      setPendingProduct(null);
      queryClient.invalidateQueries({ queryKey: ["product-list"] });
      queryClient.invalidateQueries({ queryKey: ["pos-products"] });

      showToast(
        "success",
        values.productType === "simple" ? "Product saved and ready to sell." : `Product saved with ${lines.length} variants.`,
      );
      router.push(ADMIN_PRODUCT_SHOW);
      return { success: true, productCreated: true };
    } catch (error) {
      const message = error?.response?.data?.message || error.message;
      showToast(
        "error",
        productWasCreated
          ? `${message || "Could not save variants"}. The product is saved; press Save again to retry variants.`
          : message || "Could not save product",
      );
      return { success: false, productCreated: productWasCreated };
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProductForm
      onSave={save}
      saving={saving}
      pendingProduct={pendingProduct}
      footerNote={pendingProduct ? "Product saved. Finish saving its variants before clearing or changing product details." : ""}
    />
  );
}
