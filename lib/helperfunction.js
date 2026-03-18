
import { NextResponse } from "next/server";

import { jwtVerify } from "jose";

/* -------------------- RESPONSE HELPERS -------------------- */

export const response = (success, statusCode, message, data = {}) => {
  const code = Number(statusCode);

  // ✅ NextResponse requires 200-599 integer status
  const safeStatus =
    Number.isInteger(code) && code >= 200 && code <= 599 ? code : 500;

  return NextResponse.json(
    { success, statusCode: safeStatus, message, data },
    { status: safeStatus }
  );
};

export const catchError = (error, customMessage) => {
  // ✅ Duplicate key error (MongoDB)
  if (error?.code === 11000) {
    const keys = Object.keys(error?.keyPattern || {}).join(", ") || "field";
    const message = `Duplicate field: ${keys}. These fields value must be unique.`;

    const data =
      process.env.NODE_ENV === "development"
        ? { error: { name: error?.name, message: error?.message, stack: error?.stack } }
        : {};

    return response(false, 409, message, data);
  }

  // ✅ Mongoose validation error
  if (error?.name === "ValidationError") {
    const data =
      process.env.NODE_ENV === "development"
        ? { error: { name: error?.name, message: error?.message, stack: error?.stack } }
        : {};

    return response(false, 400, customMessage || "Validation error.", data);
  }

  // ✅ Candidate status from different error types (axios/custom)
  const candidate =
    error?.statusCode ??
    error?.status ??
    error?.response?.status; // axios style

  const code = Number(candidate);

  // ✅ Only allow 400-599 for errors, otherwise 500
  const status =
    Number.isInteger(code) && code >= 400 && code <= 599 ? code : 500;

  const message =
    error?.response?.data?.message ||
    error?.message ||
    customMessage ||
    "Internal server error.";

  // ⚠️ Don't return full error object (can be circular)
  const data =
    process.env.NODE_ENV === "development"
      ? { error: { name: error?.name, message: error?.message, stack: error?.stack } }
      : {};

  return response(false, status, message, data);
};

// /* -------------------- AUTH HELPER -------------------- */

// export const isAuthenticated = async (role) => {
//   try {
//     const cookieStore = await cookies();

//     if (!cookieStore.has("access_token")) {
//       return { isAuth: false };
//     }

//     const access_token = cookieStore.get("access_token");

//     const { payload } = await jwtVerify(
//       access_token.value,
//       new TextEncoder().encode(process.env.SECRET_KEY)
//     );

//     if (role && payload?.role !== role) {
//       return { isAuth: false };
//     }

//     return { isAuth: true, userId: payload?._id };
//   } catch (error) {
//     return { isAuth: false, error };
//   }
// };

/* -------------------- TABLE COLUMN CONFIG -------------------- */

export const columnConfig = (
  column,
  isCreatedAt = false,
  isUpdatedAt = false,
  isDeletedAt = false
) => {
  const newColumn = [...column];

  if (isCreatedAt) {
    newColumn.push({
      accessorKey: "createdAt",
      header: "Created At",
      Cell: ({ renderedCellValue }) =>
        renderedCellValue ? new Date(renderedCellValue).toLocaleString() : "",
    });
  }

  if (isUpdatedAt) {
    newColumn.push({
      accessorKey: "updatedAt",
      header: "Updated At",
      Cell: ({ renderedCellValue }) =>
        renderedCellValue ? new Date(renderedCellValue).toLocaleString() : "",
    });
  }

  if (isDeletedAt) {
    newColumn.push({
      accessorKey: "deletedAt",
      header: "Deleted At",
      Cell: ({ renderedCellValue }) =>
        renderedCellValue ? new Date(renderedCellValue).toLocaleString() : "",
    });
  }

  return newColumn;
};

export const generateOTP = () => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  return otp
}



export const statusBadge = (status) => {
  const statusColorConfig = {
    pending: 'bg-blue-500',
    processing: 'bg-yellow-500',
    shipped: 'bg-cyan-500',
    delivered: 'bg-green-500',
    cancelled: 'bg-red-500',
    unverified: 'bg-orange-500',
  }

  return (
    <span className={`${statusColorConfig[status]} capitalize px-3 py-1 rounded-full text-xs`}>
      {status}
    </span>
  )
}