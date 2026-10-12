import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env");

const result = dotenv.config({ path: envPath, override: true });
console.log("Env file:", envPath);
console.log("Error:", result.error?.message);
console.log("Loaded keys:", Object.keys(result.parsed || {}));