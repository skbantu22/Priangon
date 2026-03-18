import { connectDB } from "@/lib/databaseconnection";
import { catchError } from "@/lib/helperfunction";
import { zSchema } from "@/lib/zodschema";

export async function POST(request) {
  try {
    await connectDB()
    const payload = await request.json()
    const schema = zSchema.pick({
      amount: true
    })
  } catch (error) {
    return catchError(error)
  }
}