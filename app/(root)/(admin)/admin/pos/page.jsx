"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { showToast } from "@/lib/showToast";
import ProductGallery, {
  findByBarcode,
} from "@/components/ui/Application/Admin/pos/ProductGallery";
import CartSidebar from "@/components/ui/Application/Admin/pos/CartSidebar";
import VariantModal from "@/components/ui/Application/Admin/pos/VariantModal";
import PosTopbar from "@/components/ui/Application/Admin/pos/PosTopbar";
import CheckoutModal from "@/components/ui/Application/Admin/pos/CheckoutModal";
import ExchangeModal from "@/components/ui/Application/Admin/pos/ExchangeModal";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import {
  useInfiniteQuery,
  useIsRestoring,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  posBrandsQueryOptions,
  posCategoriesQueryOptions,
  posProductsQueryKey,
  posProductsQueryOptions,
  posShowroomsQueryOptions,
} from "@/lib/posProducts";

import {
  addToCart as addToCartAction,
  removeCartItem as removeCartItemAction,
  clearCart,
  setCart,
  setCustomer,
  setDiscount as setDiscountAction,
  setVat as setVatAction,
  selectPosSummary,
} from "@/store/reducer/posCartSlice";
import PosFooter from "@/components/ui/Application/Admin/PosFooter";

// pages (20 products each) that are loaded in the background without scrolling
const MAX_EAGER_PAGES = 20;

// Held (parked) sales live only on this device, like a paper slip at the till
const HELD_SALES_KEY = "pos-held-sales";

const readHeldSales = () => {
  try {
    return JSON.parse(localStorage.getItem(HELD_SALES_KEY) || "[]");
  } catch {
    return [];
  }
};

const writeHeldSales = (list) => {
  try {
    localStorage.setItem(HELD_SALES_KEY, JSON.stringify(list));
  } catch {
    // storage full or blocked: the in-memory list still works for this session
  }
};

export default function POSPage() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const cart = useSelector((state) => state.posCart.cart);
  const user = useSelector((state) => state.authStore.auth);
  const [cartExpanded, setCartExpanded] = useState(false);
  // Core States
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(""); // 🚀 Debounce Search State
  const [selectedShowroomId, setSelectedShowroomId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [sort, setSort] = useState("latest");
  const [lastOrderId, setLastOrderId] = useState(null);
  // bumped after each sale so the cart panel resets its payment inputs
  const [saleKey, setSaleKey] = useState(0);
  const [openProduct, setOpenProduct] = useState(null);

  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Checkout / exchange modals
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isExchangeMode, setIsExchangeMode] = useState(false);
  const [isExchangeOpen, setIsExchangeOpen] = useState(false);
  const [localExchangeTotal, setLocalExchangeTotal] = useState(0);
  const [exchangePayloadCache, setExchangePayloadCache] = useState(null);

  // Parked carts (F3), restored from the top bar
  const [heldSales, setHeldSales] = useState([]);
  useEffect(() => setHeldSales(readHeldSales()), []);

  // Discount / VAT are edited in the cart panel and kept in Redux
  const posCartState = useSelector((state) => state.posCart);
  const {
    subtotal: subTotal,
    discount: discountAmount,
    vat: vatAmount,
    total,
  } = useSelector(selectPosSummary, shallowEqual);

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
  // (options are shared with PosPrefetch, so a prefetched page is a cache hit)
  // ==========================
  const isRestoring = useIsRestoring();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    ...posProductsQueryOptions({
      search: debouncedSearch,
      showroomId: selectedShowroomId,
      categoryId: selectedCategoryId,
      brand: selectedBrand,
      sort,
      currentUser,
    }),
    enabled: !!user,
    refetchOnWindowFocus: false, // 🚀 উইন্ডো ফোকাস পরিবর্তন হলে রিলোড বন্ধ
  });

  // Keep loading the remaining pages in the background, one at a time, so
  // scrolling (and barcode scans over the loaded list) never has to wait.
  // It waits for any running fetch first, so it never cancels a stock refresh.
  useEffect(() => {
    if (isRestoring || !hasNextPage || isFetching || isError) return;
    if ((data?.pages.length ?? 0) >= MAX_EAGER_PAGES) return;

    fetchNextPage();
  }, [data, hasNextPage, isFetching, isError, isRestoring, fetchNextPage]);

  // Showrooms & categories rarely change: cached (and persisted), so revisits are instant
  const { data: showrooms = [] } = useQuery({
    ...posShowroomsQueryOptions(),
    enabled: currentUser?.role === "admin",
    refetchOnWindowFocus: false,
  });

  const { data: categories = [] } = useQuery({
    ...posCategoriesQueryOptions(),
    refetchOnWindowFocus: false,
  });

  const { data: brands = [] } = useQuery({
    ...posBrandsQueryOptions(),
    refetchOnWindowFocus: false,
  });

  // 🚀 Memoized Flat Products List
  const products = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

  // 🚀 Optimized Handlers with useCallback
  const addToCart = useCallback(
    (product, variant, qty = 1) => {
      if (!variant) return;

      if (variant.stock <= 0) {
        showToast("error", "❌ Out of stock! This item cannot be added.");
        return;
      }

      const existing = cart.find((i) => i.variantId === variant._id);

      if (existing && existing.qty + qty > variant.stock) {
        showToast("error", "Not enough stock ❌");
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
          image:
            variant.image ||
            product.media?.[0]?.secure_url ||
            "/placeholder.png",
          warrantyType: product.warranty?.type || "none",
          warrantyMonths: product.warranty?.months || 0,
          trackSerial: !!product.trackSerial,
          imeis: [],
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

  const handleCheckout = async (modalData = {}) => {
    console.log("🔥 handleCheckout called", modalData);

    const dataClean =
      modalData && typeof modalData === "object" && !modalData.target
        ? modalData
        : {};

    const isExchange = dataClean.isExchangeMode || false;
    const exchange = dataClean.exchangeData || {};

    if (!isExchange && !cart.length) {
      showToast("error", "Cart is empty");
      return;
    }

    const showroomId =
      currentUser?.role === "admin"
        ? selectedShowroomId
        : currentUser?.showroomId || selectedShowroomId;

    if (!showroomId) {
      showToast("error", "Select a showroom from the top bar first");
      return;
    }

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
        imeis: (i.imeis || []).slice(0, Number(i.qty)),
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
        subTotal: isExchange ? finalBillAmount : Number(subTotal),
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
        showToast("error", resData.message || "Checkout failed");
        return;
      }

      showToast(
        "success",
        isExchange
          ? "Exchange completed successfully ✅"
          : "Order created successfully ✅",
      );

      dispatch(clearCart());
      setSearch("");

      // 🔥 Instant Cache Update for Zero Loading Time
      queryClient.setQueryData(
        posProductsQueryKey({
          search: debouncedSearch,
          showroomId: selectedShowroomId,
          categoryId: selectedCategoryId,
          brand: selectedBrand,
          sort,
          currentUser,
        }),
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

      // not awaited: refetch runs in background, don't hold up the print window
      queryClient.invalidateQueries({
        queryKey: ["pos-products"],
      });

      setSaleKey((k) => k + 1);

      const printId = resData.exchangeOrder?._id || resData.order?._id;
      if (printId) {
        setLastOrderId(printId);
        window.open(`/admin/print/${printId}`, "_blank");
      }
    } catch (err) {
      console.error("CHECKOUT ERROR:", err);
      showToast("error", "Server Error");
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
        showToast("error", result.message || "Exchange failed");
        return;
      }

      showToast("success", "Exchange completed successfully ✅");

      dispatch(clearCart());

      queryClient.setQueryData(
        posProductsQueryKey({
          search: debouncedSearch,
          showroomId: selectedShowroomId,
          categoryId: selectedCategoryId,
          brand: selectedBrand,
          sort,
          currentUser,
        }),
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
      showToast("error", "Server Error");
    }
  };

  // ==========================
  // CART ACTIONS
  // ==========================
  const openExchange = () => setIsExchangeOpen(true);

  const printLastInvoice = () => {
    if (!lastOrderId) {
      showToast("info", "No sale completed yet");
      return;
    }
    window.open(`/admin/print/${lastOrderId}`, "_blank");
  };

  const handleClearCart = () => {
    if (!cart.length) return;
    if (confirm("Are you sure you want to clear the cart?")) {
      dispatch(clearCart());
    }
  };

  const saveHeldSales = (list) => {
    setHeldSales(list);
    writeHeldSales(list);
  };

  const holdSale = () => {
    if (!cart.length) {
      showToast("error", "Cart is empty");
      return;
    }

    saveHeldSales([
      {
        id: Date.now().toString(36),
        createdAt: new Date().toISOString(),
        cart,
        total,
        discountType: posCartState.discountType,
        discountValue: posCartState.discountValue,
        vatType: posCartState.vatType,
        vatValue: posCartState.vatValue,
        customer: posCartState.customer,
      },
      ...heldSales,
    ]);
    dispatch(clearCart());
    showToast("success", "Sale put on hold");
  };

  const restoreHeldSale = (id) => {
    const held = heldSales.find((h) => h.id === id);
    if (!held) return;

    if (cart.length && !confirm("Replace the current cart with this held sale?"))
      return;

    dispatch(clearCart());
    dispatch(setCart(held.cart));
    dispatch(
      setDiscountAction({ type: held.discountType, value: held.discountValue }),
    );
    dispatch(setVatAction({ type: held.vatType, value: held.vatValue }));
    if (held.customer) dispatch(setCustomer(held.customer));
    saveHeldSales(heldSales.filter((h) => h.id !== id));
  };

  const deleteHeldSale = (id) =>
    saveHeldSales(heldSales.filter((h) => h.id !== id));

  // Barcode scanners end with Enter: add the exact match right away
  const handleSearchKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const found = findByBarcode(products, search.trim());
    if (!found) return;

    addToCart(found.product, found.variant, 1);
    setSearch("");
  };

  // ==========================
  // KEYBOARD SHORTCUTS
  // ==========================
  // the listener is registered once, so it reads the latest handlers from a ref
  const shortcutsRef = useRef({});
  shortcutsRef.current = {
    holdSale,
    openExchange,
    printLastInvoice,
    modalOpen: isCheckoutOpen || isExchangeOpen || !!openProduct,
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      const actions = shortcutsRef.current;
      const focusSearch = () => {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      };

      if (e.key === "F1") return focusSearch();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")
        return focusSearch();

      if (actions.modalOpen) return;

      if (e.key === "F2") {
        e.preventDefault();
        // the cart panel owns the payment inputs, so it completes the sale
        window.dispatchEvent(new Event("pos:complete-sale"));
      } else if (e.key === "F3") {
        e.preventDefault();
        actions.holdSale();
      } else if (e.key === "F4") {
        e.preventDefault();
        actions.printLastInvoice();
      } else if (e.key === "F6") {
        e.preventDefault();
        actions.openExchange();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const isAdmin = currentUser?.role === "admin";
  const activeShowroomId = selectedShowroomId || currentUser?.showroomId;
  const showroomName = showrooms.find((s) => s._id === activeShowroomId)?.name;

  return (
    <div className="flex h-screen flex-col bg-background">
      <PosTopbar
        search={search}
        setSearch={setSearch}
        inputRef={searchInputRef}
        onSearchKeyDown={handleSearchKeyDown}
        isAdmin={isAdmin}
        showrooms={showrooms}
        selectedShowroomId={selectedShowroomId}
        setSelectedShowroomId={setSelectedShowroomId}
        heldSales={heldSales}
        onRestoreHeld={restoreHeldSale}
        onDeleteHeld={deleteHeldSale}
        onExchange={openExchange}
      />

      {/* Main: products on the left, current sale on the right */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {!cartExpanded && (
          <ProductGallery
            products={products}
            loading={isLoading || isRestoring}
            isError={isError}
            onRetry={() => refetch()}
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
            brands={brands}
            selectedBrand={selectedBrand}
            setSelectedBrand={setSelectedBrand}
            sort={sort}
            setSort={setSort}
          />
        )}

        <CartSidebar
          key={saleKey}
          products={products}
          expanded={cartExpanded}
          setExpanded={setCartExpanded}
          cart={cart}
          removeCartItem={removeCartItem}
          onComplete={(paymentData) => handleCheckout(paymentData)}
          onHold={holdSale}
          onClear={handleClearCart}
          onPrint={printLastInvoice}
          canPrint={!!lastOrderId}
          checkoutLoading={checkoutLoading}
        />
      </div>

      <PosFooter showroomName={showroomName} />

      {openProduct && (
        <VariantModal
          product={openProduct}
          setOpenProduct={setOpenProduct}
          addToCart={addToCart}
        />
      )}

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false);
          setIsExchangeMode(false);
          setExchangePayloadCache(null);
        }}
        total={isExchangeMode ? localExchangeTotal : total}
        cashierName={currentUser?.name}
        isExchangeMode={isExchangeMode}
        cart={cart}
        onCheckout={(modalFormData) => {
          const finalPayload = isExchangeMode
            ? {
                ...exchangePayloadCache,
                ...modalFormData,
                isExchangeMode: true,
                total: localExchangeTotal,
              }
            : {
                ...modalFormData,
                isExchangeMode: false,
                total,
              };

          handleCheckout(finalPayload);
          setIsCheckoutOpen(false);
          setIsExchangeMode(false);
          setLocalExchangeTotal(0);
          setExchangePayloadCache(null);
        }}
      />

      <ExchangeModal
        isOpen={isExchangeOpen}
        onClose={() => setIsExchangeOpen(false)}
        showroomId={activeShowroomId}
        currentPosCart={cart}
        onOpenCheckout={(checkoutPayload) => {
          setIsExchangeMode(true);
          setLocalExchangeTotal(checkoutPayload?.total ?? 0);
          setExchangePayloadCache(checkoutPayload);

          if (checkoutPayload?.exchangeData) {
            handleExchange(checkoutPayload.exchangeData);
          }

          setIsExchangeOpen(false);
          setIsCheckoutOpen(true);
        }}
      />
    </div>
  );
}

