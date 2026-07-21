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
      <div className="col-span-8 h-screen p-6 border-r border-gray-200 flex flex-col">
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
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="grid grid-cols-4 gap-4 pb-6">
              {filteredProducts.map((product) => (
                <div
                  key={product._id}
                  onClick={() => setSelectedProduct(product)}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-lg hover:border-black transition-all duration-300 cursor-pointer"
                >
                  <img
                    src={product.media?.[0]?.secure_url || "/placeholder.png"}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />

                  <div className="p-3">
                    <h3 className="font-bold text-sm leading-5 line-clamp-2">
                      {product.name}
                    </h3>

                    <p className="text-xs text-gray-500 mt-1">
                      {product.variants?.length} ভ্যারিয়েন্ট
                    </p>
                  </div>
                </div>
              ))}
            </div>
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-7xl h-[88vh] bg-white rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,.35)] overflow-hidden flex flex-col">
            {/* HEADER */}
            <div className="sticky top-0 z-30 flex items-center justify-between px-8 py-5 border-b bg-gradient-to-r from-white to-gray-100">
              <div>
                <h2 className="text-3xl font-black tracking-tight">
                  {selectedProduct.name}
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  {selectedProduct.variants?.length} Variants Available
                </p>
              </div>

              <button
                onClick={() => setSelectedProduct(null)}
                className="w-12 h-12 rounded-full border hover:bg-black hover:text-white transition-all duration-300 flex items-center justify-center text-2xl"
              >
                ✕
              </button>
            </div>

            {/* BODY */}
            <div className="flex-1 overflow-y-auto p-7 bg-gray-100">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                {selectedProduct.variants?.map((v) => {
                  const image =
                    v.media?.secure_url ||
                    v.media?.[0]?.secure_url ||
                    selectedProduct.media?.[0]?.secure_url ||
                    "/placeholder.png";

                  return (
                    <div
                      key={v._id}
                      onClick={() => {
                        if (v.stock > 0) {
                          addToCart(selectedProduct, v);
                          setSelectedProduct(null);
                        }
                      }}
                      className={`group relative bg-white rounded-2xl overflow-hidden transition-all duration-300 border

                ${
                  v.stock > 0
                    ? "cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:border-black"
                    : "opacity-50 cursor-not-allowed"
                }`}
                    >
                      {/* IMAGE */}

                      <div className="relative">
                        <img
                          src={image}
                          alt=""
                          className="w-full aspect-[4/5] object-cover group-hover:scale-105 duration-500"
                        />

                        <div className="absolute top-3 left-3">
                          <span
                            className={`px-3 py-1 rounded-full text-[11px] font-bold shadow

                      ${
                        v.stock > 0
                          ? "bg-emerald-600 text-white"
                          : "bg-red-600 text-white"
                      }`}
                          >
                            {v.stock > 0 ? `${v.stock} In Stock` : "Sold Out"}
                          </span>
                        </div>
                      </div>

                      {/* CONTENT */}

                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-lg">{v.color}</h3>

                            <p className="text-sm text-gray-500 mt-1">
                              Size : {v.size}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500 uppercase">
                              Price
                            </p>

                            <h3 className="text-2xl font-black">
                              ৳{Number(v.sellingPrice).toLocaleString()}
                            </h3>
                          </div>

                          <button
                            className={`px-5 py-2 rounded-xl text-sm font-bold transition

                      ${
                        v.stock > 0
                          ? "bg-black text-white group-hover:bg-emerald-600"
                          : "bg-gray-300 text-gray-600"
                      }`}
                          >
                            {v.stock > 0 ? "Select" : "Unavailable"}
                          </button>
                        </div>
                      </div>

                      {v.stock <= 0 && (
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center">
                          <span className="bg-red-600 text-white px-6 py-2 rounded-full font-bold">
                            SOLD OUT
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
