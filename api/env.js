import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env");

if (process.env.NODE_ENV !== "production") {
  const { error } = dotenv.config({ path: envPath });
  if (error && error.code !== "ENOENT") throw error;
}