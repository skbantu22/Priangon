"use client";

import { useState, useEffect } from "react";

export default function TrackingSettingsPage() {
  const [form, setForm] = useState({
    meta: {
      pixelId: "",
      accessToken: "",
      testEventCode: "",
      enabled: false,
    },
  });

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/tracking");
        const data = await res.json();

        // Ensure meta always exists and each field has a default value
        const meta = data?.data?.meta || {};
        setForm({
          meta: {
            pixelId: meta.pixelId || "",
            accessToken: meta.accessToken || "",
            testEventCode: meta.testEventCode || "",
            enabled: meta.enabled || false,
          },
        });
      } catch (error) {
        console.error("Failed to fetch tracking settings:", error);
      }
    }

    fetchSettings();
  }, []);

  const handleSubmit = async () => {
    try {
      const res = await fetch("/api/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const result = await res.json();
      alert(
        result.success
          ? "Settings saved successfully 🚀"
          : "Failed to save settings",
      );
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings due to an error.");
    }
  };

  return (
    <div className="max-w-xl space-y-4 p-4">
      <h2 className="text-2xl font-bold">Meta Pixel Settings</h2>

      <input
        className="border p-2 w-full"
        placeholder="Pixel ID"
        value={form.meta.pixelId}
        onChange={(e) =>
          setForm({ ...form, meta: { ...form.meta, pixelId: e.target.value } })
        }
      />

      <input
        className="border p-2 w-full"
        placeholder="Access Token"
        value={form.meta.accessToken}
        onChange={(e) =>
          setForm({
            ...form,
            meta: { ...form.meta, accessToken: e.target.value },
          })
        }
      />

      <input
        className="border p-2 w-full"
        placeholder="Test Event Code"
        value={form.meta.testEventCode}
        onChange={(e) =>
          setForm({
            ...form,
            meta: { ...form.meta, testEventCode: e.target.value },
          })
        }
      />

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.meta.enabled}
          onChange={(e) =>
            setForm({
              ...form,
              meta: { ...form.meta, enabled: e.target.checked },
            })
          }
        />
        Enable Meta Tracking
      </label>

      <button
        onClick={handleSubmit}
        className="bg-black text-white px-4 py-2 rounded"
      >
        Save Settings
      </button>
    </div>
  );
}
