import { Router, Request, Response } from 'express';
import { query, queryOne, run } from '../db';
import { authenticateToken, requireRole } from '../middleware/auth';
import { MAX_MENTEES_PER_MENTOR } from '../config/env';

export const mentorRouter = Router();

// 1. GET /api/mentors - List all mentors with their current mentee count
mentorRouter.get('/', authenticateToken, (req: Request, res: Response) => {
  try {
    const mentors = query<any>(
      `SELECT u.id, u.name, u.email, u.role,
        (SELECT COUNT(*) FROM mentor_assignments ma WHERE ma.mentor_id = u.id) as mentee_count
       FROM users u
       WHERE u.role IN ('mentor', 'faculty')
       ORDER BY u.name ASC`
    );

    return res.json(mentors);
  } catch (error: any) {
    console.error('Error fetching mentors:', error);
    return res.status(500).json({ error: 'Failed to retrieve mentors' });
  }
});

// 2. GET /api/mentors/my-mentees - Get currently logged-in mentor's assigned mentees
mentorRouter.get(
  '/my-mentees',
  authenticateToken,
  requireRole(['mentor', 'faculty', 'admin']),
  (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const mentorId = req.query.mentorId as string || user.id;

      const mentees = query<any>(
        `SELECT s.*, ma.assigned_at
         FROM mentor_assignments ma
         JOIN students s ON ma.student_id = s.id
         WHERE ma.mentor_id = ?
         ORDER BY s.name ASC`,
        [mentorId]
      );

      return res.json({
        mentorId,
        count: mentees.length,
        maxQuota: MAX_MENTEES_PER_MENTOR,
        mentees,
      });
    } catch (error: any) {
      console.error('Error fetching mentees:', error);
      return res.status(500).json({ error: 'Failed to retrieve mentees' });
    }
  }
);

// 3. POST /api/mentors/assign - Assign student to mentor with MAX_MENTEES_PER_MENTOR enforcement
mentorRouter.post(
  '/assign',
  authenticateToken,
  requireRole(['admin', 'mentor', 'faculty']),
  (req: Request, res: Response) => {
    try {
      const { mentorId, studentId } = req.body;

      if (!mentorId || !studentId) {
        return res.status(400).json({ error: 'Both mentorId and studentId are required' });
      }

      // 1. Verify mentor exists and has mentor/faculty role
      const mentor = queryOne<any>(
        "SELECT id, name, email, role FROM users WHERE id = ? AND role IN ('mentor', 'faculty')",
        [mentorId]
      );
      if (!mentor) {
        return res.status(404).json({ error: 'Mentor not found or user is not a mentor' });
      }

      // 2. Verify student exists
      const student = queryOne<any>('SELECT id, name, roll_no FROM students WHERE id = ?', [studentId]);
      if (!student) {
        return res.status(404).json({ error: 'Student record not found' });
      }

      // 3. Check if student is already assigned to this exact mentor
      const currentAssignment = queryOne<any>(
        'SELECT mentor_id FROM mentor_assignments WHERE student_id = ?',
        [studentId]
      );

      const isAlreadyWithThisMentor = currentAssignment && currentAssignment.mentor_id === mentorId;

      if (!isAlreadyWithThisMentor) {
        // Count how many mentees this mentor already has
        const countRow = queryOne<{ count: number }>(
          'SELECT COUNT(*) as count FROM mentor_assignments WHERE mentor_id = ?',
          [mentorId]
        );
        const currentCount = countRow ? countRow.count : 0;

        // Enforce the rule: a mentor cannot have more than MAX_MENTEES_PER_MENTOR mentees
        if (currentCount >= MAX_MENTEES_PER_MENTOR) {
          return res.status(400).json({
            error: `Mentor assignment rejected: mentor ${mentor.name} already has ${currentCount} mentees, which reaches the maximum limit of ${MAX_MENTEES_PER_MENTOR} mentees.`,
            maxLimit: MAX_MENTEES_PER_MENTOR,
            currentCount,
          });
        }
      }

      // 4. Update or insert 1:1 mentor assignment (each student has exactly one mentor)
      if (currentAssignment) {
        run(
          `UPDATE mentor_assignments SET mentor_id = ?, assigned_at = datetime('now') WHERE student_id = ?`,
          [mentorId, studentId]
        );
      } else {
        const assignmentId = `ma_${studentId}`;
        run(
          `INSERT INTO mentor_assignments (id, mentor_id, student_id, assigned_at) VALUES (?, ?, ?, datetime('now'))`,
          [assignmentId, mentorId, studentId]
        );
      }

      // 5. Update student's advisor/mentor fields
      run(
        `UPDATE students 
         SET faculty_advisor_name = ?, faculty_advisor_email = ? 
         WHERE id = ?`,
        [mentor.name, mentor.email, studentId]
      );

      // 6. Automatically update any unassigned queries for this student
      run(
        `UPDATE queries 
         SET assigned_mentor_id = ?, 
             assigned_to = ?, 
             status = CASE WHEN status = 'unassigned' THEN 'under_review' ELSE status END,
             updated_at = datetime('now')
         WHERE student_id = ? AND (assigned_mentor_id IS NULL OR status = 'unassigned')`,
        [mentorId, mentor.name, studentId]
      );

      const updatedCount = queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM mentor_assignments WHERE mentor_id = ?',
        [mentorId]
      )?.count || 0;

      return res.status(200).json({
        message: `Student ${student.name} successfully assigned to mentor ${mentor.name}`,
        mentor: {
          id: mentor.id,
          name: mentor.name,
          email: mentor.email,
          menteeCount: updatedCount,
          maxLimit: MAX_MENTEES_PER_MENTOR,
        },
        student: {
          id: student.id,
          name: student.name,
          rollNo: student.roll_no,
        },
      });
    } catch (error: any) {
      console.error('Error assigning mentor:', error);
      return res.status(500).json({ error: 'Failed to assign mentor' });
    }
  }
);

// 3b. POST /api/mentors/unassign - Remove student assignment (Admin only)
mentorRouter.post(
  '/unassign',
  authenticateToken,
  requireRole(['admin']),
  (req: Request, res: Response) => {
    try {
      const { studentId } = req.body;
      if (!studentId) {
        return res.status(400).json({ error: 'studentId is required' });
      }

      run('DELETE FROM mentor_assignments WHERE student_id = ?', [studentId]);
      run(
        `UPDATE students 
         SET faculty_advisor_name = NULL, faculty_advisor_email = NULL 
         WHERE id = ?`,
        [studentId]
      );

      return res.json({ message: `Student ${studentId} unassigned successfully` });
    } catch (error: any) {
      console.error('Error unassigning mentor:', error);
      return res.status(500).json({ error: 'Failed to unassign mentor' });
    }
  }
);

// 4. GET /api/mentors/students - List all students with mentor information (for Admin Portal)
mentorRouter.get(
  '/students/all',
  authenticateToken,
  requireRole(['admin']),
  (req: Request, res: Response) => {
    try {
      const students = query<any>(
        `SELECT s.id, s.name, s.roll_no, s.program, s.year, s.batch, s.email, s.department,
                ma.mentor_id, u.name as mentor_name, u.email as mentor_email, ma.assigned_at
         FROM students s
         LEFT JOIN mentor_assignments ma ON s.id = ma.student_id
         LEFT JOIN users u ON ma.mentor_id = u.id
         ORDER BY s.name ASC`
      );

      const formatted = students.map((s: any) => ({
        id: s.id,
        name: s.name,
        rollNo: s.roll_no,
        program: s.program,
        year: s.year,
        batch: s.batch,
        email: s.email,
        department: s.department,
        mentor: s.mentor_id
          ? {
              id: s.mentor_id,
              name: s.mentor_name,
              email: s.mentor_email,
              assignedAt: s.assigned_at,
            }
          : null,
      }));

      return res.json(formatted);
    } catch (error: any) {
      console.error('Error fetching students:', error);
      return res.status(500).json({ error: 'Failed to retrieve students' });
    }
  }
);

// 5. GET /api/mentors/assignments/all - List all mentor assignments (for Admin Portal)
mentorRouter.get(
  '/assignments/all',
  authenticateToken,
  requireRole(['admin']),
  (req: Request, res: Response) => {
    try {
      const assignments = query<any>(
        `SELECT ma.id, ma.assigned_at,
                u.id as mentor_id, u.name as mentor_name, u.email as mentor_email,
                s.id as student_id, s.name as student_name, s.roll_no as student_roll_no, s.department as student_department
         FROM mentor_assignments ma
         JOIN users u ON ma.mentor_id = u.id
         JOIN students s ON ma.student_id = s.id
         ORDER BY ma.assigned_at DESC`
      );

      return res.json(assignments);
    } catch (error: any) {
      console.error('Error fetching assignments:', error);
      return res.status(500).json({ error: 'Failed to retrieve assignments' });
    }
  }
);

