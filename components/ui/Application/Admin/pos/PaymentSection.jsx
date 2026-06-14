import { useState } from "react";

export default function PaymentSection({
  paymentMethod,
  setPaymentMethod,
  transactionId,
  setTransactionId,
  cardDigits,
  setCardDigits,
  bankTxnRef,
  setBankTxnRef,
}) {
  const isMFS = ["bkash", "nagad", "rocket"].includes(paymentMethod);
  const isRegularCard = paymentMethod === "card";
  const isBankCard = paymentMethod === "bank_card";

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
          Payment Channel
        </label>
        <select
          className="w-full border p-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-white shadow-sm"
          value={paymentMethod}
          onChange={(e) => {
            setPaymentMethod(e.target.value);
            setTransactionId("");
            setCardDigits("");
            setBankTxnRef("");
          }}
        >
          <option value="cash">Cash Counter</option>
          <option value="bkash">bKash Mobile Wallet</option>
          <option value="nagad">Nagad Mobile Wallet</option>
          <option value="rocket">Rocket Mobile Wallet</option>
          <option value="card">Card (POS Swiped Terminal)</option>
          <option value="bank_card">
            Bank Card / Electronic Wire Transfer
          </option>
        </select>
      </div>

      {isMFS && (
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-orange-500 mb-1">
            Transaction ID Reference
          </label>
          <input
            className="w-full border p-2 rounded-lg text-sm border-orange-300 bg-orange-50/20 text-orange-900 font-mono focus:ring-1 focus:ring-orange-400 outline-none"
            placeholder="Enter 10-digit MFS TXN ID"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
          />
        </div>
      )}

      {isRegularCard && (
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-blue-500 mb-1">
            Last 4 Digits of Card
          </label>
          <input
            className="w-full border p-2 rounded-lg text-sm border-blue-300 bg-blue-50/20 text-blue-900 font-mono focus:ring-1 focus:ring-blue-400 outline-none"
            placeholder="XXXX"
            maxLength={4}
            value={cardDigits}
            onChange={(e) => setCardDigits(e.target.value)}
          />
        </div>
      )}

      {isBankCard && (
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-purple-500 mb-1">
            Bank Settlement Reference
          </label>
          <input
            className="w-full border p-2 rounded-lg text-sm border-purple-300 bg-purple-50/20 text-purple-900 font-mono focus:ring-1 focus:ring-purple-400 outline-none"
            placeholder="Enter Deposit Slip / Check reference"
            value={bankTxnRef}
            onChange={(e) => setBankTxnRef(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
