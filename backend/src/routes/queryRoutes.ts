import { Router, Request, Response } from 'express';
import { query, queryOne, run } from '../db';
import { authenticateToken, requireRole } from '../middleware/auth';
import { emitDocketCreated, emitDocketUpdated } from '../services/socketService';
import { determinePriority } from '../services/priorityEngine';

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

  const student = queryOne<any>(
    'SELECT name, roll_no, department FROM students WHERE id = ?',
    [rawQuery.student_id]
  );

  const mentor = rawQuery.assigned_mentor_id
    ? queryOne<any>('SELECT name, email FROM users WHERE id = ?', [rawQuery.assigned_mentor_id])
    : null;

  return {
    id: rawQuery.id,
    code: rawQuery.code,
    studentId: rawQuery.student_id,
    studentName: student ? student.name : null,
    studentRollNo: student ? student.roll_no : null,
    studentDepartment: student ? student.department : null,
    assignedMentorId: rawQuery.assigned_mentor_id || null,
    mentorName: mentor ? mentor.name : rawQuery.assigned_to,
    mentorEmail: mentor ? mentor.email : null,
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

// 1. GET /api/queries - List queries: Mentors see only their mentees, students see only own, admins see all
// Automatically sorted by priority: urgent (1) -> high (2) -> normal (3), with open/active queries first
queryRouter.get('/', authenticateToken, (req: Request, res: Response) => {
  try {
    const user = req.user!;
    let rawQueries: any[] = [];

    // Sorting Clause: Urgent first, then High, then Normal.
    // Within the same priority, active / under review dockets come before resolved.
    const priorityOrderClause = `
      ORDER BY 
        CASE priority
          WHEN 'urgent' THEN 1
          WHEN 'high'   THEN 2
          WHEN 'normal' THEN 3
          ELSE 4
        END ASC,
        CASE WHEN status IN ('under_review', 'active', 'unassigned') THEN 0 ELSE 1 END ASC,
        datetime(created_at) DESC
    `;

    if (user.role === 'admin') {
      rawQueries = query(`SELECT * FROM queries ${priorityOrderClause}`);
    } else if (user.role === 'mentor' || user.role === 'faculty') {
      // Mentors can only list queries from their assigned mentees, prioritized
      rawQueries = query(
        `SELECT * FROM queries 
         WHERE assigned_mentor_id = ? 
            OR student_id IN (SELECT student_id FROM mentor_assignments WHERE mentor_id = ?)
         ${priorityOrderClause}`,
        [user.id, user.id]
      );
    } else {
      const studentId = user.studentId;
      if (!studentId) {
        return res.json([]);
      }
      rawQueries = query(
        `SELECT * FROM queries WHERE student_id = ? ${priorityOrderClause}`,
        [studentId]
      );
    }

    const fullQueries = rawQueries.map(formatQueryWithRelations);
    return res.json(fullQueries);
  } catch (error: any) {
    console.error('Error fetching queries:', error);
    return res.status(500).json({ error: 'Failed to retrieve queries' });
  }
});

// 2. POST /api/queries - Create a new query docket with automatic mentor lookup and priority triage
queryRouter.post('/', authenticateToken, (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const studentId = user.studentId || (user.role === 'student' ? user.id : req.body.studentId);

    if (!studentId && user.role === 'student') {
      return res.status(400).json({ error: 'No student profile associated with this account' });
    }

    const effectiveStudentId = studentId || user.id;

    // Automatic Mentor Lookup from mentor_assignments
    const assignment = queryOne<any>(
      `SELECT ma.mentor_id, u.name as mentor_name, u.email as mentor_email 
       FROM mentor_assignments ma 
       JOIN users u ON ma.mentor_id = u.id 
       WHERE ma.student_id = ?`,
      [effectiveStudentId]
    );

    // Retrieve Student Academic Profile for Contextual Triage (attendance, cgpa)
    const studentRecord = queryOne<any>(
      'SELECT attendance_aggregate, cgpa, department FROM students WHERE id = ?',
      [effectiveStudentId]
    );

    const {
      category,
      subject,
      title,
      description,
      subLine,
      priority: requestedPriority = 'normal',
      status: requestedStatus,
      citation,
      aiConfidence = 98.5,
      daysCondonation,
      workflowSteps = [],
      auditTranscript = [],
    } = req.body;

    if (!category || !title || !description) {
      return res.status(400).json({ error: 'Category, title, and description are required' });
    }

    // Deterministic Rule-Based Priority Triage using Regex, Keywords & Student DB Context
    const triage = determinePriority(
      title,
      description,
      category,
      studentRecord
        ? {
            attendance: studentRecord.attendance_aggregate,
            cgpa: studentRecord.cgpa,
            department: studentRecord.department,
          }
        : undefined,
      requestedPriority
    );

    const effectivePriority = triage.priority;
    const priorityReason = triage.reason;

    let assignedMentorId: string | null = null;
    let assignedTo: string = 'Unassigned';
    let effectiveStatus: string = requestedStatus || 'under_review';

    if (assignment) {
      assignedMentorId = assignment.mentor_id;
      assignedTo = assignment.mentor_name;
    } else {
      // If the student has no mentor, mark the query "unassigned" so the admin can see and triage it
      assignedMentorId = null;
      assignedTo = 'Unassigned';
      effectiveStatus = 'unassigned';
    }

    const totalCount = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM queries')?.count || 0;
    const nextCode = `#CS-${4922 + totalCount + 1}`;
    const queryId = `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    run(
      `INSERT INTO queries (id, code, student_id, category, subject, title, description, sub_line, priority, status, citation, assigned_to, assigned_mentor_id, ai_confidence, days_condonation, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        queryId,
        nextCode,
        effectiveStudentId,
        category,
        subject || category,
        title,
        description,
        subLine || priorityReason || `Case ${nextCode}`,
        effectivePriority,
        effectiveStatus,
        citation || 'University Senate Ordinance',
        assignedTo,
        assignedMentorId,
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
      // Default workflow steps with priority triage record
      const defaultSteps = [
        { order: 1, label: 'Docket Submitted', detail: 'Student filed query docket via CampusDesk AI.', status: 'done' },
        {
          order: 2,
          label: 'Automated Priority Triage',
          detail: priorityReason,
          status: 'done',
          highlightKey: 'Assigned Priority',
          highlightValue: effectivePriority.toUpperCase(),
        },
        {
          order: 3,
          label: 'Forwarded to Mentor Queue',
          detail: assignedMentorId
            ? `Assigned to Faculty Mentor (${assignedTo}) with ${effectivePriority.toUpperCase()} priority tier.`
            : 'Unassigned docket awaiting mentor allocation by Admin.',
          status: 'in_progress',
        },
      ];
      defaultSteps.forEach((s) => {
        run(
          `INSERT INTO workflow_steps (id, query_id, step_order, label, detail, status, highlight_key, highlight_value)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `ws_${queryId}_${s.order}`,
            queryId,
            s.order,
            s.label,
            s.detail,
            s.status,
            (s as any).highlightKey || null,
            (s as any).highlightValue || null,
          ]
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
            a.roleBadge || (user.role === 'mentor' || user.role === 'faculty' ? 'Faculty Mentor' : 'Student'),
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
      // Default initial audit with triage note
      run(
        `INSERT INTO audit_entries (id, query_id, sender, author_name, role_badge, timestamp, text, action_taken, status_banner)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `at_${queryId}_1`,
          queryId,
          'student',
          user.name,
          'Student',
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          description,
          `Initial Submission • Auto-triaged as ${effectivePriority.toUpperCase()}`,
          effectivePriority === 'urgent' ? 'HIGH ATTENTION: URGENT PRIORITY' : null,
        ]
      );
    }

    const created = queryOne('SELECT * FROM queries WHERE id = ?', [queryId]);
    const formatted = formatQueryWithRelations(created);
    emitDocketCreated(formatted);
    return res.status(201).json(formatted);
  } catch (error: any) {
    console.error('Error creating query:', error?.message);
    return res.status(500).json({ error: 'Failed to create query docket. Please try again.' });
  }
});

// 3. GET /api/queries/:id - Retrieve single docket details with ownership enforcement
queryRouter.get('/:id', authenticateToken, (req: Request, res: Response) => {
  try {
    const raw = queryOne('SELECT * FROM queries WHERE id = ?', [req.params.id]);
    if (!raw) {
      return res.status(404).json({ error: 'Query not found' });
    }

    const user = req.user!;

    // Role check: students can only view their own
    if (user.role === 'student' && user.studentId && raw.student_id !== user.studentId) {
      return res.status(403).json({ error: 'Access forbidden: students can only view their own dockets' });
    }

    // Role check: mentors can only open queries from their assigned mentees
    if (user.role === 'mentor' || user.role === 'faculty') {
      const isMyMentee =
        raw.assigned_mentor_id === user.id ||
        Boolean(
          queryOne('SELECT id FROM mentor_assignments WHERE mentor_id = ? AND student_id = ?', [
            user.id,
            raw.student_id,
          ])
        );

      if (!isMyMentee) {
        return res.status(403).json({
          error: 'Access forbidden: mentors can only access dockets from their assigned mentees',
        });
      }
    }

    // Admins can see everything
    return res.json(formatQueryWithRelations(raw));
  } catch (error: any) {
    console.error('Error fetching query detail:', error);
    return res.status(500).json({ error: 'Failed to retrieve query details' });
  }
});

// 4. PATCH /api/queries/:id/status - Update docket status and optional priority (Assigned Mentor or Admin)
queryRouter.patch(
  '/:id/status',
  authenticateToken,
  requireRole(['mentor', 'faculty', 'admin']),
  (req: Request, res: Response) => {
    try {
      const { status, facultyRemark, priority } = req.body;
      if (!status && !priority) {
        return res.status(400).json({ error: 'Status or priority is required' });
      }

      const raw = queryOne('SELECT * FROM queries WHERE id = ?', [req.params.id]);
      if (!raw) {
        return res.status(404).json({ error: 'Query not found' });
      }

      const user = req.user!;

      // Ownership check: mentors can only update dockets from their assigned mentees
      if (user.role !== 'admin') {
        const isMyMentee =
          raw.assigned_mentor_id === user.id ||
          Boolean(
            queryOne('SELECT id FROM mentor_assignments WHERE mentor_id = ? AND student_id = ?', [
              user.id,
              raw.student_id,
            ])
          );

        if (!isMyMentee) {
          return res.status(403).json({
            error: 'Forbidden: mentors can only adjudicate dockets from their assigned mentees',
          });
        }
      }

      if (status && priority) {
        run(
          `UPDATE queries SET status = ?, priority = ?, updated_at = datetime('now') WHERE id = ?`,
          [status, priority, req.params.id]
        );
      } else if (status) {
        run(
          `UPDATE queries SET status = ?, updated_at = datetime('now') WHERE id = ?`,
          [status, req.params.id]
        );
      } else if (priority) {
        run(
          `UPDATE queries SET priority = ?, updated_at = datetime('now') WHERE id = ?`,
          [priority, req.params.id]
        );
      }

      // If mentor remark provided, append to audit transcript
      if (facultyRemark || user.role === 'mentor' || user.role === 'faculty') {
        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        run(
          `INSERT INTO audit_entries (id, query_id, sender, author_name, role_badge, timestamp, text, status_banner)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `at_${Date.now()}`,
            req.params.id,
            user.role === 'admin' ? 'admin' : 'mentor',
            user.name,
            user.role === 'admin' ? 'Admin Reviewer' : 'Faculty Mentor',
            nowTime,
            facultyRemark || `Docket status updated to: ${(status || raw.status).toUpperCase().replace('_', ' ')}`,
            status === 'resolved' ? 'DOCKET RESOLVED & APPROVED' : null,
          ]
        );
      }

      const updated = queryOne('SELECT * FROM queries WHERE id = ?', [req.params.id]);
      const formatted = formatQueryWithRelations(updated);
      emitDocketUpdated(formatted);
      return res.json(formatted);
    } catch (error: any) {
      console.error('Error updating status:', error);
      return res.status(500).json({ error: 'Failed to update query status' });
    }
  }
);

// 5. PATCH /api/queries/:id/priority - Mentor / Admin priority override
queryRouter.patch(
  '/:id/priority',
  authenticateToken,
  requireRole(['mentor', 'faculty', 'admin']),
  (req: Request, res: Response) => {
    try {
      const { priority, reason } = req.body;
      if (!priority || !['normal', 'high', 'urgent'].includes(priority)) {
        return res.status(400).json({ error: 'Valid priority (normal, high, urgent) is required' });
      }

      const raw = queryOne('SELECT * FROM queries WHERE id = ?', [req.params.id]);
      if (!raw) {
        return res.status(404).json({ error: 'Query not found' });
      }

      const user = req.user!;
      if (user.role !== 'admin') {
        const isMyMentee =
          raw.assigned_mentor_id === user.id ||
          Boolean(
            queryOne('SELECT id FROM mentor_assignments WHERE mentor_id = ? AND student_id = ?', [
              user.id,
              raw.student_id,
            ])
          );

        if (!isMyMentee) {
          return res.status(403).json({
            error: 'Forbidden: mentors can only adjust priority for their assigned mentees',
          });
        }
      }

      run(`UPDATE queries SET priority = ?, updated_at = datetime('now') WHERE id = ?`, [
        priority,
        req.params.id,
      ]);

      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      run(
        `INSERT INTO audit_entries (id, query_id, sender, author_name, role_badge, timestamp, text, action_taken, status_banner)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `at_${Date.now()}`,
          req.params.id,
          user.role === 'admin' ? 'admin' : 'mentor',
          user.name,
          user.role === 'admin' ? 'Admin Reviewer' : 'Faculty Mentor',
          nowTime,
          reason || `Priority adjusted to ${priority.toUpperCase()}`,
          `Priority Override: ${priority.toUpperCase()}`,
          priority === 'urgent' ? 'ATTENTION: ESCALATED TO URGENT' : null,
        ]
      );

      const updated = queryOne('SELECT * FROM queries WHERE id = ?', [req.params.id]);
      const formatted = formatQueryWithRelations(updated);
      emitDocketUpdated(formatted);
      return res.json(formatted);
    } catch (error: any) {
      console.error('Error updating priority:', error);
      return res.status(500).json({ error: 'Failed to update query priority' });
    }
  }
);

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

    const user = req.user!;

    // Students can only comment on their own dockets
    if (user.role === 'student' && user.studentId && raw.student_id !== user.studentId) {
      return res.status(403).json({ error: 'Forbidden: You can only comment on your own dockets' });
    }

    // Mentors can only comment on their assigned mentees' dockets
    if (user.role === 'mentor' || user.role === 'faculty') {
      const isMyMentee =
        raw.assigned_mentor_id === user.id ||
        Boolean(
          queryOne('SELECT id FROM mentor_assignments WHERE mentor_id = ? AND student_id = ?', [
            user.id,
            raw.student_id,
          ])
        );

      if (!isMyMentee) {
        return res.status(403).json({
          error: 'Forbidden: Mentors can only comment on dockets from their assigned mentees',
        });
      }
    }

    const entryId = `at_${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isMentorOrAdmin = user.role === 'mentor' || user.role === 'faculty' || user.role === 'admin';
    const sender = isMentorOrAdmin ? (user.role === 'admin' ? 'admin' : 'mentor') : 'student';
    const roleBadge = isMentorOrAdmin
      ? user.role === 'admin'
        ? 'Admin Reviewer'
        : 'Faculty Mentor'
      : 'Student';
    const effectiveStatusBanner = isMentorOrAdmin ? statusBanner : null;

    run(
      `INSERT INTO audit_entries (id, query_id, sender, author_name, role_badge, timestamp, text, action_taken, status_banner, token_ref, attached_doc_name, attached_doc_size, attached_doc_caption, attached_doc_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entryId,
        req.params.id,
        sender,
        user.name,
        roleBadge,
        timestamp,
        text || null,
        actionTaken || (isMentorOrAdmin ? 'Official Mentor Endorsement' : 'Student Message'),
        effectiveStatusBanner || null,
        tokenRef || null,
        attachedDoc?.name || null,
        attachedDoc?.size || null,
        attachedDoc?.caption || null,
        attachedDoc?.url || null,
      ]
    );

    run(`UPDATE queries SET updated_at = datetime('now') WHERE id = ?`, [req.params.id]);

    const updated = queryOne('SELECT * FROM queries WHERE id = ?', [req.params.id]);
    const formatted = formatQueryWithRelations(updated);
    emitDocketUpdated(formatted);
    return res.status(201).json(formatted);
  } catch (error: any) {
    console.error('Error adding audit entry:', error);
    return res.status(500).json({ error: 'Failed to add audit transcript message' });
  }
});

