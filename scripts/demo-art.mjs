// Studio-style SVG product renders for the starter catalog (public/demo).
// Each product type is drawn with gradients, gloss and a soft floor shadow
// so the POS grid looks like real product photography.

import path from "node:path";

export const IMG_DIR = path.join(process.cwd(), "public", "demo");

// ---- colour helpers --------------------------------------------------------
const hexToRgb = (hex) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (rgb) =>
  `#${rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;
// amt > 0 mixes toward white, amt < 0 toward black
const shade = (hex, amt) => {
  const rgb = hexToRgb(hex);
  const target = amt > 0 ? 255 : 0;
  const t = Math.abs(amt);
  return toHex(rgb.map((v) => v + (target - v) * t));
};
const isLight = (hex) => {
  const [r, g, b] = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
};

// ---- shared scene ----------------------------------------------------------
const scene = (defs, body, shadow = { cx: 200, cy: 352, rx: 120, ry: 14 }) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
<defs>
  <radialGradient id="bg" cx="50%" cy="38%" r="75%">
    <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#eeebf7"/>
  </radialGradient>
  <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
  <filter id="blur4" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
  <linearGradient id="gloss" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".35" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  ${defs}
</defs>
<rect width="400" height="400" fill="url(#bg)"/>
<ellipse cx="${shadow.cx}" cy="${shadow.cy}" rx="${shadow.rx}" ry="${shadow.ry}" fill="#1e1b4b" opacity=".22" filter="url(#soft)"/>
${body}
</svg>`;

const lens = (cx, cy, r) => `
  <circle cx="${cx}" cy="${cy}" r="${r + 3}" fill="#1a1a1f" opacity=".9"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#lens)"/>
  <circle cx="${cx - r * 0.35}" cy="${cy - r * 0.35}" r="${r * 0.22}" fill="#9ec5ff" opacity=".7"/>`;

const LENS_DEF = `<radialGradient id="lens" cx="45%" cy="40%" r="60%">
  <stop offset="0" stop-color="#3b4a6b"/><stop offset=".55" stop-color="#0b0d14"/><stop offset="1" stop-color="#2a2d36"/></radialGradient>`;

// ---- product types -----------------------------------------------------------
const phone = (c, accent) => {
  const body = c;
  const rim = shade(c, -0.25);
  return scene(
    `<linearGradient id="body" x1="0" y1="0" x2="1" y2="1">
       <stop offset="0" stop-color="${shade(body, 0.28)}"/><stop offset=".5" stop-color="${body}"/><stop offset="1" stop-color="${shade(body, -0.18)}"/></linearGradient>
     <linearGradient id="wall" x1="0" y1="0" x2="1" y2="1">
       <stop offset="0" stop-color="${shade(accent, 0.25)}"/><stop offset=".55" stop-color="${accent}"/><stop offset="1" stop-color="#140f35"/></linearGradient>
     ${LENS_DEF}`,
    `
  <!-- back -->
  <g transform="rotate(8 250 190)">
    <rect x="178" y="42" width="150" height="296" rx="28" fill="${rim}"/>
    <rect x="181" y="45" width="144" height="290" rx="25" fill="url(#body)"/>
    <rect x="193" y="58" width="68" height="74" rx="20" fill="${shade(body, -0.08)}" stroke="${shade(body, 0.2)}" stroke-width="2"/>
    ${lens(213, 80, 11)}${lens(242, 80, 11)}${lens(213, 110, 11)}
    <circle cx="243" cy="110" r="5" fill="#fff6d5" opacity=".9"/>
    <rect x="181" y="45" width="144" height="290" rx="25" fill="url(#gloss)"/>
  </g>
  <!-- front -->
  <g transform="rotate(-6 150 210)">
    <rect x="72" y="62" width="150" height="296" rx="28" fill="${rim}"/>
    <rect x="75" y="65" width="144" height="290" rx="25" fill="#0c0c10"/>
    <rect x="81" y="71" width="132" height="278" rx="20" fill="url(#wall)"/>
    <circle cx="120" cy="150" r="46" fill="${shade(accent, 0.45)}" opacity=".55" filter="url(#blur4)"/>
    <circle cx="178" cy="262" r="58" fill="#ffffff" opacity=".16" filter="url(#blur4)"/>
    <rect x="128" y="80" width="40" height="11" rx="5.5" fill="#050507"/>
    <text x="147" y="140" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#fff" text-anchor="middle" opacity=".92">10:08</text>
    <text x="147" y="158" font-family="Arial, sans-serif" font-size="9" fill="#fff" text-anchor="middle" opacity=".75">Tuesday, 24 September</text>
    <rect x="75" y="65" width="144" height="290" rx="25" fill="url(#gloss)"/>
  </g>`,
  );
};

const watch = (c, accent) =>
  scene(
    `<linearGradient id="strap" x1="0" y1="0" x2="1" y2="0">
       <stop offset="0" stop-color="${shade(c, -0.2)}"/><stop offset=".5" stop-color="${shade(c, 0.12)}"/><stop offset="1" stop-color="${shade(c, -0.2)}"/></linearGradient>
     <linearGradient id="caseG" x1="0" y1="0" x2="1" y2="1">
       <stop offset="0" stop-color="#d9dbe3"/><stop offset=".5" stop-color="#8d909c"/><stop offset="1" stop-color="#4b4e59"/></linearGradient>`,
    `
  <rect x="152" y="18" width="96" height="120" rx="26" fill="url(#strap)"/>
  <rect x="152" y="262" width="96" height="124" rx="26" fill="url(#strap)"/>
  <g stroke="${shade(c, -0.3)}" stroke-width="2" opacity=".35">
    <line x1="158" y1="300" x2="242" y2="300"/><line x1="158" y1="320" x2="242" y2="320"/><line x1="158" y1="340" x2="242" y2="340"/></g>
  <rect x="112" y="104" width="176" height="196" rx="52" fill="url(#caseG)"/>
  <rect x="120" y="112" width="160" height="180" rx="44" fill="#07070a"/>
  <rect x="290" y="160" width="12" height="40" rx="6" fill="#9a9dab"/>
  <circle cx="200" cy="202" r="58" fill="none" stroke="${accent}" stroke-width="8" stroke-dasharray="250 400" stroke-linecap="round" transform="rotate(-90 200 202)"/>
  <circle cx="200" cy="202" r="44" fill="none" stroke="#34d399" stroke-width="7" stroke-dasharray="170 400" stroke-linecap="round" transform="rotate(-90 200 202)"/>
  <text x="200" y="212" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#fff" text-anchor="middle">10:08</text>
  <rect x="112" y="104" width="176" height="196" rx="52" fill="url(#gloss)"/>`,
    { cx: 200, cy: 372, rx: 90, ry: 10 },
  );

const earbuds = (c) => {
  const dark = !isLight(c);
  const edge = dark ? shade(c, 0.2) : "#cfd3dc";
  return scene(
    `<linearGradient id="shell" x1="0" y1="0" x2="1" y2="1">
       <stop offset="0" stop-color="${shade(c, dark ? 0.2 : 0)}"/><stop offset="1" stop-color="${shade(c, dark ? -0.15 : -0.12)}"/></linearGradient>`,
    `
  <rect x="96" y="196" width="208" height="150" rx="62" fill="url(#shell)" stroke="${edge}" stroke-width="3"/>
  <path d="M100 250 H300" stroke="${edge}" stroke-width="3"/>
  <circle cx="200" cy="222" r="4" fill="#34d399"/>
  <rect x="96" y="196" width="208" height="150" rx="62" fill="url(#gloss)"/>
  <g transform="rotate(-18 150 130)">
    <ellipse cx="150" cy="118" rx="32" ry="36" fill="url(#shell)" stroke="${edge}" stroke-width="3"/>
    <rect x="138" y="138" width="24" height="70" rx="12" fill="url(#shell)" stroke="${edge}" stroke-width="3"/>
    <ellipse cx="150" cy="112" rx="14" ry="12" fill="#2b2e36" opacity=".8"/>
  </g>
  <g transform="rotate(18 252 130)">
    <ellipse cx="252" cy="118" rx="32" ry="36" fill="url(#shell)" stroke="${edge}" stroke-width="3"/>
    <rect x="240" y="138" width="24" height="70" rx="12" fill="url(#shell)" stroke="${edge}" stroke-width="3"/>
    <ellipse cx="252" cy="112" rx="14" ry="12" fill="#2b2e36" opacity=".8"/>
  </g>`,
  );
};

const headphones = (c) =>
  scene(
    `<linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
       <stop offset="0" stop-color="${shade(c, 0.25)}"/><stop offset="1" stop-color="${shade(c, -0.2)}"/></linearGradient>
     <radialGradient id="cup" cx="40%" cy="35%" r="70%">
       <stop offset="0" stop-color="${shade(c, 0.3)}"/><stop offset="1" stop-color="${shade(c, -0.25)}"/></radialGradient>`,
    `
  <path d="M96 238 C 96 86, 304 86, 304 238" fill="none" stroke="url(#band)" stroke-width="26" stroke-linecap="round"/>
  <path d="M110 232 C 112 110, 288 110, 290 232" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="6"/>
  <rect x="64" y="206" width="84" height="130" rx="40" fill="url(#cup)"/>
  <rect x="252" y="206" width="84" height="130" rx="40" fill="url(#cup)"/>
  <rect x="120" y="222" width="30" height="98" rx="15" fill="${shade(c, -0.45)}"/>
  <rect x="250" y="222" width="30" height="98" rx="15" fill="${shade(c, -0.45)}"/>
  <rect x="64" y="206" width="84" height="130" rx="40" fill="url(#gloss)"/>
  <rect x="252" y="206" width="84" height="130" rx="40" fill="url(#gloss)"/>`,
  );

const powerbank = (c, _a, p) => {
  const cap = (p.name.match(/(\d{4,5})\s*mAh/i) || [])[1] || "10000";
  return scene(
    `<linearGradient id="pb" x1="0" y1="0" x2="1" y2="1">
       <stop offset="0" stop-color="${shade(c, 0.3)}"/><stop offset=".6" stop-color="${c}"/><stop offset="1" stop-color="${shade(c, -0.25)}"/></linearGradient>`,
    `
  <g transform="rotate(-10 200 200)">
    <rect x="124" y="58" width="156" height="290" rx="30" fill="${shade(c, -0.3)}"/>
    <rect x="118" y="52" width="156" height="290" rx="30" fill="url(#pb)"/>
    <g fill="#34d399"><circle cx="170" cy="92" r="5"/><circle cx="188" cy="92" r="5"/><circle cx="206" cy="92" r="5"/><circle cx="224" cy="92" r="5" opacity=".3"/></g>
    <text x="196" y="215" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#fff" fill-opacity=".85" text-anchor="middle">${cap}</text>
    <text x="196" y="236" font-family="Arial, sans-serif" font-size="13" fill="#fff" fill-opacity=".6" text-anchor="middle">mAh</text>
    <rect x="176" y="324" width="40" height="9" rx="4.5" fill="#0b0b0f"/>
    <rect x="118" y="52" width="156" height="290" rx="30" fill="url(#gloss)"/>
  </g>`,
  );
};

const charger = (c, _a, p) => {
  const watts = (p.name.match(/(\d{2,3})\s*W/i) || [])[1] || "25";
  const light = isLight(c);
  return scene(
    `<linearGradient id="front" x1="0" y1="0" x2="0" y2="1">
       <stop offset="0" stop-color="${shade(c, light ? 0 : 0.2)}"/><stop offset="1" stop-color="${shade(c, -0.1)}"/></linearGradient>
     <linearGradient id="prong" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a8d96"/><stop offset=".5" stop-color="#e3e5ea"/><stop offset="1" stop-color="#8a8d96"/></linearGradient>`,
    `
  <rect x="172" y="46" width="14" height="70" rx="4" fill="url(#prong)"/>
  <rect x="214" y="46" width="14" height="70" rx="4" fill="url(#prong)"/>
  <path d="M120 112 L150 96 H300 L270 112 Z" fill="${shade(c, light ? -0.06 : 0.25)}"/>
  <path d="M270 112 L300 96 V300 L270 318 Z" fill="${shade(c, light ? -0.14 : -0.25)}"/>
  <rect x="120" y="112" width="150" height="206" rx="14" fill="url(#front)" stroke="${light ? "#d9dbe2" : shade(c, 0.2)}" stroke-width="2"/>
  <text x="195" y="222" font-family="Arial, sans-serif" font-size="40" font-weight="800" fill="${light ? "#6b6f7b" : "#ffffff"}" fill-opacity=".85" text-anchor="middle">${watts}W</text>
  <rect x="173" y="276" width="44" height="14" rx="7" fill="#101014"/>
  <rect x="120" y="112" width="150" height="206" rx="14" fill="url(#gloss)"/>`,
  );
};

const cable = (c) =>
  scene(
    `<linearGradient id="plug" x1="0" y1="0" x2="1" y2="0">
       <stop offset="0" stop-color="#8f929c"/><stop offset=".5" stop-color="#f0f1f4"/><stop offset="1" stop-color="#8f929c"/></linearGradient>`,
    `
  <path d="M120 318 C 40 250, 110 120, 200 128 C 300 136, 330 250, 250 270 C 170 290, 150 200, 230 186 C 300 175, 320 250, 290 318"
        fill="none" stroke="${shade(c, -0.2)}" stroke-width="18" stroke-linecap="round"/>
  <path d="M120 318 C 40 250, 110 120, 200 128 C 300 136, 330 250, 250 270 C 170 290, 150 200, 230 186 C 300 175, 320 250, 290 318"
        fill="none" stroke="${shade(c, 0.25)}" stroke-width="8" stroke-linecap="round" stroke-dasharray="4 6" opacity=".6"/>
  <rect x="104" y="300" width="32" height="46" rx="8" fill="${shade(c, -0.1)}"/>
  <rect x="110" y="340" width="20" height="18" rx="4" fill="url(#plug)"/>
  <rect x="274" y="300" width="32" height="46" rx="8" fill="${shade(c, -0.1)}"/>
  <rect x="280" y="340" width="20" height="18" rx="4" fill="url(#plug)"/>`,
  );

const phoneCase = (c) => {
  const clear = /^#?(cbd5e1|e0f2fe)$/i.test(c.replace("#", ""));
  return scene(
    `<linearGradient id="cs" x1="0" y1="0" x2="1" y2="1">
       <stop offset="0" stop-color="${shade(c, 0.25)}"/><stop offset="1" stop-color="${shade(c, -0.2)}"/></linearGradient>
     ${LENS_DEF}`,
    `
  <g transform="rotate(6 200 200)">
    <rect x="118" y="40" width="168" height="316" rx="34" fill="url(#cs)" opacity="${clear ? 0.55 : 1}" stroke="${shade(c, -0.3)}" stroke-width="3"/>
    <rect x="134" y="56" width="74" height="80" rx="22" fill="#0e0e12" opacity=".85"/>
    ${lens(156, 80, 10)}${lens(186, 80, 10)}${lens(156, 112, 10)}
    <path d="M150 200 h104 M150 214 h104" stroke="${shade(c, 0.35)}" stroke-width="3" opacity=".35"/>
    <rect x="118" y="40" width="168" height="316" rx="34" fill="url(#gloss)"/>
  </g>`,
  );
};

const glass = () =>
  scene(
    `<linearGradient id="gl" x1="0" y1="0" x2="1" y2="1">
       <stop offset="0" stop-color="#e8f6ff" stop-opacity=".95"/><stop offset="1" stop-color="#b9dcf5" stop-opacity=".7"/></linearGradient>`,
    `
  <g transform="rotate(-8 200 200)">
    <rect x="124" y="44" width="152" height="304" rx="28" fill="url(#gl)" stroke="#8fb8d8" stroke-width="3"/>
    <rect x="178" y="56" width="44" height="10" rx="5" fill="#8fb8d8" opacity=".6"/>
    <path d="M150 110 L250 210 M150 150 L250 250 M150 190 L220 260" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".85"/>
    <text x="200" y="320" font-family="Arial, sans-serif" font-size="20" font-weight="800" fill="#4b6b88" text-anchor="middle">9H</text>
  </g>`,
  );

const memory = () =>
  scene(
    `<linearGradient id="sd" x1="0" y1="0" x2="1" y2="1">
       <stop offset="0" stop-color="#ef4444"/><stop offset="1" stop-color="#991b1b"/></linearGradient>`,
    `
  <g transform="rotate(-8 200 200)">
    <path d="M128 70 H248 L286 108 V340 H128 Z" fill="url(#sd)"/>
    <rect x="128" y="226" width="158" height="114" fill="#141418"/>
    <g fill="#f5c542">${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${140 + i * 19}" y="82" width="11" height="26" rx="2"/>`).join("")}</g>
    <text x="207" y="176" font-family="Arial, sans-serif" font-size="28" font-weight="800" fill="#fff" text-anchor="middle">SanDisk</text>
    <text x="207" y="296" font-family="Arial, sans-serif" font-size="36" font-weight="800" fill="#fbbf24" text-anchor="middle">128GB</text>
    <path d="M128 70 H248 L286 108 V340 H128 Z" fill="url(#gloss)"/>
  </g>`,
  );

const ART = {
  phone,
  watch,
  earbuds,
  headphones,
  powerbank,
  charger,
  cable,
  case: phoneCase,
  glass,
  memory,
};

// product: { kind, name }, color: { hex, accent }
export const productImageSvg = (product, color) =>
  ART[product.kind](color.hex, color.accent, product);
