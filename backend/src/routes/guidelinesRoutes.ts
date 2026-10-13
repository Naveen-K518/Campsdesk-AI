import { Router, Request, Response } from 'express';
import { query, queryOne, run } from '../db';
import { authenticateToken, requireRole } from '../middleware/auth';
import path from 'path';
import fs from 'fs';

export const guidelinesRouter = Router();
export const adminGuidelinesRouter = Router();

// ============================================================================
// PUBLIC/AUTHENTICATED: GET /api/guidelines
// ============================================================================
guidelinesRouter.get('/', (req: Request, res: Response) => {
  try {
    const rows = query<any>('SELECT * FROM guidelines ORDER BY most_consulted DESC, section ASC');
    if (rows && rows.length > 0) {
      const formatted = rows.map((g) => ({
        id: g.id,
        section: g.section,
        category: g.category,
        title: g.title,
        body: g.body,
        verificationCriteria:
          typeof g.verification_criteria === 'string'
            ? JSON.parse(g.verification_criteria)
            : g.verification_criteria || [],
        lastUpdated: g.last_updated,
        mostConsulted: Boolean(g.most_consulted),
      }));
      return res.json(formatted);
    }

    // Fallback to seeds if database table is empty
    const seedPaths = [
      path.resolve(__dirname, '../../seeds/guidelines.json'),
      path.resolve(__dirname, '../../../db/seeds/guidelines.json'),
      path.resolve(process.cwd(), 'seeds/guidelines.json'),
      path.resolve(process.cwd(), '../db/seeds/guidelines.json'),
    ];
    const existingSeed = seedPaths.find((p) => fs.existsSync(p));
    if (existingSeed) {
      const raw = fs.readFileSync(existingSeed, 'utf-8');
      return res.json(JSON.parse(raw));
    }
    return res.json([]);
  } catch (error: any) {
    console.error('Error reading guidelines:', error);
    return res.status(500).json({ error: 'Failed to retrieve guidelines' });
  }
});

// ============================================================================
// ADMIN ROUTES: /api/admin/guidelines
// ============================================================================

// 1. POST /api/admin/guidelines - Create bylaw section
adminGuidelinesRouter.post(
  '/',
  authenticateToken,
  requireRole(['admin']),
  (req: Request, res: Response) => {
    try {
      const { section, category, title, body, verificationCriteria, mostConsulted, lastUpdated } = req.body;

      if (!section || !String(section).trim()) {
        return res.status(400).json({ error: 'Section number is required (e.g. 4.2)' });
      }
      if (!category || !String(category).trim()) {
        return res.status(400).json({ error: 'Category is required' });
      }
      if (!title || !String(title).trim()) {
        return res.status(400).json({ error: 'Title is required' });
      }
      if (!body || !String(body).trim()) {
        return res.status(400).json({ error: 'Bylaw body text is required' });
      }

      const id = `gl_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const criteriaJson = JSON.stringify(Array.isArray(verificationCriteria) ? verificationCriteria : []);
      const effectiveDate = lastUpdated || new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const isConsulted = Boolean(mostConsulted) ? 1 : 0;

      run(
        `INSERT INTO guidelines (id, section, category, title, body, verification_criteria, last_updated, most_consulted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, String(section).trim(), String(category).trim(), String(title).trim(), String(body).trim(), criteriaJson, effectiveDate, isConsulted]
      );

      const created = queryOne<any>('SELECT * FROM guidelines WHERE id = ?', [id]);
      return res.status(201).json({
        id: created.id,
        section: created.section,
        category: created.category,
        title: created.title,
        body: created.body,
        verificationCriteria: JSON.parse(created.verification_criteria || '[]'),
        lastUpdated: created.last_updated,
        mostConsulted: Boolean(created.most_consulted),
      });
    } catch (error: any) {
      console.error('Error creating guideline:', error?.message);
      return res.status(500).json({ error: 'Failed to create guideline section.' });
    }
  }
);

// 2. PUT /api/admin/guidelines/:id - Edit bylaw section
adminGuidelinesRouter.put(
  '/:id',
  authenticateToken,
  requireRole(['admin']),
  (req: Request, res: Response) => {
    try {
      const existing = queryOne<any>('SELECT * FROM guidelines WHERE id = ?', [req.params.id]);
      if (!existing) {
        return res.status(404).json({ error: 'Guideline section not found' });
      }

      const {
        section = existing.section,
        category = existing.category,
        title = existing.title,
        body = existing.body,
        verificationCriteria,
        mostConsulted,
        lastUpdated,
      } = req.body;

      const criteriaJson =
        verificationCriteria !== undefined
          ? JSON.stringify(Array.isArray(verificationCriteria) ? verificationCriteria : [])
          : existing.verification_criteria;

      const isConsulted =
        mostConsulted !== undefined
          ? (Boolean(mostConsulted) ? 1 : 0)
          : existing.most_consulted;

      const effectiveDate =
        lastUpdated !== undefined
          ? lastUpdated
          : new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      run(
        `UPDATE guidelines
         SET section = ?, category = ?, title = ?, body = ?, verification_criteria = ?, last_updated = ?, most_consulted = ?
         WHERE id = ?`,
        [
          String(section).trim(),
          String(category).trim(),
          String(title).trim(),
          String(body).trim(),
          criteriaJson,
          effectiveDate,
          isConsulted,
          existing.id,
        ]
      );

      const updated = queryOne<any>('SELECT * FROM guidelines WHERE id = ?', [existing.id]);
      return res.json({
        id: updated.id,
        section: updated.section,
        category: updated.category,
        title: updated.title,
        body: updated.body,
        verificationCriteria: JSON.parse(updated.verification_criteria || '[]'),
        lastUpdated: updated.last_updated,
        mostConsulted: Boolean(updated.most_consulted),
      });
    } catch (error: any) {
      console.error('Error updating guideline:', error?.message);
      return res.status(500).json({ error: 'Failed to update guideline section.' });
    }
  }
);

// 3. DELETE /api/admin/guidelines/:id - Delete bylaw section
adminGuidelinesRouter.delete(
  '/:id',
  authenticateToken,
  requireRole(['admin']),
  (req: Request, res: Response) => {
    try {
      const existing = queryOne<any>('SELECT * FROM guidelines WHERE id = ?', [req.params.id]);
      if (!existing) {
        return res.status(404).json({ error: 'Guideline section not found' });
      }

      run('DELETE FROM guidelines WHERE id = ?', [existing.id]);
      return res.json({ message: 'Guideline section deleted successfully', id: existing.id });
    } catch (error: any) {
      console.error('Error deleting guideline:', error?.message);
      return res.status(500).json({ error: 'Failed to delete guideline section.' });
    }
  }
);
