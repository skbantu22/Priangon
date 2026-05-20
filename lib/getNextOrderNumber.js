import { connectDB } from "@/lib/databaseconnection";

export async function getNextOrderNumber() {
  // ১. ডেটাবেজ কানেকশন নিশ্চিত করা
  const mongooseInstance = await connectDB();

  // ২. মঙ্গুজের ইন্টারনাল ড্রাইভার থেকে সরাসরি মঙ্গোডিবি 'db' অবজেক্টটি নেওয়া
  // এটি মঙ্গুজ মডেল ইনিশিয়েলাইজেশনের ঝামেলা সম্পূর্ণ এড়িয়ে যায়
  const db = mongooseInstance?.connection?.db || mongooseInstance?.db;

  if (!db) {
    throw new Error("Database connection object (db) not found.");
  }

  // ৩. সরাসরি র-কালেকশন (Raw Collection) অবজেক্ট ধরে কোয়েরি রান করা
  // আপনার ডেটাবেজে কালেকশনটির নাম সাধারণত 'counters' হয়ে থাকে (মঙ্গুজ অটো-প্লুরাল করে)
  const counterCollection = db.collection("counters");

  const result = await counterCollection.findOneAndUpdate(
    { name: "order" },
    { $inc: { seq: 1 } },
    {
      returnDocument: "after", // মঙ্গোডিবি ড্রাইভারের নতুন নিয়ম অনুযায়ী আপডেট হওয়া ডেটা রিটার্ন করবে
      upsert: true,
    },
  );

  // ৪. রিটার্ন ভ্যালু সেফটি চেক
  // মঙ্গোডিবি ড্রাইভার ভার্সন ভেদে ডেটা সরাসরি 'result' অথবা 'result.value' তে থাকতে পারে
  const updatedDoc = result?.value || result;

  if (!updatedDoc || typeof updatedDoc.seq !== "number") {
    throw new Error(
      "Failed to generate or retrieve order sequence from database.",
    );
  }

  return updatedDoc.seq;
}
