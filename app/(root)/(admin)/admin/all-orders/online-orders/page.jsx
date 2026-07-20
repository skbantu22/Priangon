"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useSelector } from "react-redux";
import PaymentProofUpload from "@/components/ui/Application/website/checkout/PaymentProofUpload";

export default function POSPage() {
  // --- States ---
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showroomId, setShowroomId] = useState(null);
  const [shippingMethod, setShippingMethod] = useState("inside_dhaka");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [paymentProof, setPaymentProof] = useState("");
  const [transactionNumber, setTransactionNumber] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    note: "",
  });

  const user = useSelector((state) => state.authStore.auth);
  const searchInputRef = useRef(null);

  // --- Data Fetching ---
  useEffect(() => {
    const fetchProducts = async () => {
      if (!showroomId) return;
      try {
        setLoading(true);
        const res = await fetch(
          `/api/online-products?showroomId=${showroomId}`,
        );
        const data = await res.json();
        if (data.success) setProducts(data.items);
      } catch (error) {
        console.error("Fetch Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [showroomId]);

  useEffect(() => {
    if (!user) return;
    const currentUser = user?.data?.user || user?.user || user;
    const id =
      currentUser?.showroomId?._id ||
      currentUser?.showroomId ||
      currentUser?.showroom?._id ||
      "";
    setShowroomId(id);
  }, [user]);

  // --- Filtering & Search ---
  const filteredProducts = useMemo(() => {
    if (!search) return products;
    const lowerSearch = search.trim().toLowerCase();
    return products.filter((p) => {
      const nameMatch = p.name?.toLowerCase().includes(lowerSearch);
      const variantMatch = p.variants?.some(
        (v) =>
          v.barcode?.toLowerCase().includes(lowerSearch) ||
          v.sku?.toLowerCase().includes(lowerSearch),
      );
      return nameMatch || variantMatch;
    });
  }, [search, products]);

  // --- Cart Operations ---
  const addToCart = (product, variant) => {
    if (variant.stock <= 0) return alert("❌ স্টক শেষ!");

    const exist = cart.find((item) => item.variantId === variant._id);

    // কনসোল লগ দিয়ে দেখুন ইমেজ পাওয়া যাচ্ছে কি না
    console.log("Variant Media:", variant.media);

    if (exist) {
      if (exist.qty >= variant.stock) return alert(`❌ পর্যাপ্ত স্টক নেই!`);
      setCart(
        cart.map((item) =>
          item.variantId === variant._id
            ? { ...item, qty: item.qty + 1 }
            : item,
        ),
      );
    } else {
      // ইমেজ সোর্স বের করার জন্য সেফটি চেক
      const getThumbnail = () => {
        if (variant?.media?.secure_url) return variant.media.secure_url;
        if (variant?.media?.[0]?.secure_url) return variant.media[0].secure_url;
        if (product?.media?.[0]?.secure_url) return product.media[0].secure_url;
        return "/placeholder.png";
      };

      setCart([
        ...cart,
        {
          id: `${product._id}-${variant._id}`,
          productId: product._id,
          variantId: variant._id,
          name: product.name,
          color: variant.color || "N/A",
          size: variant.size || "N/A",
          price: variant.sellingPrice || 0,
          qty: 1,
          maxStock: variant.stock,
          thumbnail: getThumbnail(), // এখানে আপডেট করা হলো
        },
      ]);
    }
  };

  const removeCart = (id) => setCart(cart.filter((item) => item.id !== id));

  const updateQty = (id, newQty) => {
    if (newQty <= 0) return removeCart(id);
    setCart(
      cart.map((item) =>
        item.id === id
          ? { ...item, qty: Math.min(newQty, item.maxStock) }
          : item,
      ),
    );
  };

  // --- Calculations ---
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const shippingFee = shippingMethod === "inside_dhaka" ? 80 : 150;
  const total = subtotal + shippingFee;

  // --- Order Submission ---
  const handleSaveOrder = async () => {
    if (!cart.length) return alert("কার্ট খালি!");
    if (!customer.name || !customer.phone) return alert("কাস্টমার তথ্য দিন!");

    const payload = {
      showroomId,
      customer,
      items: cart,
      subtotal,
      shippingMethod,
      shippingFee,
      total,
      paymentMethod,
      transactionNumber: paymentMethod !== "cod" ? transactionNumber : null,
      paymentProof,
    };

    try {
      const res = await fetch("/api/showroom-order-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        alert("অর্ডার সফল হয়েছে! ✅");
        setCart([]);
        setCustomer({ name: "", phone: "", address: "", city: "", note: "" });
      } else {
        alert(data.message || "ত্রুটি হয়েছে");
      }
    } catch (err) {
      alert("সার্ভার এরর");
    }
  };

  return (
    <div className="grid grid-cols-12 h-screen bg-white text-black font-sans overflow-hidden">
      {/* Left Column - Product Showcase */}
      <div className="col-span-8 p-6 border-r border-gray-200 flex flex-col h-full">
        <div className="flex items-center gap-4 mb-6">
          <input
            ref={searchInputRef}
            className="flex-1 p-4 border-2 border-black rounded-none outline-none"
            placeholder="প্রোডাক্টের নাম, বারকোড বা SKU দিয়ে সার্চ করুন..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            Loading Products...
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4 overflow-y-auto pb-20">
            {filteredProducts.map((product) => (
              <div
                key={product._id}
                onClick={() => setSelectedProduct(product)}
                className="border border-gray-300 p-3 hover:border-black transition-all cursor-pointer"
              >
                <img
                  src={product.media?.[0]?.secure_url}
                  className="w-full h-40 object-cover mb-2"
                />
                <h3 className="font-bold text-sm uppercase">{product.name}</h3>
                <p className="text-xs text-gray-500">
                  {product.variants?.length} ভ্যারিয়েন্ট
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Column - Cart & Checkout */}
      <div className="col-span-4 h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="font-bold text-xl uppercase tracking-widest">
            Checkout
          </h2>
        </div>

        {/* Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Customer */}
          <div className="space-y-3">
            <input
              className="w-full p-3 border border-black"
              placeholder="Name"
              value={customer.name}
              onChange={(e) =>
                setCustomer({ ...customer, name: e.target.value })
              }
            />

            <input
              className="w-full p-3 border border-black"
              placeholder="Phone"
              value={customer.phone}
              onChange={(e) =>
                setCustomer({ ...customer, phone: e.target.value })
              }
            />

            <input
              className="w-full p-3 border border-black"
              placeholder="Address"
              value={customer.address}
              onChange={(e) =>
                setCustomer({ ...customer, address: e.target.value })
              }
            />

            <input
              className="w-full p-3 border border-black"
              placeholder="City"
              value={customer.city}
              onChange={(e) =>
                setCustomer({ ...customer, city: e.target.value })
              }
            />

            <textarea
              rows={3}
              className="w-full p-3 border border-black resize-none"
              placeholder="Note"
              value={customer.note}
              onChange={(e) =>
                setCustomer({ ...customer, note: e.target.value })
              }
            />
          </div>

          {/* Cart */}
          <div className="mt-6 space-y-3">
            {cart.map((item) => (
              <div key={item.id} className="flex gap-3 border rounded p-2">
                <div className="w-16 h-16 flex-shrink-0">
                  <img
                    src={item.thumbnail}
                    alt={item.name}
                    className="w-full h-full object-cover border"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{item.name}</p>

                  <p className="text-xs text-gray-500">
                    {item.color} / {item.size}
                  </p>

                  <p className="font-bold">৳{item.price}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQty(item.id, item.qty - 1)}
                    className="w-7 h-7 bg-black text-white"
                  >
                    -
                  </button>

                  <span>{item.qty}</span>

                  <button
                    onClick={() => updateQty(item.id, item.qty + 1)}
                    className="w-7 h-7 bg-black text-white"
                  >
                    +
                  </button>

                  <button
                    onClick={() => removeCart(item.id)}
                    className="text-red-500 font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Shipping */}
          {/* Shipping & Payment */}
          <div className="mt-6 space-y-4 border-t border-black pt-4">
            {/* Shipping Method */}
            <select
              className="w-full p-3 border border-black rounded-none bg-white font-bold text-xs uppercase tracking-widest outline-none cursor-pointer"
              value={shippingMethod}
              onChange={(e) => {
                const selectedShipping = e.target.value;
                setShippingMethod(selectedShipping);

                // Outside Dhaka হলে COD বন্ধ
                if (
                  selectedShipping === "outside_dhaka" &&
                  paymentMethod === "cod"
                ) {
                  setPaymentMethod("bkash");
                }
              }}
            >
              <option value="inside_dhaka">Inside Dhaka (৳80)</option>
              <option value="outside_dhaka">Outside Dhaka (৳150)</option>
            </select>

            {/* Payment Method */}
            <select
              className="w-full p-3 border border-black rounded-none bg-white font-bold text-xs uppercase tracking-widest outline-none cursor-pointer"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              {shippingMethod === "inside_dhaka" && (
                <option value="cod">Cash On Delivery (COD)</option>
              )}

              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
              <option value="rocket">Rocket</option>
              <option value="bank">Bank Transfer</option>
              <option value="upay">Upay</option>
              <option value="cellfin">CellFin</option>
              <option value="others">Others</option>
            </select>

            {/* Online Payment */}
            {paymentMethod !== "cod" && (
              <div className="space-y-3">
                <input
                  className="w-full p-3 border border-black rounded-none outline-none text-sm"
                  placeholder={
                    paymentMethod === "bank"
                      ? "Bank Reference / Transaction ID"
                      : "Transaction ID"
                  }
                  value={transactionNumber}
                  onChange={(e) => setTransactionNumber(e.target.value)}
                />

                <PaymentProofUpload
                  value={paymentProof}
                  onChange={setPaymentProof}
                />
              </div>
            )}

            {/* Order Summary */}
            <div className="border-t border-black pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>৳{subtotal}</span>
              </div>

              <div className="flex justify-between">
                <span>Shipping</span>
                <span>৳{shippingFee}</span>
              </div>

              <div className="flex justify-between font-bold text-base border-t border-dashed pt-2">
                <span>Total</span>
                <span>৳{total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-white">
          <button
            onClick={handleSaveOrder}
            className="w-full py-4 bg-black text-white font-bold"
          >
            CONFIRM ORDER (৳{total})
          </button>
        </div>
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl border-2 border-black p-6 relative animate-in fade-in zoom-in duration-200">
            {/* ক্লোজ বাটন */}
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 text-xl font-black hover:scale-110 transition-transform"
            >
              ✕
            </button>

            {/* প্রোডাক্ট টাইটেল */}
            <h2 className="text-2xl font-black uppercase mb-6 tracking-tighter border-b-2 border-black pb-2">
              {selectedProduct.name}
            </h2>

            {/* ভ্যারিয়েন্ট গ্রিড */}
            <div className="grid grid-cols-2 gap-4">
              {selectedProduct.variants?.map((v) => (
                <div
                  key={v._id}
                  onClick={() => {
                    if (v.stock > 0) {
                      addToCart(selectedProduct, v);
                      // ক্লোজ না করতে চাইলে নিচের লাইনটি বাদ দিন, ক্লোজ করতে চাইলে রাখুন
                      setSelectedProduct(null);
                    }
                  }}
                  className={`group relative border-2 border-black p-4 cursor-pointer transition-all duration-300
              ${
                v.stock > 0
                  ? "hover:bg-black hover:text-white"
                  : "opacity-40 cursor-not-allowed bg-gray-100"
              }`}
                >
                  {/* ভ্যারিয়েন্ট ইমেজ (যদি থাকে) */}
                  <div className="w-full h-40 bg-gray-50 mb-4 overflow-hidden">
                    <img
                      src={
                        v.media?.secure_url ||
                        selectedProduct.media?.[0]?.secure_url
                      }
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      alt="variant"
                    />
                  </div>

                  {/* ভ্যারিয়েন্ট ইনফো */}
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="font-bold text-sm uppercase">
                        {v.color} / {v.size}
                      </p>
                      <p className="text-[10px] font-bold opacity-60">
                        STOCK: {v.stock}
                      </p>
                    </div>
                    <p className="font-black text-lg">৳{v.sellingPrice}</p>
                  </div>

                  {/* সিলেক্ট ইফেক্ট */}
                  {v.stock <= 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60 font-black tracking-widest text-black">
                      SOLD OUT
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
