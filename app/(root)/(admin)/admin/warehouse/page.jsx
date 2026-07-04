"use client";

import { useEffect, useState } from "react";
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

  // ================= LOAD STOCK =================
  const loadStock = async () => {
    try {
      setLoading(true);

      const res = await axios.get("/api/warehouse-stock");

      setData(res.data?.data || []);
    } catch (err) {
      console.error("Stock load failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // ================= LOAD HISTORY =================
  const loadHistory = async () => {
    try {
      const res = await axios.get("/api/inventory/history");

      setHistory(res.data?.data || []);
    } catch (err) {
      console.error("History load failed:", err);
    }
  };

  // Initial load
  useEffect(() => {
    loadStock();
  }, []);

  // Load history when tab changes
  useEffect(() => {
    if (tab === "history") {
      loadHistory();
    }
  }, [tab]);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* HEADER */}
      <WarehouseHeader
        data={data}
        tab={tab}
        setTab={setTab}
        search={search}
        setSearch={setSearch}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
      />

      {/* STOCK */}
      {tab === "stock" && (
        <ProductGrid
          data={data}
          loading={loading}
          search={search}
          activeCategory={activeCategory}
          onProductClick={(product) => setSelectedProduct(product)}
        />
      )}

      {/* HISTORY */}
      {tab === "history" && <HistoryTab history={history} />}

      {/* PRODUCT MODAL */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          refresh={loadStock}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
