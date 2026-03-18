
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export const isAuthenticated = async (role) => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (!token) return { isAuth: false };

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.SECRET_KEY)
    );

    if (role && payload?.role !== role) return { isAuth: false };

    return { isAuth: true, userId: payload?.id || payload?.userId, role: payload?.role };
  } catch {
    return { isAuth: false };
  }
};
