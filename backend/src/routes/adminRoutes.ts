import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne, run } from '../db';
import { authenticateToken, requireRole, AuthUser } from '../middleware/auth';

export const adminRouter = Router();

/**
 * POST /api/admin/users
 * Privileged admin-only endpoint to onboard students, faculty mentors, or additional admins.
 * Protected by JWT authentication and requireRole(['admin']).
 */
adminRouter.post('/users', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { email, password, name, role, rollNo, program, department } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    const normalizedRole = role.trim().toLowerCase();
    if (!['student', 'mentor', 'admin'].includes(normalizedRole)) {
      return res.status(400).json({
        error: "Invalid role specified. Role must be one of: 'student', 'mentor', 'admin'",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = queryOne('SELECT id FROM users WHERE lower(email) = ?', [normalizedEmail]);
    if (existing) {
      return res.status(409).json({ error: 'An account with this institutional email already exists' });
    }

    const userId = `u_${normalizedRole === 'admin' ? 'admin_' : normalizedRole === 'mentor' ? 'mentor_' : ''}${Date.now()}`;
    const passwordHash = bcrypt.hashSync(password, 10);
    let studentId: string | null = null;
    let studentRecord: any = null;

    if (normalizedRole === 'student') {
      studentId = `std_${Date.now()}`;
      const defaultRollNo = rollNo || `24BCS${Math.floor(10000 + Math.random() * 90000)}`;

      run(
        `INSERT INTO students (id, name, roll_no, program, year, batch, avatar_url, mobile, email, cgpa, credits, attendance_aggregate, department, faculty_advisor_name, faculty_advisor_office, faculty_advisor_hours, faculty_advisor_email)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          studentId,
          name.trim(),
          defaultRollNo,
          program || 'B.Tech · Computer Science & Engineering',
          '1st Year',
          'Sem II',
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
          '+91 98000 00000',
          normalizedEmail,
          8.5,
          24,
          91.0,
          department || 'School of Computing Sciences',
          'Dr. K. Radhakrishnan',
          'Academic Block 3, Room 412',
          'Tue & Thu • 2:00 PM – 4:30 PM',
          'k.radhakrishnan@campus.edu',
        ]
      );

      studentRecord = queryOne('SELECT * FROM students WHERE id = ?', [studentId]);
    }

    // Insert user record with validated role
    run(
      `INSERT INTO users (id, email, password_hash, role, name, student_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, normalizedEmail, passwordHash, normalizedRole, name.trim(), studentId]
    );

    const userPayload: AuthUser = {
      id: userId,
      email: normalizedEmail,
      role: normalizedRole as 'student' | 'mentor' | 'admin',
      studentId,
      name: name.trim(),
    };

    return res.status(201).json({
      message: `${normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1)} account created successfully`,
      user: userPayload,
      student: studentRecord,
    });
  } catch (error: any) {
    console.error('Admin create user error:', error?.message);
    return res.status(500).json({ error: 'Failed to create user. Please try again.' });
  }
});

/**
 * PATCH /api/admin/mentors/:id
 * Admin endpoint to edit a mentor's name and/or email address.
 * Updates the users table, and cascades advisor info to assigned students and queries.
 */
adminRouter.patch('/mentors/:id', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    if (!name && !email) {
      return res.status(400).json({ error: 'At least name or email must be provided for update' });
    }

    const mentor = queryOne<any>("SELECT * FROM users WHERE id = ? AND role IN ('mentor', 'faculty')", [id]);
    if (!mentor) {
      return res.status(404).json({ error: 'Faculty mentor not found' });
    }

    const newName = name ? name.trim() : mentor.name;
    const newEmail = email ? email.trim().toLowerCase() : mentor.email;

    // Check email conflict if email changed
    if (email && newEmail !== mentor.email.toLowerCase()) {
      const emailConflict = queryOne('SELECT id FROM users WHERE lower(email) = ? AND id != ?', [newEmail, id]);
      if (emailConflict) {
        return res.status(409).json({ error: 'This email is already in use by another user' });
      }
    }

    // Update users table
    run('UPDATE users SET name = ?, email = ? WHERE id = ?', [newName, newEmail, id]);

    // Cascade name/email updates to mentees' advisor fields
    run(
      `UPDATE students 
       SET faculty_advisor_name = ?, faculty_advisor_email = ? 
       WHERE id IN (SELECT student_id FROM mentor_assignments WHERE mentor_id = ?)`,
      [newName, newEmail, id]
    );

    // Cascade name update to assigned queries
    run('UPDATE queries SET assigned_to = ? WHERE assigned_mentor_id = ?', [newName, id]);

    const updated = queryOne<any>(
      `SELECT u.id, u.name, u.email, u.role,
        (SELECT COUNT(*) FROM mentor_assignments ma WHERE ma.mentor_id = u.id) as mentee_count
       FROM users u WHERE u.id = ?`,
      [id]
    );

    return res.json({
      message: 'Faculty mentor updated successfully',
      mentor: updated,
    });
  } catch (error: any) {
    console.error('Admin update mentor error:', error?.message);
    return res.status(500).json({ error: 'Failed to update faculty mentor. Please try again.' });
  }
});

/**
 * PATCH /api/admin/students/:id
 * Admin endpoint to edit a student's name, email, roll number, and academic info.
 * Parameter :id can be students.id (e.g. std_...) or users.id (e.g. u_...).
 */
adminRouter.patch('/students/:id', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, rollNo, department, program } = req.body;

    if (!name && !email && !rollNo && !department && !program) {
      return res.status(400).json({ error: 'At least one field (name, email, rollNo) must be provided for update' });
    }

    // Locate student record by student id or by user id
    let student = queryOne<any>('SELECT * FROM students WHERE id = ?', [id]);
    if (!student) {
      student = queryOne<any>(
        'SELECT s.* FROM students s JOIN users u ON u.student_id = s.id WHERE u.id = ?',
        [id]
      );
    }
    if (!student) {
      return res.status(404).json({ error: 'Student record not found' });
    }

    const newName = name ? name.trim() : student.name;
    const newEmail = email ? email.trim().toLowerCase() : student.email;
    const newRollNo = rollNo ? rollNo.trim().toUpperCase() : student.roll_no;
    const newDept = department ? department.trim() : student.department;
    const newProg = program ? program.trim() : student.program;

    // Check email conflict
    if (email && newEmail !== student.email.toLowerCase()) {
      const emailConflict = queryOne('SELECT id FROM students WHERE lower(email) = ? AND id != ?', [
        newEmail,
        student.id,
      ]);
      const userConflict = queryOne('SELECT id FROM users WHERE lower(email) = ? AND student_id != ?', [
        newEmail,
        student.id,
      ]);
      if (emailConflict || userConflict) {
        return res.status(409).json({ error: 'This email is already in use by another student or user' });
      }
    }

    // Check roll number conflict
    if (rollNo && newRollNo !== student.roll_no) {
      const rollConflict = queryOne('SELECT id FROM students WHERE roll_no = ? AND id != ?', [
        newRollNo,
        student.id,
      ]);
      if (rollConflict) {
        return res.status(409).json({ error: `Roll number ${newRollNo} is already assigned to another student` });
      }
    }

    // Update students table
    run(
      `UPDATE students 
       SET name = ?, email = ?, roll_no = ?, department = ?, program = ?
       WHERE id = ?`,
      [newName, newEmail, newRollNo, newDept, newProg, student.id]
    );

    // Update corresponding users table record if linked
    run(
      `UPDATE users 
       SET name = ?, email = ?
       WHERE student_id = ? OR lower(email) = ?`,
      [newName, newEmail, student.id, student.email.toLowerCase()]
    );

    const updated = queryOne<any>('SELECT * FROM students WHERE id = ?', [student.id]);

    return res.json({
      message: 'Student record updated successfully',
      student: {
        id: updated.id,
        name: updated.name,
        rollNo: updated.roll_no,
        email: updated.email,
        department: updated.department,
        program: updated.program,
        year: updated.year,
        batch: updated.batch,
      },
    });
  } catch (error: any) {
    console.error('Admin update student error:', error?.message);
    return res.status(500).json({ error: 'Failed to update student. Please try again.' });
  }
});

/**
 * PATCH /api/admin/users/:id
 * General user update endpoint for any user record.
 */
adminRouter.patch('/users/:id', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = queryOne<any>('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'mentor' || user.role === 'faculty') {
      req.params.id = user.id;
      return (adminRouter as any).handle(
        Object.assign(req, { url: `/mentors/${user.id}`, method: 'PATCH' }),
        res
      );
    }

    if (user.role === 'student' && user.student_id) {
      req.params.id = user.student_id;
      return (adminRouter as any).handle(
        Object.assign(req, { url: `/students/${user.student_id}`, method: 'PATCH' }),
        res
      );
    }

    const { name, email, isActive, is_active } = req.body;
    const newName = name ? name.trim() : user.name;
    const newEmail = email ? email.trim().toLowerCase() : user.email;
    const activeVal = typeof is_active !== 'undefined' ? (is_active ? 1 : 0) : typeof isActive !== 'undefined' ? (isActive ? 1 : 0) : (user.is_active ?? 1);

    if (email && newEmail !== user.email.toLowerCase()) {
      const emailConflict = queryOne('SELECT id FROM users WHERE lower(email) = ? AND id != ?', [newEmail, id]);
      if (emailConflict) {
        return res.status(409).json({ error: 'This email is already in use by another user' });
      }
    }

    run('UPDATE users SET name = ?, email = ?, is_active = ? WHERE id = ?', [newName, newEmail, activeVal, id]);
    const updated = queryOne<any>('SELECT id, email, role, name, is_active FROM users WHERE id = ?', [id]);
    return res.json({ message: 'User updated successfully', user: updated });
  } catch (error: any) {
    console.error('Admin update user error:', error?.message);
    return res.status(500).json({ error: 'Failed to update user record' });
  }
});

/**
 * PATCH /api/admin/users/:id/status
 * Toggle user active/deactivated state
 */
adminRouter.patch('/users/:id/status', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive, is_active } = req.body;
    const activeVal = typeof is_active !== 'undefined' ? (is_active ? 1 : 0) : typeof isActive !== 'undefined' ? (isActive ? 1 : 0) : 0;
    run('UPDATE users SET is_active = ? WHERE id = ?', [activeVal, id]);
    return res.json({ message: `User status updated to ${activeVal ? 'active' : 'deactivated'}` });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update user status' });
  }
});

/**
 * POST /api/admin/users/import-csv
 * Bulk import mentors and students from CSV text or JSON array.
 * Allows university administrator to register mentors' and students' real institutional Google emails.
 */
adminRouter.post('/users/import-csv', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { csvData, users } = req.body;
    let recordsToProcess: Array<{ name: string; email: string; role: string; rollNo?: string; department?: string; program?: string }> = [];

    if (Array.isArray(users)) {
      recordsToProcess = users;
    } else if (typeof csvData === 'string' && csvData.trim()) {
      const lines = csvData.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length > 0) {
        const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
        const emailIdx = header.indexOf('email');
        const nameIdx = header.indexOf('name');
        const roleIdx = header.indexOf('role');
        const rollNoIdx = header.indexOf('rollno') !== -1 ? header.indexOf('rollno') : header.indexOf('roll_no');
        const deptIdx = header.indexOf('department');
        const progIdx = header.indexOf('program');

        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',').map((p) => p.trim());
          if (parts.length > 1 && emailIdx !== -1) {
            recordsToProcess.push({
              email: parts[emailIdx] || '',
              name: nameIdx !== -1 ? parts[nameIdx] : parts[0],
              role: roleIdx !== -1 ? parts[roleIdx] : 'student',
              rollNo: rollNoIdx !== -1 ? parts[rollNoIdx] : undefined,
              department: deptIdx !== -1 ? parts[deptIdx] : undefined,
              program: progIdx !== -1 ? parts[progIdx] : undefined,
            });
          }
        }
      }
    }

    if (recordsToProcess.length === 0) {
      return res.status(400).json({ error: 'No valid user records found in request' });
    }

    const results = {
      imported: 0,
      updated: 0,
      errors: [] as string[],
    };

    for (const record of recordsToProcess) {
      const email = record.email?.trim().toLowerCase();
      const name = record.name?.trim();
      const role = (record.role?.trim().toLowerCase() || 'student') as 'student' | 'mentor' | 'admin';

      if (!email || !name) {
        results.errors.push(`Skipped row with missing email or name: ${JSON.stringify(record)}`);
        continue;
      }

      const existingUser = queryOne<any>('SELECT * FROM users WHERE lower(email) = ?', [email]);
      if (existingUser) {
        run('UPDATE users SET name = ?, role = ? WHERE id = ?', [name, role, existingUser.id]);
        if (role === 'student' && existingUser.student_id) {
          run('UPDATE students SET name = ?, roll_no = COALESCE(?, roll_no) WHERE id = ?', [
            name,
            record.rollNo || null,
            existingUser.student_id,
          ]);
        }
        results.updated++;
      } else {
        const userId = `u_${role === 'admin' ? 'admin_' : role === 'mentor' ? 'mentor_' : ''}${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        let studentId: string | null = null;

        if (role === 'student') {
          studentId = `std_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          const rollNo = record.rollNo || `24BCS${Math.floor(10000 + Math.random() * 90000)}`;
          run(
            `INSERT INTO students (id, name, roll_no, program, year, batch, avatar_url, mobile, email, cgpa, credits, attendance_aggregate, department, faculty_advisor_name, faculty_advisor_office, faculty_advisor_hours, faculty_advisor_email)
             VALUES (?, ?, ?, ?, '1st Year', 'Sem II', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80', '+91 98000 00000', ?, 8.5, 24, 90.0, ?, 'Dr. K. Radhakrishnan', 'Academic Block 3, Room 412', 'Tue & Thu • 2:00 PM – 4:30 PM', 'faculty@campus.edu')`,
            [studentId, name, rollNo, record.program || 'B.Tech · Computer Science & Engineering', email, record.department || 'School of Computing Sciences']
          );
        }

        run(
          `INSERT INTO users (id, email, password_hash, role, name, student_id, is_active)
           VALUES (?, ?, 'GOOGLE_OAUTH_ACCOUNT', ?, ?, ?, 1)`,
          [userId, email, role, name, studentId]
        );
        results.imported++;
      }
    }

    return res.status(200).json({
      message: `Batch import completed: ${results.imported} created, ${results.updated} updated`,
      ...results,
    });
  } catch (error: any) {
    console.error('Batch import error:', error?.message);
    return res.status(500).json({ error: 'Failed to complete batch import' });
  }
});

/**
 * GET /api/admin/auth-logs
 * View sign-in attempts audit log (both Google and password).
 */
adminRouter.get('/auth-logs', authenticateToken, requireRole(['admin']), (req: Request, res: Response) => {
  try {
    const logs = query('SELECT * FROM auth_audit_log ORDER BY created_at DESC LIMIT 150');
    return res.json(logs);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch auth audit logs' });
  }
});
