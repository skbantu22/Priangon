import mongoose from "mongoose";
import { activityLog } from "@/lib/activityLog";

import { ALL_PERMISSIONS, SYSTEM_ROLES } from "@/lib/permissions";

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Role name is required"],
      unique: true,
      trim: true,
    },

    description: { type: String, trim: true, default: "" },

    permissions: { type: [String], default: [] },

    /**
     * The key the JWT and User.role carry for a role that shipped with
     * the app. Set for admin, manager and cashier; empty for a role the
     * shop made, which is identified by its id alone.
     */
    systemKey: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    // A shipped role cannot be deleted, and its key cannot be reused
    isSystem: { type: Boolean, default: false },

    isActive: { type: Boolean, default: true, index: true },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

roleSchema.plugin(activityLog, { module: "User Role", label: "name" });

const RoleModel =
  mongoose.models.Role || mongoose.model("Role", roleSchema, "roles");

/**
 * Creates the shipped roles on first use and keeps Admin holding every
 * permission, so a feature added later is never locked away from the
 * owner. A shop's own roles are left exactly as they set them.
 */
export const ensureSystemRoles = async () => {
  for (const [systemKey, spec] of Object.entries(SYSTEM_ROLES)) {
    const permissions =
      spec.permissions === "*" ? ALL_PERMISSIONS : spec.permissions;

    const existing = await RoleModel.findOne({ systemKey });

    if (!existing) {
      await RoleModel.create({
        name: spec.name,
        description: spec.description,
        permissions,
        systemKey,
        isSystem: true,
      });

      continue;
    }

    // Admin follows the catalogue; the others keep any edits made to them
    if (spec.permissions === "*" && existing.permissions.length !== permissions.length) {
      existing.permissions = permissions;
      await existing.save();
    }
  }
};

export default RoleModel;
