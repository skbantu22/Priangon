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

  const removeCartItem = (variantId) => {
    setCart((prev) => prev.filter((item) => item.variantId !== variantId));
  };

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

  // --- 🛠️ Complete Standard/Exchange Checkout Handler ---
  const handleCheckout = async (modalData = {}) => {
    const dataClean =
      modalData && typeof modalData === "object" && !modalData.target
        ? modalData
        : {};

    const isExchange = dataClean.isExchangeMode || false;

    const exchange = dataClean.exchangeData || {};

    if (!isExchange && !cart.length) {
      showToast("Cart is empty");
      return;
    }

    const currentUser = user?.data?.user || user?.user || user;

    const showroomId =
      currentUser?.role === "admin"
        ? selectedShowroomId
        : currentUser?.showroomId || selectedShowroomId;

    try {
      setCheckoutLoading(true);

      // ==========================
      // NORMAL CART ITEMS
      // ==========================

      const normalItems = cart.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,

        productName: i.name || "Unknown Product",

        image: i.image || "",

        color: i.color || "",

        size: i.size || "",

        qty: Number(i.qty),

        price: Number(i.price),

        subtotal: Number(i.price) * Number(i.qty),
      }));

      // ==========================
      // EXCHANGE NEW ITEMS
      // ==========================

      const exchangeItems = (exchange.newItems || [])
        .filter((i) => i && Number(i.qty) > 0 && Number(i.price) >= 0)
        .map((i) => ({
          productId: i.productId,

          variantId: i.variantId,

          productName: i.productName || i.name || "Unknown Product",

          image: i.image || "",

          color: i.color || "",

          size: i.size || "",

          qty: Number(i.qty),

          price: Number(i.price),

          subtotal: Number(i.price) * Number(i.qty),
        }));

      console.log("========== EXCHANGE DEBUG ==========");
      console.log("IS EXCHANGE:", isExchange);

      console.log("OLD RETURN ITEMS:", exchange.returnedItems);

      console.log("NEW ITEMS BEFORE MAP:", exchange.newItems);

      console.log("FINAL NEW ITEMS:", exchangeItems);

      console.log("====================================");

      const orderItems = isExchange ? exchangeItems : normalItems;

      const exchangeNewTotal = orderItems.reduce(
        (sum, item) => sum + Number(item.subtotal || 0),
        0,
      );

      const finalBillAmount = isExchange ? exchangeNewTotal : Number(total);

      // ==========================
      // PAYMENTS
      // ==========================

      const formattedPayments =
        dataClean.payments?.length > 0
          ? dataClean.payments.map((p) => ({
              type: p.type,

              option: p.option || "",

              amount: Number(p.amount || 0),
            }))
          : [
              {
                type: "Cash",

                option: "",

                amount: finalBillAmount,
              },
            ];

      const payload = {
        showroomId,

        createdBy: currentUser?._id,

        orderType: isExchange ? "exchange" : "pos",

        customerName: dataClean.customerName || "Walk-in Customer",

        phone: dataClean.phone || "",

        address: dataClean.address || "",

        saleDate: dataClean.saleDate || new Date().toISOString(),

        subTotal: finalBillAmount,

        discount: isExchange ? 0 : Number(discountAmount),

        vat: isExchange ? 0 : Number(vatAmount),

        total: finalBillAmount,

        payments: formattedPayments,

        deliveryCharge: Number(dataClean.deliveryCharge || 0),

        remark: dataClean.remark || "",

        soldBy: dataClean.soldBy || currentUser?.name || "POS Agent",

        items: orderItems,

        newItems: orderItems,
      };

      // ==========================
      // EXCHANGE DATA
      // ==========================

      if (isExchange) {
        payload.originalOrderId = exchange.originalOrderId;

        payload.reason = exchange.reason || "Product Exchange";

        payload.returnedItems = (exchange.returnedItems || []).map((i) => ({
          productId: i.productId,

          variantId: i.variantId,

          productName: i.productName || i.name || "Unknown Product",

          qty: Number(i.qty || 0),

          price: Number(i.price || 0),

          subtotal: Number(i.price || 0) * Number(i.qty || 0),
        }));

        payload.newItems = exchangeItems;

        payload.items = exchangeItems;
      }

      console.log("========== FINAL PAYLOAD ==========");

      console.log(JSON.stringify(payload, null, 2));

      console.log("====================================");

      const res = await fetch(
        isExchange ? "/api/pos/exchange" : "/api/showroom-orders",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(payload),
        },
      );

      const data = await res.json();

      if (!data.success) {
        showToast(data.message || "Checkout failed");

        return;
      }

      showToast(
        isExchange
          ? "Exchange completed successfully ✅"
          : "Order created successfully ✅",
      );

      setCart([]);

      setDiscount(0);

      setVat(0);

      setSearch("");

      setExchangeOpen(false);

      setExchangeData(null);

      fetchProducts("", showroomId);

      const printId = data.exchangeOrder?._id || data.order?._id;

      if (printId) {
        window.open(`/admin/print/${printId}`, "_blank");
      }
    } catch (err) {
      console.error("CHECKOUT ERROR:", err);

      showToast("Server Error");
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

            // ✅ Variant Image
            image: v.image || "/placeholder.png",
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
    const timer = setTimeout(() => {
      fetchProducts(search, selectedShowroomId);
    }, 300); // debounce

    return () => clearTimeout(timer);
  }, [search, selectedShowroomId, fetchProducts]);
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

  useEffect(() => {
    const handleGlobalClick = (e) => {
      const targetTagName = e.target.tagName.toLowerCase();
      // এগুলোতে focus নিবে না
      if (
        targetTagName === "input" ||
        targetTagName === "select" ||
        targetTagName === "textarea" ||
        e.target.closest("button") ||
        e.target.closest("[data-no-focus]") ||
        e.target.closest("[role='dialog']") ||
        e.target.closest(".modal")
      ) {
        return;
      }

      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    };

    document.addEventListener("pointerdown", handleGlobalClick);

    return () => {
      document.removeEventListener("pointerdown", handleGlobalClick);
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
