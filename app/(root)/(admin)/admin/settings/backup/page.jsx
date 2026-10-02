"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { TRASH_RETENTION_DAYS } from "@/lib/trash";
import { Section, control } from "@/components/ui/Application/Admin/settings/settingsKit";

const CONFIRM_WORD = "REPLACE";

/**
 * Settings → Backup & Restore: the whole database out to one file, and the
 * same file back in. Handy before a risky import, and the only way back
 * once the trash has wiped something for good.
 */
export default function BackupSettingsPage() {
  const fileInput = useRef(null);

  const [downloading, setDownloading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState("merge");
  const [confirmText, setConfirmText] = useState("");
  const [result, setResult] = useState(null);

  const needsWord = mode === "replace";
  const ready = file && !restoring && (!needsWord || confirmText.trim() === CONFIRM_WORD);

  const download = async () => {
    setDownloading(true);

    try {
      const response = await fetch("/api/settings/backup");

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || "Could not build the backup");
      }

      const name =
        /filename="([^"]+)"/.exec(response.headers.get("content-disposition") || "")?.[1] ||
        "backup.json";

      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");

      link.href = url;
      link.download = name;
      link.click();

      URL.revokeObjectURL(url);
      showToast("success", "Backup downloaded");
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setDownloading(false);
    }
  };

  const restore = async () => {
    if (!ready) return;

    if (
      !confirm(
        mode === "replace"
          ? "Every collection in the backup will be emptied and written again. Carry on?"
          : "Records in the backup will overwrite the matching ones here. Carry on?",
      )
    ) {
      return;
    }

    setRestoring(true);
    setResult(null);

    try {
      const body = new FormData();

      body.append("file", file);
      body.append("mode", mode);

      const response = await fetch("/api/settings/backup", { method: "POST", body });
      const data = await response.json();

      if (!data.success) throw new Error(data.message || "Could not restore the backup");

      setResult(data);
      setFile(null);
      setConfirmText("");
      if (fileInput.current) fileInput.current.value = "";

      showToast("success", data.message);
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="border border-[#e3e8ee] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05)] dark:border-border dark:bg-card">
      <header className="border-b border-[#eef1f4] bg-[#f7f8fa] px-4 py-[14px] text-center dark:border-border dark:bg-white/5">
        <h1 className="text-[22px] font-semibold text-[#00801a] sm:text-[26px]">Backup &amp; Restore</h1>
        <p className="mt-[2px] text-[13px] text-[#6b7785]">
          Everything in one file — products, stock, purchases, sales, customers, suppliers and settings.
        </p>
      </header>

      <div className="px-4 py-5 sm:px-[22px]">
        <Section
          title="Download a backup"
          hint="Take one before an import, a price change or anything else you might want to undo."
        >
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={download}
              disabled={downloading}
              className="flex h-[40px] items-center gap-2 bg-[#10c469] px-5 text-[14px] font-semibold text-white transition hover:bg-[#0eab5c] disabled:opacity-50"
            >
              <Download size={16} />
              {downloading ? "Preparing…" : "Download backup"}
            </button>

            <p className="text-[13px] text-[#6b7785]">
              The file keeps dates and ids as they are, so a restore puts every link back.
              Deleted rows are in it too, until the trash wipes them after {TRASH_RETENTION_DAYS} days.
            </p>
          </div>
        </Section>

        <Section
          title="Restore from a backup"
          hint="Pick a file taken from this app. Nothing changes until you press Restore."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="backup-file" className="mb-[7px] block text-[14.5px] font-medium">
                Backup file
              </label>
              <input
                id="backup-file"
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                onChange={(event) => {
                  setFile(event.target.files?.[0] || null);
                  setResult(null);
                }}
                className={`${control(false)} !h-auto py-[8px] file:mr-3 file:border-0 file:bg-[#188ae2] file:px-3 file:py-[6px] file:text-white`}
              />
            </div>

            <div>
              <label htmlFor="backup-mode" className="mb-[7px] block text-[14.5px] font-medium">
                How to restore
              </label>
              <select
                id="backup-mode"
                value={mode}
                onChange={(event) => {
                  setMode(event.target.value);
                  setConfirmText("");
                }}
                className={control(false)}
              >
                <option value="merge">Merge — overwrite matching records, keep the rest</option>
                <option value="replace">Replace — empty each collection first</option>
              </select>
              <p className="mt-[5px] text-[12.5px] text-[#8a939c]">
                {mode === "replace"
                  ? "Anything added since the backup was taken is lost."
                  : "Anything added since the backup was taken is kept."}
              </p>
            </div>

            {needsWord && (
              <div className="md:col-span-2">
                <label htmlFor="backup-confirm" className="mb-[7px] block text-[14.5px] font-medium">
                  Type {CONFIRM_WORD} to confirm
                </label>
                <input
                  id="backup-confirm"
                  value={confirmText}
                  onChange={(event) => setConfirmText(event.target.value)}
                  className={control(false)}
                  placeholder={CONFIRM_WORD}
                  autoComplete="off"
                />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={restore}
            disabled={!ready}
            className="mt-4 flex h-[40px] items-center gap-2 bg-[#188ae2] px-5 text-[14px] font-semibold text-white transition hover:bg-[#1379c7] disabled:opacity-50"
          >
            <Upload size={16} />
            {restoring ? "Restoring…" : "Restore"}
          </button>

          {result && (
            <div className="mt-4 border border-[#e6ebf1] bg-[#f7f9fb] p-4 text-[13px] dark:border-border dark:bg-white/5">
              <p className="font-semibold">{result.message}</p>
              {result.takenAt && (
                <p className="mt-[2px] text-[#6b7785]">
                  Backup taken {new Date(result.takenAt).toLocaleString("en-GB")}
                </p>
              )}
              <ul className="mt-2 grid grid-cols-2 gap-x-6 sm:grid-cols-3">
                {Object.entries(result.restored || {}).map(([name, count]) => (
                  <li key={name} className="flex justify-between gap-3 tabular-nums">
                    <span className="truncate">{name}</span>
                    <span className="text-[#6b7785]">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
