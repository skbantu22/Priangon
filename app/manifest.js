/**
 * The web app manifest, served at /manifest.webmanifest.
 *
 * This is what makes Chrome offer "Install app" on a phone, and it is also
 * what PWABuilder reads to build the Play Store package — so the name, the
 * icons and start_url here end up on the Play listing and the launcher.
 */
export default function manifest() {
  return {
    name: "SB Telecom",
    short_name: "SB Telecom",
    description: "Sales, stock, dues and warranty for the shop.",

    // the app opens on the dashboard, not the public site
    start_url: "/admin/dashboard",
    scope: "/",

    display: "standalone",
    orientation: "portrait",

    background_color: "#ffffff",
    theme_color: "#00801a",

    lang: "en",
    dir: "ltr",
    categories: ["business", "productivity"],

    icons: [
      { src: "/icons/icon-48.png", sizes: "48x48", type: "image/png" },
      { src: "/icons/icon-72.png", sizes: "72x72", type: "image/png" },
      { src: "/icons/icon-96.png", sizes: "96x96", type: "image/png" },
      { src: "/icons/icon-128.png", sizes: "128x128", type: "image/png" },
      { src: "/icons/icon-144.png", sizes: "144x144", type: "image/png" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-256.png", sizes: "256x256", type: "image/png" },
      { src: "/icons/icon-384.png", sizes: "384x384", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },

      // Android crops icons to the launcher's shape, so it needs these two
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],

    // long-press the launcher icon to jump straight to a screen
    shortcuts: [
      { name: "POS", short_name: "POS", url: "/admin/pos" },
      { name: "Telekhata", short_name: "Telekhata", url: "/admin/telekhata" },
      { name: "Products", short_name: "Products", url: "/admin/product" },
    ],
  };
}
