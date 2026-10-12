import mongoose from "mongoose";

export const connectedDB = async () => {
  try {
    console.log("URI host:", process.env.MONGO_URI?.split("@").pop().split("/")[0]);
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected:", conn.connection.host);
  } catch (err) {
    console.error("Mongo error:", err.message);
    process.exit(1);
  }
};