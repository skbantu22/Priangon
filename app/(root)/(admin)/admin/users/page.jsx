"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function UsersPage() {
  // ================= STATES =================
  const [loading, setLoading] = useState(false);

  const [showrooms, setShowrooms] = useState([]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "customer",
    showroomId: "",
  });

  // ================= FETCH SHOWROOMS =================
  useEffect(() => {
    const fetchShowrooms = async () => {
      try {
        const res = await axios.get("/api/showrooms");

        setShowrooms(res.data.showrooms || []);
      } catch (err) {
        console.log(err);
      }
    };

    fetchShowrooms();
  }, []);

  // ================= HANDLE INPUT =================
  const handleChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // ================= SUBMIT =================
  const handleSubmit = async () => {
    try {
      setLoading(true);

      // VALIDATION
      if (!form.name) {
        return alert("Name required");
      }

      if (!form.email) {
        return alert("Email required");
      }

      if (!form.password) {
        return alert("Password required");
      }

      if (form.role === "cashier" && !form.showroomId) {
        return alert("Please select showroom");
      }

      console.log("SUBMIT DATA:", form);

      const res = await axios.post("/api/users/create", form);

      console.log(res.data);

      alert("User Created Successfully");

      // RESET FORM
      setForm({
        name: "",
        email: "",
        password: "",
        role: "customer",
        showroomId: "",
      });
    } catch (err) {
      console.log(err);

      alert(err?.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ================= UI =================
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow p-6">
        {/* TITLE */}
        <h1 className="text-2xl font-bold mb-6">Create User</h1>

        {/* NAME */}
        <div className="mb-4">
          <label className="block mb-1 text-sm font-medium">Name</label>

          <input
            type="text"
            placeholder="Enter name"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="w-full border rounded-lg p-3"
          />
        </div>

        {/* EMAIL */}
        <div className="mb-4">
          <label className="block mb-1 text-sm font-medium">Email</label>

          <input
            type="email"
            placeholder="Enter email"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            className="w-full border rounded-lg p-3"
          />
        </div>

        {/* PASSWORD */}
        <div className="mb-4">
          <label className="block mb-1 text-sm font-medium">Password</label>

          <input
            type="password"
            placeholder="Enter password"
            value={form.password}
            onChange={(e) => handleChange("password", e.target.value)}
            className="w-full border rounded-lg p-3"
          />
        </div>

        {/* ROLE */}
        <div className="mb-4">
          <label className="block mb-1 text-sm font-medium">Role</label>

          <select
            value={form.role}
            onChange={(e) => handleChange("role", e.target.value)}
            className="w-full border rounded-lg p-3"
          >
            <option value="customer">Customer</option>

            <option value="cashier">Cashier</option>

            <option value="admin">Admin</option>
          </select>
        </div>

        {/* SHOWROOM */}
        {form.role === "cashier" && (
          <div className="mb-5">
            <label className="block mb-1 text-sm font-medium">
              Select Showroom
            </label>

            <select
              value={form.showroomId}
              onChange={(e) => handleChange("showroomId", e.target.value)}
              className="w-full border rounded-lg p-3"
            >
              <option value="">Select Showroom</option>

              {showrooms.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* BUTTON */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-3"
        >
          {loading ? "Creating..." : "Create User"}
        </button>
      </div>
    </div>
  );
}
