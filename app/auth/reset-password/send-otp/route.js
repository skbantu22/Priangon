// import { otpEmail } from "@/Email/otpEmail";
// import { connectDB } from "@/lib/databaseconnection";
// import { catchError, generateOTP } from "@/lib/helperfunction";
// import { sendMail } from "@/lib/sendMail";
// import { zSchema } from "@/lib/zodschema";
// import OTPModel from "@/models/Otp.model";

// export async function POST(request) {
//   try {
//     await connectDB();
//     const payload = await request.json();

//     const validationSchema = zSchema.pick({
//       email: true
//     });   

// const validatedData = validationSchema.safeParse(payload)
// if (!validatedData.success) {
//   return response(false, 401, 'Invalid or missing input field.', validatedData.error)
// }

// const { email } = validatedData.data
// const getUser = await UserModel.findOne({ deletedAt: null, email }).lean()
// if (!getUser) {
//   return response(false, 404, 'User not found.')
// }

// // remove old otps
// await OTPModel.deleteMany({ email })
// const otp = generateOTP()
// const newOtpData = new OTPModel({
//   email, otp
// })

// await newOtpData.save()

// const otpSendStatus = await sendMail(
//   'Your login verification code.',
//   email,
//   otpEmail(otp)
// )

// if (!otpSendStatus.success) {
//   return response(false, 400, 'Failed to resend otp.')
// }

// return response(true, 200, 'Please Verify Your Account')




//   } catch (error) {
//     catchError(error);
//   }
// }
