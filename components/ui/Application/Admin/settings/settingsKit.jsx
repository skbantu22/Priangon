"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Save } from "lucide-react";

import { showToast } from "@/lib/showToast";

// the look of the 360 settings pages
export const control = (bad) =>
  `h-[42px] w-full min-w-0 border bg-white px-[13px] text-[14.5px] text-[#1f2933] outline-none transition placeholder:text-[#9aa3ad] focus:border-[#188ae2] focus:shadow-[0_0_0_3px_rgba(24,138,226,0.15)] dark:bg-card dark:text-foreground ${bad ? "border-[#ff5b5b]" : "border-[#dfe3e8] hover:border-[#c5ccd3] dark:border-border"}`;
export const labelClass = "mb-[7px] block text-[14.5px] font-medium text-[#1f2933] dark:text-foreground";

/**
 * The one settings document, loaded and saved whole. `fields` limits what a
 * page sends, so a page never overwrites another page's settings.
 */
export function useSettingsForm(fields) {
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    axios
      .get("/api/settings")
      .then(({ data }) => {
        if (cancelled || !data.success) return;
        const picked = Object.fromEntries(fields.map((k) => [k, data.data[k] ?? ""]));
        setSaved(picked);
        setForm(picked);
      })
      .catch(() => showToast("error", "Could not load settings"));
    return () => {
      cancelled = true;
    };
    // fields is a constant list per page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dirty = Boolean(form && saved && JSON.stringify(form) !== JSON.stringify(saved));
  const set = (patch) => setForm((current) => ({ ...current, ...patch }));

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await axios.put("/api/settings", form);
      if (!data.success) throw new Error(data.message);
      const picked = Object.fromEntries(fields.map((k) => [k, data.data[k] ?? ""]));
      setSaved(picked);
      setForm(picked);
      showToast("success", "Settings saved");
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message || "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  // Ctrl+S saves; leaving with unsaved changes asks first
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty && !saving) document.getElementById("settings-save")?.click();
      }
    };
    const onLeave = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [dirty, saving]);

  const discard = () => setForm(saved);

  return { form, set, save, saving, dirty, discard };
}

/** Page frame: centred title, sections, and a sticky Update bar */
export function SettingsPage({ title, subtitle, settings, onSubmit, children }) {
  const { form, saving, dirty, discard } = settings;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="border border-[#e3e8ee] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05)] dark:border-border dark:bg-card"
    >
      <header className="border-b border-[#eef1f4] bg-[#f7f8fa] px-4 py-[14px] text-center dark:border-border dark:bg-white/5">
        <h1 className="text-[22px] font-semibold text-[#00801a] sm:text-[26px]">{title}</h1>
        {subtitle && <p className="mt-[2px] text-[13px] text-[#6b7785]">{subtitle}</p>}
      </header>

      {!form ? (
        <div className="space-y-3 p-[22px]">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-[80px] animate-pulse bg-slate-100 dark:bg-white/5" />
          ))}
        </div>
      ) : (
        <div className="px-4 py-5 sm:px-[22px]">{children}</div>
      )}

      <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t border-[#eef1f4] bg-white/95 px-4 py-3 backdrop-blur sm:px-[22px] dark:border-border dark:bg-card/95">
        {dirty && (
          <span className="mr-auto flex items-center gap-[6px] text-[13px] text-[#b7791f]">
            <span className="size-[7px] bg-[#f5a524]" aria-hidden="true" />
            Unsaved changes
            <span className="hidden text-[#98a6ad] sm:inline"> · Ctrl+S to save</span>
          </span>
        )}
        {dirty && (
          <button
            type="button"
            onClick={discard}
            className="h-[40px] border border-[#dfe3e8] bg-white px-4 text-[14px] text-[#3b4652] hover:bg-[#f1f3f5] dark:border-border dark:bg-card dark:text-foreground"
          >
            Discard
          </button>
        )}
        <button
          id="settings-save"
          type="submit"
          disabled={!dirty || saving}
          className="flex h-[40px] items-center gap-2 bg-[#10c469] px-5 text-[14px] font-semibold text-white transition hover:bg-[#0eab5c] disabled:opacity-50 max-sm:flex-1 max-sm:justify-center"
        >
          <Save size={16} />
          {saving ? "Updating…" : "Update"}
        </button>
      </div>
    </form>
  );
}

/** A titled block with the green underline of the 360 pages */
export function Section({ title, hint, children }) {
  return (
    <section className="mt-[26px] first:mt-0">
      <div className="mb-4 border-b-2 border-[#00801a] pb-[6px]">
        <h2 className="text-[17px] font-semibold text-[#00801a]">{title}</h2>
        {hint && <p className="mt-[2px] text-[12.5px] text-[#8a939c]">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function Field({ id, label, required, hint, error, className = "", children }) {
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
        {required && <span className="text-[#f05252]"> *</span>}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-[5px] text-[13px] text-[#e5484d]">
          {error}
        </p>
      ) : (
        hint && <p className="mt-[5px] text-[12.5px] text-[#8a939c]">{hint}</p>
      )}
    </div>
  );
}

/** A ticked option in a bordered tile, as in the 360 settings */
export function Toggle({ checked, onChange, children, hint }) {
  return (
    <label className="flex cursor-pointer items-start gap-[10px] border border-[#e6ebf1] px-3 py-[10px] text-[14px] text-[#1f2933] hover:bg-[#f7f9fb] dark:border-border dark:text-foreground dark:hover:bg-white/5">
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-[2px] size-4 shrink-0 accent-[#188ae2]"
      />
      <span>
        {children}
        {hint && <span className="block text-[12.5px] text-[#8a939c]">{hint}</span>}
      </span>
    </label>
  );
}
