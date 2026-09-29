"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { showToast } from "@/lib/showToast";
import ProductGallery, {
  findByBarcode,
} from "@/components/ui/Application/Admin/pos/ProductGallery";
import CartSidebar from "@/components/ui/Application/Admin/pos/CartSidebar";
import VariantModal from "@/components/ui/Application/Admin/pos/VariantModal";
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
  filterPosProducts,
  posBrandsQueryOptions,
  posCategoriesQueryOptions,
  posProductsQueryOptions,
  posShowroomsQueryOptions,
  resolvePosTill,
  usePosShowroomId,
  WAREHOUSE_TILL,
  writePosShowroom,
} from "@/lib/posProducts";
import { ratesFor } from "@/lib/priceTiers";
import { cartLineTitle } from "@/lib/posVariantLabel";
import PosMobileScanBar from "@/components/ui/Application/Admin/pos/PosMobileScanBar";
import PosCustomerPicker from "@/components/ui/Application/Admin/pos/PosCustomerPicker";

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
import PosBottomActionBar from "@/components/ui/Application/Admin/pos/PosBottomActionBar";
import BranchSwitchScreen from "@/components/ui/Application/Admin/BranchSwitchScreen";
import HoldNoteDialog from "@/components/ui/Application/Admin/pos/HoldNoteDialog";
import PosConfirmDialog from "@/components/ui/Application/Admin/pos/PosConfirmDialog";
import {
  buildHoldEntry,
  heldSalesForShop,
  readAllHeldSales,
  writeAllHeldSales,
} from "@/lib/posHeldSales";

// pages (20 products each) that are loaded in the background without scrolling
const MAX_EAGER_PAGES = 20;

const inThisShop = (items) =>
  (items || [])
    .map((product) => {
      const variants = (product.variants || []).filter(
        (variant) => Number(variant.showroomStock ?? variant.stock ?? 0) > 0,
      );
      const totalStock = variants.reduce(
        (sum, variant) => sum + Number(variant.showroomStock ?? variant.stock ?? 0),
        0,
      );
      return { ...product, variants, totalStock };
    })
    .filter((product) => product.totalStock > 0);

export default function POSPage() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const cart = useSelector((state) => state.posCart.cart);
  const user = useSelector((state) => state.authStore.auth);
  const [cartExpanded, setCartExpanded] = useState(false);
  // Core States
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(""); // 🚀 Debounce Search State
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState("");
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
  const [trip, setTrip] = useState(null);
  const [allHeldSales, setAllHeldSales] = useState([]);
  const [holdNoteOpen, setHoldNoteOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  useEffect(() => setAllHeldSales(readAllHeldSales()), []);

  // Discount / VAT are edited in the cart panel and kept in Redux
  const posCartState = useSelector((state) => state.posCart);
  const {
    subtotal: subTotal,
    discount: discountAmount,
    vat: vatAmount,
    total,
  } = useSelector(selectPosSummary, shallowEqual);

  const searchInputRef = useRef(null);
  const tillRef = useRef(null);

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
  const { data: showrooms = [], isFetched: showroomsFetched } = useQuery({
    ...posShowroomsQueryOptions(),
    // single store: every role needs it (it is where stock is taken from)
    enabled: !!currentUser,
    refetchOnWindowFocus: false,
  });

  // single store: everyone sells from the one store
  const pickedShowroomId = usePosShowroomId();
  const selectedTill = resolvePosTill({
    picked: pickedShowroomId,
    showrooms,
    currentUser,
  });
  const canSwitchTill = currentUser?.role === "admin";
  const selectedShowroomId = selectedTill;

  const heldSales = useMemo(
    () => heldSalesForShop(allHeldSales, selectedShowroomId),
    [allHeldSales, selectedShowroomId],
  );

  useEffect(() => {
    if (tillRef.current && tillRef.current !== selectedTill) {
      dispatch(clearCart());
    }
    tillRef.current = selectedTill;
  }, [selectedTill, dispatch]);

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

  const shopSelected = /^[a-f\d]{24}$/i.test(String(selectedShowroomId || ""));

  const baseQuery = useInfiniteQuery({
    ...posProductsQueryOptions({ showroomId: selectedShowroomId, currentUser }),
    // wait for the store list so the first request uses the till's branch
    enabled: !!user && showroomsFetched && shopSelected,
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
    () => inThisShop(baseIsPlaceholder ? [] : baseQuery.data?.pages.flatMap((page) => page.items) ?? []),
    [baseQuery.data, baseIsPlaceholder],
  );

  const listFilters = {
    search,
    categoryId: selectedCategoryId,
    subcategoryId: selectedSubCategoryId,
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
    [allProducts, search, selectedCategoryId, selectedSubCategoryId, selectedBrand, sort],
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
        ? inThisShop(serverQuery.data.pages.flatMap((page) => page.items))
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
  const isLoading = baseIsPlaceholder || (!baseData && (isRestoring || baseFetching || !showroomsFetched));

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

      const available = Number(variant.showroomStock ?? variant.stock ?? 0);
      if (available <= 0) {
        showToast("error", "❌ Out of stock! This item cannot be added.");
        return;
      }

      const existing = cart.find((i) => i.variantId === variant._id);

      if (existing && existing.qty + qty > available) {
        showToast("error", "Not enough stock ❌");
        return;
      }

      dispatch(
        addToCartAction({
          _id: `${product._id}-${variant._id}`,
          productId: product._id,
          variantId: variant._id,
          name: cartLineTitle(product.name, variant),
          barcode: variant.barcode || "",
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
          vatPercent: Number(product.vatPercent) || 0,
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

    const showroomId = selectedTill;
    if (!/^[a-f\d]{24}$/i.test(String(showroomId || ""))) {
      showToast("error", "Choose a branch");
      return;
    }

    try {
      setCheckoutLoading(true);

      const normalItems = cart.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        productName: i.name || "Unknown Product",
        image: i.image || "",
        barcode: i.barcode || "",
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

      const finalBillAmount = isExchange ? Number(total) : Number(total);

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
        soldFrom: "SHOWROOM",
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
    setConfirmDialog({
      title: "Clear cart?",
      description: "All items will be removed from this sale.",
      confirmLabel: "Clear",
      destructive: true,
      onConfirm: () => dispatch(clearCart()),
    });
  };

  const saveAllHeldSales = (list) => {
    setAllHeldSales(list);
    writeAllHeldSales(list);
  };

  const commitHold = (label = "") => {
    if (!/^[a-f\d]{24}$/i.test(String(selectedShowroomId || ""))) {
      showToast("error", "Choose a branch first");
      return;
    }

    const entry = buildHoldEntry({
      showroomId: selectedShowroomId,
      cart,
      total,
      discountType: posCartState.discountType,
      discountValue: posCartState.discountValue,
      vatType: posCartState.vatType,
      vatValue: posCartState.vatValue,
      customer: posCartState.customer,
      label,
    });

    saveAllHeldSales([entry, ...allHeldSales]);
    dispatch(clearCart());
    showToast("success", "Sale put on hold");
  };

  const holdSale = () => {
    if (!cart.length) {
      showToast("error", "Cart is empty");
      return;
    }

    const customer = posCartState.customer;
    const hasCustomer =
      customer &&
      (customer._id ||
        String(customer.name || "").trim() ||
        String(customer.phone || "").trim());

    if (!hasCustomer) {
      setHoldNoteOpen(true);
      return;
    }

    commitHold("");
  };

  const restoreHeldSale = (id) => {
    const held = allHeldSales.find((h) => h.id === id);
    if (!held) return;

    const applyRestore = () => {
      dispatch(clearCart());
      dispatch(setCart(held.cart));
      dispatch(
        setDiscountAction({ type: held.discountType, value: held.discountValue }),
      );
      dispatch(setVatAction({ type: held.vatType, value: held.vatValue }));
      if (held.customer) dispatch(setCustomer(held.customer));
      else dispatch(setCustomer(null));
      saveAllHeldSales(allHeldSales.filter((h) => h.id !== id));
      showToast("success", "Held sale recalled");
    };

    if (cart.length) {
      setConfirmDialog({
        title: "Replace current cart?",
        description:
          "The items in your cart will be replaced by this held sale.",
        confirmLabel: "Recall",
        onConfirm: applyRestore,
      });
      return;
    }

    applyRestore();
  };

  const deleteHeldSale = (id) => {
    setConfirmDialog({
      title: "Delete held sale?",
      description: "This parked cart will be removed. Stock was never deducted.",
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: () =>
        saveAllHeldSales(allHeldSales.filter((h) => h.id !== id)),
    });
  };

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
  const tillLabel = (id) =>
    !id || id === WAREHOUSE_TILL
      ? "Warehouse"
      : showrooms.find((branch) => String(branch._id) === String(id))?.name || "Branch";
  const switchTill = (id) => {
    if (currentUser?.role !== "admin") return;
    if (!id || id === "shop" || String(id) === String(selectedTill)) return;
    setTrip({ from: tillLabel(selectedTill), to: tillLabel(id) });
    writePosShowroom(String(id));
  };

  return (
    // h-dvh: on phones h-screen runs under the browser bar and hides the bottom
    <div className="flex h-dvh flex-col overflow-x-hidden bg-[#e8e8e8]">
      {trip && (
        <BranchSwitchScreen from={trip.from} to={trip.to} onDone={() => setTrip(null)} />
      )}
      <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto md:flex-row md:overflow-hidden">
        {!cartExpanded && (
          <div className="order-1 flex min-h-0 min-w-0 shrink-0 flex-col max-md:max-h-[min(42vh,340px)] md:min-h-0 md:w-1/2 md:max-h-none md:flex-1 md:overflow-hidden">
            <ProductGallery
              key={selectedShowroomId || "shop"}
              products={products}
              loading={isLoading}
              isError={isError}
              onRetry={() => refetch()}
              emptyHint={
                search.trim() || selectedCategoryId || selectedBrand
                  ? "No products found"
                  : "No products in this shop"
              }
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
              selectedSubCategoryId={selectedSubCategoryId}
              setSelectedSubCategoryId={setSelectedSubCategoryId}
              brands={brands}
              selectedBrand={selectedBrand}
              setSelectedBrand={setSelectedBrand}
              sort={sort}
              setSort={setSort}
            />
          </div>
        )}

        <div className="order-2 shrink-0 space-y-2 border-b border-gray-200 bg-white px-2 py-2 md:hidden dark:border-white/10 dark:bg-card">
          <PosMobileScanBar
            search={search}
            setSearch={setSearch}
            inputRef={searchInputRef}
            onSearchKeyDown={handleSearchKeyDown}
          />
          <PosCustomerPicker amarMobile />
        </div>

        <div className="order-3 flex min-h-0 min-w-0 flex-1 flex-col md:order-2 md:w-1/2 md:shrink-0 md:overflow-hidden md:border-l md:border-gray-300">
          <CartSidebar
            key={saleKey}
            products={products}
            expanded={cartExpanded}
            setExpanded={setCartExpanded}
            cart={cart}
            search={search}
            setSearch={setSearch}
            inputRef={searchInputRef}
            onSearchKeyDown={handleSearchKeyDown}
            removeCartItem={removeCartItem}
            onComplete={(paymentData) => handleCheckout(paymentData)}
            onClear={handleClearCart}
            onPrint={printLastInvoice}
            onExchange={openExchange}
            canPrint={!!lastOrderId}
            checkoutLoading={checkoutLoading}
          />
        </div>
      </div>

      <PosBottomActionBar
        total={total}
        onExchange={openExchange}
        onHold={holdSale}
        onClear={handleClearCart}
        onPayment={() => window.dispatchEvent(new Event("pos:complete-sale"))}
        cartEmpty={cart.length === 0}
        checkoutLoading={checkoutLoading}
        heldSales={heldSales}
        onRestoreHeld={restoreHeldSale}
        onDeleteHeld={deleteHeldSale}
      />

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
        exchangeSummary={exchangePayloadCache?.exchangeSummary}
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
          setIsExchangeOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      <HoldNoteDialog
        open={holdNoteOpen}
        onOpenChange={setHoldNoteOpen}
        onSave={(note) => commitHold(note)}
      />

      <PosConfirmDialog
        open={!!confirmDialog}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog(null);
        }}
        title={confirmDialog?.title || ""}
        description={confirmDialog?.description}
        confirmLabel={confirmDialog?.confirmLabel}
        destructive={confirmDialog?.destructive}
        onConfirm={confirmDialog?.onConfirm}
      />
    </div>
  );
}

