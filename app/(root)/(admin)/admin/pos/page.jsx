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
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [qty, setQty] = useState(1);

  const [barcode, setBarcode] = useState("");

  const [showrooms, setShowrooms] = useState([]);
  const [selectedShowroomId, setSelectedShowroomId] = useState("");

  // ---------------- FETCH PRODUCTS ----------------
  const fetchProducts = useCallback(
    async (q = "") => {
      if (!user) return;

      try {
        setLoading(true);

        const params = new URLSearchParams();
        if (q) params.set("q", q);

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

          return {
            _id: product._id || item._id,
            name: product.name || "Unnamed Product",
            sellingPrice: product.sellingPrice || 0,
            media: Array.isArray(product.media) ? product.media : [],

            variants: (item?.variants || []).map((v) => {
              const variant = v?.variantId || {};

              return {
                _id: variant._id || v._id,
                color: v.color || variant.color || "N/A",
                size: v.size || variant.size || "N/A",
                stock: v.showroomStock ?? variant.showroomStock ?? 0,
                barcode: v.barcode || variant.barcode || "",
                sellingPrice: variant.sellingPrice || product.sellingPrice || 0,
              };
            }),
          };
        });

        setProducts(formatted);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  // ---------------- SHOWROOMS ----------------
  // 1. This is your existing showroom fetcher
  useEffect(() => {
    const fetchShowrooms = async () => {
      if (user?.data?.user?.role !== "admin") return;
      const res = await fetch("/api/showrooms");
      const data = await res.json();
      setShowrooms(data.showrooms || []);
    };
    fetchShowrooms();
  }, [user]);

  // 2. This is your existing product fetcher
  useEffect(() => {
    if (user) fetchProducts("");
  }, [user, fetchProducts]);

  // 3. This is your existing search bar debouncer
  useEffect(() => {
    const t = setTimeout(() => {
      fetchProducts(search);
    }, 300);
    return () => clearTimeout(t);
  }, [search, fetchProducts]);

  // ==========================================================
  // PASTE THE NEW CODE DIRECTLY HERE:
  // ==========================================================
  useEffect(() => {
    let scannedBuffer = "";
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e) => {
      // If cashier is actively typing in the search bar, don't hijack their typing
      if (
        document.activeElement &&
        document.activeElement.tagName === "INPUT" &&
        document.activeElement.placeholder?.includes("Search")
      ) {
        return;
      }

      const currentTime = Date.now();

      // If typing is slow (greater than 50ms per key), it's a human, not a scanner. Reset.
      if (currentTime - lastKeyTime > 50) {
        scannedBuffer = "";
      }
      lastKeyTime = currentTime;

      // Barcode scanners send "Enter" when they finish reading a code
      if (e.key === "Enter") {
        if (scannedBuffer.trim()) {
          processBarcode(scannedBuffer.trim());
          scannedBuffer = "";
        }
        e.preventDefault();
        return;
      }

      // Build the barcode number letter by letter
      if (e.key.length === 1) {
        scannedBuffer += e.key;
      }
    };

    const processBarcode = (code) => {
      const allVariants = products.flatMap((p) =>
        p.variants.map((v) => ({ ...v, product: p })),
      );

      const found = allVariants.find((v) => v.barcode === code);

      if (!found) {
        showToast(`Product not found: ${code}`);
        return;
      }

      if (found.stock <= 0) {
        showToast(`${found.product.name} is out of stock`);
        return;
      }

      setCart((prev) => {
        const exist = prev.find((x) => x.variantId === found._id);
        if (exist) {
          if (exist.qty + 1 > found.stock) {
            showToast("Stock limit exceeded");
            return prev;
          }
          return prev.map((x) =>
            x.variantId === found._id ? { ...x, qty: x.qty + 1 } : x,
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

      showToast(`Added: ${found.product.name}`);
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [products]); // Keeps listening seamlessly whenever your product list updates

  useEffect(() => {
    if (user) fetchProducts("");
  }, [user, fetchProducts]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchProducts(search);
    }, 300);

    return () => clearTimeout(t);
  }, [search, fetchProducts]);

  // ---------------- CART TOTAL ----------------
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

      if (exist) {
        const newQty = exist.qty + qty;

        if (newQty > selectedVariant.stock) {
          showToast("Stock limit exceeded");
          return prev;
        }

        return prev.map((x) =>
          x.variantId === selectedVariant._id ? { ...x, qty: newQty } : x,
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

    // CLEAN RESET (important)
    setOpenProduct(null);
    setSelectedVariant(null);
    setQty(1);
    setBarcode("");
  };

  // ---------------- CART UPDATE ----------------
  const increaseQty = (item) => {
    setCart((prev) =>
      prev.map((x) =>
        x.variantId === item.variantId ? { ...x, qty: x.qty + 1 } : x,
      ),
    );
  };

  const decreaseQty = (item) => {
    setCart((prev) =>
      prev
        .map((x) =>
          x.variantId === item.variantId ? { ...x, qty: x.qty - 1 } : x,
        )
        .filter((x) => x.qty > 0),
    );
  };

  const removeCartItem = (variantId) => {
    setCart((prev) => prev.filter((x) => x.variantId !== variantId));
  };

  // ---------------- BARCODE ----------------
  // const handleBarcodeScan = () => {
  //   if (!barcode.trim()) return;

  //   const allVariants = products.flatMap((p) =>
  //     p.variants.map((v) => ({ ...v, product: p })),
  //   );

  //   const found = allVariants.find((v) => v.barcode === barcode.trim());

  //   if (!found) {
  //     showToast("Product not found");
  //     setBarcode("");
  //     return;
  //   }

  //   if (found.stock <= 0) {
  //     showToast("Out of stock");
  //     setBarcode("");
  //     return;
  //   }

  //   setCart((prev) => {
  //     const exist = prev.find((x) => x.variantId === found._id);

  //     if (exist) {
  //       return prev.map((x) =>
  //         x.variantId === found._id ? { ...x, qty: x.qty + 1 } : x,
  //       );
  //     }

  //     return [
  //       ...prev,
  //       {
  //         productId: found.product._id,
  //         variantId: found._id,
  //         name: `${found.product.name} (${found.color}-${found.size})`,
  //         price: found.sellingPrice,
  //         qty: 1,
  //       },
  //     ];
  //   });

  //   showToast("Added to cart");
  //   setBarcode("");
  // };

  // ---------------- CHECKOUT ----------------
  const handleCheckout = async () => {
    if (!cart.length) {
      showToast("Cart is empty");
      return;
    }

    const showroomId =
      user?.data?.user?.role === "admin"
        ? selectedShowroomId
        : user?.data?.user?.showroomId;

    if (user?.data?.user?.role === "admin" && !showroomId) {
      showToast("Select showroom");
      return;
    }

    try {
      setCheckoutLoading(true);

      const payload = {
        items: cart.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          qty: i.qty,
          price: i.price,
        })),
        total,
        paymentMethod,
        orderType: "pos",
        showroomId,
        createdBy: user?.data?.user?._id,
      };

      const res = await fetch("/api/showroom-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        showToast("Order created");

        // CLEAN RESET
        setCart([]);
        setSearch("");
        setBarcode("");

        await fetchProducts(search);

        window.open(`print/${data.order._id}`, "_blank");
      } else {
        showToast(data.message || "Failed");
      }
    } catch (err) {
      console.log(err);
      showToast("Server error");
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 min-h-screen bg-gray-100">
      {/* LEFT */}
      <div className="lg:col-span-8 bg-white p-4">
        <input
          className="w-full border p-3 mb-3 rounded"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* <input
          className="w-full border p-3 mb-3 rounded border-green-400"
          placeholder="Scan barcode..."
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleBarcodeScan()}
        /> */}

        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map((p) => (
              <div
                key={p._id}
                onClick={() => {
                  setOpenProduct(p);
                  setSelectedVariant(null);
                  setQty(1);
                }}
                className="
  border
  rounded-xl
  p-4
  cursor-pointer
  hover:shadow-lg
  transition-all
  bg-white
  flex
  flex-col
"
              >
                <div className="h-64 w-full flex items-center justify-center bg-gray-50 rounded-lg">
                  <Image
                    src={p.media?.[0]?.secure_url || "/placeholder.png"}
                    width={220}
                    height={220}
                    className="max-h-60 w-auto object-contain"
                    alt={p.name}
                  />
                </div>
                <p className="text-center font-semibold mt-3 line-clamp-2 min-h-[48px]">
                  {p.name}
                </p>
                <p className="text-center text-2xl font-bold text-green-600 mt-2">
                  ৳{p.sellingPrice}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CART */}
      <div className="lg:col-span-4 bg-white p-4 border-l">
        <h2 className="font-bold mb-2">Cart ({totalQty})</h2>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {cart.map((item) => (
            <div key={item.variantId} className="border p-2 rounded">
              <div className="flex justify-between">
                <p className="text-sm">{item.name}</p>
                <button onClick={() => removeCartItem(item.variantId)}>
                  ✕
                </button>
              </div>

              <div className="flex gap-2 mt-2">
                <button onClick={() => decreaseQty(item)}>-</button>
                <span>{item.qty}</span>
                <button onClick={() => increaseQty(item)}>+</button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t pt-3">
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>৳{total}</span>
          </div>

          {user?.data?.user?.role === "admin" && (
            <select
              className="w-full border p-2 mt-2"
              value={selectedShowroomId}
              onChange={(e) => setSelectedShowroomId(e.target.value)}
            >
              <option value="">Select Showroom</option>
              {showrooms.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          <select
            className="w-full border p-2 mt-2"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value="cash">Cash</option>
            <option value="bkash">Bkash</option>
            <option value="card">Card</option>
          </select>

          <button
            disabled={checkoutLoading}
            onClick={handleCheckout}
            className="w-full bg-green-600 text-white p-6 mt-6 rounded"
          >
            {checkoutLoading ? "Processing..." : "Complete Sale"}
          </button>
        </div>
      </div>

      {/* MODAL */}
      {openProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-md p-4 rounded">
            <h2 className="font-bold mb-3">{openProduct.name}</h2>

            {openProduct.variants.map((v) => (
              <div
                key={v._id}
                onClick={() => setSelectedVariant(v)}
                className={`border p-2 mb-2 cursor-pointer ${
                  selectedVariant?._id === v._id ? "bg-green-100" : ""
                }`}
              >
                {v.color} - {v.size} | Stock: {v.stock}
              </div>
            ))}

            <input
              type="number"
              value={qty}
              min={1}
              onChange={(e) => setQty(Number(e.target.value))}
              className="border p-2 w-full mt-2"
            />

            <button
              onClick={addToCart}
              disabled={!selectedVariant}
              className="w-full bg-green-600 text-white p-2 mt-3"
            >
              Add to Cart
            </button>

            <button
              onClick={() => setOpenProduct(null)}
              className="w-full mt-2 text-red-500"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
