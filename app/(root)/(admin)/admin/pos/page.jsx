"use client";

import { useEffect, useState, useCallback } from "react";
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
  const removeCartItem = (id) =>
    setCart((prev) => prev.filter((item) => item._id !== id));

  const increaseQty = (variantId) =>
    setCart((prev) =>
      prev.map((item) =>
        item.variantId === variantId ? { ...item, qty: item.qty + 1 } : item,
      ),
    );

  const decreaseQty = (variantId) =>
    setCart((prev) =>
      prev
        .map((item) =>
          item.variantId === variantId ? { ...item, qty: item.qty - 1 } : item,
        )
        .filter((item) => item.qty > 0),
    );

  // ✅ FIX: Accept modalData sent up from CheckoutModal
  const handleCheckout = async (modalData = {}) => {
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

          productName: i.name || i.productName || "Unknown Product",

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

        showroomId,

        createdBy: user?.data?.user?._id,

        orderType: "pos",

        customerName: modalData.customerName || "",
        phone: modalData.phone || "",
        address: modalData.address || "",

        saleDate: modalData.saleDate || new Date().toISOString().split("T")[0],

        payments: modalData.payments || [],

        deliveryCharge: modalData.deliveryCharge || 0,

        remark: modalData.remark || "",

        soldBy: modalData.soldBy || "Guest",
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
      const res = await fetch("/api/pos/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          showroomId: selectedShowroomId,
          createdBy: user?.data?.user?._id,
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

  const fetchProducts = useCallback(
    async (q = "", showroomIdParam = "") => {
      if (!user) return;

      try {
        setLoading(true);

        const params = new URLSearchParams();
        if (q) params.set("q", q);

        const showroomId =
          user?.data?.user?.role === "admin"
            ? showroomIdParam
            : user?.data?.user?.showroomId;

        if (showroomId) {
          params.set("showroomId", showroomId);
        }

        const res = await fetch(`/api/pos?${params.toString()}`, {
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
      if (user?.data?.user?.role !== "admin") return;
      const res = await fetch("/api/showrooms");
      const data = await res.json();
      setShowrooms(data.showrooms || []);
    };
    fetchShowrooms();
  }, [user]);

  useEffect(() => {
    if (user) fetchProducts("", selectedShowroomId);
  }, [user, selectedShowroomId, fetchProducts]);

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 min-h-screen bg-gray-50">
      <ProductGallery
        products={products}
        loading={loading}
        search={search}
        setSearch={setSearch}
        setOpenProduct={setOpenProduct}
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
        handleCheckout={handleCheckout} // Passed cleanly to CartSidebar
        checkoutLoading={checkoutLoading}
        handleExchange={handleExchange}
      />

      {openProduct && (
        <VariantModal
          product={openProduct}
          setOpenProduct={setOpenProduct}
          setCart={setCart}
        />
      )}
    </div>
  );
}
