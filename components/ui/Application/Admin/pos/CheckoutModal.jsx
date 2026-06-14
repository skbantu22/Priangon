import { useState, useEffect } from "react";

export default function CheckoutModal({
  isOpen,
  onClose,
  total,
  cashierName,
  onCheckout,
  cart = [], // Defaults to safe array mapping
  isExchangeMode = false,
  exchangeData = null,
}) {
  const [payments, setPayments] = useState([
    { type: "Mobile Banking", option: "", amount: total },
  ]);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [remark, setRemark] = useState("");

  // State for editable fields
  const [soldBy, setSoldBy] = useState(cashierName || "Guest");
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [saleDate, setSaleDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  // Sync initial payment line item with the current incoming total
  useEffect(() => {
    if (isOpen) {
      setPayments([{ type: "Mobile Banking", option: "", amount: total }]);
    }
  }, [isOpen, total]);

  // Keyboard shortcut: Esc to cancel
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalPayable = total + parseFloat(deliveryCharge || 0);
  const totalReceived = payments.reduce(
    (sum, p) => sum + parseFloat(p.amount || 0),
    0,
  );
  const balanceDue = Math.max(0, totalPayable - totalReceived);
  const change = Math.max(0, totalReceived - totalPayable);

  const addPaymentRow = () =>
    setPayments([...payments, { type: "Cash", option: "", amount: 0 }]);

  const removePaymentRow = (index) => {
    if (payments.length === 1) return; // Retain at least 1 row
    setPayments(payments.filter((_, i) => i !== index));
  };

  const updatePayment = (index, field, value) => {
    const updated = [...payments];
    updated[index][field] = field === "amount" ? parseFloat(value) || 0 : value;
    setPayments(updated);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white w-full max-w-5xl shadow-2xl rounded-none flex flex-col max-h-[90vh]">
        {/* Top Total Bar */}
        <div className="bg-gray-600 text-white p-4 text-center font-bold text-xl flex-shrink-0">
          Total Amount: {totalPayable.toLocaleString()} TK
        </div>

        {/* Form Body Context */}
        <div className="flex flex-1 overflow-y-auto">
          {/* Left Column: Payment Details Sidebar */}
          <div className="w-1/3 p-6 border-r space-y-4 bg-gray-50/50">
            <div className="text-sm font-bold border-b pb-2 mb-4">
              Payment Details
            </div>
            <div className="flex justify-between border-b pb-2">
              <span>Subtotal</span>
              <span>{total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-b pb-2 font-bold">
              <span>Total Amount</span>
              <span>{totalPayable.toFixed(2)}</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-gray-500">
                Sale Date
              </label>
              <input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="w-full border p-2 rounded-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-gray-500">
                Sold By
              </label>
              <input
                value={soldBy}
                onChange={(e) => setSoldBy(e.target.value)}
                className="w-full border p-2 rounded-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-gray-500">
                Customer Name
              </label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full border p-2 rounded-none"
                placeholder="Enter Name"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-gray-500">
                Phone
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border p-2 rounded-none"
                placeholder="01XXX-XXXXXX"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-gray-500">
                Customer Address
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full border p-2 rounded-none resize-none h-16 text-sm"
                placeholder="Enter Delivery Address"
              />
            </div>
          </div>

          {/* Right Column: Transaction Form */}
          <div className="w-2/3 p-6 space-y-4">
            <div className="grid grid-cols-4 gap-4 text-xs font-bold border-b pb-2 uppercase">
              <div>Payment Type</div>
              <div>Option (Ref)</div>
              <div>Amount</div>
              <div>Action</div>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {payments.map((p, index) => (
                <div
                  key={index}
                  className="grid grid-cols-4 gap-4 items-center"
                >
                  <select
                    value={p.type}
                    onChange={(e) =>
                      updatePayment(index, "type", e.target.value)
                    }
                    className="border p-2 rounded-none text-sm w-full"
                  >
                    <option>Mobile Banking</option>
                    <option>Cash</option>
                    <option>Card</option>
                    <option>Bank</option>
                  </select>
                  <input
                    value={p.option}
                    onChange={(e) =>
                      updatePayment(index, "option", e.target.value)
                    }
                    className="border p-2 rounded-none text-sm w-full"
                    placeholder="Reference"
                  />
                  <input
                    type="number"
                    value={p.amount}
                    onChange={(e) =>
                      updatePayment(index, "amount", e.target.value)
                    }
                    className="border p-2 rounded-none text-sm w-full"
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={() => removePaymentRow(index)}
                      disabled={payments.length === 1}
                      className="bg-red-500 text-white px-3 py-2 rounded-none disabled:opacity-40"
                    >
                      ✕
                    </button>
                    {index === payments.length - 1 && (
                      <button
                        onClick={addPaymentRow}
                        className="bg-blue-600 text-white px-3 py-2 rounded-none hover:bg-blue-700"
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="text-xs font-bold uppercase text-gray-500">
                  Delivery Charge
                </label>
                <input
                  type="number"
                  value={deliveryCharge}
                  onChange={(e) => setDeliveryCharge(e.target.value)}
                  className="w-full border p-2 rounded-none"
                  placeholder="0"
                />
              </div>
              <div className="bg-gray-100 p-2 border border-gray-200 flex flex-col justify-center">
                <label className="text-xs font-bold uppercase text-gray-500">
                  Change to Return
                </label>
                <div className="text-lg font-bold text-green-700">
                  {change.toFixed(2)} TK
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-gray-500">
                Remark Note
              </label>
              <input
                type="text"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                className="w-full border p-2 rounded-none"
                placeholder="Remark"
              />
            </div>
          </div>
        </div>

        {/* Bottom Footer Actions */}
        <div className="p-4 border-t flex justify-between bg-gray-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="bg-red-600 text-white px-10 py-3 font-bold rounded-none hover:bg-red-700 transition"
          >
            Cancel [Esc]
          </button>
          <button
            disabled={balanceDue > 0}
            onClick={() =>
              onCheckout({
                soldBy,
                customerName,
                phone,
                address,
                saleDate,
                payments,
                deliveryCharge: parseFloat(deliveryCharge || 0),
                remark,
                items: cart.map((i) => ({
                  productId: i.productId,
                  variantId: i.variantId,
                  qty: i.qty,
                })),
              })
            }
            className={`px-12 py-3 font-bold rounded-none transition ${
              balanceDue > 0
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {balanceDue > 0
              ? `Due: ${balanceDue.toFixed(2)} TK`
              : "Complete Checkout"}
          </button>
        </div>
      </div>
    </div>
  );
}
