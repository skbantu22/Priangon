"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function ColorPage() {
  const [name, setName] = useState("");
  const [colors, setColors] = useState([]);
  const [editing, setEditing] = useState(null);

  const loadColors = async () => {
    const { data } = await axios.get("/api/color");

    if (data.success) {
      setColors(data.data);
    }
  };

  useEffect(() => {
    loadColors();
  }, []);

  const saveColor = async () => {
    if (!name) return;

    if (editing) {
      await axios.put(`/api/color/update/${editing}`, { name });
    } else {
      await axios.post("/api/color/create", { name });
    }

    setName("");
    setEditing(null);

    loadColors();
  };

  const deleteColor = async (id) => {
    await axios.delete(`/api/color/delete/${id}`);

    loadColors();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Color Library</h1>

      <div className="flex gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Color Name"
          className="border px-3 h-10 flex-1"
        />

        <button onClick={saveColor} className="bg-black text-white px-5">
          {editing ? "Update" : "Save"}
        </button>
      </div>

      <table className="w-full border">
        <thead className="bg-black text-white">
          <tr>
            <th className="p-2">Color</th>
            <th className="p-2">Action</th>
          </tr>
        </thead>

        <tbody>
          {colors.map((color) => (
            <tr key={color._id} className="border-t">
              <td className="p-2">{color.name}</td>

              <td className="p-2 flex gap-3">
                <button
                  onClick={() => {
                    setEditing(color._id);
                    setName(color.name);
                  }}
                >
                  Edit
                </button>

                <button
                  onClick={() => deleteColor(color._id)}
                  className="text-red-500"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
