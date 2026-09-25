"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { FiSave } from "react-icons/fi";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import { showToast } from "@/lib/showToast";
import { ADMIN_DASHBOARD, ADMIN_SYSTEM_SETTINGS } from "@/Route/Adminpannelroute";
import { LANGUAGES } from "@/lib/labels";
import {
  fiscalYearRange,
  formatNumberBD,
  isValidBdMobile,
} from "@/lib/bdFormat";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_SYSTEM_SETTINGS, label: "System Settings" },
];

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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

const SystemSettingsPage = () => {
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

  const supportPhoneError =
    form?.supportPhone && !isValidBdMobile(form.supportPhone)
      ? "Use a Bangladeshi mobile number, e.g. 01712345678"
      : "";

  const toggleWeekend = (day) => {
    const current = form.weekendDays || [];

    set({
      weekendDays: current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day].sort(),
    });
  };

  const save = async () => {
    if (supportPhoneError) {
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

  const fiscal = fiscalYearRange();

  return (
    <div className="space-y-4">
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="pt-3 px-3 border-b flex flex-row items-center justify-between">
          <h4 className="text-xl font-semibold">System Settings</h4>

          <Button onClick={save} disabled={saving}>
            <FiSave className="mr-2" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </CardHeader>
      </Card>

      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="pt-3 px-3 border-b">
          <h4 className="text-lg font-semibold">Regional</h4>
        </CardHeader>

        <CardContent className="px-3 py-4 space-y-4">
          <Field
            label="App Language (shop default)"
            hint="What a device shows before anyone picks their own in the account panel"
          >
            <select
              className={selectClass}
              value={form.language || "bn-en"}
              onChange={(e) => set({ language: e.target.value })}
            >
              {Object.entries(LANGUAGES).map(([key, item]) => (
                <option key={key} value={key}>
                  {item.label} — {item.sample}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Number Digits"
              hint={`Amounts print as ${formatNumberBD(1234567, {
                bengaliDigits: form.numberDigits === "bengali",
              })}`}
            >
              <select
                className={selectClass}
                value={form.numberDigits}
                onChange={(e) => set({ numberDigits: e.target.value })}
              >
                <option value="latin">English digits — 12,34,567</option>
                <option value="bengali">Bangla digits — ১২,৩৪,৫৬৭</option>
              </select>
            </Field>

            <Field
              label="Fiscal Year Starts"
              hint={`Bangladesh runs July to June. Current year: ${fiscal.label}`}
            >
              <select
                className={selectClass}
                value={form.fiscalYearStartMonth}
                onChange={(e) =>
                  set({ fiscalYearStartMonth: Number(e.target.value) })
                }
              >
                {MONTHS.map((month, index) => (
                  <option key={month} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="space-y-2">
            <Label>Weekend Days</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day, index) => (
                <Button
                  key={day}
                  type="button"
                  size="sm"
                  variant={
                    (form.weekendDays || []).includes(index)
                      ? "default"
                      : "outline"
                  }
                  onClick={() => toggleWeekend(index)}
                >
                  {day.slice(0, 3)}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Friday and Saturday in Bangladesh. Used by reports that skip
              closed days.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="pt-3 px-3 border-b">
          <h4 className="text-lg font-semibold">Stock</h4>
        </CardHeader>

        <CardContent className="px-3 py-4 space-y-4">
          <Field
            label="Low Stock Alert"
            hint="Warn once a variant falls to this many units"
          >
            <Input
              type="number"
              min={0}
              value={form.lowStockAlert}
              onChange={(e) => set({ lowStockAlert: e.target.value })}
              className="sm:w-48"
            />
          </Field>

          <Check
            checked={form.enforceImeiCheck}
            onChange={(enforceImeiCheck) => set({ enforceImeiCheck })}
          >
            Check IMEI digits on handsets
            <span className="block text-xs text-muted-foreground">
              Rejects an IMEI that is not 15 digits or fails its check digit,
              which catches most typing mistakes at the counter.
            </span>
          </Check>

          <Check
            checked={form.allowNegativeStock}
            onChange={(allowNegativeStock) => set({ allowNegativeStock })}
          >
            Allow selling below zero stock
            <span className="block text-xs text-muted-foreground">
              Leave off unless you knowingly sell before goods are entered.
            </span>
          </Check>
        </CardContent>
      </Card>

      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="pt-3 px-3 border-b">
          <h4 className="text-lg font-semibold">Support</h4>
        </CardHeader>

        <CardContent className="px-3 py-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Support Phone" error={supportPhoneError}>
            <Input
              value={form.supportPhone}
              onChange={(e) => set({ supportPhone: e.target.value })}
              placeholder="01712345678"
            />
          </Field>

          <Field label="Support Email">
            <Input
              type="email"
              value={form.supportEmail}
              onChange={(e) => set({ supportEmail: e.target.value })}
            />
          </Field>
        </CardContent>
      </Card>

      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="pt-3 px-3 border-b">
          <h4 className="text-lg font-semibold">Maintenance</h4>
        </CardHeader>

        <CardContent className="px-3 py-4 space-y-4">
          <Check
            checked={form.maintenanceMode}
            onChange={(maintenanceMode) => set({ maintenanceMode })}
          >
            Maintenance mode
            <span className="block text-xs text-muted-foreground">
              Shows the message below to website visitors. The admin panel and
              POS keep working.
            </span>
          </Check>

          {form.maintenanceMode && (
            <Field label="Message shown to visitors">
              <Textarea
                rows={2}
                value={form.maintenanceMessage}
                onChange={(e) => set({ maintenanceMessage: e.target.value })}
                placeholder="We are updating the site. Please come back shortly."
              />
            </Field>
          )}
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

export default SystemSettingsPage;
