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
  exchangeSummary = null,
}) {
  const [payments, setPayments] = useState([
    { type: "Cash", option: "", amount: total },
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
  const resetForm = () => {
    setPayments([
      {
        type: "Cash",
        option: "",
        amount: total,
      },
    ]);

    setDeliveryCharge(0);
    setRemark("");

    setSoldBy(cashierName || "Guest");

    setCustomerName("");
    setPhone("");
    setAddress("");

    setSaleDate(new Date().toISOString().split("T")[0]);
  };
  useEffect(() => {
    if (phone.trim().length < 11) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customer/search?phone=${phone}`);
        const data = await res.json();

        if (data.success && data.customer) {
          setCustomerName(data.customer.name || "");
          setAddress(data.customer.address || "");
        }
      } catch (err) {
        console.error(err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [phone]);

  // Sync initial payment line item with the current incoming total
  useEffect(() => {
    if (isOpen) {
      setPayments([{ type: "Cash", option: "", amount: total }]);
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

  const totalPayable =
    (isExchangeMode ? Math.max(0, Number(total)) : Number(total)) +
    parseFloat(deliveryCharge || 0);
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

  const canComplete =
    isExchangeMode && totalPayable <= 0 ? true : balanceDue <= 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-none sm:max-h-[90vh]">
        <div className="shrink-0 bg-gray-600 p-4 text-center text-base font-bold text-white sm:text-xl">
          {isExchangeMode && totalPayable <= 0
            ? "Confirm refund / even exchange"
            : `Collect: ${totalPayable.toLocaleString()} TK`}
        </div>

        {isExchangeMode && exchangeSummary && (
          <div className="shrink-0 space-y-1 border-b bg-orange-50 px-4 py-3 text-sm">
            <div className="flex justify-between">
              <span>Old total (returns)</span>
              <span>{Number(exchangeSummary.returnedTotal || 0).toLocaleString()} TK</span>
            </div>
            <div className="flex justify-between">
              <span>New total</span>
              <span>{Number(exchangeSummary.newTotal || 0).toLocaleString()} TK</span>
            </div>
            <div className="flex justify-between font-bold text-orange-800">
              <span>Difference</span>
              <span>
                {Number(exchangeSummary.difference || 0).toLocaleString()} TK
                {exchangeSummary.refundAmount > 0
                  ? ` (refund ${Number(exchangeSummary.refundAmount).toLocaleString()})`
                  : exchangeSummary.extraPaid > 0
                    ? ` (pay ${Number(exchangeSummary.extraPaid).toLocaleString()})`
                    : ""}
              </span>
            </div>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row">
          <div className="space-y-4 border-b bg-gray-50/50 p-4 lg:w-1/3 lg:border-b-0 lg:border-r lg:p-6">
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

          <div className="space-y-4 p-4 lg:w-2/3 lg:p-6">
            <div className="hidden text-xs font-bold uppercase lg:grid lg:grid-cols-4 lg:gap-4 lg:border-b lg:pb-2">
              <div>Payment Type</div>
              <div>Option (Ref)</div>
              <div>Amount</div>
              <div>Action</div>
            </div>

            <div className="max-h-[220px] space-y-3 overflow-y-auto pr-1">
              {payments.map((p, index) => (
                <div
                  key={index}
                  className="space-y-2 rounded-lg border border-gray-200 p-3 lg:grid lg:grid-cols-4 lg:items-center lg:gap-4 lg:space-y-0 lg:border-0 lg:p-0"
                >
                  <select
                    value={p.type}
                    onChange={(e) =>
                      updatePayment(index, "type", e.target.value)
                    }
                    className="border p-2 rounded-none text-sm w-full"
                  >
                    <option>Cash</option>
                    <option>Mobile Banking</option>
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
        <div className="flex shrink-0 flex-col gap-2 border-t bg-gray-50 p-3 sm:flex-row sm:justify-between sm:p-4">
          <button
            onClick={onClose}
            className="min-h-12 rounded-xl bg-red-600 px-8 py-3 text-sm font-bold text-white hover:bg-red-700"
          >
            Cancel
          </button>
          <button
            disabled={!canComplete}
            onClick={() => {
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
              });
              resetForm();
            }}
            className={`min-h-12 rounded-xl px-8 py-3 text-sm font-bold transition ${
              !canComplete
                ? "cursor-not-allowed bg-gray-300 text-gray-500"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {!canComplete
              ? `Due: ${balanceDue.toFixed(2)} TK`
              : isExchangeMode
                ? "Save exchange"
                : "Complete Checkout"}
          </button>
        </div>
      </div>
    </div>
  );
}
