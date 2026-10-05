import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { run } from '../db';
import { authenticateToken } from '../middleware/auth';

export const uploadRouter = Router();

const uploadsDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

// POST /api/upload
uploadRouter.post('/', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const docId = `doc_${Date.now()}`;
    const queryId = (req.body.queryId as string) || null;
    const studentId = (req.body.studentId as string) || null;

    run(
      `INSERT INTO documents (id, query_id, student_id, filename, original_name, mimetype, size, filepath)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [docId, queryId, studentId, file.filename, file.originalname, file.mimetype, file.size, file.path]
    );

    const fileUrl = `/uploads/${file.filename}`;

    return res.status(201).json({
      id: docId,
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      bytes: file.size,
      url: fileUrl,
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    return res.status(500).json({ error: error.message || 'File upload failed' });
  }
});
