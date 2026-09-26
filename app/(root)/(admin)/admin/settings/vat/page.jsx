"use client";

import { formatTaka, isValidBIN, isValidTIN, vatFromInclusive, vatOnExclusive } from "@/lib/bdFormat";
import {
  Field,
  Section,
  SettingsPage,
  Toggle,
  control,
  useSettingsForm,
} from "@/components/ui/Application/Admin/settings/settingsKit";

const FIELDS = ["vatEnabled", "vatRate", "vatInclusive", "mushakFormNo", "showMushakLine", "bin", "tin"];
const SAMPLE = 11500;

// Settings → VAT Settings: the VAT rate the POS charges, and the NBR numbers
export default function VatSettingsPage() {
  const settings = useSettingsForm(FIELDS);
  const { form, set, save } = settings;

  const binError = form?.bin && !isValidBIN(form.bin) ? "BIN must be 13 digits" : "";
  const tinError = form?.tin && !isValidTIN(form.tin) ? "e-TIN must be 12 digits" : "";
  const rate = Number(form?.vatRate);
  const rateError = form?.vatEnabled && !(rate >= 0 && rate <= 100) ? "Enter a rate from 0 to 100" : "";

  const submit = () => {
    if (binError || tinError || rateError) return;
    save();
  };

  // worked example so the switches are not guesswork
  const sampleVat = form ? (form.vatInclusive ? vatFromInclusive(SAMPLE, rate) : vatOnExclusive(SAMPLE, rate)) : 0;

  return (
    <SettingsPage
      title="VAT Settings"
      subtitle="The VAT the POS charges, and the NBR numbers printed on VAT invoices."
      settings={settings}
      onSubmit={submit}
    >
      {form && (
        <>
          <Section title="VAT (Mushak)">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Toggle checked={form.vatEnabled} onChange={(vatEnabled) => set({ vatEnabled })}>
                Charge VAT on sales
              </Toggle>
            </div>

            {form.vatEnabled && (
              <>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field id="vat-rate" label="VAT Rate (%)" hint="Standard rate in Bangladesh is 15%" error={rateError}>
                    <div className="relative">
                      <input
                        id="vat-rate"
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        inputMode="decimal"
                        value={form.vatRate}
                        onChange={(e) => set({ vatRate: e.target.value })}
                        className={`${control(rateError)} pr-[38px] tabular-nums`}
                      />
                      <span className="pointer-events-none absolute right-[13px] top-1/2 -translate-y-1/2 text-[15px] text-[#6b7785]">
                        %
                      </span>
                    </div>
                  </Field>

                  <Field id="vat-mushak" label="Mushak Form No" hint="Retail VAT challan is 6.3">
                    <input
                      id="vat-mushak"
                      value={form.mushakFormNo}
                      maxLength={20}
                      onChange={(e) => set({ mushakFormNo: e.target.value })}
                      className={control(false)}
                    />
                  </Field>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Toggle checked={form.vatInclusive} onChange={(vatInclusive) => set({ vatInclusive })}>
                    Shelf price already includes VAT (usual for retail)
                  </Toggle>
                  <Toggle checked={form.showMushakLine} onChange={(showMushakLine) => set({ showMushakLine })}>
                    Print the Mushak line on invoices
                  </Toggle>
                </div>

                <div className="mt-4 border border-[#e6ebf1] bg-[#f7f9fb] px-4 py-3 text-[14px] dark:border-border dark:bg-white/5">
                  <p className="font-medium">On a {formatTaka(SAMPLE)} sale</p>
                  <p className="mt-1 text-[#6b7785]">
                    VAT {form.vatInclusive ? "inside" : "added on top"}:{" "}
                    <b className="text-[#1f2933] dark:text-foreground">{formatTaka(sampleVat)}</b>
                    {" · "}customer pays{" "}
                    <b className="text-[#1f2933] dark:text-foreground">
                      {formatTaka(form.vatInclusive ? SAMPLE : SAMPLE + sampleVat)}
                    </b>
                  </p>
                </div>
              </>
            )}
          </Section>

          <Section
            title="BIN / e-TIN"
            hint="Leave blank if the shop is not VAT registered. A wrong number on a printed challan is worse than none."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field id="vat-bin" label="BIN No" hint="13 digits, issued by NBR" error={binError}>
                <input
                  id="vat-bin"
                  value={form.bin}
                  inputMode="numeric"
                  onChange={(e) => set({ bin: e.target.value })}
                  className={control(binError)}
                  placeholder="1234567890123"
                />
              </Field>
              <Field id="vat-tin" label="e-TIN" hint="12 digits" error={tinError}>
                <input
                  id="vat-tin"
                  value={form.tin}
                  inputMode="numeric"
                  onChange={(e) => set({ tin: e.target.value })}
                  className={control(tinError)}
                  placeholder="123456789012"
                />
              </Field>
            </div>
          </Section>
        </>
      )}
    </SettingsPage>
  );
}
