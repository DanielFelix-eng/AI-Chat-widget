import mongoose from "mongoose";

export const connectedDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is required.");
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.MONGO_DB_NAME || "ai-chat-widget",
    });
    console.log("MongoDB connected:", conn.connection.host, "database:", conn.connection.name);
  } catch (err) {
    console.error("Mongo error:", err.message);
    throw err;
  }
};