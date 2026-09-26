"use client";

import { takaInWords } from "@/lib/bdFormat";
import {
  Field,
  Section,
  SettingsPage,
  Toggle,
  control,
  useSettingsForm,
} from "@/components/ui/Application/Admin/settings/settingsKit";

const FIELDS = ["showAmountInWords", "invoiceFooter", "warrantyTerms"];

// Settings → Print Settings: what the invoice prints below the items
export default function PrintSettingsPage() {
  const settings = useSettingsForm(FIELDS);
  const { form, set, save } = settings;

  return (
    <SettingsPage
      title="Print Settings"
      subtitle="What the invoice prints under the items. The receipt's credit line stays as it is."
      settings={settings}
      onSubmit={save}
    >
      {form && (
        <>
          <Section title="Invoice">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Toggle
                checked={form.showAmountInWords}
                onChange={(showAmountInWords) => set({ showAmountInWords })}
                hint={`e.g. ${takaInWords(11500)}`}
              >
                Print the total in words
              </Toggle>
            </div>
          </Section>

          <Section title="Invoice Note" hint="Printed at the bottom of every invoice, e.g. the return policy.">
            <Field id="ps-footer" label="Invoice Footer">
              <textarea
                id="ps-footer"
                rows={3}
                value={form.invoiceFooter}
                maxLength={500}
                onChange={(e) => set({ invoiceFooter: e.target.value })}
                className={`${control(false)} !h-auto resize-y py-[10px]`}
                placeholder="Sold goods are not returnable after 3 days."
              />
            </Field>
          </Section>

          <Section title="Warranty" hint="Printed on invoices that carry a warranty item.">
            <Field id="ps-warranty" label="Warranty Terms">
              <textarea
                id="ps-warranty"
                rows={4}
                value={form.warrantyTerms}
                maxLength={1000}
                onChange={(e) => set({ warrantyTerms: e.target.value })}
                className={`${control(false)} !h-auto resize-y py-[10px]`}
                placeholder="Physical damage, water damage and burnt boards are outside warranty."
              />
            </Field>
          </Section>
        </>
      )}
    </SettingsPage>
  );
}
