import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.SECRET_KEY);

// kept here (not imported) so the proxy bundle stays tiny
const PARTNER_ROLES = ["dealer", "subDealer", "wholesaler"];

const STAFF_ROLES = ["admin", "manager", "cashier"];

// A login that is neither staff nor a partner has nowhere to go now that
// there is no storefront: sign it out
const signOut = (request) => {
  const response = NextResponse.redirect(new URL("/auth/login", request.url));
  response.cookies.delete("access_token");
  return response;
};

/** Only these are guarded below; everything else is served as-is */
const GUARDED_PREFIXES = ["/admin", "/partner", "/auth"];

const startsWithAny = (pathname, prefixes) =>
  prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // No storefront any more: "/" is the login screen, and logged-in staff
  // are moved on to their own start page below
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Anything outside the guarded set is public: invoices opened from a link
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

    // dealer / sub dealer / wholesaler: only the partner portal
    if (
      isPartner &&
      (isAuthRoute || pathname.startsWith("/admin"))
    ) {
      return NextResponse.redirect(new URL("/partner", request.url));
    }

    if (!isPartner && !STAFF_ROLES.includes(role)) return signOut(request);

    if (pathname.startsWith("/partner") && !isPartner) {
      const home = role === "admin" ? "/admin/dashboard" : "/admin/pos";

      return NextResponse.redirect(new URL(home, request.url));
    }

    // already logged in user visiting auth page
    if (isAuthRoute) {
      if (role === "admin") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }

      return NextResponse.redirect(new URL("/admin/pos", request.url));
    }

    const response = NextResponse.next();

    // The software must never show up in search results
    response.headers.set("X-Robots-Tag", "noindex, nofollow");

    return response;
  } catch (error) {
    const response = NextResponse.redirect(new URL("/auth/login", request.url));

    response.cookies.delete("access_token");

    return response;
  }
}

export const config = {
  // Everything except Next's own assets, the API and static files
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|.*\\.[\\w]+$).*)"],
};
