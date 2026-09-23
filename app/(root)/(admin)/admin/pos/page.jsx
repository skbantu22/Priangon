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
  keepPreviousData,
  useInfiniteQuery,
  useIsRestoring,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  filterPosProducts,
  posBrandsQueryOptions,
  posCategoriesQueryOptions,
  posProductsQueryOptions,
  posShowroomsQueryOptions,
  resolvePosShowroomId,
} from "@/lib/posProducts";
import { ShoppingCart } from "lucide-react";
import { ratesFor } from "@/lib/priceTiers";

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
  // phones: the cart opens full screen over the products
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  // Core States
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(""); // 🚀 Debounce Search State
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

  // /admin/pos?partnerOrder=<id>: load a dealer's order into the cart at the
  // prices they ordered at, for the cashier to scan IMEIs and invoice it
  const partnerOrderRef = useRef(null);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("partnerOrder");
    if (!id) return;
    window.history.replaceState(null, "", "/admin/pos");

    (async () => {
      try {
        const res = await fetch(`/api/partner-orders/${id}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        const order = data.order;
        if (!["pending", "confirmed"].includes(order.status)) {
          throw new Error(`${order.orderNumber} is already ${order.status}`);
        }

        dispatch(clearCart());
        dispatch(
          setCart(
            order.items.map((i) => ({
              _id: `${i.productId}-${i.variantId}`,
              productId: i.productId,
              variantId: i.variantId,
              name: i.productName,
              color: i.color,
              size: i.size,
              price: i.price,
              qty: i.qty,
              image: i.image || "/placeholder.png",
              warrantyType: i.warrantyType,
              warrantyMonths: i.warrantyMonths,
              trackSerial: i.trackSerial,
              imeis: [],
            })),
          ),
        );
        dispatch(
          setCustomer({
            _id: order.customerId,
            name: order.customerName,
            phone: order.phone,
            address: "",
            type: order.customerType,
          }),
        );
        partnerOrderRef.current = order._id;
        showToast("success", `${order.orderNumber} loaded: scan IMEIs and complete the sale`);
      } catch (err) {
        showToast("error", err.message || "Could not load the dealer order");
      }
    })();
  }, [dispatch]);
  const currentUser = useMemo(
    () => user?.data?.user || user?.user || user,
    [user],
  );

  // Showrooms rarely change: cached (and persisted), so revisits are instant
  const { data: showrooms = [] } = useQuery({
    ...posShowroomsQueryOptions(),
    // single store: every role needs it (it is where stock is taken from)
    enabled: !!currentUser,
    refetchOnWindowFocus: false,
  });

  // single store: everyone sells from the one store
  const selectedShowroomId = resolvePosShowroomId({ currentUser, showrooms });

  // 🚀 Debounce Search Effect (দ্রুত টাইপিংয়ে বারবার API কল হওয়া আটকাবে)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 200);

    return () => clearTimeout(timer);
  }, [search]);

  // ==========================
  // 🚀 ZERO LOADING PRODUCT LIST
  // The full (unfiltered) list of the showroom is loaded once and cached; search,
  // category, brand and sort are applied to it in the browser, so they are instant.
  // (options are shared with PosPrefetch, so a prefetched list is a cache hit)
  // ==========================
  const isRestoring = useIsRestoring();

  const baseQuery = useInfiniteQuery({
    ...posProductsQueryOptions({ showroomId: selectedShowroomId, currentUser }),
    enabled: !!user,
    // switching showroom keeps the old list on screen until the new one is in
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false, // 🚀 উইন্ডো ফোকাস পরিবর্তন হলে রিলোড বন্ধ
  });

  // Keep loading the remaining pages in the background, one at a time, so
  // scrolling (and barcode scans over the loaded list) never has to wait.
  // It waits for any running fetch first, so it never cancels a stock refresh.
  const {
    data: baseData,
    hasNextPage: baseHasNext,
    isFetching: baseFetching,
    isError: baseError,
    isPlaceholderData: baseIsPlaceholder,
    fetchNextPage: fetchNextBasePage,
  } = baseQuery;

  useEffect(() => {
    if (isRestoring || baseIsPlaceholder || !baseHasNext || baseFetching || baseError) return;
    if ((baseData?.pages.length ?? 0) >= MAX_EAGER_PAGES) return;

    fetchNextBasePage();
  }, [baseData, baseHasNext, baseFetching, baseError, baseIsPlaceholder, isRestoring, fetchNextBasePage]);

  const allProducts = useMemo(
    () => baseQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [baseQuery.data],
  );

  const listFilters = {
    search,
    categoryId: selectedCategoryId,
    brand: selectedBrand,
    sort,
  };
  const hasFilter = !!(
    search.trim() ||
    selectedCategoryId ||
    selectedBrand ||
    sort !== "latest"
  );

  const localProducts = useMemo(
    () => filterPosProducts(allProducts, listFilters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allProducts, search, selectedCategoryId, selectedBrand, sort],
  );

  // Only when the shop has more products than the eager load holds does a
  // filter also ask the server; the local result is shown meanwhile.
  const needServer = hasFilter && !!baseQuery.data && !!baseQuery.hasNextPage;

  const serverQuery = useInfiniteQuery({
    ...posProductsQueryOptions({
      ...listFilters,
      search: debouncedSearch,
      showroomId: selectedShowroomId,
      currentUser,
    }),
    enabled: !!user && needServer,
    refetchOnWindowFocus: false,
  });

  const useServer = needServer && !!serverQuery.data;
  const activeQuery = useServer ? serverQuery : baseQuery;

  const products = useMemo(
    () =>
      useServer
        ? serverQuery.data.pages.flatMap((page) => page.items)
        : localProducts,
    [useServer, serverQuery.data, localProducts],
  );

  const {
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isError,
    refetch,
  } = activeQuery;
  // a spinner only on a truly empty cache (first ever visit)
  const isLoading = !baseData && (isRestoring || baseFetching);

  const { data: categories = [] } = useQuery({
    ...posCategoriesQueryOptions(),
    refetchOnWindowFocus: false,
  });

  const { data: brands = [] } = useQuery({
    ...posBrandsQueryOptions(),
    refetchOnWindowFocus: false,
  });

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
          // all rates, so the slice charges the customer type's rate
          rates: ratesFor(product, variant),
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

    const showroomId = selectedShowroomId || currentUser?.showroomId;

    if (!showroomId) {
      showToast("error", "Store is still loading, try again in a moment");
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
        customerType: dataClean.customerType || "retail",
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
      queryClient.setQueriesData(
        { queryKey: ["pos-products"] },
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
      setMobileCartOpen(false);

      // a dealer order was loaded into this sale: mark it invoiced
      if (!isExchange && partnerOrderRef.current && resData.order?._id) {
        const partnerOrderId = partnerOrderRef.current;
        partnerOrderRef.current = null;
        fetch(`/api/partner-orders/${partnerOrderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "invoiced", posOrderId: resData.order._id }),
        })
          .then((r) => r.json())
          .then((r) => {
            if (!r.success) showToast("error", `Dealer order not updated: ${r.message}`);
          })
          .catch(() => showToast("error", "Dealer order not updated"));
      }

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

      queryClient.setQueriesData(
        { queryKey: ["pos-products"] },
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

  const activeShowroomId = selectedShowroomId || currentUser?.showroomId;

  return (
    <div className="flex h-screen flex-col bg-background">
      <PosTopbar
        search={search}
        setSearch={setSearch}
        inputRef={searchInputRef}
        onSearchKeyDown={handleSearchKeyDown}
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
            loading={isLoading}
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
          mobileOpen={mobileCartOpen}
          onMobileClose={() => setMobileCartOpen(false)}
          removeCartItem={removeCartItem}
          onComplete={(paymentData) => handleCheckout(paymentData)}
          onHold={holdSale}
          onClear={handleClearCart}
          onPrint={printLastInvoice}
          canPrint={!!lastOrderId}
          checkoutLoading={checkoutLoading}
        />
      </div>

      {/* phones: cart summary bar, opens the cart */}
      {cart.length > 0 && !mobileCartOpen && (
        <button
          type="button"
          onClick={() => setMobileCartOpen(true)}
          className="fixed inset-x-3 bottom-3 z-40 flex h-14 items-center gap-3 rounded-2xl bg-primary px-4 text-white shadow-xl shadow-primary/40 lg:hidden"
        >
          <span className="relative">
            <ShoppingCart className="size-6" />
            <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[11px] font-bold text-gray-900">
              {cart.reduce((n, i) => n + (Number(i.qty) || 0), 0)}
            </span>
          </span>
          <span className="text-left text-sm leading-tight">
            <span className="block font-semibold">View Cart</span>
            <span className="text-xs text-white/80">{cart.length} products</span>
          </span>
          <span className="ml-auto text-lg font-bold">
            ৳{Number(total || 0).toLocaleString("en-BD")}
          </span>
        </button>
      )}

      <PosFooter />

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

