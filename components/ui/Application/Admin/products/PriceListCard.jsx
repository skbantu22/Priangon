"use client";

import { Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const ROWS = [
  { name: "purchasePrice", label: "Purchase Rate", bn: "ক্রয় মূল্য" },
  { name: "dealerPrice", label: "Dealer", bn: "ডিলার" },
  { name: "subDealerPrice", label: "Sub Dealer", bn: "সাব ডিলার" },
  { name: "retailerPrice", label: "Retailer", bn: "রিটেইলার" },
];

const money = (n) => `৳${Number(n || 0).toLocaleString("en-BD")}`;

// Rate per buyer type (add & edit product forms). The POS charges a customer
// the rate of their type; an empty rate falls back to the Sale Price.
export default function PriceListCard({ form }) {
  const purchase = Number(form.watch("purchasePrice")) || 0;
  const retail = Number(form.watch("sellingPrice")) || 0;

  const profit = (rate) => {
    if (!purchase || !rate) return null;
    const p = rate - purchase;
    return (
      <span className={p < 0 ? "text-red-600" : "text-emerald-600"}>
        {p < 0 ? "−" : "+"}
        {money(Math.abs(p))}
      </span>
    );
  };

  return (
    <Card className="gap-0 rounded-xl py-0 shadow-sm">
      <CardHeader className="border-b py-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Layers className="size-4 text-primary" /> Price List (রেট)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 p-5">
        {ROWS.map((row) => (
          <FormField
            key={row.name}
            control={form.control}
            name={row.name}
            render={({ field }) => {
              const rate = Number(field.value) || 0;
              return (
                <FormItem className="grid grid-cols-[1fr_7.5rem] items-center gap-3 space-y-0">
                  <label htmlFor={row.name} className="text-sm leading-tight">
                    <span className="font-medium">{row.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {row.bn}
                      {row.name !== "purchasePrice" && rate > 0 && <> · {profit(rate)}</>}
                    </span>
                  </label>
                  <Input
                    id={row.name}
                    type="number"
                    min="0"
                    inputMode="decimal"
                    placeholder={row.name === "purchasePrice" ? "0" : retail ? String(retail) : "0"}
                    className="h-9 text-right"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormItem>
              );
            }}
          />
        ))}

        <div className="grid grid-cols-[1fr_7.5rem] items-center gap-3 border-t pt-2.5">
          <span className="text-sm leading-tight">
            <span className="font-medium">Retail / Selling</span>
            <span className="block text-xs text-muted-foreground">
              খুচরা · Sale Price {retail > 0 && profit(retail) && <>· {profit(retail)}</>}
            </span>
          </span>
          <span className="pr-3 text-right text-sm font-semibold text-primary">{money(retail)}</span>
        </div>

        <p className="pt-1 text-xs text-muted-foreground">
          Empty rate = Sale Price. POS applies the rate of the customer&apos;s type.
        </p>
      </CardContent>
    </Card>
  );
}
