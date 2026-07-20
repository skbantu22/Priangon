"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import OrderDetailsModal from "./OrderDetailsModal";
import OrderTable from "./OrderTable";
import { useSelector } from "react-redux";
export default function ShowroomOrderRequestPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedOrder, setSelectedOrder] = useState(null);

  const [approving, setApproving] = useState(false);
  const user = useSelector((state) => state.authStore.auth);

  // ===============================
  // LOAD ORDERS
  // ===============================

  const loadOrders = async () => {
    try {
      setLoading(true);

      const res = await axios.get("/api/showroom-order-request");
      console.log("Orders Response:", res.data);
      console.log("Orders:", res.data.data);

      setOrders(res.data.data || []);
    } catch (err) {
      console.error("Load orders error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // ===============================
  // APPROVE
  // SHOWROOM -> WAREHOUSE
  // CREATE ORDER
  // ===============================

  const handleApprove = async (order) => {
    try {
      setApproving(true);

      const currentUser = user?.data?.user || user?.user || user;

      const adminId =
        currentUser?._id || currentUser?.id || currentUser?.userId;

      if (!adminId) {
        console.log("AUTH USER:", user);
        alert("Admin user not found");
        return;
      }

      const payload = {
        orderId: order._id,
        userId: adminId,
      };

      console.log("APPROVE PAYLOAD:", payload);

      const res = await axios.put(
        "/api/showroom-order-request/approve",
        payload,
      );

      if (res.data.success) {
        await loadOrders();

        setSelectedOrder(null);

        alert("Order Approved Successfully");
      }
    } catch (err) {
      console.error("Approve error:", err);

      alert(err.response?.data?.message || "Approve Failed");
    } finally {
      setApproving(false);
    }
  };

  // ===============================
  // REJECT
  // ===============================

  const handleReject = async (order) => {
    if (!confirm("Reject this order?")) return;

    try {
      const res = await axios.put("/api/showroom-order-request/reject", {
        orderId: order._id,
      });

      if (res.data.success) {
        await loadOrders();

        setSelectedOrder(null);

        alert("Order Rejected");
      }
    } catch (err) {
      console.error("Reject error:", err);

      alert(err.response?.data?.message || "Reject Failed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <OrderTable
        orders={orders}
        loading={loading}
        onRefresh={loadOrders}
        onView={setSelectedOrder}
      />

      <OrderDetailsModal
        open={!!selectedOrder}
        order={selectedOrder}
        approving={approving}
        onClose={() => setSelectedOrder(null)}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}
