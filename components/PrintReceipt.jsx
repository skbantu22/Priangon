"use client";

import { useEffect } from "react";

function numberToWords(num) {
  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  if ((num = num.toString()).length > 9) return "Overflow";
  let n = ("000000000" + num)
    .substr(-9)
    .match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return "";
  let str = "";
  str +=
    n[1] != 0
      ? (a[Number(n[1])] || b[n[1][0]] + " " + a[n[1][1]]) + " Crore "
      : "";
  str +=
    n[2] != 0
      ? (a[Number(n[2])] || b[n[2][0]] + " " + a[n[2][1]]) + " Lakh "
      : "";
  str +=
    n[3] != 0
      ? (a[Number(n[3])] || b[n[3][0]] + " " + a[n[3][1]]) + " Thousand "
      : "";
  str +=
    n[4] != 0
      ? (a[Number(n[4])] || b[n[4][0]] + " " + a[n[4][1]]) + " Hundred "
      : "";
  str +=
    n[5] != 0
      ? (str != "" ? "and " : "") +
        (a[Number(n[5])] || b[n[5][0]] + " " + a[n[5][1]])
      : "";
  return str.trim();
}

export default function PrintReceipt({ order }) {
  useEffect(() => {
    window.print();
  }, []);

  if (!order) return <div className="p-4 text-center">Loading...</div>;

  const showroomName = "Mini Thailand";
  const showroomAddress =
    order.showroom?.address ||
    "Sahabuddin plaza Shop no- 43, Level-3\nRing Road, Adabor, Mohammadpur.";
  const showroomPhone = order.showroom?.phone || "01400209876";
  const showroomEmail = order.showroom?.email || "minithailand@gmail.com";

  const totalAmount = order.total || 0;
  const totalPaid = order.paidAmount || totalAmount;
  const cashReceive = order.cashReceive || totalPaid;
  const changeAmount = cashReceive - totalPaid;
  const totalInWords = numberToWords(Math.round(totalAmount));

  // Date & Time formatting from the custom Server payload date configs
  const saleDate = order.saleDate ? new Date(order.saleDate) : new Date();
  const createdTime = order.createdAt ? new Date(order.createdAt) : saleDate;

  const orderDate = saleDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const orderTime = createdTime.toLocaleTimeString("en-US", {
    timeZone: "Asia/Dhaka",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  console.log("ORDER =", order);
  console.log("createdAt =", order.createdAt);
  console.log("saleDate =", order.saleDate);

  return (
    <div
      id="receipt"
      className="mx-auto p-4 font-sans text-[12px] leading-relaxed text-black bg-white"
      style={{ width: "80mm", color: "#000000" }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body * { visibility: hidden; background: #fff !important; }
          #receipt, #receipt * { visibility: visible; }
          #receipt { position: absolute; left: 0; top: 0; width: 80mm !important; }
        }
      `,
        }}
      />

      {/* Header Info */}
      <div className="text-center mb-3">
        <h2 className="font-serif font-bold text-[22px] tracking-wide text-gray-800">
          {showroomName}
        </h2>
        {order.showroom?.name && (
          <p className="text-[11px] font-bold text-gray-700 uppercase mt-0.5">
            Branch: {order.showroom.name}
          </p>
        )}
        <p className="whitespace-pre-line text-[11px] leading-4 text-gray-700 mt-1">
          {showroomAddress}
        </p>
        <p className="text-[11px] text-gray-700 mt-0.5">
          Mobile: {showroomPhone}
        </p>
        <p className="text-[11px] text-gray-700">Email: {showroomEmail}</p>
      </div>

      {/* Core Metadata Specifications Grid Block */}
      <div className="space-y-0.5 text-[11px] px-1 text-gray-800 border-t border-b border-gray-200 py-1.5 my-2">
        <div className="flex">
          <span className="w-32 font-medium">Invoice ID:</span>
          <span>{order.orderNumber || order._id || "20261011747"}</span>
        </div>
        <div className="flex">
          <span className="w-32 font-medium">Sale Date:</span>
          <span>
            {orderDate} @ {orderTime}
          </span>
        </div>
        <div className="flex">
          <span className="w-32 font-medium">Customer Name:</span>
          <span>{order.customerName}</span>
        </div>
        <div className="flex">
          <span className="w-32 font-medium">Phone:</span>
          <span>{order.customerPhone}</span>
        </div>
        <div className="flex font-semibold text-gray-950">
          <span className="w-32">Sold By:</span>
          <span>{order.soldBy}</span>
        </div>
      </div>

      {/* Barcode Element */}
      <div className="my-3 text-center">
        <img
          src={`https://barcode.tec-it.com/barcode.ashx?data=${order.orderNumber || "20261011747"}&code=Code128&translate-esc=true`}
          alt="barcode"
          className="mx-auto h-8 w-[85%] object-stretch block"
        />
      </div>

      <h3 className="text-center font-bold text-[13px] tracking-wider my-1 uppercase">
        INVOICE
      </h3>

      {/* Products Grid Layout Table */}
      <table className="w-full text-left border-collapse text-[11px] mt-2">
        <thead>
          <tr className="border-b border-black font-semibold text-gray-800">
            <th className="w-[8%] pb-1">Sl.</th>
            <th className="w-[47%] pb-1">Name</th>
            <th className="text-right w-[20%] pb-1">Price</th>
            <th className="text-center w-[10%] pb-1">Qty</th>
            <th className="text-right w-[15%] pb-1">Total</th>
          </tr>
        </thead>
        <tbody>
          {(order.items || []).map((item, index) => (
            <tr
              key={index}
              className="align-top border-b border-black/5 last:border-b-0"
            >
              <td className="py-1 text-gray-800">{index + 1}</td>
              <td className="py-1 pr-1 break-words">
                <span className="block lowercase text-gray-800">
                  {item.name}
                </span>
                {item.code && (
                  <span className="block text-[10px] tracking-wide text-gray-600">
                    {item.code}
                  </span>
                )}
              </td>
              <td className="text-right py-1 align-bottom text-gray-800">
                {Number(item.price).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="text-center py-1 align-bottom text-gray-800">
                {item.qty}
              </td>
              <td className="text-right py-1 align-bottom font-medium text-gray-900">
                {(item.price * (parseInt(item.qty) || 1)).toLocaleString(
                  "en-US",
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-black my-1" />

      {/* Calculations Pricing Summary */}
      <div className="text-[11px] font-medium space-y-0.5 pr-0.5 text-gray-900">
        <div className="flex justify-end space-x-4">
          <span className="w-28 text-right font-bold">Subtotal :</span>
          <span className="w-20 text-right border-b border-dashed border-gray-400 pb-0.5">
            {Number(order.subTotal || totalAmount).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        <div className="flex justify-end space-x-4">
          <span className="w-28 text-right font-bold">Total :</span>
          <span className="w-20 text-right border-b border-dashed border-gray-400 pb-0.5">
            {Number(totalAmount).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        <div className="flex justify-end space-x-4">
          <span className="w-28 text-right font-bold">Paid :</span>
          <span className="w-20 text-right border-b border-dashed border-gray-400 pb-0.5">
            {Number(totalPaid).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        <div className="flex justify-end space-x-4">
          <span className="w-28 text-right font-bold">Cash Receive:</span>
          <span className="w-20 text-right border-b border-dashed border-gray-400 pb-0.5">
            {Number(cashReceive).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        <div className="flex justify-end space-x-4">
          <span className="w-28 text-right font-bold">Change:</span>
          <span className="w-20 text-right border-b border-dashed border-gray-400 pb-0.5">
            {Number(changeAmount).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>

      {/* Words Summary */}
      <div className="text-[11px] font-medium text-gray-800 mt-3 px-1">
        <strong>In Words:</strong> {totalInWords} TK Only
      </div>

      {/* Payment Block */}
      <div className="mt-3 border border-black text-[11px]">
        <div className="text-center font-bold tracking-wider py-0.5 border-b border-black bg-gray-50 uppercase">
          Payments
        </div>
        <div className="p-1 px-2 space-y-0.5">
          <div className="flex justify-between text-gray-800">
            <span>{order.paymentMethod || "Cash"}</span>
            <span>
              =&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;TK{" "}
              {Number(totalPaid).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="flex justify-between font-bold border-t border-dashed border-black/40 pt-0.5 text-gray-950">
            <span>Total</span>
            <span>
              =&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;TK{" "}
              {Number(totalPaid).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Notes */}
      <div className="text-center mt-5 px-1 space-y-1 text-[9px] leading-3 text-gray-600 font-sans font-medium italic opacity-90">
        <p className="border-t border-dashed border-black/20 pt-2">
          Note: No return policy. Exchange is allowed within three days from the
          buying date.
        </p>
        <p>Items purchased with discounts are not eligible for exchange.</p>
        <p>Hijab items cannot be exchanged.</p>
        <p className="text-black font-semibold not-italic mt-2">
          This is a computer generated copy. No signature is required from the
          company.
        </p>
      </div>
    </div>
  );
}
