"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { showToast } from "@/lib/showToast";
import ProductGallery from "@/components/ui/Application/Admin/pos/ProductGallery";
import CartSidebar from "@/components/ui/Application/Admin/pos/CartSidebar";
import VariantModal from "@/components/ui/Application/Admin/pos/VariantModal";
import { useDispatch, useSelector } from "react-redux";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";

import {
  addToCart as addToCartAction,
  increaseQty as increaseQtyAction,
  decreaseQty as decreaseQtyAction,
  removeCartItem as removeCartItemAction,
  clearCart,
} from "@/store/reducer/posCartSlice";
import PosFooter from "@/components/ui/Application/Admin/PosFooter";

export default function POSPage() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const cart = useSelector((state) => state.posCart.cart);
  const user = useSelector((state) => state.authStore.auth);
  const [cartExpanded, setCartExpanded] = useState(false);
  // Core States
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(""); // 🚀 Debounce Search State
  const [showrooms, setShowrooms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedShowroomId, setSelectedShowroomId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [openProduct, setOpenProduct] = useState(null);

  // Exchange & Discount States
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const [exchangeData, setExchangeData] = useState(null);
  const [discountType, setDiscountType] = useState("amount");
  const [vat, setVat] = useState(0);
  const [vatType, setVatType] = useState("percent");
  const [discount, setDiscount] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const searchInputRef = useRef(null);
  const currentUser = useMemo(
    () => user?.data?.user || user?.user || user,
    [user],
  );

  // 🚀 Debounce Search Effect (দ্রুত টাইপিংয়ে বারবার API কল হওয়া আটকাবে)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 200);

    return () => clearTimeout(timer);
  }, [search]);

  // ==========================
  // 🚀 OPTIMIZED USEINFINITEQUERY
  // ==========================
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: [
      "pos-products",
      debouncedSearch,
      selectedShowroomId,
      selectedCategoryId,
      currentUser?._id,
      currentUser?.role,
    ],

    queryFn: async ({ pageParam = 1 }) => {
      if (!user)
        return { items: [], page: 1, limit: 20, total: 0, hasMore: false };

      const params = new URLSearchParams();
      params.set("page", pageParam.toString());
      params.set("limit", "20");

      if (debouncedSearch) params.set("q", debouncedSearch);
      if (selectedCategoryId) params.set("categoryId", selectedCategoryId);

      const showroomId =
        currentUser?.role === "admin"
          ? selectedShowroomId
          : currentUser?.showroomId;

      if (currentUser?.role === "admin" && !selectedShowroomId) {
        params.set("showroomId", "all");
      } else if (showroomId) {
        params.set("showroomId", showroomId);
      }

      const res = await fetch(`/api/pos?${params.toString()}`, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
        cache: "no-store",
      });

      const resData = await res.json();

      const formatted = (resData.items ?? []).map(
        ({ productId = {}, variants = [], _id }) => {
          const productVariants = variants.map((v) => ({
            ...v,
            stock: v.showroomStock || 0,
            showroomStock: v.showroomStock || 0,
            sellingPrice: v.sellingPrice || productId.sellingPrice || 0,
            image: v.image || productId.image || "/placeholder.png",
          }));

          return {
            _id: productId._id || _id,
            name: productId.name,
            image: productId.image,
            sellingPrice: productId.sellingPrice,
            variants: productVariants,
            media: productId.image ? [{ secure_url: productId.image }] : [],
            totalStock: productVariants.reduce((a, b) => a + b.stock, 0),
          };
        },
      );

      return {
        items: formatted,
        page: resData.page || pageParam,
        limit: resData.limit || 20,
        total: resData.total || 0,
        hasMore: resData.hasMore ?? false,
      };
    },

    initialPageParam: 1,

    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,

    enabled: !!user,
    staleTime: 1000 * 60 * 3, // 🚀 ৩ মিনিট পর্যন্ত ব্যাকগ্রাউন্ড ক্যাস ধরে রাখবে
    gcTime: 1000 * 60 * 10, // 🚀 ১০ মিনিট ডাটা মেমোরিতে সেভ থাকবে
    refetchOnWindowFocus: false, // 🚀 উইন্ডো ফোকাস পরিবর্তন হলে রিলোড বন্ধ
  });

  // 🚀 Memoized Flat Products List
  const products = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

  // 🚀 Memoized Cart Calculations
  const subTotal = useMemo(
    () => cart.reduce((s, item) => s + item.price * item.qty, 0),
    [cart],
  );

  const discountAmount = useMemo(
    () =>
      discountType === "percent"
        ? (subTotal * Number(discount || 0)) / 100
        : Number(discount || 0),
    [subTotal, discount, discountType],
  );

  const afterDiscount = useMemo(
    () => Math.max(0, subTotal - discountAmount),
    [subTotal, discountAmount],
  );

  const vatAmount = useMemo(
    () =>
      vatType === "percent"
        ? (afterDiscount * Number(vat || 0)) / 100
        : Number(vat || 0),
    [afterDiscount, vat, vatType],
  );

  const total = useMemo(
    () => afterDiscount + vatAmount,
    [afterDiscount, vatAmount],
  );
  const totalQty = useMemo(
    () => cart.reduce((s, item) => s + item.qty, 0),
    [cart],
  );

  // 🚀 Optimized Handlers with useCallback
  const addToCart = useCallback(
    (product, variant, qty = 1) => {
      console.log("PRODUCT", product);
      console.log("VARIANT", variant);
      if (!variant) return;

      if (variant.stock <= 0) {
        showToast("❌ Out of stock! This item cannot be added.");
        return;
      }

      const existing = cart.find((i) => i.variantId === variant._id);

      if (existing && existing.qty + qty > variant.stock) {
        showToast("Not enough stock ❌");
        return;
      }

      dispatch(
        addToCartAction({
          _id: `${product._id}-${variant._id}`,
          productId: product._id,
          variantId: variant._id,
          name: product.name,
          color: variant.color,
          size: variant.size,
          price: variant.sellingPrice,
          qty,
          image: product.media?.[0]?.secure_url || "/placeholder.png",
        }),
      );
    },
    [cart, dispatch],
  );

  const removeCartItem = useCallback(
    (variantId) => {
      dispatch(removeCartItemAction(variantId));
    },
    [dispatch],
  );

  const increaseQty = useCallback(
    (variantId) => {
      const item = cart.find((i) => i.variantId === variantId);
      if (!item) return;

      const parentProduct = products.find((p) => p._id === item.productId);
      const vMeta = parentProduct?.variants?.find((v) => v._id === variantId);

      if (vMeta && item.qty + 1 > vMeta.stock) {
        showToast("Not enough stock ❌");
        return;
      }

      dispatch(increaseQtyAction(variantId));
    },
    [cart, products, dispatch],
  );

  const decreaseQty = useCallback(
    (variantId) => {
      dispatch(decreaseQtyAction(variantId));
    },
    [dispatch],
  );

  const handleCheckout = async (modalData = {}) => {
    console.log("🔥 handleCheckout called", modalData);

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

    const showroomId =
      currentUser?.role === "admin"
        ? selectedShowroomId
        : currentUser?.showroomId || selectedShowroomId;

    try {
      setCheckoutLoading(true);

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

      const orderItems = isExchange ? exchangeItems : normalItems;
      const exchangeNewTotal = orderItems.reduce(
        (sum, item) => sum + Number(item.subtotal || 0),
        0,
      );

      const finalBillAmount = isExchange ? exchangeNewTotal : Number(total);

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
        customerId: dataClean.customerId || null,
      };

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

      const res = await fetch(
        isExchange ? "/api/pos/exchange" : "/api/showroom-orders",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const resData = await res.json();

      if (!resData.success) {
        showToast(resData.message || "Checkout failed");
        return;
      }

      showToast(
        isExchange
          ? "Exchange completed successfully ✅"
          : "Order created successfully ✅",
      );

      dispatch(clearCart());
      setDiscount(0);
      setVat(0);
      setSearch("");
      setExchangeOpen(false);
      setExchangeData(null);

      // 🔥 Instant Cache Update for Zero Loading Time
      queryClient.setQueryData(
        [
          "pos-products",
          debouncedSearch,
          selectedShowroomId,
          selectedCategoryId,
          currentUser?._id,
          currentUser?.role,
        ],
        (oldData) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              items: page.items.map((product) => ({
                ...product,
                variants: product.variants.map((variant) => {
                  const sold = orderItems.find(
                    (i) => i.variantId === variant._id,
                  );

                  if (!sold) return variant;

                  return {
                    ...variant,
                    stock: Math.max(0, variant.stock - sold.qty),
                    showroomStock: Math.max(
                      0,
                      variant.showroomStock - sold.qty,
                    ),
                  };
                }),
              })),
            })),
          };
        },
      );

      await queryClient.invalidateQueries({
        queryKey: ["pos-products"],
      });

      const printId = resData.exchangeOrder?._id || resData.order?._id;
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
      const res = await fetch("/api/pos/exchange", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          showroomId: selectedShowroomId,
          createdBy: currentUser?._id,
        }),
      });

      const result = await res.json();

      if (!result.success) {
        showToast(result.message || "Exchange failed");
        return;
      }

      showToast("Exchange completed successfully ✅");

      dispatch(clearCart());
      setExchangeOpen(false);
      setExchangeData(null);

      queryClient.setQueryData(
        [
          "pos-products",
          debouncedSearch,
          selectedShowroomId,
          selectedCategoryId,
          currentUser?._id,
          currentUser?.role,
        ],
        (oldData) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              items: page.items.map((product) => ({
                ...product,
                variants: product.variants.map((variant) => {
                  const returned = data.returnedItems?.find(
                    (i) => i.variantId === variant._id,
                  );

                  const sold = data.newItems?.find(
                    (i) => i.variantId === variant._id,
                  );

                  return {
                    ...variant,
                    stock: Math.max(
                      0,
                      variant.stock + (returned?.qty || 0) - (sold?.qty || 0),
                    ),
                    showroomStock: Math.max(
                      0,
                      variant.showroomStock +
                        (returned?.qty || 0) -
                        (sold?.qty || 0),
                    ),
                  };
                }),
              })),
            })),
          };
        },
      );

      queryClient.invalidateQueries({
        queryKey: ["pos-products"],
      });
    } catch (err) {
      console.error(err);
      showToast("Server Error");
    }
  };

  // Fetch Showrooms
  useEffect(() => {
    const fetchShowrooms = async () => {
      if (currentUser?.role !== "admin") return;
      const res = await fetch("/api/showrooms");
      const data = await res.json();
      setShowrooms(data.showrooms || []);
    };
    fetchShowrooms();
  }, [currentUser]);

  // Fetch Categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/category");
        const data = await res.json();
        setCategories(data.categories || data.data || []);
      } catch (err) {
        console.error("Fetch categories error:", err);
      }
    };
    fetchCategories();
  }, []);

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Main */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full lg:grid lg:grid-cols-12 overflow-hidden">
          {!cartExpanded && (
            <ProductGallery
              products={products}
              loading={isLoading}
              search={search}
              setSearch={setSearch}
              setOpenProduct={setOpenProduct}
              addToCart={addToCart}
              inputRef={searchInputRef}
              fetchNextPage={fetchNextPage}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              setSelectedCategoryId={setSelectedCategoryId}
            />
          )}

          <div className={cartExpanded ? "lg:col-span-12" : "lg:col-span-6"}>
            <CartSidebar
              products={products}
              addToCart={addToCart}
              searchTerm={search}
              setSearchTerm={setSearch}
              expanded={cartExpanded}
              setExpanded={setCartExpanded}
              cart={cart}
              user={user}
              selectedShowroomId={selectedShowroomId}
              setSelectedShowroomId={setSelectedShowroomId}
              showrooms={showrooms}
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
          </div>

          {openProduct && (
            <VariantModal
              product={openProduct}
              setOpenProduct={setOpenProduct}
              addToCart={addToCart}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <PosFooter
        onBack={() => window.history.back()}
        onHold={() => {}}
        handleCheckout={handleCheckout}
        checkoutLoading={checkoutLoading}
        handleExchange={handleExchange}
        user={user}
        selectedShowroomId={selectedShowroomId}
      />
    </div>
  );
}
