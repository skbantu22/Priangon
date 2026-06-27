"use border";

import { useState, useEffect } from "react";
import Image from "next/image";
import CheckoutModal from "./CheckoutModal";
import ExchangeModal from "./ExchangeModal";

export default function CartSidebar({
  cart,
  setCart,
  subTotal,
  discount,
  setDiscount,
  total,
  totalQty,
  removeCartItem,
  increaseQty,
  decreaseQty,
  user,
  selectedShowroomId,
  setSelectedShowroomId,
  showrooms,
  handleCheckout,
  checkoutLoading,
  discountType,
  setDiscountType,
  vat,
  setVat,
  vatType,
  setVatType,
  discountAmount,
  vatAmount,
  handleExchange,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExchangeMode, setIsExchangeMode] = useState(false);
  const [isExchangeOpen, setIsExchangeOpen] = useState(false);

  // 💡 এক্সচেঞ্জের পর অ্যাডজাস্টেড নেট পেয়েবল অ্যামাউন্ট রাখার স্টেট
  const [exchangeTotal, setExchangeTotal] = useState(0);

  useEffect(() => {
    setCart([]);
  }, [selectedShowroomId, setCart]);

  const handleNumericInput = (val, setter) => {
    if (val === "") setter(0);
    else {
      const num = parseFloat(val);
      setter(isNaN(num) ? 0 : num);
    }
  };

  const currentUser = user?.data?.user || user?.user || user;
  const userRole = currentUser?.role;

  const hideButtons =
    userRole === "admin" && (!selectedShowroomId || selectedShowroomId === "");

  return (
    <div className="lg:col-span-4 bg-white p-6 border-l border-gray-100 shadow-xl flex flex-col justify-between min-h-screen">
      <div>
        <div className="flex justify-between items-center border-b pb-4 mb-4">
          <h2 className="font-bold text-lg text-gray-800">Current Checkout</h2>
          <span className="bg-green-100 text-green-700 text-xs px-3 py-1 font-bold">
            {totalQty} Items
          </span>
        </div>

        <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
          {cart.length === 0 ? (
            <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-100">
              <p className="text-4xl mb-2">🛍️</p>
              <p className="text-sm font-medium">No products added</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.variantId}
                className="flex gap-3 items-center bg-gray-50 p-2 border border-gray-100"
              >
                <div className="relative h-14 w-14 bg-white border border-gray-200">
                  <Image
                    src={item.image || "/placeholder.png"}
                    fill
                    className="object-cover"
                    alt={item.name}
                  />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-bold text-gray-800 truncate">
                    {item.name}
                  </p>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs font-bold text-green-600">
                      {item.price.toLocaleString()}৳
                    </span>
                    <div className="flex items-center bg-white border border-gray-300">
                      <button
                        onClick={() => decreaseQty(item.variantId)}
                        className="px-2 py-0.5 hover:bg-gray-100"
                      >
                        −
                      </button>
                      <span className="px-2 text-xs font-bold border-x border-gray-300">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => increaseQty(item.variantId)}
                        className="px-2 py-0.5 hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeCartItem(item.variantId)}
                  className="text-gray-300 hover:text-red-500 p-1"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Discount & VAT Section */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-green-600">
              Discount
            </label>
            <div className="flex">
              <input
                type="number"
                min="0"
                value={discount}
                onFocus={(e) => e.target.select()}
                onChange={(e) =>
                  handleNumericInput(e.target.value, setDiscount)
                }
                className="w-full text-sm p-2 outline outline-1 outline-gray-300 focus:outline-green-500"
              />
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
                className="outline outline-1 outline-gray-300 px-1 text-xs bg-gray-50 text-green-700"
              >
                <option value="amount">৳</option>
                <option value="percent">%</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-green-600">
              VAT
            </label>
            <div className="flex">
              <input
                type="number"
                min="0"
                value={vat}
                onFocus={(e) => e.target.select()}
                onChange={(e) => handleNumericInput(e.target.value, setVat)}
                className="w-full text-sm p-2 outline outline-1 outline-gray-300 focus:outline-green-500"
              />
              <select
                value={vatType}
                onChange={(e) => setVatType(e.target.value)}
                className="outline outline-1 outline-gray-300 px-1 text-xs bg-gray-50 text-green-700"
              >
                <option value="amount">৳</option>
                <option value="percent">%</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="bg-green-600 text-white p-4 space-y-2">
          <div className="flex justify-between text-xs opacity-90">
            <span>Subtotal</span>
            <span>{subTotal.toLocaleString()}৳</span>
          </div>
          <div className="flex justify-between text-xs opacity-90">
            <span>Discount</span>
            <span>-{discountAmount.toLocaleString()}৳</span>
          </div>
          <div className="flex justify-between text-xs opacity-90">
            <span>VAT</span>
            <span>+{vatAmount.toLocaleString()}৳</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-green-500">
            <span className="text-sm font-bold">Grand Total</span>
            <span className="text-2xl font-black">
              {total.toLocaleString()}৳
            </span>
          </div>
        </div>

        {userRole === "admin" && (
          <select
            className="w-full p-2.5 text-sm font-medium outline outline-1 outline-gray-300 focus:outline-green-500"
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
        )}

        {!hideButtons && (
          <>
            <button
              disabled={checkoutLoading || cart.length === 0}
              onClick={() => {
                setIsExchangeMode(false);
                setExchangeTotal(0); // রেগুলার সেলে এক্সচেঞ্জ টোটাল রিসেট
                setIsModalOpen(true);
              }}
              className="w-full bg-green-600 text-white py-4 font-black text-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Complete Sale
            </button>

            <button
              disabled={checkoutLoading}
              onClick={() => setIsExchangeOpen(true)}
              className="w-full bg-orange-500 text-white py-3 font-bold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Exchange
            </button>
          </>
        )}
      </div>

      <CheckoutModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        // 🛠️ ফিক্স: এক্সচেঞ্জ মোড অন থাকলে এক্সচেঞ্জের অ্যাডজাস্টেড টোটাল পাস হবে, অন্যথায় রেগুলার কার্ট টোটাল
        total={isExchangeMode ? exchangeTotal : total}
        cashierName={currentUser?.name}
        isExchangeMode={isExchangeMode}
        cart={cart}
        onCheckout={(data) => {
          handleCheckout({
            ...data,
            isExchangeMode,
            total: isExchangeMode ? exchangeTotal : total,
          });
          setIsModalOpen(false);
          setIsExchangeMode(false);
          setExchangeTotal(0);
        }}
      />

      <ExchangeModal
        isOpen={isExchangeOpen}
        onClose={() => setIsExchangeOpen(false)}
        showroomId={selectedShowroomId || currentUser?.showroomId}
        currentPosCart={cart}
        onOpenCheckout={(checkoutPayload) => {
          // ১. এক্সচেঞ্জ মোড ট্রু করা হলো
          setIsExchangeMode(true);

          // 🛠️ ফিক্স লজিক: এক্সচেঞ্জ মডাল থেকে পাঠানো অ্যাডজাস্টমেন্ট ভ্যালু রিসিভ করা হচ্ছে
          // আপনার ExchangeModal-এ যেই নামেই পাস করুক (total, difference, বা payableAmount), নিচে তা হ্যান্ডেল করা হয়েছে।
          const finalAdjustmentAmount =
            checkoutPayload?.total ??
            checkoutPayload?.difference ??
            checkoutPayload?.payableAmount ??
            0;

          setExchangeTotal(finalAdjustmentAmount);

          if (
            typeof handleExchange === "function" &&
            checkoutPayload?.exchangeData
          ) {
            handleExchange(checkoutPayload.exchangeData);
          }

          // ২. এক্সচেঞ্জ মডাল অফ করে পেমেন্ট মডাল অন করা হলো
          setIsExchangeOpen(false);
          setIsModalOpen(true);
        }}
      />
    </div>
  );
}
