"use client";

import { useEffect, useState } from "react";
import OrderHeader from "@/components/ui/Application/Admin/pos-orders/OrderHeader";
import OrderSummary from "@/components/ui/Application/Admin/pos-orders/OrderSummary";
import OrderFilters from "@/components/ui/Application/Admin/pos-orders/OrderFilters";
import OrderTable from "@/components/ui/Application/Admin/pos-orders/OrderTable";

export default function POSOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/showroom-orders/All-showroom-orders");
      const data = await res.json();

      if (data.success) {
        setOrders(data.orders || []);
        setSummary(data.summary || {});
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div className="w-full p-3 sm:p-4 md:p-6 space-y-5">
      <OrderHeader />

      <OrderSummary summary={summary} />

      <OrderFilters />

      {/* Responsive Table */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <OrderTable orders={orders} loading={loading} refresh={fetchOrders} />
      </div>
    </div>
  );
}
