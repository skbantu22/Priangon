"use client";

import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  useSelector as useReduxSelector,
  useDispatch as useReduxDispatch,
} from "react-redux";
import { motion } from "framer-motion";
import {
  ChevronsLeft,
  Repeat,
  ListOrdered,
  Trash2,
  Banknote,
  ChevronRight,
} from "lucide-react";
import { selectPosSummary, clearCart } from "@/store/reducer/posCartSlice";
import CheckoutModal from "./pos/CheckoutModal";
import ExchangeModal from "./pos/ExchangeModal";
import Link from "next/link";

export default function PosFooter({
  onBack,
  onHold,
  handleCheckout,
  checkoutLoading = false,
  handleExchange,
  user,
  selectedShowroomId,
}) {
  const dispatch = useReduxDispatch();
  const cart = useReduxSelector((state) => state.posCart?.cart || []);
  const summary = useReduxSelector(selectPosSummary) || {};
  const { total = 0 } = summary;

  // Local Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExchangeMode, setIsExchangeMode] = useState(false);
  const [isExchangeOpen, setIsExchangeOpen] = useState(false);

  const [localExchangeTotal, setLocalExchangeTotal] = useState(0);
  const [exchangePayloadCache, setExchangePayloadCache] = useState(null);

  const currentUser = user?.data?.user || user?.user || user;

  // Clear Cart Handler
  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (confirm("Are you sure you want to clear the cart?")) {
      dispatch(clearCart());
    }
  };

  return (
    <>
      <footer className="sticky bottom-0 z-50 h-20 bg-[#1b2a6b] shadow-[0_-4px_20px_rgba(0,0,0,0.3)] px-4 flex items-center select-none">
        <div className="grid h-16 w-full grid-cols-12 gap-3 items-center">
          {/* Back Button */}
          <Link
            href="/admin/all-orders/pos-orders"
            className="col-span-1 h-full flex items-center justify-center bg-[#00a651] hover:bg-[#008e45] text-white rounded-xl shadow-lg transition-colors"
          >
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.94 }}>
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-inner">
                <ChevronsLeft
                  size={24}
                  className="text-[#00a651]"
                  strokeWidth={3}
                />
              </div>
            </motion.div>
          </Link>

          {/* Brand / Logo Section */}
          <div className="col-span-2 h-full flex items-center justify-start text-white pl-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 border-2 border-white/80 rounded-xl flex items-center justify-center text-white font-black text-xl bg-white/10 backdrop-blur-sm">
                eS
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-blue-200/90 font-medium tracking-wide">
                  © Powered By
                </span>
                <span className="text-xl font-black tracking-wider leading-none text-white">
                  Ecommerce Solution
                </span>
              </div>
            </div>
          </div>

          {/* Total Display */}
          <div className="col-span-3 h-full flex items-center justify-center bg-white/10 rounded-xl border border-white/10 backdrop-blur-md px-4">
            <h1 className="text-2xl lg:text-3xl font-black tracking-wide text-white uppercase flex items-baseline gap-2">
              <span className="text-blue-200 text-lg font-bold">Total :</span>
              <span>{Number(total).toFixed(2)}</span>
              <span className="text-sm font-bold text-emerald-400">TK</span>
            </h1>
          </div>

          {/* Exchange Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsExchangeOpen(true)}
            className="col-span-2 h-full flex items-center justify-center gap-3 bg-gradient-to-r from-[#1e88e5] to-[#1565c0] hover:from-[#1565c0] hover:to-[#0d47a1] text-white rounded-xl shadow-md transition-all cursor-pointer border border-blue-400/30"
          >
            <Repeat size={30} strokeWidth={2.8} />
            <span className="text-3xl font-black tracking-tight">Exchange</span>
          </motion.button>

          {/* Hold Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={onHold}
            className="col-span-1 h-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#ff9800] to-[#f57c00] hover:from-[#f57c00] hover:to-[#e65100] text-white rounded-xl shadow-md font-extrabold text-lg transition-all cursor-pointer border border-orange-400/30"
          >
            <ListOrdered size={22} strokeWidth={2.5} />
            <span>Hold</span>
          </motion.button>

          {/* Clear Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClearCart}
            className="col-span-1 h-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#ff1744] to-[#d50000] hover:from-[#d50000] hover:to-[#9b0000] text-white rounded-xl shadow-md font-extrabold text-xl transition-all cursor-pointer border border-red-400/30"
          >
            <Trash2 size={22} strokeWidth={2.5} />
            <span>Clear</span>
          </motion.button>

          {/* Payment Button */}
          <motion.button
            whileHover={
              checkoutLoading || cart.length === 0 ? {} : { scale: 1.02 }
            }
            whileTap={
              checkoutLoading || cart.length === 0 ? {} : { scale: 0.95 }
            }
            onClick={() => {
              setIsExchangeMode(false);
              setIsModalOpen(true);
            }}
            disabled={checkoutLoading || cart.length === 0}
            className="col-span-2 h-full flex items-center justify-between bg-gradient-to-r from-[#00a651] to-[#008742] hover:from-[#008742] hover:to-[#006b34] text-white rounded-xl shadow-xl px-5 font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border border-emerald-400/30"
          >
            <div className="flex items-center gap-3">
              <Banknote size={30} strokeWidth={2.5} />
              <span className="text-3xl font-black tracking-tight">
                {checkoutLoading ? "Processing..." : "Payment"}
              </span>
            </div>

            <ChevronRight size={38} strokeWidth={3.5} />
          </motion.button>
        </div>
      </footer>

      {/* Modals */}
      <CheckoutModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
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
                total: total,
              };

          if (typeof handleCheckout === "function") {
            handleCheckout(finalPayload);
          }
          setIsModalOpen(false);
          setIsExchangeMode(false);
          setLocalExchangeTotal(0);
          setExchangePayloadCache(null);
        }}
      />

      <ExchangeModal
        isOpen={isExchangeOpen}
        onClose={() => setIsExchangeOpen(false)}
        showroomId={selectedShowroomId || currentUser?.showroomId}
        currentPosCart={cart}
        onOpenCheckout={(checkoutPayload) => {
          setIsExchangeMode(true);
          setLocalExchangeTotal(checkoutPayload?.total ?? 0);
          setExchangePayloadCache(checkoutPayload);

          if (
            typeof handleExchange === "function" &&
            checkoutPayload?.exchangeData
          ) {
            handleExchange(checkoutPayload.exchangeData);
          }

          setIsExchangeOpen(false);
          setIsModalOpen(true);
        }}
      />
    </>
  );
}
