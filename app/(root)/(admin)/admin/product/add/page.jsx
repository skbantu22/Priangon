"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import ProductForm from "@/components/ui/Application/Admin/products/ProductForm";
import { ADMIN_PRODUCT_SHOW } from "@/Route/Adminpannelroute";
import { showToast } from "@/lib/showToast";

export default function AddProduct() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const save = async (values, simpleItem, variants) => {
    setSaving(true);
    try {
      const { data } = await axios.post("/api/product/create", values);
      const created = data?.data;

      if (!data?.success || !created?._id) {
        showToast("error", data?.message || "Could not save product");
        return false;
      }

      // a simple product sells as one "Default" item; a variant product
      // brings the lines typed in on the form
      const lines =
        values.productType === "simple"
          ? [{ color: "Default", size: "Standard", barcode: simpleItem.barcode, stock: Number(simpleItem.stock) || 0 }]
          : variants;
      if (lines.length) {
        await axios.post("/api/product-variant/create", { productId: created._id, variants: lines });
      }

      queryClient.invalidateQueries({ queryKey: ["product-list"] });
      queryClient.invalidateQueries({ queryKey: ["pos-products"] });

      showToast(
        "success",
        values.productType === "simple" ? "Product saved and ready to sell." : `Product saved with ${lines.length} variants.`,
      );
      router.push(ADMIN_PRODUCT_SHOW);
      return true;
    } catch (error) {
      showToast("error", error?.response?.data?.message || "Could not save product");
      return false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProductForm onSave={save} saving={saving} />
  );
}
