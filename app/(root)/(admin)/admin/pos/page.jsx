"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import { showToast } from "@/lib/showToast";
import ProductGallery from "@/components/ui/Application/Admin/pos/ProductGallery";
import CartSidebar from "@/components/ui/Application/Admin/pos/CartSidebar";
import VariantModal from "@/components/ui/Application/Admin/pos/VariantModal";

export default function POSPage() {
  const user = useSelector((state) => state.authStore.auth);

  // Core States
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showrooms, setShowrooms] = useState([]);
  const [selectedShowroomId, setSelectedShowroomId] = useState("");
  const [openProduct, setOpenProduct] = useState(null);

  // Exchange States
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const [exchangeData, setExchangeData] = useState(null);
  const [originalOrder, setOriginalOrder] = useState(null);

  const [discountType, setDiscountType] = useState("amount");
  const [vat, setVat] = useState(0);
  const [vatType, setVatType] = useState("percent");

  // Cart & Checkout States
  const [discount, setDiscount] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // FOCUS LOCK & SCANNER REFS
  const searchInputRef = useRef(null);

  // Calculations
  const subTotal = cart.reduce((s, item) => s + item.price * item.qty, 0);

  const discountAmount =
    discountType === "percent"
      ? (subTotal * Number(discount || 0)) / 100
      : Number(discount || 0);

  const afterDiscount = Math.max(0, subTotal - discountAmount);

  const vatAmount =
    vatType === "percent"
      ? (afterDiscount * Number(vat || 0)) / 100
      : Number(vat || 0);

  const total = afterDiscount + vatAmount;
  const totalQty = cart.reduce((s, item) => s + item.qty, 0);

  // --- Cart Helper Functions ---
  const addToCart = (product, variant, qty = 1) => {
    if (!variant) return;

    if (variant.stock <= 0) {
      showToast("❌ Out of stock! This item cannot be added.");
      return;
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.variantId === variant._id);

      if (existing) {
        if (existing.qty + qty > variant.stock) {
          showToast("Not enough stock ❌");
          return prev;
        }
        return prev.map((i) =>
          i.variantId === variant._id ? { ...i, qty: i.qty + qty } : i,
        );
      }

      return [
        ...prev,
        {
          _id: `${product._id}-${variant._id}`,
          productId: product._id,
          variantId: variant._id,
          name: product.name,
          color: variant.color,
          size: variant.size,
          price: variant.sellingPrice,
          qty,
          image: product.media?.[0]?.secure_url || "/placeholder.png",
        },
      ];
    });
  };

  const removeCartItem = (id) =>
    setCart((prev) =>
      prev.filter((item) => item.variantId !== id || item._id !== id),
    );

  const increaseQty = (variantId) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.variantId === variantId) {
          const parentProduct = products.find((p) => p._id === item.productId);
          const vMeta = parentProduct?.variants?.find(
            (v) => v._id === variantId,
          );
          if (vMeta && item.qty + 1 > vMeta.stock) {
            showToast("Not enough stock ❌");
            return item;
          }
          return { ...item, qty: item.qty + 1 };
        }
        return item;
      }),
    );
  };

  const decreaseQty = (variantId) =>
    setCart((prev) =>
      prev
        .map((item) =>
          item.variantId === variantId ? { ...item, qty: item.qty - 1 } : item,
        )
        .filter((item) => item.qty > 0),
    );

  // --- Checkout Function ---
  const handleCheckout = async (modalData = {}) => {
    const dataClean =
      modalData && typeof modalData === "object" && !modalData.target
        ? modalData
        : {};

    if (!cart.length) {
      showToast("Cart is empty");
      return;
    }

    const currentUser = user?.data?.user || user?.user || user;
    const userRole = currentUser?.role;

    const showroomId =
      userRole === "admin"
        ? selectedShowroomId
        : currentUser?.showroomId || selectedShowroomId;

    try {
      setCheckoutLoading(true);

      const payload = {
        items: cart.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          productName: i.name || "Unknown Product",
          image: i.image || "",
          color: i.color || "",
          size: i.size || "",
          qty: Number(i.qty),
          price: Number(i.price),
          subtotal: Number(i.price) * Number(i.qty),
        })),
        subTotal: Number(subTotal),
        discount: Number(discountAmount),
        vat: Number(vatAmount),
        total: Number(total),
        showroomId: showroomId,
        createdBy: currentUser?._id,
        userId: currentUser?._id,
        orderType: "pos",
        customerName: dataClean.customerName || "Walk-in Customer",
        phone: dataClean.phone || "",
        address: dataClean.address || "",
        saleDate: dataClean.saleDate || new Date().toISOString().split("T")[0],
        payments: dataClean.payments || [
          { method: "Cash", amount: Number(total) },
        ],
        deliveryCharge: Number(dataClean.deliveryCharge || 0),
        remark: dataClean.remark || "",
        soldBy: dataClean.soldBy || currentUser?.name || "POS Agent",
      };

      const res = await fetch("/api/showroom-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        showToast("Order created successfully ✅");

        setCart([]);
        setDiscount(0);
        setVat(0);
        setSearch("");

        // 🔥 ওর্ডার হওয়ার সাথে সাথেই নতুন স্টক ইনস্ট্যান্ট ফেচ করে স্ক্রিন আপডেট করবে
        fetchProducts("", showroomId);

        if (data.order?._id) {
          window.open(`/admin/print/${data.order._id}`, "_blank");
        }
      } else {
        showToast(data.message || "Checkout failed ❌");
      }
    } catch (err) {
      console.error("CHECKOUT ERROR:", err);
      showToast("Server error ❌");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleExchange = async (data) => {
    try {
      const currentUser = user?.data?.user || user?.user || user;
      const res = await fetch("/api/pos/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          showroomId: selectedShowroomId,
          createdBy: currentUser?._id,
        }),
      });

      const result = await res.json();

      if (result.success) {
        showToast("Exchange completed successfully");
        setCart([]);
        setExchangeOpen(false);
        setExchangeData(null);
        fetchProducts("", selectedShowroomId);
      } else {
        showToast(result.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- Fetch Products Callback ---
  const fetchProducts = useCallback(
    async (q = "", showroomIdParam = "") => {
      if (!user) return;

      try {
        setLoading(true);
        const currentUser = user?.data?.user || user?.user || user;
        const params = new URLSearchParams();
        if (q) params.set("q", q);

        const showroomId =
          currentUser?.role === "admin"
            ? showroomIdParam
            : currentUser?.showroomId;

        if (currentUser?.role === "admin" && !showroomIdParam) {
          params.set("showroomId", "all");
        } else if (showroomId) {
          params.set("showroomId", showroomId);
        }

        // 💡 নো-ক্যাশ হেডার যুক্ত করা হলো যেন ব্রাউজার পুরাতন ডাটা ক্যাশ থেকে না দেখায়
        const res = await fetch(`/api/pos?${params.toString()}`, {
          method: "GET",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
          cache: "no-store",
        });

        const data = await res.json();

        const formatted = (data.items || []).map((item) => {
          const product = item?.productId || {};

          const productVariants = (item?.variants || []).map((v) => ({
            _id: v._id,
            color: v.color || "N/A",
            size: v.size || "N/A",
            stock: v.showroomStock || 0,
            showroomStock: v.showroomStock || 0,
            barcode: v.barcode || "",
            sku: v.sku || "",
            mrp: v.mrp || 0,
            sellingPrice: v.sellingPrice || product.sellingPrice || 0,
          }));

          const totalStock = productVariants.reduce(
            (sum, v) => sum + v.stock,
            0,
          );

          return {
            _id: product._id || item._id,
            name: product.name || "Unnamed Product",
            sellingPrice: product.sellingPrice || 0,
            media: Array.isArray(product.media) ? product.media : [],
            variants: productVariants,
            totalStock,
          };
        });

        setProducts(formatted);
      } catch (error) {
        console.error("FETCH ERROR:", error);
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  useEffect(() => {
    const fetchShowrooms = async () => {
      const currentUser = user?.data?.user || user?.user || user;
      if (currentUser?.role !== "admin") return;
      const res = await fetch("/api/showrooms");
      const data = await res.json();
      setShowrooms(data.showrooms || []);
    };
    fetchShowrooms();
  }, [user]);

  useEffect(() => {
    if (user) fetchProducts("", selectedShowroomId);
  }, [user, selectedShowroomId, fetchProducts]);

  // STATE CHANGE FOCUS EFFECT
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [cart, openProduct, products]);

  // GLOBAL FOCUS LOCKER
  useEffect(() => {
    const handleGlobalClick = (e) => {
      const targetTagName = e.target.tagName.toLowerCase();

      if (
        targetTagName === "input" ||
        targetTagName === "select" ||
        targetTagName === "textarea" ||
        e.target.closest("button") ||
        e.target.closest("[role='dialog']") ||
        e.target.closest(".modal")
      ) {
        return;
      }

      if (searchInputRef.current) {
        requestAnimationFrame(() => {
          searchInputRef.current.focus();
        });
      }
    };

    document.addEventListener("click", handleGlobalClick);
    return () => {
      document.removeEventListener("click", handleGlobalClick);
    };
  }, []);

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 min-h-screen bg-gray-50">
      <ProductGallery
        products={products}
        loading={loading}
        search={search}
        setSearch={setSearch}
        setOpenProduct={setOpenProduct}
        addToCart={addToCart}
        inputRef={searchInputRef}
      />

      <CartSidebar
        cart={cart}
        setCart={setCart}
        user={user}
        selectedShowroomId={selectedShowroomId}
        setSelectedShowroomId={setSelectedShowroomId}
        showrooms={showrooms}
        fetchProducts={fetchProducts}
        search={search}
        subTotal={subTotal}
        discount={discount}
        setDiscount={setDiscount}
        discountType={discountType}
        setDiscountType={setDiscountType}
        vat={vat}
        setVat={setVat}
        vatType={vatType}
        setVatType={setVatType}
        discountAmount={discountAmount}
        vatAmount={vatAmount}
        total={total}
        totalQty={totalQty}
        removeCartItem={removeCartItem}
        increaseQty={increaseQty}
        decreaseQty={decreaseQty}
        handleCheckout={handleCheckout}
        checkoutLoading={checkoutLoading}
        handleExchange={handleExchange}
      />

      {openProduct && (
        <VariantModal
          product={openProduct}
          setOpenProduct={setOpenProduct}
          addToCart={addToCart}
        />
      )}
    </div>
  );
}
