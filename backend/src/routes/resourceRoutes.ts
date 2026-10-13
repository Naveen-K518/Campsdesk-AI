import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { query, queryOne, run } from '../db';
import { authenticateToken, requireRole } from '../middleware/auth';
import { extractRulesFromPdf } from '../services/geminiService';

export const adminResourceRouter = Router();
export const resourceRouter = Router();

const uploadsDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Strict whitelist: PDF, DOCX, XLSX, PNG, JPG, JPEG (Max 10 MB)
const ALLOWED_EXT_MIME: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.docx': [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/octet-stream',
    'application/zip',
    'application/x-zip-compressed',
  ],
  '.xlsx': [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/octet-stream',
    'application/zip',
    'application/x-zip-compressed',
  ],
  '.png': ['image/png'],
  '.jpg': ['image/jpeg', 'image/pjpeg'],
  '.jpeg': ['image/jpeg', 'image/pjpeg'],
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate randomized server-side filename; never use original filename in path
    const ext = path.extname(file.originalname || '').toLowerCase();
    const randomHex = crypto.randomBytes(16).toString('hex');
    const safeFilename = `res_${Date.now()}_${randomHex}${ext}`;
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const ALLOWED_CATEGORIES = ['rules', 'timetable', 'calendar', 'circular', 'form', 'other'];
const ALLOWED_STATUSES = ['draft', 'published', 'archived'];

// Helper to handle multer upload errors cleanly
function handleUpload(req: Request, res: Response, next: () => void) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.message === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
          error: 'Invalid file type. Only .pdf, .docx, .xlsx, .png, .jpg, and .jpeg files are permitted.',
        });
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File size exceeds maximum allowed limit (10MB).',
        });
      }
      return res.status(400).json({
        error: err.message || 'File upload validation failed.',
      });
    }
    next();
  });
}

// ============================================================================
// ADMIN ROUTES: /api/admin/resources
// ============================================================================

// 1. POST /api/admin/resources - Create resource with optional file upload and timetable entries
adminResourceRouter.post(
  '/',
  authenticateToken,
  requireRole(['admin']),
  handleUpload,
  async (req: Request, res: Response) => {
    try {
      const {
        title,
        category,
        department,
        academic_year,
        description,
        effective_date,
        status = 'draft',
      } = req.body;

      if (!title || !title.trim()) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Title is required' });
      }

      if (!category || !ALLOWED_CATEGORIES.includes(category.trim())) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({
          error: `Invalid category. Allowed categories are: ${ALLOWED_CATEGORIES.join(', ')}`,
        });
      }

      if (status && !ALLOWED_STATUSES.includes(status.trim())) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({
          error: `Invalid status. Allowed statuses are: ${ALLOWED_STATUSES.join(', ')}`,
        });
      }

      const fileUrl = req.file ? `/uploads/${req.file.filename}` : req.body.file_url || null;
      const resourceId = `res_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const user = req.user!;

      run(
        `INSERT INTO resources (id, title, category, department, academic_year, description, file_url, status, version, effective_date, uploaded_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, datetime('now'), datetime('now'))`,
        [
          resourceId,
          title.trim(),
          category.trim(),
          department ? department.trim() : null,
          academic_year ? academic_year.trim() : null,
          description ? description.trim() : null,
          fileUrl,
          status.trim(),
          effective_date ? effective_date.trim() : null,
          user.id,
        ]
      );

      // Record initial version in resource_versions
      if (fileUrl) {
        run(
          `INSERT INTO resource_versions (id, resource_id, version, file_url, uploaded_by, change_summary, created_at)
           VALUES (?, ?, 1, ?, ?, ?, datetime('now'))`,
          [`rv_${resourceId}_1`, resourceId, fileUrl, user.id, 'Initial upload']
        );
      }

      // Handle timetable_entries if passed (for timetable resources)
      let timetableEntries: any[] = [];
      if (req.body.timetableEntries) {
        try {
          const rawEntries =
            typeof req.body.timetableEntries === 'string'
              ? JSON.parse(req.body.timetableEntries)
              : req.body.timetableEntries;

          if (Array.isArray(rawEntries)) {
            rawEntries.forEach((entry: any, idx: number) => {
              const entryId = `te_${resourceId}_${idx + 1}`;
              run(
                `INSERT INTO timetable_entries (id, resource_id, day, period, subject, faculty, room, department, year, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
                [
                  entryId,
                  resourceId,
                  entry.day || 'Monday',
                  Number(entry.period) || 1,
                  entry.subject || '',
                  entry.faculty || null,
                  entry.room || null,
                  entry.department || department || null,
                  entry.year || academic_year || null,
                ]
              );
              timetableEntries.push({ id: entryId, ...entry });
            });
          }
        } catch (parseErr) {
          console.warn('[ResourceRouter] Error parsing timetableEntries:', parseErr);
        }
      }

      const created = queryOne<any>('SELECT * FROM resources WHERE id = ?', [resourceId]);
      return res.status(201).json({
        ...created,
        timetableEntries,
      });
    } catch (error: any) {
      console.error('Error creating resource:', error?.message);
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {
          // ignore
        }
      }
      return res.status(500).json({ error: 'Failed to create resource.' });
    }
  }
);

// 2. GET /api/admin/resources - List all resources (including drafts and archived)
adminResourceRouter.get('/', authenticateToken, requireRole(['admin']), (req: Request, res: Response) => {
  try {
    const { category, status, department, academic_year } = req.query;
    let sql = 'SELECT * FROM resources WHERE 1=1';
    const params: any[] = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(String(category).trim());
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(String(status).trim());
    }
    if (department) {
      sql += ' AND lower(department) = lower(?)';
      params.push(String(department).trim());
    }
    if (academic_year) {
      sql += ' AND academic_year = ?';
      params.push(String(academic_year).trim());
    }

    sql += ' ORDER BY created_at DESC';
    const resources = query<any>(sql, params);

    const formatted = resources.map((r) => {
      const versionsCount =
        queryOne<{ count: number }>(
          'SELECT COUNT(*) as count FROM resource_versions WHERE resource_id = ?',
          [r.id]
        )?.count || 0;
      const timetableCount =
        queryOne<{ count: number }>(
          'SELECT COUNT(*) as count FROM timetable_entries WHERE resource_id = ?',
          [r.id]
        )?.count || 0;

      return {
        ...r,
        versionsCount,
        timetableCount,
      };
    });

    return res.json(formatted);
  } catch (error: any) {
    console.error('Error fetching admin resources:', error?.message);
    return res.status(500).json({ error: 'Failed to fetch resources.' });
  }
});

// 3. GET /api/admin/resources/:id - Get resource details, versions, and timetable
adminResourceRouter.get('/:id', authenticateToken, requireRole(['admin']), (req: Request, res: Response) => {
  try {
    const resource = queryOne<any>('SELECT * FROM resources WHERE id = ?', [req.params.id]);
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    const versions = query<any>(
      'SELECT * FROM resource_versions WHERE resource_id = ? ORDER BY version DESC',
      [resource.id]
    );
    const timetableEntries = query<any>(
      'SELECT * FROM timetable_entries WHERE resource_id = ? ORDER BY day ASC, period ASC',
      [resource.id]
    );

    return res.json({
      ...resource,
      versions,
      timetableEntries,
    });
  } catch (error: any) {
    console.error('Error fetching resource details:', error?.message);
    return res.status(500).json({ error: 'Failed to fetch resource details.' });
  }
});

// 4. PUT /api/admin/resources/:id - Update metadata and/or timetable entries
adminResourceRouter.put('/:id', authenticateToken, requireRole(['admin']), (req: Request, res: Response) => {
  try {
    const existing = queryOne<any>('SELECT * FROM resources WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    const {
      title = existing.title,
      category = existing.category,
      department = existing.department,
      academic_year = existing.academic_year,
      description = existing.description,
      effective_date = existing.effective_date,
      status = existing.status,
      timetableEntries,
    } = req.body;

    if (category && !ALLOWED_CATEGORIES.includes(category.trim())) {
      return res.status(400).json({
        error: `Invalid category. Allowed categories are: ${ALLOWED_CATEGORIES.join(', ')}`,
      });
    }

    if (status && !ALLOWED_STATUSES.includes(status.trim())) {
      return res.status(400).json({
        error: `Invalid status. Allowed statuses are: ${ALLOWED_STATUSES.join(', ')}`,
      });
    }

    run(
      `UPDATE resources 
       SET title = ?, category = ?, department = ?, academic_year = ?, description = ?, effective_date = ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        title.trim(),
        category.trim(),
        department ? department.trim() : null,
        academic_year ? academic_year.trim() : null,
        description ? description.trim() : null,
        effective_date ? effective_date.trim() : null,
        status.trim(),
        existing.id,
      ]
    );

    // If timetableEntries passed, replace them
    if (Array.isArray(timetableEntries)) {
      run('DELETE FROM timetable_entries WHERE resource_id = ?', [existing.id]);
      timetableEntries.forEach((entry: any, idx: number) => {
        const entryId = `te_${existing.id}_${idx + 1}`;
        run(
          `INSERT INTO timetable_entries (id, resource_id, day, period, subject, faculty, room, department, year, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [
            entryId,
            existing.id,
            entry.day || 'Monday',
            Number(entry.period) || 1,
            entry.subject || '',
            entry.faculty || null,
            entry.room || null,
            entry.department || department || null,
            entry.year || academic_year || null,
          ]
        );
      });
    }

    const updated = queryOne<any>('SELECT * FROM resources WHERE id = ?', [existing.id]);
    const updatedTimetable = query<any>('SELECT * FROM timetable_entries WHERE resource_id = ?', [existing.id]);

    return res.json({
      ...updated,
      timetableEntries: updatedTimetable,
    });
  } catch (error: any) {
    console.error('Error updating resource:', error?.message);
    return res.status(500).json({ error: 'Failed to update resource.' });
  }
});

// 5. POST /api/admin/resources/:id/replace-file - Replace file, increment version, log in resource_versions
adminResourceRouter.post(
  '/:id/replace-file',
  authenticateToken,
  requireRole(['admin']),
  handleUpload,
  async (req: Request, res: Response) => {
    try {
      const existing = queryOne<any>('SELECT * FROM resources WHERE id = ?', [req.params.id]);
      if (!existing) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Resource not found' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded for replacement' });
      }

      const newVersion = (existing.version || 1) + 1;
      const newFileUrl = `/uploads/${req.file.filename}`;
      const changeSummary = req.body.changeSummary?.trim() || `Replaced file with v${newVersion}`;
      const user = req.user!;

      // Update main resource record
      run(
        `UPDATE resources 
         SET file_url = ?, version = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [newFileUrl, newVersion, existing.id]
      );

      // Add to resource_versions
      const versionId = `rv_${existing.id}_${newVersion}`;
      run(
        `INSERT INTO resource_versions (id, resource_id, version, file_url, uploaded_by, change_summary, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [versionId, existing.id, newVersion, newFileUrl, user.id, changeSummary]
      );

      const updated = queryOne<any>('SELECT * FROM resources WHERE id = ?', [existing.id]);
      const versions = query<any>(
        'SELECT * FROM resource_versions WHERE resource_id = ? ORDER BY version DESC',
        [existing.id]
      );

      return res.json({
        ...updated,
        versions,
      });
    } catch (error: any) {
      console.error('Error replacing resource file:', error?.message);
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {
          // ignore
        }
      }
      return res.status(500).json({ error: 'Failed to replace resource file.' });
    }
  }
);

// 6. PATCH /api/admin/resources/:id/status - Update status (draft, published, archived)
adminResourceRouter.patch(
  '/:id/status',
  authenticateToken,
  requireRole(['admin']),
  (req: Request, res: Response) => {
    try {
      const existing = queryOne<any>('SELECT * FROM resources WHERE id = ?', [req.params.id]);
      if (!existing) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      const { status } = req.body;
      if (!status || !ALLOWED_STATUSES.includes(status.trim())) {
        return res.status(400).json({
          error: `Invalid status. Allowed statuses are: ${ALLOWED_STATUSES.join(', ')}`,
        });
      }

      run(
        `UPDATE resources SET status = ?, updated_at = datetime('now') WHERE id = ?`,
        [status.trim(), existing.id]
      );

      const updated = queryOne<any>('SELECT * FROM resources WHERE id = ?', [existing.id]);
      return res.json({
        ...updated,
        message: `Resource status updated to ${status.trim()}`,
      });
    } catch (error: any) {
      console.error('Error updating resource status:', error?.message);
      return res.status(500).json({ error: 'Failed to update resource status.' });
    }
  }
);

// 7. DELETE /api/admin/resources/:id - Delete resource and associated entries
adminResourceRouter.delete(
  '/:id',
  authenticateToken,
  requireRole(['admin']),
  (req: Request, res: Response) => {
    try {
      const existing = queryOne<any>('SELECT * FROM resources WHERE id = ?', [req.params.id]);
      if (!existing) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      // Delete cascade
      run('DELETE FROM timetable_entries WHERE resource_id = ?', [existing.id]);
      run('DELETE FROM resource_versions WHERE resource_id = ?', [existing.id]);
      run('DELETE FROM resources WHERE id = ?', [existing.id]);

      return res.json({ message: 'Resource deleted successfully', id: existing.id });
    } catch (error: any) {
      console.error('Error deleting resource:', error?.message);
      return res.status(500).json({ error: 'Failed to delete resource.' });
    }
  }
);

// 8. POST /api/admin/resources/extract-text (and /api/admin/resources/:id/extract-text)
// Extracts text and suggested bylaw sections from PDF using Gemini
adminResourceRouter.post(
  '/extract-text',
  authenticateToken,
  requireRole(['admin']),
  handleUpload,
  async (req: Request, res: Response) => {
    try {
      let pdfBuffer: Buffer | null = null;
      let filename = 'document.pdf';

      if (req.file) {
        if (!req.file.originalname.toLowerCase().endsWith('.pdf') && req.file.mimetype !== 'application/pdf') {
          if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
          return res.status(400).json({ error: 'Only PDF files are supported for text extraction.' });
        }
        pdfBuffer = fs.readFileSync(req.file.path);
        filename = req.file.originalname;
      } else if (req.body.resourceId) {
        const resObj = queryOne<any>('SELECT * FROM resources WHERE id = ?', [req.body.resourceId]);
        if (!resObj || !resObj.file_url) {
          return res.status(404).json({ error: 'Resource with PDF file not found' });
        }
        const relPath = resObj.file_url.replace(/^\/uploads\//, '');
        const absPath = path.resolve(uploadsDir, relPath);
        if (!fs.existsSync(absPath)) {
          return res.status(404).json({ error: 'Physical PDF file not found on disk' });
        }
        pdfBuffer = fs.readFileSync(absPath);
        filename = path.basename(absPath);
      } else if (req.body.fileUrl) {
        const relPath = req.body.fileUrl.replace(/^\/uploads\//, '');
        const absPath = path.resolve(uploadsDir, relPath);
        if (!fs.existsSync(absPath)) {
          return res.status(404).json({ error: 'Physical PDF file not found on disk' });
        }
        pdfBuffer = fs.readFileSync(absPath);
        filename = path.basename(absPath);
      }

      if (!pdfBuffer) {
        return res.status(400).json({
          error: 'Please provide a PDF file upload, resourceId, or fileUrl for text extraction.',
        });
      }

      const extractionResult = await extractRulesFromPdf(pdfBuffer, filename);
      return res.json({
        filename,
        extractedText: extractionResult.text,
        suggestedSections: extractionResult.suggestedSections,
      });
    } catch (error: any) {
      console.error('Error during PDF rule extraction:', error?.message);
      return res.status(500).json({ error: 'Failed to extract text from PDF.' });
    }
  }
);

adminResourceRouter.post(
  '/:id/extract-text',
  authenticateToken,
  requireRole(['admin']),
  async (req: Request, res: Response) => {
    try {
      const resObj = queryOne<any>('SELECT * FROM resources WHERE id = ?', [req.params.id]);
      if (!resObj || !resObj.file_url) {
        return res.status(404).json({ error: 'Resource with PDF file not found' });
      }

      const relPath = resObj.file_url.replace(/^\/uploads\//, '');
      const absPath = path.resolve(uploadsDir, relPath);
      if (!fs.existsSync(absPath)) {
        return res.status(404).json({ error: 'Physical PDF file not found on disk' });
      }

      const pdfBuffer = fs.readFileSync(absPath);
      const extractionResult = await extractRulesFromPdf(pdfBuffer, path.basename(absPath));
      return res.json({
        resourceId: resObj.id,
        extractedText: extractionResult.text,
        suggestedSections: extractionResult.suggestedSections,
      });
    } catch (error: any) {
      console.error('Error extracting text from resource PDF:', error?.message);
      return res.status(500).json({ error: 'Failed to extract text from resource PDF.' });
    }
  }
);

// ============================================================================
// STUDENT & MENTOR ROUTES: GET /api/resources
// Students & mentors see only published items, filtered by their department and year
// ============================================================================

resourceRouter.get('/', authenticateToken, (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { category, department, academic_year } = req.query;

    let filterDept: string | null = null;
    let filterYear: string | null = null;

    if (user.role === 'student') {
      // Find student record to get department and year
      let studentRecord: any = null;
      if (user.studentId) {
        studentRecord = queryOne('SELECT department, year FROM students WHERE id = ?', [user.studentId]);
      }
      if (!studentRecord) {
        studentRecord = queryOne('SELECT department, year FROM students WHERE lower(email) = ?', [
          user.email.toLowerCase(),
        ]);
      }

      if (studentRecord) {
        filterDept = studentRecord.department || null;
        filterYear = studentRecord.year || null;
      }
    }

    // Explicit query parameters can override or specify filters for mentors/admins
    if (department && typeof department === 'string') {
      filterDept = department.trim();
    }
    if (academic_year && typeof academic_year === 'string') {
      filterYear = academic_year.trim();
    }

    let sql = "SELECT * FROM resources WHERE status = 'published'";
    const params: any[] = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(String(category).trim());
    }

    // Department filtering for students
    if (filterDept) {
      sql += ` AND (
        department IS NULL 
        OR department = '' 
        OR lower(department) = 'all' 
        OR lower(department) = lower(?)
        OR lower(?) LIKE '%' || lower(department) || '%'
        OR lower(department) LIKE '%' || lower(?) || '%'
      )`;
      params.push(filterDept, filterDept, filterDept);
    }

    // Academic year filtering for students
    if (filterYear) {
      const yearDigit = filterYear.match(/\d+/)?.[0] || filterYear;
      sql += ` AND (
        academic_year IS NULL 
        OR academic_year = '' 
        OR lower(academic_year) = 'all' 
        OR academic_year LIKE '20%' 
        OR academic_year = ? 
        OR academic_year LIKE ? 
        OR academic_year = ?
        OR academic_year LIKE ?
      )`;
      params.push(filterYear, `%${filterYear}%`, yearDigit, `%${yearDigit}%`);
    }

    sql += ' ORDER BY created_at DESC';
    const rows = query<any>(sql, params);

    // Attach timetable entries for timetable items
    const enriched = rows.map((r) => {
      let timetableEntries: any[] = [];
      if (r.category === 'timetable') {
        timetableEntries = query<any>(
          'SELECT * FROM timetable_entries WHERE resource_id = ? ORDER BY day ASC, period ASC',
          [r.id]
        );
      }
      return {
        ...r,
        timetableEntries: timetableEntries.length > 0 ? timetableEntries : undefined,
      };
    });

    return res.json(enriched);
  } catch (error: any) {
    console.error('Error fetching published resources:', error?.message);
    return res.status(500).json({ error: 'Failed to fetch resources.' });
  }
});
