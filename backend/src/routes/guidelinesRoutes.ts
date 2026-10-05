import { Router, Request, Response } from 'express';
import { query } from '../db';
import path from 'path';
import fs from 'fs';

export const guidelinesRouter = Router();

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
        verificationCriteria: typeof g.verification_criteria === 'string'
          ? JSON.parse(g.verification_criteria)
          : (g.verification_criteria || []),
        lastUpdated: g.last_updated,
        mostConsulted: Boolean(g.most_consulted),
      }));
      return res.json(formatted);
    }

    // Fallback to seeds if database table is empty
    const seedPath = path.resolve(__dirname, '../../../db/seeds/guidelines.json');
    if (fs.existsSync(seedPath)) {
      const raw = fs.readFileSync(seedPath, 'utf-8');
      return res.json(JSON.parse(raw));
    }
    return res.json([]);
  } catch (error: any) {
    console.error('Error reading guidelines:', error);
    return res.status(500).json({ error: 'Failed to retrieve guidelines' });
  }
});
