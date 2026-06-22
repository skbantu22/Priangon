"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function ModeratorPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [month, setMonth] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const months = [
    { label: "January", value: "01" },
    { label: "February", value: "02" },
    { label: "March", value: "03" },
    { label: "April", value: "04" },
    { label: "May", value: "05" },
    { label: "June", value: "06" },
    { label: "July", value: "07" },
    { label: "August", value: "08" },
    { label: "September", value: "09" },
    { label: "October", value: "10" },
    { label: "November", value: "11" },
    { label: "December", value: "12" },
  ];

  const fetchData = async (selectedMonth = "", fromDate = "", toDate = "") => {
    setLoading(true);

    try {
      const year = new Date().getFullYear();
      let url = `/api/moderator/stats?`;

      const params = [];

      if (selectedMonth) params.push(`month=${year}-${selectedMonth}`);
      if (fromDate) params.push(`from=${fromDate}`);
      if (toDate) params.push(`to=${toDate}`);

      url += params.join("&");

      const res = await axios.get(url);

      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.log(err);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="p-4 space-y-5">
      {/* TITLE */}
      <h1 className="text-xl md:text-2xl font-bold">Moderator Analytics</h1>

      {/* FILTERS */}
      <div className="flex flex-col md:flex-row gap-2 md:items-center">
        {/* MONTH */}
        <select
          value={month}
          onChange={(e) => {
            setMonth(e.target.value);
            fetchData(e.target.value, from, to);
          }}
          className="border p-2 rounded w-full md:w-48"
        >
          <option value="">All Months</option>
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        {/* FROM */}
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="border p-2 rounded w-full md:w-auto"
        />

        {/* TO */}
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="border p-2 rounded w-full md:w-auto"
        />

        {/* SEARCH */}
        <button
          onClick={() => fetchData(month, from, to)}
          className="bg-black text-white px-4 py-2 rounded w-full md:w-auto"
        >
          Search
        </button>

        {/* RESET */}
        <button
          onClick={() => {
            setMonth("");
            setFrom("");
            setTo("");
            fetchData("", "", "");
          }}
          className="bg-gray-200 px-4 py-2 rounded w-full md:w-auto"
        >
          Reset
        </button>
      </div>

      {/* ================= DESKTOP TABLE ================= */}
      <div className="hidden md:block border rounded-xl overflow-x-auto bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-xs uppercase">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-center">Orders</th>
              <th className="p-3 text-center text-green-600">Delivered</th>
              <th className="p-3 text-center text-red-600">Cancelled</th>
              <th className="p-3 text-center">Revenue</th>
            </tr>
          </thead>

          <tbody>
            {data.map((m) => (
              <tr key={m._id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-medium">{m.name}</td>
                <td className="p-3 text-gray-600">{m.email}</td>
                <td className="p-3 text-center">{m.totalOrders}</td>
                <td className="p-3 text-center text-green-600 font-semibold">
                  {m.delivered}
                </td>
                <td className="p-3 text-center text-red-600 font-semibold">
                  {m.cancelled}
                </td>
                <td className="p-3 text-center font-bold">
                  ৳ {m.totalRevenue}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ================= MOBILE CARD VIEW ================= */}
      <div className="md:hidden space-y-3">
        {data.map((m) => (
          <div key={m._id} className="border rounded-xl p-4 bg-white shadow-sm">
            <div className="mb-2">
              <p className="font-bold">{m.name}</p>
              <p className="text-xs text-gray-500">{m.email}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <p>
                Orders: <b>{m.totalOrders}</b>
              </p>
              <p className="text-green-600">
                Delivered: <b>{m.delivered}</b>
              </p>
              <p className="text-red-600">
                Cancelled: <b>{m.cancelled}</b>
              </p>
              <p>
                Revenue: <b>৳ {m.totalRevenue}</b>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
