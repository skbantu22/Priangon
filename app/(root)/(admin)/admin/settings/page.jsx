"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { FiSave } from "react-icons/fi";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import { showToast } from "@/lib/showToast";
import { ADMIN_APP_SETTINGS, ADMIN_DASHBOARD } from "@/Route/Adminpannelroute";
import {
  formatTaka,
  isValidBIN,
  isValidBdMobile,
  isValidTIN,
  takaInWords,
  vatFromInclusive,
  vatOnExclusive,
} from "@/lib/bdFormat";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_APP_SETTINGS, label: "App Settings" },
];

const Field = ({ label, hint, error, children }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    {children}
    {error ? (
      <p className="text-xs text-destructive">{error}</p>
    ) : hint ? (
      <p className="text-xs text-muted-foreground">{hint}</p>
    ) : null}
  </div>
);

const Check = ({ checked, onChange, children }) => (
  <label className="flex items-start gap-2 text-sm">
    <input
      type="checkbox"
      checked={!!checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 size-4"
    />
    <span>{children}</span>
  </label>
);

const AppSettingsPage = () => {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get("/api/settings");

        if (data.success) setForm(data.data);
      } catch {
        showToast("error", "Could not load settings");
      }
    };

    load();
  }, []);

  const set = (patch) => setForm((current) => ({ ...current, ...patch }));

  const binError =
    form?.bin && !isValidBIN(form.bin) ? "BIN must be 13 digits" : "";
  const tinError =
    form?.tin && !isValidTIN(form.tin) ? "e-TIN must be 12 digits" : "";
  const phoneError =
    form?.phone && !isValidBdMobile(form.phone)
      ? "Use a Bangladeshi mobile number, e.g. 01712345678"
      : "";

  const save = async () => {
    if (binError || tinError || phoneError) {
      showToast("error", "Fix the marked fields first");
      return;
    }

    setSaving(true);

    try {
      const { data } = await axios.put("/api/settings", form);

      if (!data.success) {
        showToast("error", data.message || "Could not save settings");
        return;
      }

      showToast("success", "Settings saved");
      setForm(data.data);
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not save settings",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!form) {
    return (
      <div className="space-y-4">
        <BreadCrumb breadcrumbData={breadcrumbData} />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  // Worked example so the VAT switches are not guesswork
  const sample = 11500;
  const sampleVat = form.vatInclusive
    ? vatFromInclusive(sample, form.vatRate)
    : vatOnExclusive(sample, form.vatRate);

  return (
    <div className="space-y-4">
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="pt-3 px-3 border-b flex flex-row items-center justify-between">
          <h4 className="text-xl font-semibold">App Settings</h4>

          <Button onClick={save} disabled={saving}>
            <FiSave className="mr-2" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </CardHeader>
      </Card>

      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="pt-3 px-3 border-b">
          <h4 className="text-lg font-semibold">Company</h4>
          <p className="text-sm text-muted-foreground">
            Printed at the top of every invoice, challan and warranty slip.
          </p>
        </CardHeader>

        <CardContent className="px-3 py-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Company Name">
            <Input
              value={form.companyName}
              onChange={(e) => set({ companyName: e.target.value })}
              placeholder="Priangon Mobile"
            />
          </Field>

          <Field label="Logo URL">
            <Input
              value={form.logo}
              onChange={(e) => set({ logo: e.target.value })}
              placeholder="https://..."
            />
          </Field>

          <Field label="Phone" error={phoneError}>
            <Input
              value={form.phone}
              onChange={(e) => set({ phone: e.target.value })}
              placeholder="01712345678"
            />
          </Field>

          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set({ email: e.target.value })}
            />
          </Field>

          <Field label="Website">
            <Input
              value={form.website}
              onChange={(e) => set({ website: e.target.value })}
            />
          </Field>

          <Field label="Address">
            <Textarea
              rows={2}
              value={form.address}
              onChange={(e) => set({ address: e.target.value })}
            />
          </Field>
        </CardContent>
      </Card>

      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="pt-3 px-3 border-b">
          <h4 className="text-lg font-semibold">NBR Identifiers</h4>
          <p className="text-sm text-muted-foreground">
            Leave blank if the shop is not VAT registered. A wrong number on a
            printed challan is worse than none.
          </p>
        </CardHeader>

        <CardContent className="px-3 py-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field
            label="BIN (Business Identification Number)"
            hint="13 digits, issued by NBR"
            error={binError}
          >
            <Input
              value={form.bin}
              onChange={(e) => set({ bin: e.target.value })}
              placeholder="1234567890123"
            />
          </Field>

          <Field label="e-TIN" hint="12 digits" error={tinError}>
            <Input
              value={form.tin}
              onChange={(e) => set({ tin: e.target.value })}
              placeholder="123456789012"
            />
          </Field>

          <Field label="Trade License No">
            <Input
              value={form.tradeLicenseNo}
              onChange={(e) => set({ tradeLicenseNo: e.target.value })}
            />
          </Field>
        </CardContent>
      </Card>

      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="pt-3 px-3 border-b">
          <h4 className="text-lg font-semibold">VAT (Mushak)</h4>
        </CardHeader>

        <CardContent className="px-3 py-4 space-y-4">
          <Check
            checked={form.vatEnabled}
            onChange={(vatEnabled) => set({ vatEnabled })}
          >
            Charge VAT on sales
          </Check>

          {form.vatEnabled && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="VAT Rate (%)"
                  hint="Standard rate in Bangladesh is 15%"
                >
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={form.vatRate}
                    onChange={(e) => set({ vatRate: e.target.value })}
                  />
                </Field>

                <Field label="Mushak Form No" hint="Retail VAT challan is 6.3">
                  <Input
                    value={form.mushakFormNo}
                    onChange={(e) => set({ mushakFormNo: e.target.value })}
                  />
                </Field>
              </div>

              <Check
                checked={form.vatInclusive}
                onChange={(vatInclusive) => set({ vatInclusive })}
              >
                Shelf price already includes VAT (usual for retail)
              </Check>

              <Check
                checked={form.showMushakLine}
                onChange={(showMushakLine) => set({ showMushakLine })}
              >
                Print the Mushak line on invoices
              </Check>

              <div className="rounded border bg-muted/40 p-3 text-sm">
                <p className="font-medium">
                  On a {formatTaka(sample)} sale
                </p>
                <p className="mt-1 text-muted-foreground">
                  VAT {form.vatInclusive ? "inside" : "added on top"}:{" "}
                  <span className="font-semibold text-foreground">
                    {formatTaka(sampleVat)}
                  </span>
                  {" · "}customer pays{" "}
                  <span className="font-semibold text-foreground">
                    {formatTaka(
                      form.vatInclusive ? sample : sample + sampleVat,
                    )}
                  </span>
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="pt-3 px-3 border-b">
          <h4 className="text-lg font-semibold">Invoice</h4>
        </CardHeader>

        <CardContent className="px-3 py-4 space-y-4">
          <Check
            checked={form.showAmountInWords}
            onChange={(showAmountInWords) => set({ showAmountInWords })}
          >
            Print the amount in words
            <span className="block text-xs text-muted-foreground">
              {takaInWords(sample)}
            </span>
          </Check>

          <Field label="Invoice Footer">
            <Textarea
              rows={2}
              value={form.invoiceFooter}
              onChange={(e) => set({ invoiceFooter: e.target.value })}
              placeholder="Sold goods are not returnable after 3 days."
            />
          </Field>

          <Field label="Warranty Terms">
            <Textarea
              rows={3}
              value={form.warrantyTerms}
              onChange={(e) => set({ warrantyTerms: e.target.value })}
              placeholder="Physical damage, water damage and burnt boards are outside warranty."
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          <FiSave className="mr-2" />
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
};

export default AppSettingsPage;
