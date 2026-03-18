import { connectDB } from "@/lib/databaseconnection";
import { catchError } from "@/lib/helperfunction";
import { zSchema } from "@/lib/zodschema";

export async function POST(request) {
  try {
    await connectDB();

    const payload = await request.json();
    const validationSchema = zSchema.pick({ email: true });
    const validatedData = validationSchema.safeParse(payload);

    const getUser = await UserModel.findOne({ email })
if (!getUser) {
  return response(false, 404, 'User not found.')
}

// remove old otps
await OTPModel.deleteMany({ email })
const otp = generateOTP()
const newOtpData = new OTPModel({
  email, otp
})

await newOtpData.save()
const otpSendStatus = await sendMail(
  'Your login verification code.',
  email,
  otpEmail(otp)
)

if (!otpSendStatus.success) {
  return response(false, 400, 'Failed to resend otp.')
}

return response(true, 200, 'OTP sent successfully.')



  } catch (error) {
    return catchError(error);
  }
}
