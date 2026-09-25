import { NextResponse } from "next/server";

import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import RoleModel from "@/models/Role.model";
import UserModel from "@/models/User.model";
import { ALL_PERMISSIONS, SYSTEM_ROLES } from "@/lib/permissions";

export const STAFF_ROLES = ["admin", "manager", "cashier"];
export const ADMIN_ONLY = ["admin"];
export const ADMIN_MANAGER = ["admin", "manager"];
// dealers, sub dealers and wholesalers — the partner portal, not staff
export const PARTNER_ROLES = ["dealer", "subDealer", "wholesaler"];
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

/**
 * The signed-in person's own name, for a "Created By" column people read.
 * Falls back to the role when the login has no name.
 */
export async function actorFullName(auth) {
  if (!auth?.userId) return actorName(auth);

  await connectDB();

  const user = await UserModel.findById(auth.userId).select("name").lean();

  return String(user?.name || "").trim() || actorName(auth);
}

/**
 * What a signed-in login may actually do.
 *
 * A user carries a role document; one created before roles existed
 * carries only a role key, and falls back to what that key shipped with,
 * so an upgrade never locks anyone out. An admin always holds every
 * permission, including ones added after their role was saved.
 */
export async function permissionsFor(auth) {
  if (auth?.role === "admin") return ALL_PERMISSIONS;

  await connectDB();

  const user = await UserModel.findById(auth?.userId)
    .select("roleId role isActive")
    .lean();

  if (!user || user.isActive === false) return [];

  if (user.roleId) {
    const role = await RoleModel.findOne({
      _id: user.roleId,
      deletedAt: null,
      isActive: true,
    })
      .select("permissions")
      .lean();

    if (role) return role.permissions || [];
  }

  const fallback = SYSTEM_ROLES[user.role || auth?.role];

  if (!fallback) return [];

  return fallback.permissions === "*" ? ALL_PERMISSIONS : fallback.permissions;
}

/**
 * Guards a route by what it does rather than by who is asking.
 *
 *   const auth = await requirePermission("purchase.receive");
 *   if (auth.response) return auth.response;
 */
export async function requirePermission(permission) {
  const auth = await requireRoles([]);

  if (auth.response) return auth;

  const held = await permissionsFor(auth);

  if (!held.includes(permission)) {
    return {
      response: NextResponse.json(
        { success: false, message: "You do not have access to this" },
        { status: 403 },
      ),
    };
  }

  return { ...auth, permissions: held };
}

/** Like requirePermission, for a route several screens share */
export async function requireAnyPermission(permissions) {
  const auth = await requireRoles([]);

  if (auth.response) return auth;

  const held = await permissionsFor(auth);

  if (!permissions.some((permission) => held.includes(permission))) {
    return {
      response: NextResponse.json(
        { success: false, message: "You do not have access to this" },
        { status: 403 },
      ),
    };
  }

  return { ...auth, permissions: held };
}
