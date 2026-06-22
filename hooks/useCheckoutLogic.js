"use client";

import { useMemo, useState, useEffect } from "react";
import axios from "axios";
import { useDispatch } from "react-redux";
import { setCart } from "@/store/reducer/cartReducer";

export default function useCheckoutLogic(cartStore, authStore) {
  const dispatch = useDispatch();

  const products = Array.isArray(cartStore?.products) ? cartStore.products : [];

  const [verifiedOnce, setVerifiedOnce] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  const [couponDiscountAmount, setCouponDiscountAmount] = useState(0);
  const [isCouponApplied, setIsCouponApplied] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const [shippingMethod, setShippingMethod] = useState("inside_dhaka");
  const [payment, setPayment] = useState("cod");
  const [placingOrder, setPlacingOrder] = useState(false);

  // subtotal
  const subtotal = useMemo(() => {
    return products.reduce((acc, item) => {
      return acc + Number(item.sellingPrice || 0) * Number(item.quantity || 1);
    }, 0);
  }, [products]);

  const shipping = shippingMethod === "inside_dhaka" ? 80 : 150;

  const total = useMemo(() => {
    return Math.max(subtotal - couponDiscountAmount + shipping, 0);
  }, [subtotal, couponDiscountAmount, shipping]);

  return {
    products,
    verifiedOnce,
    setVerifiedOnce,
    verifyError,
    setVerifyError,

    subtotal,
    shipping,
    total,

    shippingMethod,
    setShippingMethod,

    payment,
    setPayment,

    placingOrder,
    setPlacingOrder,

    couponDiscountAmount,
    setCouponDiscountAmount,

    isCouponApplied,
    setIsCouponApplied,

    appliedCoupon,
    setAppliedCoupon,

    dispatch,
  };
}
