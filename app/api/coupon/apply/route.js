import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import { zSchema } from "@/lib/zodschema";
import CouponModel from "@/models/Coupon.model";

export async function POST(request) {
  try {
    await connectDB();

    const payload = await request.json();

    const couponFormSchema = zSchema.pick({
      code: true,
      minShoppingAmount: true,
    });

    const validate = couponFormSchema.safeParse(payload);

    if (!validate.success) {
      return response(false, 400, "Missing or invalid data.", validate.error);
    }

    const { code, minShoppingAmount } = validate.data;

    const couponData = await CouponModel.findOne({
  code: { $regex: `^${code.trim()}$`, $options: "i" },
}).lean();

    if (!couponData) {
      return response(false, 400, "Invalid or expired coupon code.");
    }

    if (!couponData.validity || new Date() > new Date(couponData.validity)) {
      return response(false, 400, "Coupon code expired.");
    }

    if (Number(minShoppingAmount) < Number(couponData.minShoppingAmount || 0)) {
      return response(false, 400, "Insufficient shopping amount.");
    }

    return response(true, 200, "Coupon applied successfully.", {
      code: couponData.code,
      discountPercentage: couponData.discountPercentage,
      minShoppingAmount: couponData.minShoppingAmount,
      validity: couponData.validity,
    });
  } catch (error) {
    return catchError(error);

  }
}