"use client";

import { ShieldCheck, ScanBarcode } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { posBrandsQueryOptions } from "@/lib/posProducts";
import { WARRANTY_TYPES, formatWarrantyPeriod, warrantyLabel } from "@/lib/warranty";

const PERIODS = [1, 3, 6, 12, 18, 24, 36];

const selectClass =
  "h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:border-primary dark:bg-input/30";

// Brand + warranty + IMEI tracking for a product (add & edit forms)
export default function MobileSpecsCard({ form, hideBrand = false }) {
  const { data: brands = [] } = useQuery({
    ...posBrandsQueryOptions(),
    refetchOnWindowFocus: false,
  });

  const warrantyType = form.watch("warrantyType");
  const warrantyMonths = form.watch("warrantyMonths");
  const preview = warrantyLabel({ type: warrantyType, months: warrantyMonths });

  return (
    <Card className="gap-0 rounded-xl py-0 shadow-sm">
      <CardHeader className="border-b py-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="size-4 text-primary" /> {hideBrand ? "Warranty & IMEI" : <>Brand &amp; Warranty</>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-5">
        {!hideBrand && (
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand</FormLabel>
                <Input list="brand-options" placeholder="Ex: Samsung" {...field} />
                <datalist id="brand-options">
                  {brands.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="warrantyType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Warranty</FormLabel>
                <select
                  className={selectClass}
                  value={field.value}
                  onChange={(e) => {
                    field.onChange(e.target.value);
                    if (e.target.value === "none") form.setValue("warrantyMonths", 0);
                    else if (!Number(form.getValues("warrantyMonths")))
                      form.setValue("warrantyMonths", 12);
                  }}
                >
                  {Object.entries(WARRANTY_TYPES).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="warrantyMonths"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Period</FormLabel>
                <select
                  className={selectClass}
                  value={field.value}
                  disabled={warrantyType === "none"}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                >
                  {warrantyType === "none" && <option value={0}>—</option>}
                  {PERIODS.map((m) => (
                    <option key={m} value={m}>
                      {formatWarrantyPeriod(m)}
                    </option>
                  ))}
                </select>
              </FormItem>
            )}
          />
        </div>

        <p className="rounded-lg bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          Invoice will show:{" "}
          <span className="font-semibold text-foreground">{preview || "No warranty"}</span>
        </p>

        <FormField
          control={form.control}
          name="trackSerial"
          render={({ field }) => (
            <FormItem>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-accent/50">
                <input
                  type="checkbox"
                  checked={!!field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="mt-0.5 size-4 accent-[var(--primary)]"
                />
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <ScanBarcode className="size-4" /> Require IMEI / Serial at sale
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Turn on for phones, smart watches and earbuds. The POS will ask for
                    one IMEI / serial per unit, used for warranty claims.
                  </span>
                </span>
              </label>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
