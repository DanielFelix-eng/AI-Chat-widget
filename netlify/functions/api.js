import serverless from "serverless-http";
import { app } from "../../api/index.js";
import { connectedDB, isDBConnected } from "../../api/db/db.js";

const expressHandler = serverless(app);
const functionPath = "/.netlify/functions/api";

export const handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const requestPath = event.path.startsWith(`${functionPath}/`)
    ? event.path.slice(functionPath.length)
    : event.path;
  const requiresDatabase = requestPath !== "/livez" && requestPath !== "/widget.js";

  if (requiresDatabase && !isDBConnected()) {
    try {
      await connectedDB();
    } catch (error) {
      console.error("Netlify function could not connect to MongoDB:", error);
      return {
        statusCode: 503,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "not_ready",
          database: "disconnected",
        }),
      };
    }
  }

  event.path = requestPath || "/";

  return expressHandler(event, context);
};
