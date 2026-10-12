
 import "./env.js"; // must be first
 import dotenv from "dotenv";

 import express from "express";
import { connectedDB } from "./db/db.js";
import cookieParser from "cookie-parser";
import authRoute from "./routes/authRoute.js";
import companyRoutes from "./routes/company.routes.js";
import documentRoute from "./routes/document.routes.js"; 


const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRoute);
app.use("/api/company", companyRoutes);
app.use("/api", documentRoute);

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.listen(PORT, () => {
  connectedDB();
  console.log("server is running on port", PORT);
});