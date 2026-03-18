import cloudinary from "@/lib/cloudinary";
import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import MediaModel from "@/models/Media.model";

export async function POST(request) {
  try {
const payload=await request.json()

await connectDB();


    // const auth = await isAuthenticated("admin");
    // if (!auth.isAuth) {
    //   return response(false, 403, "Unauthorized.");
    // }

    

    const newMedia = await MediaModel.insertMany(payload);

    return response(true, 200, "Media uploaded successfully.", newMedia);

  } catch (error) {

    // ✅ Cloudinary rollback
    if (payload && payload.length > 0) {
      const publicIds = payload.map(item => item.public_id);

      if (publicIds.length > 0) {
        try {
          await cloudinary.api.delete_resources(publicIds);
        } catch (deleteError) {
          error.cloudinary = deleteError;
        }
      }
    }

    return catchError(error);
  }
}
