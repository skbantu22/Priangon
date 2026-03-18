"use client";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
// Import the clearCart action from your slice file
import { clearCart} from "@/store/reducer/cartReducer"; 
   

export default function CartCleanup() {
  const dispatch = useDispatch();

  useEffect(() => {
    // This resets 'products' to [] and 'count' to 0
    dispatch(clearCart());
  }, [dispatch]);

  return null; 
}