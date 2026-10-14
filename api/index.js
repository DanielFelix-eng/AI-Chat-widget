
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
 import billingRoutes from "./paystack/billing.js";
 import webhookRoutes from "./routes/webhook.js";
 import { dashboardCors, widgetCors } from "./db/cors.js"


const app = express();
const PORT = process.env.PORT || 5000;


app.use("/api/webhooks", webhookRoutes);
app.use("/api/widget", widgetCors, express.json(), widgetRoutes)
app.use(express.json());
app.use(cookieParser());
app.use(dashboardCors);
app.use("/api/auth", authRoute);
app.use("/api/company", companyRoutes);
app.use("/api", documentRoute);
app.use("/api/chat", chatRoutes);
app.use("/api/widget", widgetRoutes);
app.use("/api/billing", billingRoutes);

app.get("/widget.js", (_req, res) => {
  res.sendFile(fileURLToPath(new URL("./widget.js", import.meta.url)));
});

app.get("/", (req, res) => {
  res.send("Hello, World!");
});
app.use((err, req, res, next) => {
  if (err.message === "Origin not allowed by CORS") {
    return res.status(403).json({ message: err.message });
  }
  console.error(err);
  res.status(err.status || 500).json({ message: "Server error" });
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