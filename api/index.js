
 import "./env.js"; // must be first
 import express from "express";
 import { fileURLToPath } from "node:url";
 import path from "node:path";
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
const PORT = process.env.PORT || 8000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, "../client/dist");

app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/webhooks", webhookRoutes);
app.use("/api/widget", widgetCors, express.json(), widgetRoutes)
app.use(express.json());
app.use(cookieParser());
app.use(dashboardCors);
app.use("/api/auth", authRoute);
app.use("/api/company", companyRoutes);
app.use("/api", documentRoute);
app.use("/api/chat", chatRoutes);
app.use("/api/billing", billingRoutes);

app.get("/widget.js", (_req, res) => {
  res.sendFile(path.resolve(__dirname, "./widget.js"));
});

app.use(express.static(clientDist, {
  index: false,
  maxAge: process.env.NODE_ENV === "production" ? "1y" : 0,
  immutable: process.env.NODE_ENV === "production",
}));

app.use("/api", (_req, res) => {
  res.status(404).json({ message: "API route not found." });
});

app.get(/^\/(?!api(?:\/|$)|widget\.js$).*/, (req, res, next) => {
  res.sendFile(path.join(clientDist, "index.html"), (error) => {
    if (error) next(error);
  });
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
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exitCode = 1;
  }
};

startServer();