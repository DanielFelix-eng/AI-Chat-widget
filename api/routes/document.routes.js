import express from "express";
import { verifyToken } from "../middleware/verify.js";
import { handleUpload } from "../middleware/upload.middle.js";
import { uploadDocument } from "../controllers/document.controller.js";

const router = express.Router();

// Order matters: auth -> multer -> handler
router.post("/documents", verifyToken, handleUpload, uploadDocument);

export default router;