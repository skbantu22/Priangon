// Small helpers shared by the Telekhata screens

export const money = (value) => `${Number(value || 0).toLocaleString("bn-BD", { maximumFractionDigits: 2 })} ৳`;

export const dateLabel = (value) =>
  new Date(value).toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric" });

export const todayInput = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
};

/** start/end (yyyy-mm-dd) for the Day / Month / Year / All tabs */
export const rangeFor = (key) => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (key === "day") return { start: ymd(now), end: ymd(now) };
  if (key === "month") {
    return { start: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), end: ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
  }
  if (key === "year") return { start: `${now.getFullYear()}-01-01`, end: `${now.getFullYear()}-12-31` };
  return { start: "", end: "" };
};

// Telekhata is always Bangla: t(english, bangla) answers the Bangla
export const t = (english, bangla) => bangla || english;

export const bnNumber = (value) => Number(value || 0).toLocaleString("bn-BD");

/** Opens a print window for a statement / receipt (the app's PDF button) */
export const printHtml = (title, body) => {
  const win = window.open("", "_blank", "width=480,height=700");
  if (!win) return false;
  win.document.write(
    `<html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Arial;font-size:13px;padding:14px}table{width:100%;border-collapse:collapse}td,th{padding:4px 3px;text-align:right;border-bottom:1px solid #ddd}td:first-child,th:first-child{text-align:left}h3{margin:0 0 6px}</style></head><body>${body}</body></html>`,
  );
  win.document.close();
  win.focus();
  win.print();
  return true;
};

/** "০১ জানুয়ারী, ২৬" */
export const shortDate = (value) => {
  const d = new Date(value);
  const day = d.toLocaleDateString("bn-BD", { day: "2-digit", month: "long" });
  const year = d.toLocaleDateString("bn-BD", { year: "2-digit" });
  return `${day}, ${year}`;
};

/** Day / Month / Year window moved by `offset` steps, as yyyy-mm-dd strings */
export const windowFor = (key, offset = 0) => {
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const now = new Date();

  if (key === "day") {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    return { start: ymd(d), end: ymd(d), from: d, to: d };
  }
  if (key === "month") {
    const from = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const to = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
    return { start: ymd(from), end: ymd(to), from, to };
  }
  if (key === "year") {
    const from = new Date(now.getFullYear() + offset, 0, 1);
    const to = new Date(now.getFullYear() + offset, 11, 31);
    return { start: ymd(from), end: ymd(to), from, to };
  }
  return { start: "", end: "", from: null, to: null };
};
