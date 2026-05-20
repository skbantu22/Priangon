"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function ShowroomPage() {
  // ================= STATES =================
  const [showrooms, setShowrooms] = useState([]);

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);

  // ================= FETCH SHOWROOMS =================
  const fetchShowrooms = async () => {
    try {
      const res = await axios.get("/api/showrooms");

      setShowrooms(res.data.showrooms || []);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchShowrooms();
  }, []);

  // ================= CREATE SHOWROOM =================
  const handleCreate = async () => {
    try {
      setLoading(true);

      await axios.post("/api/showrooms", {
        name: form.name,
        address: form.address,
        phone: form.phone,
      });

      alert("Showroom created");

      setForm({
        name: "",
        address: "",
        phone: "",
      });

      fetchShowrooms();
    } catch (err) {
      console.log(err);

      alert(err?.response?.data?.message || "Create failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* TITLE */}
      <h1 className="text-2xl font-bold mb-6">Showroom Management</h1>

      {/* CREATE FORM */}
      <div className="bg-white p-5 rounded-xl shadow mb-8">
        <h2 className="text-lg font-semibold mb-4">Create Showroom</h2>

        <div className="grid grid-cols-1 gap-3">
          {/* NAME */}
          <input
            type="text"
            placeholder="Showroom Name"
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value,
              })
            }
            className="border p-2 rounded"
          />

          {/* ADDRESS */}
          <input
            type="text"
            placeholder="Address"
            value={form.address}
            onChange={(e) =>
              setForm({
                ...form,
                address: e.target.value,
              })
            }
            className="border p-2 rounded"
          />

          {/* PHONE */}
          <input
            type="text"
            placeholder="Phone"
            value={form.phone}
            onChange={(e) =>
              setForm({
                ...form,
                phone: e.target.value,
              })
            }
            className="border p-2 rounded"
          />
        </div>

        {/* BUTTON */}
        <button
          onClick={handleCreate}
          disabled={loading}
          className="bg-blue-600 text-white px-5 py-2 rounded mt-5"
        >
          {loading ? "Creating..." : "Create Showroom"}
        </button>
      </div>

      {/* SHOWROOM LIST */}
      <div className="bg-white p-5 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-4">All Showrooms</h2>

        <div className="space-y-3">
          {showrooms.map((s) => (
            <div key={s._id} className="border rounded p-4">
              <p className="font-bold">{s.name}</p>

              <p className="text-sm text-gray-500">{s.address}</p>

              <p className="text-sm text-gray-500">{s.phone}</p>

              <p className="text-xs text-gray-400 mt-1">ID: {s._id}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
