import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { queryOne, run } from '../db';
import { authenticateToken } from '../middleware/auth';

export const uploadRouter = Router();

const uploadsDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Allowed extensions and corresponding strict MIME types
const ALLOWED_EXT_MIME: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.png': ['image/png'],
  '.jpg': ['image/jpeg', 'image/pjpeg'],
  '.jpeg': ['image/jpeg', 'image/pjpeg'],
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate completely random server-side filename; never use original filename in path
    const ext = path.extname(file.originalname || '').toLowerCase();
    const randomHex = crypto.randomBytes(16).toString('hex');
    const safeFilename = `doc_${Date.now()}_${randomHex}${ext}`;
    cb(null, safeFilename);
  },
});

const fileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  const allowedMimes = ALLOWED_EXT_MIME[ext];
  if (!allowedMimes || !allowedMimes.includes(mime)) {
    return cb(new Error('INVALID_FILE_TYPE'));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

// POST /api/upload
uploadRouter.post('/', authenticateToken, (req: Request, res: Response) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.message === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
          error: 'Invalid file type. Only .pdf, .png, .jpg, and .jpeg files are permitted.',
        });
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File size exceeds maximum allowed limit (15MB).',
        });
      }
      return res.status(400).json({
        error: err.message || 'File upload validation failed.',
      });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const file = req.file;
      const user = req.user!;
      const rawQueryId = req.body.queryId;
      const queryId =
        rawQueryId && rawQueryId !== 'null' && rawQueryId !== 'undefined'
          ? String(rawQueryId).trim()
          : null;

      let targetStudentId = user.studentId || (user.role === 'student' ? user.id : null);

      // Ownership check: When queryId is provided, enforce that only the student who owns
      // that docket, its assigned mentor, or an admin may attach documents to it.
      if (queryId) {
        const docket = queryOne<any>('SELECT * FROM queries WHERE id = ?', [queryId]);
        if (!docket) {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
          return res.status(404).json({ error: 'Query docket not found' });
        }

        const isOwnerStudent =
          user.role === 'student' &&
          Boolean(user.studentId || user.id) &&
          (docket.student_id === user.studentId || docket.student_id === user.id);

        const isAssignedMentor =
          (user.role === 'mentor' || user.role === 'faculty') &&
          (docket.assigned_mentor_id === user.id ||
            Boolean(
              queryOne(
                'SELECT id FROM mentor_assignments WHERE mentor_id = ? AND student_id = ?',
                [user.id, docket.student_id]
              )
            ));

        const isAdmin = user.role === 'admin';

        if (!isOwnerStudent && !isAssignedMentor && !isAdmin) {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
          return res.status(403).json({
            error: 'Forbidden: You do not have permission to attach documents to this query docket',
          });
        }

        targetStudentId = docket.student_id;
      }

      const docId = `doc_${Date.now()}`;

      run(
        `INSERT INTO documents (id, query_id, student_id, filename, original_name, mimetype, size, filepath)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [docId, queryId, targetStudentId, file.filename, file.originalname, file.mimetype, file.size, file.path]
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
      console.error('File upload error:', error?.message);
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {
          // Ignore cleanup error
        }
      }
      return res.status(500).json({ error: 'File upload failed. Please try again.' });
    }
  });
});
