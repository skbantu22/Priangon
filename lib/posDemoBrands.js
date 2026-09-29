import slugify from "slugify";

/** Default telecom / accessory brands for POS chip row when none exist yet. */
export const POS_DEMO_BRAND_NAMES = [
  "Samsung",
  "Vivo",
  "Oppo",
  "Realme",
  "Xiaomi",
  "Nokia",
  "Symphony",
  "Walton",
  "Infinix",
  "Tecno",
  "Apple",
  "Anker",
  "Baseus",
  "Oraimo",
  "Ugreen",
  "Remax",
  "Hoco",
];

/** Insert demo brands that are not already in the brands collection (case-insensitive). */
export async function ensurePosDemoBrands(BrandModel) {
  const existing = await BrandModel.find({ deletedAt: null }).select("name").lean();
  const have = new Set(existing.map((b) => String(b.name || "").trim().toLowerCase()));
  const added = [];

  for (const name of POS_DEMO_BRAND_NAMES) {
    const key = name.toLowerCase();
    if (have.has(key)) continue;

    try {
      await BrandModel.create({
        name,
        slug: slugify(name, { lower: true, strict: true }),
        isActive: true,
      });
      added.push(name);
      have.add(key);
    } catch (err) {
      if (err?.code !== 11000) throw err;
    }
  }

  return added;
}
