"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, Loader2, Send, ShoppingCart, Minus, Plus } from "lucide-react";
import { usePartnerCart } from "@/components/ui/Application/Partner/PartnerCart";
import { skipOptimize } from "@/lib/imageSrc";
import { money } from "@/lib/partnerQueries";
import { showToast } from "@/lib/showToast";

export default function PartnerCartPage() {
  const cart = usePartnerCart();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const place = async () => {
    setSending(true);
    try {
      const { data } = await axios.post("/api/partner/orders", {
        items: cart.items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
        note,
      });
      if (!data.success) throw new Error(data.message);
      cart.clear();
      queryClient.invalidateQueries({ queryKey: ["partner-orders"] });
      queryClient.invalidateQueries({ queryKey: ["partner-me"] });
      showToast("success", `Order ${data.order.orderNumber} placed. We will confirm it soon.`);
      router.push("/partner/orders");
    } catch (err) {
      showToast("error", err.response?.data?.message || err.message || "Could not place the order");
    } finally {
      setSending(false);
    }
  };

  if (!cart) return null;

  if (cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <ShoppingCart className="size-12 text-muted-foreground" />
        <h1 className="text-xl font-bold">Your order is empty</h1>
        <Link href="/partner/products" className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold leading-10 text-white">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <section className="rounded-2xl border bg-card">
        <div className="flex items-center justify-between border-b p-4">
          <h1 className="text-xl font-bold">My Order</h1>
          <button type="button" onClick={() => confirm("Remove all items?") && cart.clear()} className="text-sm font-medium text-red-600 hover:underline">
            Clear all
          </button>
        </div>
        <ul className="divide-y">
          {cart.items.map((i) => (
            <li key={i.variantId} className="flex flex-wrap items-center gap-3 p-4">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-violet-50">
                <Image src={i.image || "/placeholder.png"} alt="" fill sizes="56px" className="object-contain" unoptimized={skipOptimize(i.image)} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{i.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[i.size, i.color].filter(Boolean).join(" · ")} · {money(i.price)} each · {i.stock} in stock
                </p>
              </div>
              <div className="flex h-9 items-center rounded-lg border">
                <button type="button" onClick={() => cart.setQty(i.variantId, i.qty - 1)} className="flex h-full w-8 items-center justify-center text-gray-500">
                  <Minus className="size-3.5" />
                </button>
                <input
                  type="number"
                  min={1}
                  value={i.qty}
                  onChange={(e) => cart.setQty(i.variantId, e.target.value)}
                  className="h-full w-12 bg-transparent text-center text-sm font-semibold outline-none"
                />
                <button type="button" onClick={() => cart.setQty(i.variantId, i.qty + 1)} className="flex h-full w-8 items-center justify-center text-gray-500">
                  <Plus className="size-3.5" />
                </button>
              </div>
              <span className="w-28 text-right font-bold tabular-nums">{money(i.price * i.qty)}</span>
              <button type="button" onClick={() => cart.remove(i.variantId)} title="Remove" className="rounded-lg p-2 text-red-500 hover:bg-red-50">
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <aside className="h-fit space-y-4 rounded-2xl border bg-card p-5 lg:sticky lg:top-24">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Items</span>
          <span>{cart.count} pcs</span>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-primary/10 px-4 py-3">
          <span className="font-bold text-primary">Order Total</span>
          <span className="text-2xl font-extrabold tabular-nums text-primary">{money(cart.total)}</span>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Note for the shop (delivery time, payment plan...)"
          className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={place}
          disabled={sending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-white shadow-lg shadow-primary/30 hover:brightness-110 disabled:opacity-60"
        >
          {sending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
          Place Order
        </button>
        <p className="text-xs text-muted-foreground">
          Prices are checked again when you place the order. The shop confirms it and sends the invoice with IMEI / warranty details.
        </p>
      </aside>
    </div>
  );
}
