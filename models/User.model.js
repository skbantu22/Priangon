import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,

      enum: ["customer", "cashier", "admin"],

      default: "customer",
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

const UserModel =
  mongoose.models.User || mongoose.model("User", userSchema, "users");

export default UserModel;
