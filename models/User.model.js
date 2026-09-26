import mongoose from "mongoose";
import { activityLog } from "@/lib/activityLog";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: [
        "customer",
        "cashier",
        "admin",
        "moderator",
        "manager",
        // partner logins: buy at their price list through /partner
        "dealer",
        "subDealer",
        "wholesaler",
      ],
      default: "customer",
    },

    /**
     * The role document deciding what this login may do. Left empty on
     * older users, who fall back to the permissions their `role` key
     * carries, so nobody is locked out by the upgrade.
     */
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      default: null,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // partner logins: may place orders from the partner portal. Off, they
    // can still see their prices, invoices and dues.
    canOrder: { type: Boolean, default: true },

    // partner logins: the Customer account their invoices and dues belong to
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
      index: true,
    },

    showroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Showroom",

      required: function () {
        return this.role === "cashier";
      },

      default: null,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    // Used to invalidate old JWT tokens after password change
    tokenVersion: {
      type: Number,
      default: 0,
    },

    avatar: {
      url: {
        type: String,
        trim: true,
      },

      public_id: {
        type: String,
        trim: true,
      },
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    phone: {
      type: String,
      trim: true,
    },

    address: {
      type: String,
      trim: true,
    },

    city: {
      type: String,
      trim: true,
    },

    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },

  {
    timestamps: true,
  },
);

// ================= HASH PASSWORD =================
userSchema.pre("save", async function () {
  // PASSWORD NOT MODIFIED
  if (!this.isModified("password")) {
    return;
  }

  // HASH PASSWORD
  this.password = await bcrypt.hash(this.password, 10);
});

// ================= COMPARE PASSWORD =================
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.plugin(activityLog, { module: "User", label: "name" });

const UserModel =
  mongoose.models.User || mongoose.model("User", userSchema, "users");

export default UserModel;
