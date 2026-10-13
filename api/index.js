
 import "./env.js"; // must be first
 import cors from "cors";
 import express from "express";
 import { fileURLToPath } from "node:url";
 import { connectedDB } from "./db/db.js";
 import cookieParser from "cookie-parser";
 import authRoute from "./routes/authRoute.js";
 import companyRoutes from "./routes/company.routes.js";
 import documentRoute from "./routes/document.routes.js";
 import widgetRoutes from "./routes/widget.routes.js";
 import chatRoutes from "./routes/chat.routes.js";


const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use("/api/auth", authRoute);
app.use("/api/company", companyRoutes);
app.use("/api", documentRoute);
app.use("/api/chat", chatRoutes);
app.use("/api/widget", widgetRoutes);

app.get("/widget.js", (_req, res) => {
  res.sendFile(fileURLToPath(new URL("./widget.js", import.meta.url)));
});

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

const startServer = async () => {
  try {
    await connectedDB();
    app.listen(PORT, () => {
      console.log("server is running on port", PORT);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exitCode = 1;
  }
};

startServer();