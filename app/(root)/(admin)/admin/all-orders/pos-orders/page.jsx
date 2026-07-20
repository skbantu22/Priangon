"use client";

import { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";

import OrderHeader from "@/components/ui/Application/Admin/pos-orders/OrderHeader";
import OrderSummary from "@/components/ui/Application/Admin/pos-orders/OrderSummary";
import OrderFilters from "@/components/ui/Application/Admin/pos-orders/OrderFilters";
import OrderTable from "@/components/ui/Application/Admin/pos-orders/OrderTable";
import OrderExport from "@/components/ui/Application/Admin/pos/OrderExport";

export default function POSOrdersPage() {
  const auth = useSelector((state) => state.authStore.auth);

  const user = auth?.data?.user;

  const [orders, setOrders] = useState([]);

  const [summary, setSummary] = useState({});

  const [loading, setLoading] = useState(false);

  const [showrooms, setShowrooms] = useState([]);

  // ===============================
  // FILTER STATE
  // ===============================

  const initialFilters = {
    dateFrom: "",
    dateTo: "",

    showroomId: "all",

    paymentMethod: "",

    orderType: "",

    status: "",

    search: "",

    page: 1,

    limit: 25,
  };

  const [filters, setFilters] = useState(initialFilters);

  // ===============================
  // FETCH ORDERS
  // ===============================

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);

      let params = new URLSearchParams();

      let showroomId = filters.showroomId;

      // cashier restriction

      if (user?.role === "cashier" && user?.showroomId) {
        showroomId = user.showroomId;
      }

      if (showroomId && showroomId !== "all") {
        params.append("showroomId", showroomId);
      }

      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== "showroomId") {
          params.append(key, value);
        }
      });

      const url = `/api/showroom-orders/All-showroom-orders?${params.toString()}`;

      console.log(url);
      console.log("Filters:", filters);
      console.log("Payment Method:", filters.paymentMethod);

      const res = await fetch(url);

      const data = await res.json();

      if (data.success) {
        setOrders(data.orders || []);

        setSummary(data.summary || {});
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }, [filters, user]);

  // ===============================
  // SHOWROOM LOAD
  // ===============================

  const fetchShowrooms = async () => {
    try {
      const res = await fetch("/api/showrooms");

      const data = await res.json();

      if (data.success) {
        setShowrooms(data.showrooms || []);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") {
      fetchShowrooms();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user, fetchOrders]);

  // ===============================
  // APPLY FILTER
  // ===============================

  const applyFilter = () => {
    setFilters((prev) => ({
      ...prev,

      page: 1,
    }));
  };

  // ===============================
  // RESET
  // ===============================

  const resetFilter = () => {
    setFilters(initialFilters);
  };

  return (
    <div className="w-full p-3 sm:p-4 md:p-6 space-y-5">
      <OrderHeader />

      <OrderExport orders={orders} />

      <OrderSummary summary={summary} />

      <OrderFilters
        showrooms={showrooms}
        filters={filters}
        setFilters={setFilters}
        applyFilter={applyFilter}
        resetFilter={resetFilter}
      />

      <div
        className="
bg-white 
rounded-xl 
shadow 
overflow-x-auto
"
      >
        <OrderTable orders={orders} loading={loading} refresh={fetchOrders} />
      </div>
    </div>
  );
}
