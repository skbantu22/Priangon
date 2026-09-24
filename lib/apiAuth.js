import { NextResponse } from "next/server";

import { isAuthenticated } from "@/lib/auth.server";

export const STAFF_ROLES = ["admin", "manager", "cashier"];
export const ADMIN_ONLY = ["admin"];
export const ADMIN_MANAGER = ["admin", "manager"];
// dealers, sub dealers and retailers — the partner portal, not staff
export const PARTNER_ROLES = ["dealer", "subDealer", "retailer"];
// any signed-in account, customers included
export const ANY_USER = [];

/**
 * Guards an API route.
 *
 * isAuthenticated only takes a single role, but most screens are open to
 * more than one — a manager may record an expense, only an admin may
 * change the VAT rate. Returns either a ready response to send back, or
 * the caller's identity to carry on with.
 *
 *   const auth = await requireRoles(ADMIN_MANAGER);
 *   if (auth.response) return auth.response;
 *   // auth.userId, auth.role, auth.showroomId
 *
 * 401 means "log in", 403 means "logged in, but not allowed" — kept
 * apart so the browser can tell a session timeout from a permission
 * problem.
 */
export async function requireRoles(roles = STAFF_ROLES) {
  const auth = await isAuthenticated();

  if (!auth.isAuth) {
    return {
      response: NextResponse.json(
        { success: false, message: "Please sign in" },
        { status: 401 },
      ),
    };
  }

  if (roles.length > 0 && !roles.includes(auth.role)) {
    return {
      response: NextResponse.json(
        { success: false, message: "You do not have access to this" },
        { status: 403 },
      ),
    };
  }

  return {
    response: null,
    userId: auth.userId,
    role: auth.role,
    showroomId: auth.showroomId,
  };
}

/** Name to stamp on createdBy / updatedBy fields */
export const actorName = (auth) => auth?.role || "";
