import { catchError, response } from "@/lib/helperfunction"
import { isAuthenticated } from "@/lib/auth.server";
import OrderModel from "@/models/Order.model";
import { connectDB } from "@/lib/databaseconnection";
import CategoryModel from "@/models/category.model";
import ProductModel from "@/models/Product.model";
import UserModel from "@/models/User.model";

export async function GET() {
  try {
    const auth = await isAuthenticated('admin')

    if (!auth.isAuth) {
      return response(false, 403, 'Unauthorized.')
    }

    await connectDB()

    const [category, product, customer,order] = await Promise.all([
  CategoryModel.countDocuments({ deletedAt: null }),
  ProductModel.countDocuments({ deletedAt: null }),
  UserModel.countDocuments({ deletedAt: null }),
  OrderModel.countDocuments({ deletedAt: null }),
 
])

return response(true, 200, 'Dashboard count.', {
  category,
  product,
  customer,
  order
})

  } catch (error) {
    return catchError(error)
  }
}