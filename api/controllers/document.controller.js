import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { createReadStream } from "fs";
import Document from "../models/documents.js";
import  {enqueueIngestion}  from "../service/queu.js"

// File extension -> Document.sourceType
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

// Real PDFs start with "%PDF-". Catches files renamed to .pdf.
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


export const uploadDocument = async (req, res, next) => {
  const file = req.file;
  try {
    if (!file) {
      return res.status(400).json({ message: "No file uploaded (field name must be 'file')" });
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const sourceType = SOURCE_TYPE_BY_EXT[ext];

    if (ext === ".pdf" && !(await looksLikePdf(file.path))) {
      await safeUnlink(file.path);
      return res.status(400).json({ message: "File is not a valid PDF" });
    }

    const { companyId, _id: userId } = req.user;

    // Skip exact duplicates within the same company
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
      storagePath: file.path, // swap for an S3/R2 key later
      contentHash,
      status: "pending",
    });

    // Fire and forget: the request must not wait for extraction/embedding
    enqueueIngestion(document._id).catch((err) =>
      console.error(`[ingestion] failed to enqueue ${document._id}:`, err)
    );

    // 202 Accepted: processing continues in the background
    return res.status(202).json({ document });
  } catch (err) {
    await safeUnlink(file?.path);
    next(err);
  }
};