"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";

import WarehouseHeader from "@/components/ui/Application/Admin/warehouse/WarehouseHeader";
import ProductGrid from "@/components/ui/Application/Admin/warehouse/ProductGrid";
import ProductModal from "@/components/ui/Application/Admin/warehouse/ProductVariantsModal";
import HistoryTab from "@/components/ui/Application/Admin/warehouse/HistoryList";

export default function WarehousePage() {
  const [data, setData] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const [tab, setTab] = useState("stock");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // ================= LOAD STOCK (FIXED WITH RETURN) =================
  const loadStock = useCallback(async () => {
    try {
      setLoading(true);

      const res = await axios.get("/api/warehouse-stock");
      const freshData = res.data?.data || [];

      // ১. পেজের পেছনের মেইন গ্রিড আপডেট করার জন্য
      setData([...freshData]);

      // 👑 ২. নতুন ডেটা রিটার্ন করা হচ্ছে যেন ProductModal এটি পড়তে পারে (সবচেয়ে গুরুত্বপূর্ণ পরিবর্তন)
      return freshData;
    } catch (err) {
      console.error("Stock load failed:", err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ================= LOAD HISTORY =================
  const loadHistory = useCallback(async () => {
    try {
      const res = await axios.get("/api/inventory/history");
      setHistory([...(res.data?.data || [])]);
    } catch (err) {
      console.error("History load failed:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadStock();
  }, [loadStock]);

  // Load history when tab changes
  useEffect(() => {
    if (tab === "history") {
      loadHistory();
    }
  }, [tab, loadHistory]);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <WarehouseHeader
        data={data}
        tab={tab}
        setTab={setTab}
        search={search}
        setSearch={setSearch}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
      />

      {tab === "stock" && (
        <ProductGrid
          data={data}
          loading={loading}
          search={search}
          activeCategory={activeCategory}
          onProductClick={(product) => setSelectedProduct(product)}
        />
      )}

      {tab === "history" && <HistoryTab history={history} />}

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          refresh={loadStock} // 👈 এই ফাংশনটি এখন রিটার্ন করা ফ্রেশ ডেটা মোডালে পাঠিয়ে দেবে
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
