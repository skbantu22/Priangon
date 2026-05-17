"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useSelector } from "react-redux";
import { showToast } from "@/lib/showToast";

export default function POSPage() {
  const user = useSelector((state) => state.authStore.auth);

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const [openProduct, setOpenProduct] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);

  const [selectedVariant, setSelectedVariant] = useState(null);
  const [qty, setQty] = useState(1);
  const [barcode, setBarcode] = useState("");

  // ---------------- FETCH PRODUCTS ----------------
  const fetchProducts = useCallback(
    async (q = "") => {
      if (!user) return;

      try {
        setLoading(true);

        const params = new URLSearchParams();

        if (q) {
          params.set("q", q);
        }

        const showroomId = user?.data?.user?.showroomId;

        if (user?.data?.user?.role !== "admin" && showroomId) {
          params.set("showroomId", showroomId);
        }

        const res = await fetch(`/api/pos?${params.toString()}`, {
          cache: "no-store",
        });

        const data = await res.json();

        const formatted = (data.items || []).map((item) => {
          const product = item?.productId || {};

          console.log("USER:", user?.data?.user);

          console.log("ROLE:", user?.data?.user?.role);

          console.log("SHOWROOM ID:", showroomId);

          console.log("PARAMS:", params.toString());
          return {
            _id: product._id || item._id,
            name: product.name || "Unnamed Product",
            sellingPrice: product.sellingPrice || 0,
            media: Array.isArray(product.media) ? product.media : [],

            variants: (item?.variants || []).map((v) => {
              const variant = v?.variantId || {};

              return {
                _id: variant._id || v._id,
                color: variant.color || "N/A",
                size: variant.size || "N/A",
                stock: v.stock || 0,
                barcode: variant.barcode || "",
                sellingPrice: variant.sellingPrice || product.sellingPrice || 0,
              };
            }),
          };
        });

        // remove duplicate products
        const uniqueProducts = formatted.filter(
          (product, index, self) =>
            index === self.findIndex((p) => p._id === product._id),
        );

        setProducts(uniqueProducts);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  useEffect(() => {
    if (user) {
      fetchProducts("");
    }
  }, [user, fetchProducts]);

  // ---------------- SEARCH ----------------
  useEffect(() => {
    const t = setTimeout(() => {
      fetchProducts(search);
    }, 300);

    return () => clearTimeout(t);
  }, [search, fetchProducts]);

  // ---------------- TOTAL ----------------
  const total = cart.reduce((s, p) => s + p.price * p.qty, 0);

  const totalQty = cart.reduce((s, p) => s + p.qty, 0);

  // ---------------- ADD TO CART ----------------
  const addToCart = () => {
    if (!openProduct || !selectedVariant) return;

    if (qty > selectedVariant.stock) {
      showToast("Not enough stock");
      return;
    }

    setCart((prev) => {
      const exist = prev.find((x) => x.variantId === selectedVariant._id);

      // already exists
      if (exist) {
        const newQty = exist.qty + qty;

        if (newQty > selectedVariant.stock) {
          showToast("Stock limit exceeded");
          return prev;
        }

        return prev.map((x) =>
          x.variantId === selectedVariant._id
            ? {
                ...x,
                qty: newQty,
              }
            : x,
        );
      }

      return [
        ...prev,
        {
          productId: openProduct._id,
          variantId: selectedVariant._id,

          name: `${openProduct.name} (${selectedVariant.color}-${selectedVariant.size})`,

          price: selectedVariant.sellingPrice,

          qty,
        },
      ];
    });

    setOpenProduct(null);
    setSelectedVariant(null);
    setQty(1);
  };

  // ---------------- CART QTY ----------------
  const increaseQty = (item) => {
    const stock = products
      .flatMap((p) => p.variants)
      .find((v) => v._id === item.variantId)?.stock;

    setCart((prev) =>
      prev.map((x) =>
        x.variantId === item.variantId
          ? {
              ...x,
              qty: x.qty < stock ? x.qty + 1 : x.qty,
            }
          : x,
      ),
    );
  };

  const decreaseQty = (item) => {
    setCart((prev) =>
      prev
        .map((x) =>
          x.variantId === item.variantId
            ? {
                ...x,
                qty: x.qty - 1,
              }
            : x,
        )
        .filter((x) => x.qty > 0),
    );
  };

  // ---------------- REMOVE CART ITEM ----------------
  const removeCartItem = (variantId) => {
    setCart((prev) => prev.filter((x) => x.variantId !== variantId));
  };

  const handleBarcodeScan = () => {
    if (!barcode.trim()) return;

    const allVariants = products.flatMap((p) =>
      p.variants.map((v) => ({
        ...v,
        product: p,
      })),
    );

    const found = allVariants.find((v) => v.barcode === barcode.trim());

    if (!found) {
      showToast("Product not found");
      setBarcode("");
      return;
    }

    if (found.stock <= 0) {
      showToast("Out of stock");
      setBarcode("");
      return;
    }

    setCart((prev) => {
      const exist = prev.find((x) => x.variantId === found._id);

      if (exist) {
        if (exist.qty >= found.stock) {
          showToast("Stock limit exceeded");
          return prev;
        }

        return prev.map((x) =>
          x.variantId === found._id
            ? {
                ...x,
                qty: x.qty + 1,
              }
            : x,
        );
      }

      return [
        ...prev,
        {
          productId: found.product._id,
          variantId: found._id,
          name: `${found.product.name} (${found.color}-${found.size})`,
          price: found.sellingPrice,
          qty: 1,
        },
      ];
    });

    showToast("Added to cart");

    setBarcode("");
  };

  // ---------------- CHECKOUT ----------------
  const handleCheckout = async () => {
    if (!cart.length) {
      showToast("Cart is empty");
      return;
    }

    try {
      setCheckoutLoading(true);

      const res = await fetch("/api/showroom-orders", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          items: cart.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            qty: i.qty,
            price: i.price,
          })),

          total,
          paymentMethod,

          showroomId: user?.data?.user?.showroomId,

          orderType: "pos",

          createdBy: user?.data?.user?.id,
        }),
      });

      const data = await res.json();

      if (data.success) {
        showToast("Order created successfully");

        setCart([]);

        await fetchProducts(search);

        window.open(`print/${data.order._id}`, "_blank");
      } else {
        showToast(data.message || "Checkout failed");
      }
    } catch (error) {
      console.log(error);

      showToast("Server Error");
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 min-h-screen bg-gray-100">
      {/* ---------------- LEFT SIDE ---------------- */}
      <div className="lg:col-span-8 bg-white p-3 sm:p-5">
        {/* SEARCH */}
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-300 p-3 rounded-lg mb-4 text-sm outline-none focus:border-green-500"
        />

        <input
          autoFocus
          type="text"
          placeholder="Scan barcode..."
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleBarcodeScan();
            }
          }}
          className="w-full border border-green-400 p-3 rounded-lg mb-4 text-sm outline-none"
        />

        {/* PRODUCTS */}
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {products.map((p) => (
              <div
                key={p._id}
                onClick={() => {
                  setSelectedProducts((prev) =>
                    prev.includes(p._id)
                      ? prev.filter((id) => id !== p._id)
                      : [...prev, p._id],
                  );

                  setOpenProduct(p);

                  setSelectedVariant(null);

                  setQty(1);
                }}
                className={`relative border rounded-xl p-2 cursor-pointer transition-all duration-200 active:scale-[0.98]

                ${
                  selectedProducts.includes(p._id)
                    ? "border-green-600 bg-green-50 shadow-lg"
                    : "bg-white hover:border-green-400 hover:shadow"
                }`}
              >
                {/* SELECTED BADGE */}
                {selectedProducts.includes(p._id) && (
                  <div className="absolute top-2 right-2 bg-green-600 text-white text-[10px] px-2 py-1 rounded-full">
                    Selected
                  </div>
                )}

                <Image
                  src={p.media?.[0]?.secure_url || "/placeholder.png"}
                  width={300}
                  height={300}
                  alt={p.name}
                  className="w-full h-28 sm:h-36 object-cover rounded-lg"
                />

                <h2 className="text-xs sm:text-sm font-semibold mt-2 line-clamp-2">
                  {p.name}
                </h2>

                <p className="text-green-700 font-bold text-sm mt-1">
                  ৳ {p.sellingPrice}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------------- RIGHT SIDE / CART ---------------- */}
      <div className="lg:col-span-4 bg-white border-t lg:border-l p-3 sm:p-4 flex flex-col min-h-[40vh] lg:min-h-screen">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Cart</h2>

          <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
            {totalQty} Items
          </div>
        </div>

        {/* CART ITEMS */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {cart.length === 0 && (
            <div className="text-center text-gray-400 text-sm mt-10">
              No items in cart
            </div>
          )}

          {cart.map((item) => (
            <div
              key={`${item.variantId}-${item.productId}`}
              className="border rounded-xl p-3"
            >
              <div className="flex justify-between gap-2">
                <div>
                  <h3 className="text-sm font-medium">{item.name}</h3>

                  <p className="text-green-700 font-bold text-sm mt-1">
                    ৳ {item.price}
                  </p>
                </div>

                <button
                  onClick={() => removeCartItem(item.variantId)}
                  className="text-red-500 text-lg"
                >
                  ✕
                </button>
              </div>

              {/* QTY */}
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={() => decreaseQty(item)}
                  className="w-8 h-8 rounded bg-gray-100"
                >
                  -
                </button>

                <span className="font-semibold">{item.qty}</span>

                <button
                  onClick={() => increaseQty(item)}
                  className="w-8 h-8 rounded bg-gray-100"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* PAYMENT */}
        <div className="pt-4 border-t mt-4">
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full border p-3 rounded-lg text-sm mb-4"
          >
            <option value="cash">Cash</option>
            <option value="bkash">Bkash</option>
            <option value="card">Card</option>
          </select>

          {/* TOTAL */}
          <div className="flex justify-between text-lg font-bold mb-4">
            <span>Total</span>

            <span className="text-green-700">৳ {total}</span>
          </div>

          {/* CHECKOUT */}
          <button
            onClick={handleCheckout}
            disabled={checkoutLoading}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
          >
            {checkoutLoading ? "Processing..." : "Complete Sale"}
          </button>
        </div>
      </div>

      {/* ---------------- MODAL ---------------- */}
      {openProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-2">
          <div className="bg-white w-full sm:w-[450px] rounded-t-2xl sm:rounded-2xl p-4">
            <h2 className="font-bold text-lg mb-4">{openProduct.name}</h2>

            {/* VARIANTS */}
            <div className="space-y-2">
              {openProduct.variants?.map((v) => (
                <div
                  key={v._id}
                  onClick={() => setSelectedVariant(v)}
                  className={`border rounded-lg p-3 cursor-pointer transition-all

                  ${
                    selectedVariant?._id === v._id
                      ? "bg-green-100 border-green-500"
                      : "hover:border-green-400"
                  }`}
                >
                  <div className="flex justify-between text-sm">
                    <span>
                      {v.color} - {v.size}
                    </span>

                    <span className="font-semibold">Stock: {v.stock}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* QTY */}
            <input
              type="number"
              min={1}
              max={selectedVariant?.stock || 1}
              value={qty}
              onChange={(e) =>
                setQty(
                  Math.min(Number(e.target.value), selectedVariant?.stock || 1),
                )
              }
              className="border p-3 rounded-lg w-full mt-4"
            />

            {/* ADD BUTTON */}
            <button
              disabled={!selectedVariant}
              onClick={addToCart}
              className="bg-green-600 text-white w-full p-3 rounded-xl mt-4 disabled:opacity-50"
            >
              Add to Cart
            </button>

            {/* CLOSE */}
            <button
              onClick={() => setOpenProduct(null)}
              className="w-full mt-3 text-red-500"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
