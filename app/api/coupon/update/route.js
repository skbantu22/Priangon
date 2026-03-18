import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import { zSchema } from "@/lib/zodschema";
import CouponModel from "@/models/Coupon.model";



export async function PUT(request) {
  try {
    await connectDB();

    const payload = await request.json();

    console.log("PAYLOAD:", payload); // ✅ See incoming data

      const schema = zSchema.pick({
         _id: true,
    code: true,
    discountPercentage: true,
    minShoppingAmount: true,
    validity: true,
  })

    const validate = schema.safeParse(payload);

    // ✅ Zod error show
    if (!validate.success) {
      console.log("ZOD ERROR:", validate.error.format());

      return response(
        false,
        400,
        "Validation Error",
        validate.error.format()
      );
    }

    const validatedData = validate.data;

    console.log("VALIDATED DATA:", validatedData);

    // ✅ Check _id
    if (!validatedData?._id) {
      console.log("ID MISSING");
      return response(false, 400, "_id missing");
    }

    const  getCoupon = await CouponModel.findOne({
      deletedAt: null,
      _id: validatedData._id,
    });

    console.log("FOUND PRODUCT:", getCoupon);

   if (!getCoupon) {
  return response(false, 404, "coupon not found");
}

     getCoupon.code = validatedData.code
getCoupon.discountPercentage = validatedData.discountPercentage
getCoupon.minShoppingAmount = validatedData.minShoppingAmount
getCoupon.validity = validatedData.validity

    await getCoupon.save();

    return response(true, 200, "Coupon updated successfully.");

  } catch (error) {

    // ✅ Full error log
    console.log("SERVER ERROR:");
    console.log(error);

    // ✅ Axios readable error
    return response(
      false,
      500,
      error.message,
      error
    );
  }
}