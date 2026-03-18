"use client";

import React from "react";
import Link from "next/link";
import { useSelector } from "react-redux";

import UserPanelLayout from "@/components/ui/Application/website/UserPannelLayout";
import Breadcums from "@/components/ui/Application/Admin/Breadcums";
import useFetch from "@/hooks/useFetch";
import { WEBSITE_ORDER_DETAILS, WEBSITE_ORDERS_DETAILS } from "@/Route/Websiteroute";

const breadCrumbData = [
  { label: "Home", href: "/" },
  { label: "Orders" },
];

const money = (amount) =>
  Number(amount || 0).toLocaleString("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  });

const statusStyles = {
  pending: "bg-yellow-100 text-yellow-700",
  placed: "bg-blue-100 text-blue-700",
  confirmed: "bg-indigo-100 text-indigo-700",
  processing: "bg-purple-100 text-purple-700",
  shipped: "bg-cyan-100 text-cyan-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const Orders = () => {
  const { data: dashboardData, loading } = useFetch("/api/user-order");

  console.log("dashboardData:", dashboardData);
  const cartStore = useSelector((store) => store.cartStore);

const recentOrders = dashboardData?.data?.orders || [];
const totalOrder = recentOrders.length;
  const cartCount = cartStore?.count || 0;

  return (
    <div>
     


      <UserPanelLayout>
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="border-b px-4 py-4 sm:px-6">

            {/* Breadcrumb */}
  <div className="mb-4">
    <Breadcums items={breadCrumbData} />
  </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
              Orders
            </h1>

            <div className="mt-3 flex flex-wrap gap-3">
             

             
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="text-center text-sm text-gray-500">Loading...</div>
            ) : (
              <>
                {/* Desktop / tablet table */}
                <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-200">
                  <table className="w-full min-w-[700px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Sr. No.
                        </th>
                        <th className="p-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Order ID
                        </th>
                        <th className="p-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Total Item
                        </th>
                        <th className="p-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Amount
                        </th>
                        <th className="p-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {recentOrders.length > 0 ? (
                        recentOrders.map((order, i) => (
                          <tr
                            key={order._id}
                            className="border-t border-gray-200 hover:bg-gray-50 transition-colors"
                          >
                            <td className="p-4 text-sm font-medium text-gray-700">
                              {i + 1}
                            </td>

                            <td className="p-4 text-sm">
                              {order.orderNumber ? (
                                <Link
                                  href={WEBSITE_ORDER_DETAILS(order.orderNumber)}
                                  className="font-semibold text-primary hover:underline"
                                >
                                  {order.orderNumber}
                                </Link>
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </td>

                            <td className="p-4 text-sm text-gray-600">
                              {order.items?.length || 0} Items
                            </td>

                            <td className="p-4 text-sm font-semibold text-gray-900">
                              {money(order.total)}
                            </td>

                            <td className="p-4">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                  statusStyles[order.status?.toLowerCase()] ||
                                  "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {order.status || "Placed"}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            className="p-8 text-center text-sm text-gray-500"
                          >
                            No recent orders found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="space-y-4 md:hidden">
                  {recentOrders.length > 0 ? (
                    recentOrders.map((order, i) => (
                      <div
                        key={order._id}
                        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                              Order {i + 1}
                            </p>

                            {order.orderNumber ? (
                              <Link
                                href={WEBSITE_ORDER_DETAILS(order.orderNumber)}
                                className="mt-1 inline-block text-sm font-semibold text-primary hover:underline break-all"
                              >
                                {order.orderNumber}
                              </Link>
                            ) : (
                              <p className="mt-1 text-sm text-gray-400">N/A</p>
                            )}
                          </div>

                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${
                              statusStyles[order.status?.toLowerCase()] ||
                              "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {order.status || "Placed"}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3">
                          <div>
                            <p className="text-xs text-gray-500">Items</p>
                            <p className="mt-1 text-sm font-semibold text-gray-900">
                              {order.items?.length || 0}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500">Amount</p>
                            <p className="mt-1 text-sm font-semibold text-gray-900">
                              {money(order.total)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                      No recent orders found.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </UserPanelLayout>
    </div>
  );
};

export default Orders;