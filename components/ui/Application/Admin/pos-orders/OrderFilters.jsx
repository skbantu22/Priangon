"use client";

export default function OrderFilters({ search, setSearch }) {
  return (
    <div className="bg-white shadow rounded-xl p-4 flex gap-3">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search invoice/customer..."
        className="border rounded-lg p-2 w-80"
      />

      <button className="bg-blue-600 text-white px-5 rounded-lg">Search</button>
    </div>
  );
}
