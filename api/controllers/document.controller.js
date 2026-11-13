import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { createReadStream } from "fs";
import Document from "../models/documents.js";
import Company from "../models/company.js";
import { enqueueIngestion } from "../service/queu.js";
import { extractText } from "../service/extract.js";
import { ensureDocumentLimit, incrementDocumentCount } from "../utils/workspaceLimits.js";
import { getPlanConfig } from "../plans.js";
import mongoose from "mongoose";

const SOURCE_TYPE_BY_EXT = {
  ".pdf": "pdf",
  ".txt": "text",
  ".md": "text",
};

const safeUnlink = (filePath) => (filePath ? fs.unlink(filePath).catch(() => {}) : null);

const hashFile = (filePath) =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    createReadStream(filePath)
      .on("data", (chunk) => hash.update(chunk))
      .on("end", () => resolve(hash.digest("hex")))
      .on("error", reject);
  });

const looksLikePdf = async (filePath) => {
  const handle = await fs.open(filePath, "r");
  try {
    const buf = Buffer.alloc(5);
    await handle.read(buf, 0, 5, 0);
    return buf.toString("utf8") === "%PDF-";
  } finally {
    await handle.close();
  }
};

const countPages = async (filePath, originalName) => {
  const pages = await extractText({ storagePath: filePath, originalName });
  return pages.length;
};

export const uploadDocument = async (req, res, next) => {
  const file = req.file;
  try {
    if (!file) {
      return res.status(400).json({ message: "No file uploaded (field name must be 'file')" });
    }

    const { companyId, _id: userId } = req.user;
    if (!companyId) {
      await safeUnlink(file.path);
      return res.status(409).json({ message: "Set up your company workspace before uploading documents." });
    }

    const company = await Company.findById(companyId).select('plan usage');
    const plan = getPlanConfig(company?.plan || 'free');
    const docLimit = await ensureDocumentLimit(companyId);
    if (!docLimit.allowed) {
      await safeUnlink(file.path);
      return res.status(403).json({ code: docLimit.code, message: docLimit.message, plan: company?.plan || 'free' });
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const sourceType = SOURCE_TYPE_BY_EXT[ext];
    if (!sourceType) {
      await safeUnlink(file.path);
      return res.status(400).json({ message: "Unsupported file type. Allowed: PDF, TXT, MD" });
    }

    if (file.size > plan.maxDocumentSizeMB * 1024 * 1024) {
      await safeUnlink(file.path);
      return res.status(413).json({ code: 'PLAN_LIMIT_REACHED', message: `File too large for ${plan.label}. Max ${plan.maxDocumentSizeMB} MB per document.`, plan: company?.plan || 'free', limit: 'maxDocumentSizeMB' });
    }

    if (ext === ".pdf" && !(await looksLikePdf(file.path))) {
      await safeUnlink(file.path);
      return res.status(400).json({ message: "File is not a valid PDF" });
    }

    const pageCount = ext === '.pdf' ? await countPages(file.path, file.originalname) : 1;
    if (pageCount > plan.maxPagesPerDocument) {
      await safeUnlink(file.path);
      return res.status(403).json({ code: 'PLAN_LIMIT_REACHED', message: `This file exceeds the ${plan.maxPagesPerDocument}-page limit for your plan.`, plan: company?.plan || 'free', limit: 'maxPagesPerDocument' });
    }

    const contentHash = await hashFile(file.path);
    const duplicate = await Document.findOne({
      companyId,
      contentHash,
      status: { $ne: "failed" },
    }).select("_id originalName");

    if (duplicate) {
      await safeUnlink(file.path);
      return res.status(409).json({
        message: "This file has already been uploaded",
        documentId: duplicate._id,
      });
    }

    const document = await Document.create({
      companyId,
      uploadedBy: userId,
      sourceType,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      pageCount,
      storagePath: file.path,
      contentHash,
      status: "pending",
    });

    await incrementDocumentCount(companyId, 1);

    enqueueIngestion(document._id).catch((err) =>
      console.error(`[ingestion] failed to enqueue ${document._id}:`, err)
    );

    return res.status(202).json({ document });
  } catch (err) {
    await safeUnlink(file?.path);
    next(err);
  }
};

export const listDocuments = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    if (!companyId) {
      return res.status(409).json({ message: "Set up your company workspace before viewing documents." });
    }

    const documents = await Document.find({ companyId })
      .select("originalName sourceType size status errorMessage chunkCount createdAt updatedAt pageCount")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ documents });
  } catch (error) {
    next(error);
  }
};

export const retryDocument = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    if (!companyId) {
      return res.status(409).json({ message: "Set up your company workspace before retrying documents." });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid document ID." });
    }

    const document = await Document.findOneAndUpdate(
      { _id: req.params.id, companyId, status: "failed", storagePath: { $ne: null } },
      { $set: { status: "pending", errorMessage: null } },
      { new: true },
    ).select("_id");

    if (!document) {
      const existing = await Document.findOne({ _id: req.params.id, companyId }).select("status storagePath").lean();
      if (!existing) return res.status(404).json({ message: "Document not found." });
      if (existing.status !== "failed") {
        return res.status(409).json({ message: "Only failed documents can be retried." });
      }
      return res.status(409).json({ message: "The original file is no longer available. Upload it again to retry." });
    }

    enqueueIngestion(document._id).catch(async (error) => {
      console.error(`[ingestion] failed to retry ${document._id}:`, error);
      try {
        await Document.findOneAndUpdate(
          { _id: document._id, companyId, status: "pending" },
          { $set: { status: "failed", errorMessage: "Could not restart document processing. Please try again." } },
        );
      } catch (recoveryError) {
        console.error(`[ingestion] could not restore retry state for ${document._id}:`, recoveryError);
      }
    });

    return res.status(202).json({ message: "Document processing restarted." });
  } catch (error) {
    next(error);
  }
};