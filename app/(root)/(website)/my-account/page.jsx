"use client";

import React from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { HiOutlineShoppingBag } from "react-icons/hi2";
import { IoCartOutline } from "react-icons/io5";

import UserPanelLayout from "@/components/ui/Application/website/UserPannelLayout";
import useFetch from "@/hooks/useFetch";
import { WEBSITE_ORDER_DETAILS } from "@/Route/Websiteroute";

const money = (amount) =>
  Number(amount || 0).toLocaleString("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  });

const statusStyles = {
  Placed: "bg-amber-100 text-amber-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Processing: "bg-blue-100 text-blue-700",
  Shipped: "bg-sky-100 text-sky-700",
  Delivered: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
};

const MyAccount = () => {
  const { data: dashboardData } = useFetch("/api/dashboard/user");
  const cartStore = useSelector((store) => store.cartStore);

  const totalOrder = dashboardData?.data?.totalOrder || 0;
  const recentOrders = dashboardData?.data?.recentOrders || [];
  const cartCount = cartStore?.count || 0;

  return (
    <UserPanelLayout>
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="border-b px-4 py-4 sm:px-6">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            View your orders and cart summary.
          </p>
        </div>

        <div className="p-4 sm:p-6">
          {/* Stats */}
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-6">
  <div className="rounded-none border border-neutral-200 bg-white px-6 py-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-neutral-500">Total Orders</p>
        <p className="mt-2 text-3xl font-light text-neutral-900">
          {totalOrder}
        </p>
      </div>
      <HiOutlineShoppingBag className="text-neutral-700" size={26} />
    </div>
  </div>

  <div className="rounded-none border border-neutral-200 bg-white px-6 py-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-neutral-500">Items In Cart</p>
        <p className="mt-2 text-3xl font-light text-neutral-900">
          {cartCount}
        </p>
      </div>
      <IoCartOutline className="text-neutral-700" size={26} />
    </div>
  </div>
</div>
          {/* Recent orders */}
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                Recent Orders
              </h2>
            </div>

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
                              statusStyles[order.status] ||
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
                          statusStyles[order.status] ||
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
          </div>
        </div>
      </div>
    </UserPanelLayout>
  );
};

export default MyAccount;