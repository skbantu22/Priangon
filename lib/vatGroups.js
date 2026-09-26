/** name and percent from a VAT group form, or the reason they cannot be saved */
export const readVatGroup = (body) => {
  const name = String(body?.name || "").trim().slice(0, 100);
  const percent = Number(body?.percent);
  if (!name) return { error: "Enter the VAT / SD group name" };
  if (body?.percent === "" || !Number.isFinite(percent) || percent < 0 || percent > 100) {
    return { error: "Enter a percentage from 0 to 100" };
  }
  return { name, percent: Math.round(percent * 100) / 100 };
};
