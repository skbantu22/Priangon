import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.SECRET_KEY);

// kept here (not imported) so the proxy bundle stays tiny
const PARTNER_ROLES = ["dealer", "subDealer", "retailer"];

/* =========================
   TWO SURFACES, ONE CODEBASE
   =========================
   APP_HOSTS  — the software: admin panel, POS, partner portal
   SHOP_HOSTS — the storefront normal customers browse

   Both are comma separated, e.g.
     APP_HOSTS=app.sbtelecombd.com
     SHOP_HOSTS=sbtelecom.com.bd,www.sbtelecom.com.bd

   With neither set — localhost, previews, an install that has not been
   split yet — the app behaves exactly as it did before: one host serving
   everything, with "/" opening the login screen.
*/
const parseHosts = (value) =>
  (value || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

const APP_HOSTS = parseHosts(process.env.APP_HOSTS);
const SHOP_HOSTS = parseHosts(process.env.SHOP_HOSTS);

const PRIMARY_APP_HOST = APP_HOSTS[0] || "";
const PRIMARY_SHOP_HOST = SHOP_HOSTS[0] || "";

/** Paths that belong to the software, never to the storefront */
const APP_PREFIXES = ["/admin", "/partner"];

/** Paths a customer browses, which have no place on the software host */
const SHOP_PREFIXES = [
  "/shop",
  "/product",
  "/cart",
  "/checkout",
  "/wishlist",
  "/track-order",
  "/stock-check",
  "/about-us",
  "/terms-and-condision",
];

/** Only these are guarded below; everything else is served as-is */
const GUARDED_PREFIXES = ["/admin", "/partner", "/my-account", "/auth"];

const startsWithAny = (pathname, prefixes) =>
  prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

const surfaceFor = (hostname) => {
  if (APP_HOSTS.includes(hostname)) return "app";
  if (SHOP_HOSTS.includes(hostname)) return "shop";

  // Not configured, or an unknown host: keep the single-host behaviour
  return "both";
};

/** Same path, other host — so a mistyped link still lands somewhere useful */
const sendToHost = (request, host) => {
  const url = new URL(request.nextUrl);

  url.host = host;
  url.port = "";
  url.protocol = "https:";

  return NextResponse.redirect(url);
};

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  const hostname = request.headers.get("host")?.split(":")[0].toLowerCase();
  const surface = surfaceFor(hostname);

  /* -------------------------------------------------
     1. Send each path to the host it belongs to
  ------------------------------------------------- */
  if (surface === "shop" && startsWithAny(pathname, APP_PREFIXES)) {
    if (PRIMARY_APP_HOST) return sendToHost(request, PRIMARY_APP_HOST);

    return NextResponse.redirect(new URL("/", request.url));
  }

  if (
    surface === "app" &&
    PRIMARY_SHOP_HOST &&
    startsWithAny(pathname, SHOP_PREFIXES)
  ) {
    return sendToHost(request, PRIMARY_SHOP_HOST);
  }

  /* -------------------------------------------------
     2. The home page means different things per host
  ------------------------------------------------- */
  if (pathname === "/") {
    // On the storefront "/" is the storefront
    if (surface === "shop") return NextResponse.next();

    // On the software host, and on an unsplit install, "/" is the login
    // screen; logged-in staff are moved on to their own start page below
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Anything outside the guarded set is public: storefront pages, the
  // order success page, invoices opened from a link
  if (!startsWithAny(pathname, GUARDED_PREFIXES)) {
    return NextResponse.next();
  }

  const token = request.cookies.get("access_token")?.value;

  const isAuthRoute = pathname.startsWith("/auth");

  // NO TOKEN
  if (!token) {
    // allow auth pages
    if (isAuthRoute) {
      return NextResponse.next();
    }

    // redirect protected routes
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  try {
    // VERIFY TOKEN
    const { payload } = await jwtVerify(token, SECRET);

    const role = payload?.role;
    const isPartner = PARTNER_ROLES.includes(role);

    // dealer / sub dealer / retailer: only the partner portal
    if (
      isPartner &&
      (isAuthRoute ||
        pathname.startsWith("/admin") ||
        pathname.startsWith("/my-account"))
    ) {
      return NextResponse.redirect(new URL("/partner", request.url));
    }

    if (pathname.startsWith("/partner") && !isPartner) {
      const home =
        role === "admin"
          ? "/admin/dashboard"
          : role === "cashier" || role === "manager"
            ? "/admin/pos"
            : "/my-account";

      return NextResponse.redirect(new URL(home, request.url));
    }

    // already logged in user visiting auth page
    if (isAuthRoute) {
      if (role === "admin") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }

      if (role === "cashier" || role === "manager") {
        return NextResponse.redirect(new URL("/admin/pos", request.url));
      }

      // A customer logging in belongs on the storefront
      if (surface === "app" && PRIMARY_SHOP_HOST) {
        const url = new URL("/my-account", request.url);
        url.host = PRIMARY_SHOP_HOST;
        url.port = "";
        url.protocol = "https:";

        return NextResponse.redirect(url);
      }

      return NextResponse.redirect(new URL("/my-account", request.url));
    }

    // ADMIN PANEL ACCESS
    if (
      pathname.startsWith("/admin") &&
      !["admin", "cashier", "manager"].includes(role)
    ) {
      return NextResponse.redirect(new URL("/my-account", request.url));
    }

    const response = NextResponse.next();

    // The software host must never show up in search results
    if (surface === "app") {
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
    }

    return response;
  } catch (error) {
    const response = NextResponse.redirect(new URL("/auth/login", request.url));

    response.cookies.delete("access_token");

    return response;
  }
}

export const config = {
  // Everything except Next's own assets, the API and static files, so a
  // storefront path reaching the software host can be redirected
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|.*\\.[\\w]+$).*)"],
};
