import express from "express";
import { verifyToken } from "../middleware/verify.js";
import { requirePlanAccess } from "../middleware/requirePlanAccess.js";
import { handleUpload } from "../middleware/upload.middle.js";
import { listDocuments, retryDocument, uploadDocument } from "../controllers/document.controller.js";
import { getUsage } from "../controllers/companyController.js";

const router = express.Router();

// Order matters: auth -> multer -> handler
router.get("/usage", verifyToken, requirePlanAccess, getUsage);
router.post("/documents", verifyToken, requirePlanAccess, handleUpload, uploadDocument);
router.get("/documents", verifyToken, requirePlanAccess, listDocuments);
router.patch("/documents/:id/retry", verifyToken, requirePlanAccess, retryDocument);

export default router;