"use client";

import { Boxes } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PRODUCT_UNITS } from "@/lib/productExtraFields";

const selectClass =
  "h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:border-primary dark:bg-input/30";

const NumberField = ({ form, name, label, hint, prefix }) => (
  <FormField
    control={form.control}
    name={name}
    render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <div className="flex">
          {prefix && (
            <span className="flex items-center rounded-l-md border border-r-0 bg-muted px-2.5 text-xs text-muted-foreground">
              {prefix}
            </span>
          )}
          <Input
            type="number"
            min="0"
            placeholder="0"
            className={prefix ? "rounded-l-none" : ""}
            {...field}
            value={field.value ?? ""}
          />
        </div>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </FormItem>
    )}
  />
);

// Codes, stock alert and selling rules of a product (add & edit forms)
export default function ProductStockCard({ form, showUnit = false }) {
  return (
    <Card className="gap-0 rounded-xl py-0 shadow-sm">
      <CardHeader className="border-b py-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Boxes className="size-4 text-primary" /> Stock &amp; Codes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          {showUnit && (
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit</FormLabel>
                  <select className={selectClass} {...field}>
                    {[...new Set([field.value, ...PRODUCT_UNITS].filter(Boolean))].map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Code</FormLabel>
                <Input placeholder="Ex: SM-A55" {...field} value={field.value ?? ""} />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rackNo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rack No</FormLabel>
                <Input placeholder="Ex: A-12" {...field} value={field.value ?? ""} />
              </FormItem>
            )}
          />
          <NumberField form={form} name="weight" label="Weight" prefix="gram" />
          <NumberField
            form={form}
            name="alertQuantity"
            label="Low Stock Alert"
            hint="Alert when stock falls to this"
          />
          <NumberField
            form={form}
            name="minSalePrice"
            label="Minimum Sale Price"
            prefix="৳"
            hint="POS can't sell below this"
          />
        </div>

        <div className="space-y-2 border-t pt-3">
          {[
            { name: "showInWebsite", label: "Show on website shop" },
            { name: "freeDelivery", label: "Free delivery (website)" },
          ].map((opt) => (
            <FormField
              key={opt.name}
              control={form.control}
              name={opt.name}
              render={({ field }) => (
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={!!field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                  {opt.label}
                </label>
              )}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
