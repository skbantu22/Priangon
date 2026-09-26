import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { setActor } from "@/lib/activityContext";

export const isAuthenticated = async (role) => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (!token) return { isAuth: false };

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.SECRET_KEY),
    );

    if (role && payload?.role !== role) return { isAuth: false };

    // the Activity Log reads who is acting from here
    setActor({ userId: payload?.id || payload?.userId, role: payload?.role });

    return {
      isAuth: true,
      userId: payload?.id || payload?.userId,
      role: payload?.role,
      showroomId: payload?.showroomId,
    };
  } catch {
    return { isAuth: false };
  }
};
