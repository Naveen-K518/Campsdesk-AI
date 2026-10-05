import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { queryOne, run } from '../db';
import { authenticateToken, JWT_SECRET, AuthUser } from '../middleware/auth';

export const authRouter = Router();

// Register new student or faculty
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, rollNo, program, department, role = 'student' } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = queryOne('SELECT id FROM users WHERE lower(email) = ?', [normalizedEmail]);
    if (existing) {
      return res.status(409).json({ error: 'An account with this institutional email already exists' });
    }

    const userId = `u_${Date.now()}`;
    const passwordHash = bcrypt.hashSync(password, 10);
    let studentId: string | null = null;
    let studentRecord: any = null;

    if (role === 'student') {
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

    // Insert user
    run(
      `INSERT INTO users (id, email, password_hash, role, name, student_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, normalizedEmail, passwordHash, role, name.trim(), studentId]
    );

    const userPayload: AuthUser = {
      id: userId,
      email: normalizedEmail,
      role,
      studentId,
      name: name.trim(),
    };

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      message: 'Account registered successfully',
      token,
      user: userPayload,
      student: studentRecord,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error during registration' });
  }
});

// Login
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = queryOne<any>('SELECT * FROM users WHERE lower(email) = ?', [normalizedEmail]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. User not found.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
    }

    let studentRecord: any = null;
    if (user.student_id) {
      studentRecord = queryOne('SELECT * FROM students WHERE id = ?', [user.student_id]);
    } else if (user.role === 'student') {
      studentRecord = queryOne('SELECT * FROM students WHERE lower(email) = ?', [normalizedEmail]);
    }

    const userPayload: AuthUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      studentId: user.student_id || (studentRecord ? studentRecord.id : null),
      name: user.name,
    };

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      message: 'Authentication successful',
      token,
      user: userPayload,
      student: studentRecord,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error during login' });
  }
});

// Current user profile
authRouter.get('/me', authenticateToken, (req: Request, res: Response) => {
  try {
    const user = queryOne<any>('SELECT id, email, role, name, student_id, created_at FROM users WHERE id = ?', [
      req.user!.id,
    ]);

    if (!user) {
      return res.status(404).json({ error: 'User record not found' });
    }

    let studentRecord: any = null;
    if (user.student_id) {
      studentRecord = queryOne('SELECT * FROM students WHERE id = ?', [user.student_id]);
    } else if (user.role === 'student') {
      studentRecord = queryOne('SELECT * FROM students WHERE lower(email) = ?', [user.email.toLowerCase()]);
    }

    return res.json({
      user,
      student: studentRecord,
    });
  } catch (error: any) {
    console.error('Error fetching /me:', error);
    return res.status(500).json({ error: 'Failed to retrieve user profile' });
  }
});
