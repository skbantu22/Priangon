import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function CartSummaryFooter({
  cart = [],
  subTotal = 0,
  totalQty = 0,
  discount = 0,
  setDiscount,
  discountType = "amount",
  setDiscountType,
  discountAmount = 0,
  vat = 0,
  setVat,
  vatType = "percent",
  setVatType,
  vatAmount = 0,
  afterDiscountPrice = 0,
  currentExchangeTotal = 0,
  payableAmount = 0,
  userRole,
  selectedShowroomId,
  setSelectedShowroomId,
  showrooms = [],
  handleNumericInput,
}) {
  const [activePopover, setActivePopover] = useState(null); // 'discount' | 'vat' | null

  return (
    <div className="bg-[#fdf6ed] border-t border-orange-200 text-xs flex-shrink-0 divide-y divide-orange-200/60 relative select-none">
      {/* ---------------- Items & Total ---------------- */}
      <div className="flex justify-between items-center px-3 py-1 font-semibold text-gray-700">
        <div>
          <span>Items</span>
          <span className="font-bold text-black ml-3">{cart.length}</span>
        </div>
        <div>
          <span>Total</span>
          <span className="font-bold text-black ml-3">
            TK {(subTotal || 0).toLocaleString()}
          </span>
        </div>
      </div>

      {/* ---------------- Quantity & Dynamic Discount ---------------- */}
      <div className="flex justify-between items-center px-3 py-1 font-semibold text-gray-700 relative">
        <div>
          <span>Quantity</span>
          <span className="font-bold text-black ml-3">{totalQty}</span>
        </div>

        {/* Dynamic Popover Trigger for Discount */}
        <div className="relative flex items-center gap-1">
          <span className="mr-1">Discount 📝</span>
          <button
            type="button"
            onClick={() =>
              setActivePopover(activePopover === "discount" ? null : "discount")
            }
            className="px-2 py-0.5 border border-orange-300 rounded bg-white font-bold text-black text-[11px] hover:border-blue-500 shadow-2xs transition"
          >
            {discountType === "percent" ? `${discount}%` : `TK ${discount}`}
          </button>
          <span className="font-bold text-black ml-1">TK {discountAmount}</span>

          {/* Motion Popover for Discount */}
          <AnimatePresence>
            {activePopover === "discount" && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 bottom-full mb-2 bg-white p-2.5 rounded-xl shadow-xl border border-orange-200 z-50 w-52 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between border-b pb-1">
                  <span className="text-[11px] font-bold text-gray-700">
                    Apply Discount
                  </span>
                  <button
                    onClick={() => setActivePopover(null)}
                    className="text-gray-400 hover:text-black text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg text-[10px]">
                  <button
                    type="button"
                    onClick={() => setDiscountType("amount")}
                    className={`flex-1 py-1 rounded font-bold transition ${
                      discountType === "amount"
                        ? "bg-white text-black shadow-2xs"
                        : "text-gray-500"
                    }`}
                  >
                    TK (Fixed)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType("percent")}
                    className={`flex-1 py-1 rounded font-bold transition ${
                      discountType === "percent"
                        ? "bg-white text-black shadow-2xs"
                        : "text-gray-500"
                    }`}
                  >
                    % (Percent)
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    autoFocus
                    value={discount}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) =>
                      handleNumericInput(e.target.value, setDiscount)
                    }
                    className="w-full p-1.5 border border-gray-300 rounded-lg text-center font-bold text-sm bg-white outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => setActivePopover(null)}
                    className="bg-blue-600 text-white font-bold text-xs px-3 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    Set
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ---------------- Dynamic VAT & After Discount ---------------- */}
      <div className="flex justify-between items-center px-3 py-1 font-semibold text-gray-700 bg-orange-100/40 relative">
        {/* Dynamic Popover Trigger for VAT */}
        <div className="relative flex items-center">
          <span className="mr-1">Total Vat</span>
          <button
            type="button"
            onClick={() =>
              setActivePopover(activePopover === "vat" ? null : "vat")
            }
            className="px-1.5 py-0.5 border border-orange-300 rounded bg-white font-bold text-black text-[10px] hover:border-blue-500 shadow-2xs transition"
          >
            {vatType === "percent" ? `${vat}%` : `TK ${vat}`}
          </button>
          <span className="font-bold text-black ml-2">TK {vatAmount}</span>

          {/* Motion Popover for VAT */}
          <AnimatePresence>
            {activePopover === "vat" && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 bottom-full mb-2 bg-white p-2.5 rounded-xl shadow-xl border border-orange-200 z-50 w-52 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between border-b pb-1">
                  <span className="text-[11px] font-bold text-gray-700">
                    Apply VAT
                  </span>
                  <button
                    onClick={() => setActivePopover(null)}
                    className="text-gray-400 hover:text-black text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg text-[10px]">
                  <button
                    type="button"
                    onClick={() => setVatType("percent")}
                    className={`flex-1 py-1 rounded font-bold transition ${
                      vatType === "percent"
                        ? "bg-white text-black shadow-2xs"
                        : "text-gray-500"
                    }`}
                  >
                    % (Percent)
                  </button>
                  <button
                    type="button"
                    onClick={() => setVatType("amount")}
                    className={`flex-1 py-1 rounded font-bold transition ${
                      vatType === "amount"
                        ? "bg-white text-black shadow-2xs"
                        : "text-gray-500"
                    }`}
                  >
                    TK (Fixed)
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    autoFocus
                    value={vat}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handleNumericInput(e.target.value, setVat)}
                    className="w-full p-1.5 border border-gray-300 rounded-lg text-center font-bold text-sm bg-white outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => setActivePopover(null)}
                    className="bg-blue-600 text-white font-bold text-xs px-3 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    Set
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div>
          <span>After Discount</span>
          <span className="font-bold text-black ml-2">
            TK {(afterDiscountPrice || 0).toLocaleString()}
          </span>
        </div>
      </div>

      {/* ---------------- Exchange Total ---------------- */}
      <div className="flex justify-between items-center px-3 py-1 font-semibold text-gray-700">
        <span className="font-bold text-black">Exchange Total</span>
        <span className="font-bold text-black">
          TK {(currentExchangeTotal || 0).toLocaleString()}
        </span>
      </div>

      {/* ---------------- Payable ---------------- */}
      <div className="flex justify-between items-center px-3 py-1.5 bg-[#e8decb] font-bold text-black">
        <span className="text-xs font-extrabold">Payable</span>
        <span className="text-sm font-black text-black">
          TK {(payableAmount || 0).toLocaleString()}
        </span>
      </div>

      {/* ---------------- Admin Showroom Select ---------------- */}
      {userRole === "admin" && (
        <div className="p-1.5 bg-white">
          <select
            className="w-full p-1 text-[11px] font-medium border border-gray-300 rounded bg-white outline-none"
            value={selectedShowroomId}
            onChange={(e) => setSelectedShowroomId(e.target.value)}
          >
            <option value="">Select Showroom Location</option>
            {showrooms.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
