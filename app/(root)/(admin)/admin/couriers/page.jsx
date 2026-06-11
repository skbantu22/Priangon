"use client";

import { useState, useEffect } from "react";

export default function CourierPage() {
  const [couriers, setCouriers] = useState([]);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    name: "",
    apiUrl: "",
    apiKey: "",
    secretKey: "",
  });

  // GET couriers
  const fetchCouriers = async () => {
    const res = await fetch("/api/couriers");
    const data = await res.json();
    setCouriers(data.data || []);
  };

  useEffect(() => {
    fetchCouriers();
  }, []);

  // CREATE / UPDATE
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editing) {
      await fetch(`/api/couriers/${editing}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/couriers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }

    setForm({ name: "", apiUrl: "", apiKey: "", secretKey: "" });
    setEditing(null);
    fetchCouriers();
  };

  // DELETE
  const handleDelete = async (id) => {
    await fetch(`/api/couriers/${id}`, { method: "DELETE" });
    fetchCouriers();
  };

  // TOGGLE ACTIVE
  const toggleActive = async (id) => {
    await fetch("/api/couriers/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchCouriers();
  };

  // EDIT
  const handleEdit = (c) => {
    setEditing(c._id);
    setForm({
      name: c.name,
      apiUrl: c.apiUrl,
      apiKey: c.apiKey,
      secretKey: c.secretKey,
    });
  };

  // TEST API
  const testApi = async (id) => {
    const res = await fetch("/api/couriers/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    const data = await res.json();
    alert(data.message);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Courier Management</h1>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="space-y-3 border p-4 rounded">
        <input
          className="w-full border p-2"
          placeholder="Courier Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <input
          className="w-full border p-2"
          placeholder="API URL"
          value={form.apiUrl}
          onChange={(e) => setForm({ ...form, apiUrl: e.target.value })}
        />

        <input
          className="w-full border p-2"
          placeholder="API Key"
          value={form.apiKey}
          onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
        />

        <input
          className="w-full border p-2"
          placeholder="Secret Key"
          value={form.secretKey}
          onChange={(e) => setForm({ ...form, secretKey: e.target.value })}
        />

        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          {editing ? "Update Courier" : "Add Courier"}
        </button>
      </form>

      {/* LIST */}
      <div className="mt-6 space-y-3">
        {couriers.map((c) => (
          <div key={c._id} className="border p-3 rounded flex justify-between">
            {/* INFO */}
            <div>
              <p className="font-bold">{c.name}</p>
              <p className="text-sm">{c.apiUrl}</p>
              <p className="text-xs">
                Status: {c.isActive ? "Active" : "Inactive"}
              </p>
            </div>

            {/* ACTIONS */}
            <div className="flex gap-2 items-center">
              <button
                onClick={() => handleEdit(c)}
                className="px-2 py-1 text-xs bg-yellow-500 text-white rounded"
              >
                Edit
              </button>

              <button
                onClick={() => handleDelete(c._id)}
                className="px-2 py-1 text-xs bg-red-500 text-white rounded"
              >
                Delete
              </button>

              <button
                onClick={() => toggleActive(c._id)}
                className="px-2 py-1 text-xs bg-gray-700 text-white rounded"
              >
                Toggle
              </button>

              <button
                onClick={() => testApi(c._id)}
                className="px-2 py-1 text-xs bg-green-600 text-white rounded"
              >
                Test
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
