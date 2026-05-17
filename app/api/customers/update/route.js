import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import UserModel from "@/models/User.model";
import { z } from "zod";

export async function PUT(request) {
  try {
    await connectDB();

    const payload = await request.json();

    console.log("PAYLOAD:", payload);

    // ✅ VALIDATION (USER SYSTEM)
    const schema = z.object({
      _id: z.string(),

      name: z.string().optional(),
      email: z.string().email().optional(),

      role: z.enum(["user", "admin", "manager", "staff"]).optional(),

      showroomId: z.string().optional(),

      isEmailVerified: z.boolean().optional(),
    });

    const validate = schema.safeParse(payload);

    if (!validate.success) {
      console.log("ZOD ERROR:", validate.error.format());

      return response(false, 400, "Validation Error", validate.error.format());
    }

    const data = validate.data;

    // ❌ CHECK ID
    if (!data._id) {
      return response(false, 400, "_id missing");
    }

    // ✅ FIND USER
    const user = await UserModel.findOne({
      _id: data._id,
      deletedAt: null,
    });

    if (!user) {
      return response(false, 404, "User not found");
    }

    console.log("FOUND USER:", user);

    // ✅ UPDATE FIELDS
    if (data.name !== undefined) user.name = data.name;
    if (data.email !== undefined) user.email = data.email;
    if (data.role !== undefined) user.role = data.role;
    if (data.showroomId !== undefined) user.showroomId = data.showroomId;
    if (data.isEmailVerified !== undefined)
      user.isEmailVerified = data.isEmailVerified;

    await user.save();

    return response(true, 200, "User updated successfully");
  } catch (error) {
    console.log("SERVER ERROR:", error);

    return response(false, 500, error.message, error);
  }
}
