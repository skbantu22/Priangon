/**
 * Builds the icon sizes Android asks for, from app/icon.png.
 *
 * Two kinds go out:
 *   icon-<size>.png       the logo as it is, for the browser tab and lists
 *   maskable-<size>.png   the logo shrunk onto a filled square, because
 *                         Android crops the icon to the launcher's own shape
 *                         (circle, squircle, teardrop) and a logo drawn edge
 *                         to edge loses its corners.
 *
 * Run: node scripts/make-pwa-icons.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SOURCE = "app/icon.png";
const OUT = "public/icons";

// Android's maskable spec keeps the middle 80% safe, so the logo sits in 60%
// of the square and the rest is padding it can crop away without harm.
const SAFE = 0.6;
const BACKGROUND = { r: 255, g: 255, b: 255, alpha: 1 };

const PLAIN = [48, 72, 96, 128, 144, 192, 256, 384, 512];
const MASKABLE = [192, 512];

await fs.mkdir(OUT, { recursive: true });

const source = await fs.readFile(SOURCE);

for (const size of PLAIN) {
  await sharp(source)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(OUT, `icon-${size}.png`));
}

for (const size of MASKABLE) {
  const inner = Math.round(size * SAFE);
  const logo = await sharp(source)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: BACKGROUND },
  })
    .composite([{ input: logo, gravity: "centre" }])
    .png()
    .toFile(path.join(OUT, `maskable-${size}.png`));
}

// Apple wants one square with no transparency, 180px
await sharp({ create: { width: 180, height: 180, channels: 4, background: BACKGROUND } })
  .composite([
    {
      input: await sharp(source).resize(150, 150, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
      gravity: "centre",
    },
  ])
  .png()
  .toFile("public/apple-touch-icon.png");

console.log(
  `wrote ${PLAIN.length} plain + ${MASKABLE.length} maskable icons to ${OUT}, plus public/apple-touch-icon.png`,
);
