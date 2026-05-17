import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import UserModel from "@/models/User.model";
import cloudinary from "@/lib/cloudinary";

export const runtime = "nodejs";

export async function PUT(request) {
  try {
    await connectDB();

    // ---------------- AUTH CHECK ----------------
    const auth = await isAuthenticated("user");

    if (!auth?.isAuth) {
      return response(false, 401, "Unauthorized");
    }

    const userId = auth.userId;

    // ---------------- FIND USER ----------------
    const user = await UserModel.findById(userId);

    if (!user) {
      return response(false, 404, "User not found.");
    }

    // ---------------- FORM DATA ----------------
    const formData = await request.formData();
    const file = formData.get("file");

    // ---------------- UPDATE FIELDS ----------------
    user.name = formData.get("name") || user.name;
    user.phone = formData.get("phone") || user.phone;
    user.address = formData.get("address") || user.address;
    user.city = formData.get("city") || user.city;
    user.showroomId = formData.get("showroomId") || user.showroomId;

    // ---------------- AVATAR UPLOAD ----------------
    if (file && typeof file === "object") {
      const fileBuffer = await file.arrayBuffer();

      const base64Image = `data:${file.type};base64,${Buffer.from(
        fileBuffer,
      ).toString("base64")}`;

      const uploadFile = await cloudinary.uploader.upload(base64Image, {
        upload_preset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
      });

      // delete old image
      if (user?.avatar?.public_id) {
        await cloudinary.api.delete_resources([user.avatar.public_id]);
      }

      user.avatar = {
        url: uploadFile.secure_url,
        public_id: uploadFile.public_id,
      };
    }

    // ---------------- SAVE ----------------
    await user.save();

    // ---------------- RESPONSE ----------------
    return response(true, 200, "Profile updated successfully.", {
      _id: user._id.toString(),
      role: user.role,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      city: user.city,
      avatar: user.avatar,

      // 🔥 IMPORTANT FIX
      showroomId: user.showroomId,
    });
  } catch (error) {
    return catchError(error);
  }
}
