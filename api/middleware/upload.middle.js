import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// extension -> accepted mimetypes (browsers are inconsistent, especially for .md)
const ALLOWED_TYPES = {
    '.pdf': ['application/pdf'],
    '.txt': ['text/plain'],
    '.md': ['text/markdown', 'text/x-markdown', 'text/plain', 'application/octet-stream'],
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    // Random name on disk, keep only the extension
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${crypto.randomUUID()}${ext}`);
    },
});

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_TYPES[ext]?.includes(file.mimetype)) {
        const err = new Error('Unsupported file type. Allowed: PDF, TXT, MD');
        err.code = 'UNSUPPORTED_FILE_TYPE';
        return cb(err);
    }
    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE, files: 1 },
}).single('file'); // form-data field name must be "file"

// Wrap multer so its errors become clean JSON responses
const handleUpload = (req, res, next) => {
    upload(req, res, (err) => {
        if (!err) return next();

        if (err.code === 'LIMIT_FILE_SIZE') {
            return res
                .status(413)
                .json({ message: `File too large. Max ${MAX_FILE_SIZE / 1024 / 1024} MB` });
        }
        if (err.code === 'UNSUPPORTED_FILE_TYPE' || err instanceof multer.MulterError) {
            return res.status(400).json({ message: err.message });
        }
        return next(err);
    });
};

export { handleUpload, UPLOAD_DIR, MAX_FILE_SIZE };