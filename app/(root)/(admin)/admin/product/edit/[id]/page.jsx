"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import ProductForm from "@/components/ui/Application/Admin/products/ProductForm";
import VariantList from "@/components/ui/Application/Admin/products/VariantList";
import { showToast } from "@/lib/showToast";

export default function EditProduct({ params }) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const [product, setProduct] = useState(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  // bumped after a save so the variant table picks up the new price list
  const [version, setVersion] = useState(0);

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get(`/api/product/get/${id}`);
      if (!data?.success) throw new Error(data?.message);
      setProduct(data.data);
    } catch {
      setFailed(true);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (values) => {
    setSaving(true);
    try {
      const { data } = await axios.put("/api/product/update", { ...values, _id: id });
      if (!data?.success) {
        showToast("error", data?.message || "Update failed");
        return false;
      }
      showToast("success", "Product updated");
      queryClient.invalidateQueries({ queryKey: ["product-list"] });
      queryClient.invalidateQueries({ queryKey: ["pos-products"] });
      await load();
      setVersion((v) => v + 1);
      return true;
    } catch (error) {
      showToast("error", error.response?.data?.message || "Update failed");
      return false;
    } finally {
      setSaving(false);
    }
  };

  if (failed) return <p className="p-6 text-center text-red-600">Product not found.</p>;
  if (!product) return <div className="h-[420px] animate-pulse rounded-[8px] bg-slate-100 dark:bg-muted" />;

  return (
    <div className="space-y-4">
      <ProductForm key={version} product={product} onSave={save} saving={saving} />
      <VariantList key={version} product={product} />
    </div>
  );
}
