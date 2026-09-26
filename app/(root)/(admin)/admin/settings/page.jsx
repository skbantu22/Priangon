"use client";

import { isValidBdMobile } from "@/lib/bdFormat";
import {
  Field,
  Section,
  SettingsPage,
  control,
  useSettingsForm,
} from "@/components/ui/Application/Admin/settings/settingsKit";

const FIELDS = ["companyName", "phone", "email", "website", "address", "logo", "tradeLicenseNo"];

// Settings → Business Settings: who the shop is, printed on every invoice
export default function BusinessSettingsPage() {
  const settings = useSettingsForm(FIELDS);
  const { form, set, save } = settings;

  const phoneError =
    form?.phone && !isValidBdMobile(form.phone) ? "Use a Bangladeshi mobile number, e.g. 01712345678" : "";
  const emailError =
    form?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ? "Enter a valid email address" : "";
  const nameError = form && !String(form.companyName).trim() ? "Enter the business name printed on invoices" : "";

  const submit = () => {
    if (nameError || phoneError || emailError) return;
    save();
  };

  return (
    <SettingsPage
      title="Business Settings"
      subtitle="Printed at the top of every invoice, challan and warranty slip."
      settings={settings}
      onSubmit={submit}
    >
      {form && (
        <>
          <Section title="Business Information">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field id="bs-name" label="Business Name" required error={nameError}>
                <input
                  id="bs-name"
                  value={form.companyName}
                  maxLength={150}
                  onChange={(e) => set({ companyName: e.target.value })}
                  className={control(nameError)}
                  placeholder="SB Telecom"
                />
              </Field>

              <Field id="bs-phone" label="Mobile Phone" error={phoneError}>
                <input
                  id="bs-phone"
                  value={form.phone}
                  inputMode="tel"
                  onChange={(e) => set({ phone: e.target.value })}
                  className={control(phoneError)}
                  placeholder="01712345678"
                />
              </Field>

              <Field id="bs-email" label="Email" error={emailError}>
                <input
                  id="bs-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set({ email: e.target.value })}
                  className={control(emailError)}
                  placeholder="shop@example.com"
                />
              </Field>

              <Field id="bs-website" label="Website">
                <input
                  id="bs-website"
                  value={form.website}
                  onChange={(e) => set({ website: e.target.value })}
                  className={control(false)}
                  placeholder="https://your-shop.com"
                />
              </Field>

              <Field id="bs-address" label="Address" className="md:col-span-2">
                <textarea
                  id="bs-address"
                  rows={3}
                  value={form.address}
                  maxLength={500}
                  onChange={(e) => set({ address: e.target.value })}
                  className={`${control(false)} !h-auto resize-y py-[10px]`}
                  placeholder="House, road, area, city"
                />
              </Field>

              <Field id="bs-trade" label="Trade License No">
                <input
                  id="bs-trade"
                  value={form.tradeLicenseNo}
                  onChange={(e) => set({ tradeLicenseNo: e.target.value })}
                  className={control(false)}
                />
              </Field>
            </div>
          </Section>

          <Section title="Logo" hint="A link to the logo image printed on A4 invoices.">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_200px] md:items-start">
              <Field id="bs-logo" label="Logo URL">
                <input
                  id="bs-logo"
                  value={form.logo}
                  onChange={(e) => set({ logo: e.target.value })}
                  className={control(false)}
                  placeholder="https://..."
                />
              </Field>
              <div className="flex h-[110px] items-center justify-center border border-[#dfe3e8] bg-white dark:border-border dark:bg-card">
                {form.logo ? (
                  // a preview of whatever link was typed, so not next/image
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.logo} alt="Logo preview" className="max-h-[85%] max-w-[90%] object-contain" />
                ) : (
                  <span className="text-[13px] text-[#8a939c]">No logo</span>
                )}
              </div>
            </div>
          </Section>
        </>
      )}
    </SettingsPage>
  );
}
