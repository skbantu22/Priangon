import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.SECRET_KEY);

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("access_token")?.value;

  const isAuthRoute = pathname.startsWith("/auth");

  // PUBLIC ROUTES
  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith("/product") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico";

  // allow public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

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

    // already logged in user visiting auth page
    if (isAuthRoute) {
      if (role === "admin") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }

      if (role === "cashier" || role === "manager") {
        return NextResponse.redirect(new URL("/admin/pos", request.url));
      }

      return NextResponse.redirect(new URL("/my-account", request.url));
    }

    // ADMIN ONLY
    // ADMIN PANEL ACCESS
    if (
      pathname.startsWith("/admin") &&
      role !== "admin" &&
      role !== "cashier" &&
      role !== "manager"
    ) {
      return NextResponse.redirect(new URL("/my-account", request.url));
    }

    // USER ONLY
    if (
      pathname.startsWith("/admin") &&
      !["admin", "cashier", "manager"].includes(role)
    ) {
      return NextResponse.redirect(new URL("/my-account", request.url));
    }
    if (
      pathname.startsWith("/my-account") &&
      (role === "admin" || role === "cashier" || role === "manager")
    )
      return NextResponse.next();
  } catch (error) {
    const response = NextResponse.redirect(new URL("/auth/login", request.url));

    response.cookies.delete("access_token");

    return response;
  }
}

export const config = {
  matcher: ["/admin/:path*", "/my-account/:path*", "/auth/:path*"],
};
