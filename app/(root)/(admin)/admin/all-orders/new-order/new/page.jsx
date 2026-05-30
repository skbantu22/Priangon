"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
/* Components */
import OrdersTable from "@/components/ui/Application/Admin/orders/OrdersTable";
import StatusTabs from "@/components/ui/Application/Admin/orders/StatusTabs";
import Pagination from "@/components/ui/Application/Admin/orders/Pagination";
import OrderDetailDrawer from "@/components/ui/Application/Admin/orders/OrderDetailDrawer";
import CourierModal from "@/components/ui/Application/Admin/orders/Modals/CourierModal";
import CreateOrderModal from "@/components/ui/Application/Admin/orders/Modals/CreateOrderModal";
import AdvancedFilterPanel from "@/components/ui/Application/Admin/orders/AdvancedFilterPanel";
import BulkActionsPanel from "@/components/ui/Application/Admin/orders/BulkActionsPanel";

import { useDispatch } from "react-redux";

import { incrementOrderNotification } from "@/store/reducer/notificationSlice";

/* Icons */
import {
  ShoppingBag,
  Plus,
  Search,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Download,
  FileSpreadsheet,
  FileJson,
} from "lucide-react";

const Page = () => {
  /* =========================
     STATES
  ========================= */

  const [orders, setOrders] = useState([]);
  const latestOrderIdRef = useRef(null);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);

  const [selectedOrders, setSelectedOrders] = useState([]);
  const [showCustomerColumn, setShowCustomerColumn] = useState(true);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");

  const [statusFilter, setStatusFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");

  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const [isCourierModalOpen, setIsCourierModalOpen] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [courierTargets, setCourierTargets] = useState([]);

  const [selectedCarrier, setSelectedCarrier] = useState("");

  const [sortBy, setSortBy] = useState("");

  const [newOrder, setNewOrder] = useState({
    customerName: "",
    customerEmail: "",
    itemName: "",
    itemPrice: "",
    paymentMethod: "Credit Card",
    status: "Pending",
    carrier: "UPS",
    shippingAddress: "",
  });

  /* =========================
     API FETCH
  ========================= */

  useEffect(() => {
    fetchOrders();

    const interval = setInterval(() => {
      fetchOrders();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/orders");

      const data = await res.json();

      const ordersData = data.data || [];

      // newest order
      const newestOrderId = ordersData[0]?._id;

      console.log("OLD:", latestOrderIdRef.current);
      console.log("NEW:", newestOrderId);

      // detect new order
      if (
        latestOrderIdRef.current &&
        newestOrderId &&
        newestOrderId !== latestOrderIdRef.current
      ) {
        dispatch(incrementOrderNotification());
      }

      // save latest id
      latestOrderIdRef.current = newestOrderId;

      setOrders(ordersData);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     FILTERED ORDERS
  ========================= */

  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    /* Search */
    if (searchQuery) {
      filtered = filtered.filter(
        (order) =>
          order?.orderNumber
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          order?.customer?.name
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          order?.items?.some((item) =>
            item?.name?.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
      );
    }

    /* Status */
    if (statusFilter !== "All") {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    /* Payment */
    if (paymentFilter !== "All") {
      filtered = filtered.filter(
        (order) => order?.payment?.method === paymentFilter,
      );
    }

    /* Price */
    if (minPrice) {
      filtered = filtered.filter((order) => order.total >= Number(minPrice));
    }

    if (maxPrice) {
      filtered = filtered.filter((order) => order.total <= Number(maxPrice));
    }

    return filtered;
  }, [orders, searchQuery, statusFilter, paymentFilter, minPrice, maxPrice]);

  /* =========================
     PAGINATION
  ========================= */

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  /* =========================
     STATUS COUNTS
  ========================= */

  const statusCounts = {
    All: orders.length,
    Pending: orders.filter((o) => o.status === "pending").length,
    Processing: orders.filter((o) => o.status === "processing").length,
    Shipped: orders.filter((o) => o.status === "shipped").length,
    Delivered: orders.filter((o) => o.status === "delivered").length,
    Cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  /* =========================
     FUNCTIONS
  ========================= */

  const handleDeleteOrders = async (ids) => {
    try {
      const deleteIds = Array.isArray(ids) ? ids : [ids];

      await fetch("/api/orders", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: deleteIds,
        }),
      });

      setOrders((prev) => prev.filter((o) => !deleteIds.includes(o._id)));

      setSelectedOrders([]);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedOrders((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === paginatedOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(paginatedOrders.map((o) => o._id));
    }
  };

  const handleSort = (field) => {
    setSortBy(field);
  };

  const triggerCourierModal = (ids) => {
    setCourierTargets(ids || selectedOrders);
    setIsCourierModalOpen(true);
  };

  const handleSetStatus = (ids, status) => {
    const updateIds = Array.isArray(ids) ? ids : [ids];

    setOrders((prev) =>
      prev.map((order) =>
        updateIds.includes(order._id) ? { ...order, status } : order,
      ),
    );
  };

  const exportData = (type) => {
    if (type === "json") {
      const blob = new Blob([JSON.stringify(filteredOrders, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");

      a.href = url;
      a.download = "orders.json";
      a.click();
    }

    if (type === "csv") {
      const headers = ["ID", "Customer", "Status", "Total"];

      const rows = filteredOrders.map((o) => [
        o._id,
        o.customer?.name,
        o.status,
        o.total,
      ]);

      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join(
        "\n",
      );

      const blob = new Blob([csv], {
        type: "text/csv",
      });

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");

      a.href = url;
      a.download = "orders.csv";
      a.click();
    }
  };

  const handleConfirmCourierDispatch = () => {
    handleSetStatus(courierTargets, "Shipped");

    setIsCourierModalOpen(false);

    setSelectedCarrier("");
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        customerName: newOrder.customerName,
        customerEmail: newOrder.customerEmail,
        itemName: newOrder.itemName,
        itemPrice: Number(newOrder.itemPrice),
        paymentMethod: newOrder.paymentMethod,
        status: newOrder.status,
        carrier: newOrder.carrier,
        shippingAddress: newOrder.shippingAddress,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const created = await res.json();

      setOrders((prev) => [created, ...prev]);

      setIsCreateModalOpen(false);

      setNewOrder({
        customerName: "",
        customerEmail: "",
        itemName: "",
        itemPrice: "",
        paymentMethod: "Credit Card",
        status: "Pending",
        carrier: "UPS",
        shippingAddress: "",
      });
    } catch (error) {
      console.error(error);
    }
  };

  /* =========================
     RETURN
  ========================= */

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans antialiased transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2.5 rounded-xl">
              <ShoppingBag className="w-6 h-6" />
            </div>

            <div>
              <h1 className="text-xl font-bold">OrderHub</h1>

              <p className="text-xs text-slate-500">
                Advanced Merchant Dashboard
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            New Order
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <StatusTabs
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          setCurrentPage={setCurrentPage}
          addNotification={() => {}}
          statusCounts={statusCounts}
        />

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Controls */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="w-full md:w-80 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

              <input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setShowCustomerColumn(!showCustomerColumn)}
                className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl border"
              >
                {showCustomerColumn ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}

                {showCustomerColumn ? "Customer On" : "Customer Off"}
              </button>

              <button
                onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl border"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </button>

              <div className="relative group">
                <button className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold border rounded-xl">
                  <Download className="w-4 h-4" />
                  Export
                </button>

                <div className="absolute right-0 top-full mt-1.5 w-40 bg-white dark:bg-slate-800 border rounded-xl shadow-xl hidden group-hover:block z-20">
                  <div className="p-1.5 space-y-1">
                    <button
                      onClick={() => exportData("csv")}
                      className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      Export CSV
                    </button>

                    <button
                      onClick={() => exportData("json")}
                      className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <FileJson className="w-4 h-4 text-amber-600" />
                      Export JSON
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <AdvancedFilterPanel
            isOpen={isFilterPanelOpen}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            paymentFilter={paymentFilter}
            setPaymentFilter={setPaymentFilter}
            minPrice={minPrice}
            setMinPrice={setMinPrice}
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
            setCurrentPage={setCurrentPage}
            addNotification={() => {}}
            filteredCount={filteredOrders.length}
          />

          {/* Bulk */}
          <BulkActionsPanel
            selectedOrders={selectedOrders}
            triggerCourierModal={triggerCourierModal}
            handleSetStatus={handleSetStatus}
            handleDeleteOrders={handleDeleteOrders}
            setSelectedOrders={setSelectedOrders}
          />

          {/* Table */}
          <OrdersTable
            paginatedOrders={paginatedOrders}
            selectedOrders={selectedOrders}
            handleSelectRow={handleSelectRow}
            handleSelectAll={handleSelectAll}
            filteredOrders={filteredOrders}
            showCustomerColumn={showCustomerColumn}
            sortBy={sortBy}
            handleSort={handleSort}
            setSelectedOrderDetail={setSelectedOrderDetail}
            triggerCourierModal={triggerCourierModal}
            handleSetStatus={handleSetStatus}
            handleDeleteOrders={handleDeleteOrders}
            loading={loading}
          />

          {/* Pagination */}
          <Pagination
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            filteredLength={filteredOrders.length}
            totalPages={totalPages}
          />
        </div>
      </main>

      {/* Drawer */}
      <OrderDetailDrawer
        order={selectedOrderDetail}
        onClose={() => setSelectedOrderDetail(null)}
      />

      {/* Courier */}
      <CourierModal
        isOpen={isCourierModalOpen}
        onClose={() => setIsCourierModalOpen(false)}
        targetsCount={courierTargets.length}
        selectedCarrier={selectedCarrier}
        setSelectedCarrier={setSelectedCarrier}
        onConfirm={handleConfirmCourierDispatch}
      />

      {/* Create */}
      <CreateOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        newOrder={newOrder}
        setNewOrder={setNewOrder}
        onSubmit={handleCreateOrder}
      />
    </div>
  );
};

export default Page;
