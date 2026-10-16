import express from "express";
import { verifyToken } from "../middleware/verify.js";
import { requirePlanAccess } from "../middleware/requirePlanAccess.js";
import { handleUpload } from "../middleware/upload.middle.js";
import { listDocuments, uploadDocument } from "../controllers/document.controller.js";

const router = express.Router();

// Order matters: auth -> multer -> handler
router.post("/documents", verifyToken, requirePlanAccess, handleUpload, uploadDocument);
router.get("/documents", verifyToken, requirePlanAccess, listDocuments);

export default router;