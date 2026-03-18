import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

import { WEBSITE_LOGIN, WEBSITE_USER_DASHBOARD } from "@/Route/Websiteroute";
import { ADMIN_DASHBOARD } from "@/Route/Adminpannelroute";

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // ✅ token আছে কিনা (সবচেয়ে safe way)
  const token = request.cookies.get("access_token")?.value;

  // 🔥 debug (এটা terminal/edge logs এ দেখবে)
  // console.log("PATH:", pathname, "TOKEN?", !!token);

  // ✅ token নাই
  if (!token) {
    // শুধু auth page allow
    if (pathname.startsWith("/auth")) return NextResponse.next();

    // protected page গেলে login
    return NextResponse.redirect(new URL(WEBSITE_LOGIN, request.nextUrl));
  }

  try {
    // ✅ token verify
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.SECRET_KEY)
    );

    const role = payload?.role; // "admin" | "user"

    // ✅ login করা user /auth এ গেলে dashboard এ পাঠাও
    if (pathname.startsWith("/auth")) {
      return NextResponse.redirect(
        new URL(role === "admin" ? ADMIN_DASHBOARD : WEBSITE_USER_DASHBOARD, request.nextUrl)
      );
    }

    // ✅ /admin route only admin
    if (pathname.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL(WEBSITE_LOGIN, request.nextUrl));
    }

    // ✅ /my-account route only user
    if (pathname.startsWith("/my-account") && role !== "user") {
      return NextResponse.redirect(new URL(WEBSITE_LOGIN, request.nextUrl));
    }

    return NextResponse.next();
  } catch (err) {
    // ✅ token invalid/expired => cookie delete + login
    const res = NextResponse.redirect(new URL(WEBSITE_LOGIN, request.nextUrl));
    res.cookies.delete("access_token");
    return res;
  }
}

export const config = {
  matcher: ["/admin/:path*", "/my-account/:path*", "/auth/:path*"],
};
