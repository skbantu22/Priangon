/** Paths that open as a full-page bill (no sidebar, top bar, or breadcrumb). */

const PURCHASE_RESERVED = new Set(["add", "order", "return", "returnable", "return-types"]);

const normalizePath = (pathname) => {
  if (!pathname) return "";
  return pathname.split("?")[0].split("#")[0].replace(/\/$/, "") || "/";
};

export function isAdminLargePrintPath(pathname) {
  const path = normalizePath(pathname);

  if (/^\/admin\/print\/[^/]+$/.test(path)) return true;

  if (/^\/admin\/inventory\/transfers\/[a-f0-9]{24}$/i.test(path)) return true;

  if (/^\/admin\/inventory\/adjustments\/[a-f0-9]{24}$/i.test(path)) return true;

  const match = path.match(/^\/admin\/purchase\/([^/]+)$/);
  if (!match) return false;

  const segment = match[1];
  if (PURCHASE_RESERVED.has(segment)) return false;

  return /^[a-f0-9]{24}$/i.test(segment);
}

export const adminLargePrintShellClass = "min-h-screen bg-[#d6d6d6] px-4 py-8 text-[#212529]";
