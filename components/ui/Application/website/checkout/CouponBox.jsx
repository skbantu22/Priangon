import { X } from "lucide-react";

export default function CouponBox({
  onApply,
  loading,
  applied,
  onRemove,
  appliedCode,
}) {
  return applied ? (
    <div className="flex items-center justify-between  bg-white p-3 ">
      <div className="flex flex-col">
        <span className="text-xs font-bold uppercase text-green-600">
          Coupon Applied
        </span>
        {appliedCode && (
          <span className="text-sm font-black">{appliedCode}</span>
        )}
      </div>

      <button
        onClick={onRemove}
        type="button"
        className="flex h-8 w-8 items-center justify-center border border-black hover:bg-black hover:text-white"
      >
        <X size={14} />
      </button>
    </div>
  ) : (
    <form onSubmit={onApply} className="flex border-2 border-black bg-white">
      <input
        name="code"
        placeholder="Enter coupon code"
        className="w-full px-3 py-2 text-sm outline-none"
      />

      <button
        type="submit"
        disabled={loading}
        className="border-l-2 border-black px-4 text-xs font-bold uppercase hover:bg-black hover:text-white disabled:opacity-50"
      >
        {loading ? "Applying..." : "Apply"}
      </button>
    </form>
  );
}
