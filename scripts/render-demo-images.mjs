// Re-draws the starter product images in public/demo without touching the
// database (file names match what the seed stored on each product).
//
//   npm run images:demo

import fs from "node:fs";
import path from "node:path";
import { PRODUCTS, slugify } from "./mobile-catalog.mjs";
import { IMG_DIR, productImageSvg } from "./demo-art.mjs";

fs.mkdirSync(IMG_DIR, { recursive: true });

let count = 0;
for (const p of PRODUCTS) {
  for (const color of p.colors) {
    const file = `${slugify(p.name)}-${slugify(color.name)}.svg`;
    fs.writeFileSync(path.join(IMG_DIR, file), productImageSvg(p, color));
    count++;
  }
}

console.log(`Wrote ${count} images to ${IMG_DIR}`);
