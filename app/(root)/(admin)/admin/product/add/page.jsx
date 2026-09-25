"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import ProductForm from "@/components/ui/Application/Admin/products/ProductForm";
import { ADMIN_PRODUCT_EDIT, ADMIN_PRODUCT_SHOW } from "@/Route/Adminpannelroute";
import { showToast } from "@/lib/showToast";

export default function AddProduct() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const save = async (values, simpleItem) => {
    setSaving(true);
    try {
      const { data } = await axios.post("/api/product/create", values);
      const created = data?.data;

      if (!data?.success || !created?._id) {
        showToast("error", data?.message || "Could not save product");
        return false;
      }

      // a simple product sells as one "Default" item: create it right away
      if (values.productType === "simple") {
        await axios.post("/api/product-variant/create", {
          productId: created._id,
          variants: [{ color: "Default", size: "Standard", barcode: simpleItem.barcode, stock: Number(simpleItem.stock) || 0 }],
        });
      }

      queryClient.invalidateQueries({ queryKey: ["product-list"] });
      queryClient.invalidateQueries({ queryKey: ["pos-products"] });

      if (values.productType === "simple") {
        showToast("success", "Product saved and ready to sell.");
        router.push(ADMIN_PRODUCT_SHOW);
      } else {
        showToast("success", "Product saved. Now add its variants (color / storage).");
        router.push(ADMIN_PRODUCT_EDIT(created._id));
      }
      return true;
    } catch (error) {
      showToast("error", error?.response?.data?.message || "Could not save product");
      return false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProductForm
      onSave={save}
      saving={saving}
      footerNote="Variant product: colors / storage and their barcodes are added on the next screen."
    />
  );
}
