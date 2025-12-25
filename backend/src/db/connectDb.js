import mongoose from "mongoose";

export async function connectDb() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("Missing MONGO_URI in .env");

  mongoose.set("strictQuery", true);
  mongoose.set("bufferCommands", false);

  await mongoose.connect(uri, {
    dbName: process.env.MONGO_DB || "signature_engine",
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 20000,
    connectTimeoutMS: 10000,
  });

  console.log("MongoDB connected");
}
