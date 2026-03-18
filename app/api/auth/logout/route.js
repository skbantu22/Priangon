import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import { cookies } from "next/headers";

export async function POST(request) {
  try {
    await connectDB();

    const cookieStore = await cookies();
    cookieStore.delete('access_token');

    return response(true, 200, 'Logout successfull.');

  } catch (error) {
    catchError(error);
  }
}