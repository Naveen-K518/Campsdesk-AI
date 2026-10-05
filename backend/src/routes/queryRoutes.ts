import { Router, Request, Response } from 'express';
import { query, queryOne, run } from '../db';
import { authenticateToken } from '../middleware/auth';

export const queryRouter = Router();

// Helper to format query row to full frontend object
function formatQueryWithRelations(rawQuery: any): any {
  const steps = query<any>(
    'SELECT * FROM workflow_steps WHERE query_id = ? ORDER BY step_order ASC',
    [rawQuery.id]
  ).map((s) => ({
    id: s.id,
    queryId: s.query_id,
    order: s.step_order,
    label: s.label,
    detail: s.detail,
    status: s.status,
    highlightKey: s.highlight_key,
    highlightValue: s.highlight_value,
  }));

  const audits = query<any>(
    'SELECT * FROM audit_entries WHERE query_id = ? ORDER BY created_at ASC',
    [rawQuery.id]
  ).map((a) => ({
    id: a.id,
    sender: a.sender,
    authorName: a.author_name,
    roleBadge: a.role_badge,
    timestamp: a.timestamp,
    text: a.text,
    actionTaken: a.action_taken,
    statusBanner: a.status_banner,
    tokenRef: a.token_ref,
    attachedDoc: a.attached_doc_name
      ? {
          name: a.attached_doc_name,
          size: a.attached_doc_size,
          caption: a.attached_doc_caption,
          url: a.attached_doc_url,
        }
      : undefined,
  }));

  return {
    id: rawQuery.id,
    code: rawQuery.code,
    studentId: rawQuery.student_id,
    category: rawQuery.category,
    subject: rawQuery.subject,
    title: rawQuery.title,
    description: rawQuery.description,
    subLine: rawQuery.sub_line,
    priority: rawQuery.priority || 'normal',
    status: rawQuery.status || 'active',
    citation: rawQuery.citation,
    assignedTo: rawQuery.assigned_to,
    aiConfidence: rawQuery.ai_confidence,
    resolutionTimeMins: rawQuery.resolution_time_mins,
    daysCondonation: rawQuery.days_condonation,
    rating: rawQuery.rating,
    createdAt: rawQuery.created_at,
    updatedAt: rawQuery.updated_at,
    workflowSteps: steps,
    auditTranscript: audits,
  };
}

// 1. GET /api/queries - List student's queries or all for faculty
queryRouter.get('/', authenticateToken, (req: Request, res: Response) => {
  try {
    const user = req.user!;
    let rawQueries: any[] = [];

    if (user.role === 'faculty' || user.role === 'admin') {
      rawQueries = query('SELECT * FROM queries ORDER BY datetime(updated_at) DESC');
    } else {
      const studentId = user.studentId;
      if (!studentId) {
        return res.json([]);
      }
      rawQueries = query('SELECT * FROM queries WHERE student_id = ? ORDER BY datetime(updated_at) DESC', [
        studentId,
      ]);
    }

    const fullQueries = rawQueries.map(formatQueryWithRelations);
    return res.json(fullQueries);
  } catch (error: any) {
    console.error('Error fetching queries:', error);
    return res.status(500).json({ error: 'Failed to retrieve queries' });
  }
});

// 2. POST /api/queries - Create a new query docket
queryRouter.post('/', authenticateToken, (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const studentId = user.studentId;

    if (!studentId && user.role === 'student') {
      return res.status(400).json({ error: 'No student profile associated with this account' });
    }

    const {
      category,
      subject,
      title,
      description,
      subLine,
      priority = 'normal',
      status = 'under_review',
      citation,
      assignedTo = 'Dr. K. Radhakrishnan (HOD CSE)',
      aiConfidence = 98.5,
      daysCondonation,
      workflowSteps = [],
      auditTranscript = [],
    } = req.body;

    if (!category || !title || !description) {
      return res.status(400).json({ error: 'Category, title, and description are required' });
    }

    const totalCount = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM queries')?.count || 0;
    const nextCode = `#CS-${4922 + totalCount + 1}`;
    const queryId = `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    run(
      `INSERT INTO queries (id, code, student_id, category, subject, title, description, sub_line, priority, status, citation, assigned_to, ai_confidence, days_condonation, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        queryId,
        nextCode,
        studentId || user.id,
        category,
        subject || category,
        title,
        description,
        subLine || `Case ${nextCode}`,
        priority,
        status,
        citation || 'University Senate Ordinance',
        assignedTo,
        aiConfidence,
        daysCondonation || null,
      ]
    );

    // Insert workflow steps
    if (Array.isArray(workflowSteps) && workflowSteps.length > 0) {
      workflowSteps.forEach((s: any, idx: number) => {
        run(
          `INSERT INTO workflow_steps (id, query_id, step_order, label, detail, status, highlight_key, highlight_value)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `ws_${queryId}_${idx + 1}`,
            queryId,
            s.order || idx + 1,
            s.label || `Step ${idx + 1}`,
            s.detail || '',
            s.status || 'done',
            s.highlightKey || null,
            s.highlightValue || null,
          ]
        );
      });
    } else {
      // Default workflow steps
      const defaultSteps = [
        { order: 1, label: 'Docket Submitted', detail: 'Student filed query docket via CampusDesk AI.', status: 'done' },
        { order: 2, label: 'Autonomous Policy Evaluation', detail: 'Validated against relevant campus ordinances.', status: 'done' },
        { order: 3, label: 'Forwarded to Queue', detail: `Assigned to ${assignedTo} for review.`, status: 'in_progress' },
      ];
      defaultSteps.forEach((s) => {
        run(
          `INSERT INTO workflow_steps (id, query_id, step_order, label, detail, status)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [`ws_${queryId}_${s.order}`, queryId, s.order, s.label, s.detail, s.status]
        );
      });
    }

    // Insert audit entries
    if (Array.isArray(auditTranscript) && auditTranscript.length > 0) {
      auditTranscript.forEach((a: any, idx: number) => {
        run(
          `INSERT INTO audit_entries (id, query_id, sender, author_name, role_badge, timestamp, text, action_taken, status_banner, token_ref, attached_doc_name, attached_doc_size, attached_doc_caption, attached_doc_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `at_${queryId}_${idx + 1}`,
            queryId,
            a.sender || 'student',
            a.authorName || user.name,
            a.roleBadge || (user.role === 'faculty' ? 'Faculty' : 'Student'),
            a.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            a.text || null,
            a.actionTaken || null,
            a.statusBanner || null,
            a.tokenRef || null,
            a.attachedDoc?.name || null,
            a.attachedDoc?.size || null,
            a.attachedDoc?.caption || null,
            a.attachedDoc?.url || null,
          ]
        );
      });
    } else {
      // Default initial audit
      run(
        `INSERT INTO audit_entries (id, query_id, sender, author_name, role_badge, timestamp, text)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          `at_${queryId}_1`,
          queryId,
          'student',
          user.name,
          'Student',
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          description,
        ]
      );
    }

    const created = queryOne('SELECT * FROM queries WHERE id = ?', [queryId]);
    return res.status(201).json(formatQueryWithRelations(created));
  } catch (error: any) {
    console.error('Error creating query:', error);
    return res.status(500).json({ error: error.message || 'Failed to create query docket' });
  }
});

// 3. GET /api/queries/:id - Retrieve single docket details
queryRouter.get('/:id', authenticateToken, (req: Request, res: Response) => {
  try {
    const raw = queryOne('SELECT * FROM queries WHERE id = ?', [req.params.id]);
    if (!raw) {
      return res.status(404).json({ error: 'Query not found' });
    }

    // Role check: students can only view their own
    if (req.user!.role === 'student' && req.user!.studentId && raw.student_id !== req.user!.studentId) {
      return res.status(403).json({ error: 'Access forbidden' });
    }

    return res.json(formatQueryWithRelations(raw));
  } catch (error: any) {
    console.error('Error fetching query detail:', error);
    return res.status(500).json({ error: 'Failed to retrieve query details' });
  }
});

// 4. PATCH /api/queries/:id/status - Update docket status
queryRouter.patch('/:id/status', authenticateToken, (req: Request, res: Response) => {
  try {
    const { status, facultyRemark } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const raw = queryOne('SELECT * FROM queries WHERE id = ?', [req.params.id]);
    if (!raw) {
      return res.status(404).json({ error: 'Query not found' });
    }

    run(
      `UPDATE queries SET status = ?, updated_at = datetime('now') WHERE id = ?`,
      [status, req.params.id]
    );

    // If faculty or comment provided, append to audit
    if (facultyRemark || req.user!.role === 'faculty') {
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      run(
        `INSERT INTO audit_entries (id, query_id, sender, author_name, role_badge, timestamp, text, status_banner)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `at_${Date.now()}`,
          req.params.id,
          req.user!.role,
          req.user!.name,
          req.user!.role === 'faculty' ? 'Faculty Reviewer' : 'Student',
          nowTime,
          facultyRemark || `Docket status updated to: ${status.toUpperCase().replace('_', ' ')}`,
          status === 'resolved' ? 'DOCKET RESOLVED & APPROVED' : null,
        ]
      );
    }

    const updated = queryOne('SELECT * FROM queries WHERE id = ?', [req.params.id]);
    return res.json(formatQueryWithRelations(updated));
  } catch (error: any) {
    console.error('Error updating status:', error);
    return res.status(500).json({ error: 'Failed to update query status' });
  }
});

// 5. POST /api/queries/:id/audit - Append a response/message to audit transcript
queryRouter.post('/:id/audit', authenticateToken, (req: Request, res: Response) => {
  try {
    const { text, actionTaken, statusBanner, tokenRef, attachedDoc } = req.body;

    if (!text && !actionTaken && !statusBanner) {
      return res.status(400).json({ error: 'Message text or action is required' });
    }

    const raw = queryOne('SELECT * FROM queries WHERE id = ?', [req.params.id]);
    if (!raw) {
      return res.status(404).json({ error: 'Query not found' });
    }

    const entryId = `at_${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const sender = req.user!.role === 'faculty' ? 'faculty' : 'student';
    const roleBadge = req.user!.role === 'faculty' ? 'Faculty HOD' : 'Student';

    run(
      `INSERT INTO audit_entries (id, query_id, sender, author_name, role_badge, timestamp, text, action_taken, status_banner, token_ref, attached_doc_name, attached_doc_size, attached_doc_caption, attached_doc_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entryId,
        req.params.id,
        sender,
        req.user!.name,
        roleBadge,
        timestamp,
        text || null,
        actionTaken || null,
        statusBanner || null,
        tokenRef || null,
        attachedDoc?.name || null,
        attachedDoc?.size || null,
        attachedDoc?.caption || null,
        attachedDoc?.url || null,
      ]
    );

    run(`UPDATE queries SET updated_at = datetime('now') WHERE id = ?`, [req.params.id]);

    const updated = queryOne('SELECT * FROM queries WHERE id = ?', [req.params.id]);
    return res.status(201).json(formatQueryWithRelations(updated));
  } catch (error: any) {
    console.error('Error adding audit entry:', error);
    return res.status(500).json({ error: 'Failed to add audit transcript message' });
  }
});
