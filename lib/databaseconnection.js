import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

/**
 * Global cache to prevent multiple connections in development
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = {
    conn: null,
    promise: null,
  };
}

export const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      // MONGODB_DB lets the app run on a separate (e.g. demo) database
      dbName: process.env.MONGODB_DB || "MobiZone",
      bufferCommands: false,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    // don't keep the rejected promise, or every later request fails until restart
    cached.promise = null;
    throw error;
  }

  return cached.conn;
};
