import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { NODE_ENV } from '../config/env';

let db: Database;
const dataDir = path.resolve(__dirname, '../../data');
const dbFilePath = path.join(dataDir, 'campusdesk.sqlite');

export function saveDb(): void {
  if (!db) return;
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const binaryArray = db.export();
  fs.writeFileSync(dbFilePath, Buffer.from(binaryArray));
}

export function query<T = any>(sql: string, params: any[] = []): T[] {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return results;
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const rows = query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function run(sql: string, params: any[] = []): { changes: number } {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
  saveDb();
  return { changes: db.getRowsModified() };
}

export interface AuthAuditParams {
  email: string;
  provider: 'google' | 'password';
  status: 'success' | 'failure';
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  role?: string;
}

export function logAuthAttempt(params: AuthAuditParams): void {
  try {
    const id = `auth_audit_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    run(
      `INSERT INTO auth_audit_log (id, email, provider, status, reason, ip_address, user_agent, role, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        id,
        params.email.toLowerCase().trim(),
        params.provider,
        params.status,
        params.reason || null,
        params.ipAddress || null,
        params.userAgent || null,
        params.role || null,
      ]
    );
  } catch (err: any) {
    console.error('[AuthAudit] Failed to log auth attempt:', err?.message);
  }
}

export async function initDb(): Promise<void> {
  if (db) return;

  const SQL = await initSqlJs();

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (fs.existsSync(dbFilePath)) {
    const fileBuffer = fs.readFileSync(dbFilePath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'student',
      name TEXT NOT NULL,
      student_id TEXT,
      google_sub TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS auth_audit_log (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      provider TEXT NOT NULL,
      status TEXT NOT NULL,
      reason TEXT,
      ip_address TEXT,
      user_agent TEXT,
      role TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      roll_no TEXT UNIQUE NOT NULL,
      program TEXT NOT NULL,
      year TEXT NOT NULL,
      batch TEXT NOT NULL,
      avatar_url TEXT,
      mobile TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      cgpa REAL,
      credits INTEGER,
      attendance_aggregate REAL,
      department TEXT,
      faculty_advisor_name TEXT,
      faculty_advisor_office TEXT,
      faculty_advisor_hours TEXT,
      faculty_advisor_email TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS guidelines (
      id TEXT PRIMARY KEY,
      section TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      verification_criteria TEXT,
      last_updated TEXT,
      most_consulted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS queries (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      student_id TEXT NOT NULL,
      category TEXT NOT NULL,
      subject TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      sub_line TEXT,
      priority TEXT DEFAULT 'normal',
      status TEXT DEFAULT 'active',
      citation TEXT,
      assigned_to TEXT,
      ai_confidence REAL,
      resolution_time_mins INTEGER,
      days_condonation INTEGER,
      rating INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workflow_steps (
      id TEXT PRIMARY KEY,
      query_id TEXT NOT NULL,
      step_order INTEGER NOT NULL,
      label TEXT NOT NULL,
      detail TEXT NOT NULL,
      status TEXT DEFAULT 'in_progress',
      highlight_key TEXT,
      highlight_value TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_entries (
      id TEXT PRIMARY KEY,
      query_id TEXT NOT NULL,
      sender TEXT NOT NULL,
      author_name TEXT NOT NULL,
      role_badge TEXT,
      timestamp TEXT NOT NULL,
      text TEXT,
      action_taken TEXT,
      status_banner TEXT,
      token_ref TEXT,
      attached_doc_name TEXT,
      attached_doc_size TEXT,
      attached_doc_caption TEXT,
      attached_doc_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mentor_assignments (
      id TEXT PRIMARY KEY,
      mentor_id TEXT NOT NULL,
      student_id TEXT UNIQUE NOT NULL,
      assigned_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      query_id TEXT,
      student_id TEXT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mimetype TEXT NOT NULL,
      size INTEGER NOT NULL,
      filepath TEXT NOT NULL,
      uploaded_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      department TEXT,
      academic_year TEXT,
      description TEXT,
      file_url TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      version INTEGER NOT NULL DEFAULT 1,
      effective_date TEXT,
      uploaded_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS resource_versions (
      id TEXT PRIMARY KEY,
      resource_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      file_url TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      change_summary TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS timetable_entries (
      id TEXT PRIMARY KEY,
      resource_id TEXT NOT NULL,
      day TEXT NOT NULL,
      period INTEGER NOT NULL,
      subject TEXT NOT NULL,
      faculty TEXT,
      room TEXT,
      department TEXT,
      year TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
    );
  `);

  // Run migrations
  try {
    const tableInfo = query<any>("PRAGMA table_info(queries)");
    const hasAssignedMentorId = tableInfo.some((col: any) => col.name === 'assigned_mentor_id');
    if (!hasAssignedMentorId) {
      db.run("ALTER TABLE queries ADD COLUMN assigned_mentor_id TEXT;");
      console.log('[Migration] Added assigned_mentor_id column to queries table');
    }

    // Migration: ensure content management tables exist
    db.run(`
      CREATE TABLE IF NOT EXISTS resources (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        department TEXT,
        academic_year TEXT,
        description TEXT,
        file_url TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        version INTEGER NOT NULL DEFAULT 1,
        effective_date TEXT,
        uploaded_by TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS resource_versions (
        id TEXT PRIMARY KEY,
        resource_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        file_url TEXT NOT NULL,
        uploaded_by TEXT NOT NULL,
        change_summary TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS timetable_entries (
        id TEXT PRIMARY KEY,
        resource_id TEXT NOT NULL,
        day TEXT NOT NULL,
        period INTEGER NOT NULL,
        subject TEXT NOT NULL,
        faculty TEXT,
        room TEXT,
        department TEXT,
        year TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // Migrate any legacy 'faculty' role users to 'mentor'
    db.run("UPDATE users SET role = 'mentor' WHERE role = 'faculty'");

    // Migration: ensure google_sub and is_active columns exist on users
    const userTableInfo = query<any>("PRAGMA table_info(users)");
    const hasGoogleSub = userTableInfo.some((col: any) => col.name === 'google_sub');
    if (!hasGoogleSub) {
      db.run("ALTER TABLE users ADD COLUMN google_sub TEXT;");
      console.log('[Migration] Added google_sub column to users table');
    }

    const hasIsActive = userTableInfo.some((col: any) => col.name === 'is_active');
    if (!hasIsActive) {
      db.run("ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1;");
      console.log('[Migration] Added is_active column to users table');
    }
  } catch (mErr: any) {
    console.warn('[Migration Warning]', mErr.message);
  }

  // Seed default data
  await seedInitialData();

  saveDb();
  console.log('[Database] SQLite initialized successfully at', dbFilePath);
}

function findSeedPath(fileName: string): string {
  const possiblePaths = [
    path.resolve(__dirname, '../../seeds', fileName),
    path.resolve(__dirname, '../seeds', fileName),
    path.resolve(__dirname, '../../../db/seeds', fileName),
    path.resolve(process.cwd(), 'seeds', fileName),
    path.resolve(process.cwd(), '../db/seeds', fileName),
  ];
  return possiblePaths.find((p) => fs.existsSync(p)) || possiblePaths[0];
}

async function seedInitialData(): Promise<void> {
  // 1. Seed guidelines
  const existingGuidelines = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM guidelines');
  if (!existingGuidelines || existingGuidelines.count === 0) {
    const guidelinesSeedPath = findSeedPath('guidelines.json');
    if (fs.existsSync(guidelinesSeedPath)) {
      const raw = fs.readFileSync(guidelinesSeedPath, 'utf-8');
      const items = JSON.parse(raw);
      for (const g of items) {
        db.run(
          `INSERT INTO guidelines (id, section, category, title, body, verification_criteria, last_updated, most_consulted)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            g.id,
            g.section,
            g.category,
            g.title,
            g.body,
            JSON.stringify(g.verificationCriteria || []),
            g.lastUpdated || '',
            g.mostConsulted ? 1 : 0,
          ]
        );
      }
      console.log(`[Database] Seeded ${items.length} guidelines`);
    }
  }

  // 2. Seed students and users (~12 students)
  const studentsSeedPath = findSeedPath('students.json');
  if (fs.existsSync(studentsSeedPath)) {
    const raw = fs.readFileSync(studentsSeedPath, 'utf-8');
    const items = JSON.parse(raw);
    for (const s of items) {
      const existingStudent = queryOne<any>(
        'SELECT id FROM students WHERE id = ? OR roll_no = ? OR lower(email) = ?',
        [s.id, s.rollNo, s.email.toLowerCase()]
      );

      let effectiveStudentId = s.id;

      if (!existingStudent) {
        db.run(
          `INSERT INTO students (id, name, roll_no, program, year, batch, avatar_url, mobile, email, cgpa, credits, attendance_aggregate, department, faculty_advisor_name, faculty_advisor_office, faculty_advisor_hours, faculty_advisor_email)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            s.id,
            s.name,
            s.rollNo,
            s.program,
            s.year,
            s.batch,
            s.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
            s.mobile,
            s.email,
            s.cgpa || 8.92,
            s.credits || 118,
            s.attendanceAggregate || 88.4,
            s.department || 'School of Computing Sciences',
            'Dr. K. Radhakrishnan',
            'Academic Block 3, Room 412',
            'Tue & Thu • 2:00 PM – 4:30 PM',
            'faculty@campus.edu',
          ]
        );
      } else {
        effectiveStudentId = existingStudent.id;
        db.run(
          `UPDATE students 
           SET name = ?, roll_no = ?, program = ?, year = ?, batch = ?, mobile = ? 
           WHERE id = ?`,
          [s.name, s.rollNo, s.program, s.year, s.batch, s.mobile, existingStudent.id]
        );
      }

      // Create or update matching student user in development mode
      if (NODE_ENV !== 'production') {
        const userExists = queryOne<any>('SELECT id FROM users WHERE lower(email) = ?', [s.email.toLowerCase()]);
        const passwordHash = bcrypt.hashSync('password123', 10);
        if (!userExists) {
          db.run(
            `INSERT INTO users (id, email, password_hash, role, name, student_id)
             VALUES (?, ?, ?, 'student', ?, ?)`,
            [`u_${effectiveStudentId}`, s.email, passwordHash, s.name, effectiveStudentId]
          );
        } else {
          db.run(
            `UPDATE users SET name = ?, student_id = ?, password_hash = ? WHERE id = ?`,
            [s.name, effectiveStudentId, passwordHash, userExists.id]
          );
        }
      }

    }
  }

  // 3. Seed Mentors (3 mentors) & Admin (1 admin) (Development Mode)
  if (NODE_ENV !== 'production') {
    // Mentor 1 (Dr. K. Radhakrishnan - mentor.radhakrishnan@campus.edu / faculty@campus.edu)
    const mentor1 = queryOne('SELECT * FROM users WHERE email = ? OR id = ? OR id = ?', ['faculty@campus.edu', 'u_mentor_1', 'u_faculty_01']);
    if (!mentor1) {
      const passwordHash = bcrypt.hashSync('mentor123', 10);
      db.run(
        `INSERT INTO users (id, email, password_hash, role, name, student_id)
         VALUES (?, ?, ?, 'mentor', ?, ?)`,
        ['u_faculty_01', 'faculty@campus.edu', passwordHash, 'Dr. K. Radhakrishnan', null]
      );
    } else {
      db.run("UPDATE users SET role = 'mentor', name = 'Dr. K. Radhakrishnan' WHERE id = ?", [mentor1.id]);
    }

    // Mentor 2 (Dr. Priya Sharma - mentor.priya@campus.edu / password: mentor123)
    const mentor2 = queryOne('SELECT * FROM users WHERE email = ? OR id = ?', ['mentor.priya@campus.edu', 'u_mentor_2']);
    if (!mentor2) {
      const passwordHash = bcrypt.hashSync('mentor123', 10);
      db.run(
        `INSERT INTO users (id, email, password_hash, role, name, student_id)
         VALUES (?, ?, ?, 'mentor', ?, ?)`,
        ['u_mentor_2', 'mentor.priya@campus.edu', passwordHash, 'Dr. Priya Sharma', null]
      );
    } else {
      db.run("UPDATE users SET role = 'mentor' WHERE id = ?", [mentor2.id]);
    }

    // Mentor 3 (Dr. Anand Kumar - mentor.anand@campus.edu / password: mentor123)
    const mentor3 = queryOne('SELECT * FROM users WHERE email = ? OR id = ?', ['mentor.anand@campus.edu', 'u_mentor_3']);
    if (!mentor3) {
      const passwordHash = bcrypt.hashSync('mentor123', 10);
      db.run(
        `INSERT INTO users (id, email, password_hash, role, name, student_id)
         VALUES (?, ?, ?, 'mentor', ?, ?)`,
        ['u_mentor_3', 'mentor.anand@campus.edu', passwordHash, 'Dr. Anand Kumar', null]
      );
    } else {
      db.run("UPDATE users SET role = 'mentor' WHERE id = ?", [mentor3.id]);
    }

    // Admin (admin@campus.edu / password: admin123)
    const adminUser = queryOne('SELECT * FROM users WHERE email = ? OR id = ?', ['admin@campus.edu', 'u_admin_1']);
    if (!adminUser) {
      const passwordHash = bcrypt.hashSync('admin123', 10);
      db.run(
        `INSERT INTO users (id, email, password_hash, role, name, student_id)
         VALUES (?, ?, ?, 'admin', ?, ?)`,
        ['u_admin_1', 'admin@campus.edu', passwordHash, 'System Administrator', null]
      );
    }
  }

  // 4. Seed Mentor Assignments (1:1 student-to-mentor)
  const m1 = queryOne<any>('SELECT id FROM users WHERE email = ?', ['faculty@campus.edu']);
  const m2 = queryOne<any>('SELECT id FROM users WHERE email = ?', ['mentor.priya@campus.edu']);
  const m3 = queryOne<any>('SELECT id FROM users WHERE email = ?', ['mentor.anand@campus.edu']);
  const mentor1Id = m1 ? m1.id : 'u_mentor_1';
  const mentor2Id = m2 ? m2.id : 'u_mentor_2';
  const mentor3Id = m3 ? m3.id : 'u_mentor_3';

  function getStudentId(email: string, fallbackId: string): string {
    const s = queryOne<any>('SELECT id FROM students WHERE lower(email) = ? OR id = ?', [email.toLowerCase(), fallbackId]);
    return s ? s.id : fallbackId;
  }

  const assignmentDefinitions = [
    // Mentor 1 (Dr. K. Radhakrishnan): Kishor, Kumar, Murali, Rohan Gupta
    { email: 'kishorkumarp.cs24@bitsathy.ac.in', fallback: 'std_01', mentorId: mentor1Id },
    { email: 'kumar.s@campus.edu', fallback: 'std_02', mentorId: mentor1Id },
    { email: 'murali.d@campus.edu', fallback: 'std_03', mentorId: mentor1Id },
    { email: 'rohan.gupta@campus.edu', fallback: 'std_06', mentorId: mentor1Id },

    // Mentor 2 (Dr. Priya Sharma): Student1 (Aarav), Student2 (Ananya), Sneha Patel, Vikram Singh
    { email: 'aarav.sharma@campus.edu', fallback: 'std_04', mentorId: mentor2Id },
    { email: 'ananya.verma@campus.edu', fallback: 'std_05', mentorId: mentor2Id },
    { email: 'sneha.patel@campus.edu', fallback: 'std_07', mentorId: mentor2Id },
    { email: 'vikram.singh@campus.edu', fallback: 'std_08', mentorId: mentor2Id },

    // Mentor 3 (Dr. Anand Kumar): Pooja Nair, Aditya Rao, Meera Iyer
    { email: 'pooja.nair@campus.edu', fallback: 'std_09', mentorId: mentor3Id },
    { email: 'aditya.rao@campus.edu', fallback: 'std_10', mentorId: mentor3Id },
    { email: 'meera.iyer@campus.edu', fallback: 'std_11', mentorId: mentor3Id },
    // std_12 (Rahul Menon: rahul.menon@campus.edu) left unassigned for testing unassigned triage
  ];

  for (const def of assignmentDefinitions) {
    const studentId = getStudentId(def.email, def.fallback);
    const studentExists = queryOne('SELECT id FROM students WHERE id = ?', [studentId]);
    if (studentExists) {
      const alreadyAssigned = queryOne('SELECT id FROM mentor_assignments WHERE student_id = ?', [studentId]);
      if (!alreadyAssigned) {
        db.run(
          `INSERT INTO mentor_assignments (id, mentor_id, student_id, assigned_at)
           VALUES (?, ?, ?, datetime('now'))`,
          [`ma_${studentId}`, def.mentorId, studentId]
        );
      }
    }
  }


  // Update students' advisor fields based on mentor assignments
  db.run(`
    UPDATE students SET 
      faculty_advisor_name = 'Dr. K. Radhakrishnan',
      faculty_advisor_office = 'Academic Block 3, Room 412',
      faculty_advisor_hours = 'Tue & Thu • 2:00 PM – 4:30 PM',
      faculty_advisor_email = 'faculty@campus.edu'
    WHERE id IN (SELECT student_id FROM mentor_assignments WHERE mentor_id = '${mentor1Id}')
  `);

  db.run(`
    UPDATE students SET 
      faculty_advisor_name = 'Dr. Priya Sharma',
      faculty_advisor_office = 'Academic Block 2, Room 305',
      faculty_advisor_hours = 'Mon & Wed • 10:00 AM – 1:00 PM',
      faculty_advisor_email = 'mentor.priya@campus.edu'
    WHERE id IN (SELECT student_id FROM mentor_assignments WHERE mentor_id = '${mentor2Id}')
  `);

  db.run(`
    UPDATE students SET 
      faculty_advisor_name = 'Dr. Anand Kumar',
      faculty_advisor_office = 'Academic Block 1, Room 210',
      faculty_advisor_hours = 'Wed & Fri • 3:00 PM – 5:00 PM',
      faculty_advisor_email = 'mentor.anand@campus.edu'
    WHERE id IN (SELECT student_id FROM mentor_assignments WHERE mentor_id = '${mentor3Id}')
  `);

  // 5. Seed sample queries if empty
  const existingQueries = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM queries');
  if (!existingQueries || existingQueries.count === 0) {
    const student = queryOne<{ id: string }>('SELECT id FROM students WHERE id = ?', ['std_04']) ||
                    queryOne<{ id: string }>('SELECT id FROM students LIMIT 1');
    const studentId = student ? student.id : 'std_04';

    // Sample Query 1: Medical leave condonation (Assigned to Mentor 2)
    const q1Id = 'q_1001';
    db.run(
      `INSERT INTO queries (id, code, student_id, category, subject, title, description, sub_line, priority, status, citation, assigned_to, assigned_mentor_id, ai_confidence, resolution_time_mins, days_condonation, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-2 days'), datetime('now', '-1 hours'))`,
      [
        q1Id,
        '#CS-4921',
        studentId,
        'Attendance & Leave',
        'Medical Leave Condonation',
        'Medical Leave Condonation (Verified by AI)',
        'Student submitted St. Jude Hospital Certificate (1.2 MB). Verified under Ordinance Sec 4.2.',
        'Routed to Mentor • Case Medical-Cert.pdf',
        'urgent',
        'under_review',
        'Cited Attendance Bylaws Sec 4.2',
        'Dr. Priya Sharma (Mentor CSE)',
        mentor2Id,
        99.4,
        18,
        6,
      ]
    );

    // Workflow steps for Q1
    const steps = [
      { order: 1, label: 'Fetched SIS Profile', detail: 'OS Attendance recorded at 68.5%.', status: 'done', hk: 'Current Record', hv: '68.5%' },
      { order: 2, label: 'Evaluated Bylaws Sec 4.2', detail: 'Criteria validated. 6 days condonation admissible.', status: 'done', hk: 'Bylaw Match', hv: 'Sec 4.2' },
      { order: 3, label: 'Certificate Authenticated', detail: 'Medical-Cert.pdf validated and cryptographically hashed.', status: 'done', hk: 'Validation', hv: 'Verified' },
      { order: 4, label: 'Forwarded to Mentor', detail: 'Docket forwarded to Faculty Mentor for review and endorsement.', status: 'in_progress', hk: 'Target', hv: 'Faculty Mentor' },
    ];
    for (const step of steps) {
      db.run(
        `INSERT INTO workflow_steps (id, query_id, step_order, label, detail, status, highlight_key, highlight_value)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [`ws_${q1Id}_${step.order}`, q1Id, step.order, step.label, step.detail, step.status, step.hk, step.hv]
      );
    }

    // Audit entries for Q1
    db.run(
      `INSERT INTO audit_entries (id, query_id, sender, author_name, role_badge, timestamp, text, attached_doc_name, attached_doc_size, attached_doc_caption)
       VALUES (?, ?, 'student', 'Aarav Sharma (Student)', 'Student', '10:15 AM', 'Uploaded medical certificate for attendance shortage condonation.', 'Medical-Cert.pdf', '1.2 MB', 'Hospital Stamped & Doctor Signed')`,
      [`at_${q1Id}_1`, q1Id]
    );
    db.run(
      `INSERT INTO audit_entries (id, query_id, sender, author_name, role_badge, timestamp, text, action_taken)
       VALUES (?, ?, 'agent', 'CampusDesk Autonomous Triage Agent', 'Autonomous Triage', '10:16 AM', 'Validated medical certificate format and doctor registration. Effective attendance projection: 88.5% post-condonation. Admissible under Senate Ordinance Sec 4.2.', 'Docket escalated to Faculty Mentor for review and endorsement.')`,
      [`at_${q1Id}_2`, q1Id]
    );

    // Sample Query 2: Hostel Leave Pass (Assigned to Mentor 1)
    const kishorStudent = queryOne<{ id: string }>('SELECT id FROM students WHERE id = ?', ['std_01']);
    const q2StudentId = kishorStudent ? kishorStudent.id : studentId;
    const q2Id = 'q_1002';
    db.run(
      `INSERT INTO queries (id, code, student_id, category, subject, title, description, sub_line, priority, status, citation, assigned_to, assigned_mentor_id, ai_confidence, resolution_time_mins, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-5 days'), datetime('now', '-4 days'))`,
      [
        q2Id,
        '#CS-4890',
        q2StudentId,
        'Hostel & Mess',
        'Weekend Leave Pass',
        'Hostel Weekend Leave Pass (Gate Clearance)',
        'Weekend leave pass to home city with digital parent acknowledgement token.',
        'Auto-approved via Warden Bot',
        'normal',
        'resolved',
        'Cited Hostel Regulations Sec 6.1',
        'Dr. K. Radhakrishnan (Mentor CSE)',
        mentor1Id,
        98.2,
        12,
      ]
    );

    db.run(
      `INSERT INTO audit_entries (id, query_id, sender, author_name, role_badge, timestamp, text, status_banner, token_ref)
       VALUES (?, ?, 'mentor', 'Dr. K. Radhakrishnan', 'Faculty Mentor', '11:00 AM', 'Parent SMS verification token verified. Gate exit authorized until Sunday 8:00 PM.', 'LEAVE PASS GRANTED', 'TOKEN-HP-84920')`,
      [`at_${q2Id}_1`, q2Id]
    );

    console.log('[Database] Seeded initial sample queries with workflow steps and audit transcripts');
  }

  // Ensure all queries have assigned_mentor_id populated if their student has a mentor
  db.run(`
    UPDATE queries 
    SET assigned_mentor_id = (
      SELECT mentor_id FROM mentor_assignments WHERE mentor_assignments.student_id = queries.student_id
    )
    WHERE (assigned_mentor_id IS NULL OR assigned_mentor_id = '')
      AND student_id IN (SELECT student_id FROM mentor_assignments)
  `);

  // 6. Seed sample published resources if empty
  const existingResources = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM resources');
  if (!existingResources || existingResources.count === 0) {
    const adminUser = queryOne<any>('SELECT id FROM users WHERE role = ?', ['admin']);
    const adminId = adminUser ? adminUser.id : 'u_admin_1';

    // 1. Timetable for Computing Sciences, 1st Year
    const resTtId = 'res_seed_tt_01';
    db.run(
      `INSERT INTO resources (id, title, category, department, academic_year, description, file_url, status, version, effective_date, uploaded_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-3 days'), datetime('now', '-3 days'))`,
      [
        resTtId,
        'B.Tech CSE Class Timetable — Fall Semester',
        'timetable',
        'School of Computing Sciences',
        '1st Year',
        'Master weekly timetable for B.Tech Computer Science & Engineering (Batch 2024-28). Contains daily lecture slots, lab allocations, and tutorial hours.',
        '/uploads/res_1791802256949_6cbc181cbc472f27392d7cd831c2f6b0.pdf',
        'published',
        1,
        '2025-08-01',
        adminId,
      ]
    );

    // Timetable Entries for resTtId
    const ttEntries = [
      { day: 'Monday', period: 1, subject: 'Data Structures & Algorithms', faculty: 'Dr. K. Radhakrishnan', room: 'AB3-302' },
      { day: 'Monday', period: 2, subject: 'Digital Electronics', faculty: 'Prof. M. Varma', room: 'AB2-204' },
      { day: 'Monday', period: 3, subject: 'Discrete Mathematics', faculty: 'Dr. Priya Sharma', room: 'AB3-302' },
      { day: 'Monday', period: 4, subject: 'AI Principles Lab', faculty: 'Prof. Anand Kumar', room: 'Computing Lab 4' },

      { day: 'Tuesday', period: 1, subject: 'Computer Architecture', faculty: 'Dr. K. Radhakrishnan', room: 'AB3-302' },
      { day: 'Tuesday', period: 2, subject: 'Python Programming Lab', faculty: 'Prof. Rajesh K.', room: 'Computing Lab 2' },
      { day: 'Tuesday', period: 3, subject: 'Technical English', faculty: 'Dr. S. Nair', room: 'AB1-108' },

      { day: 'Wednesday', period: 1, subject: 'Discrete Mathematics', faculty: 'Dr. Priya Sharma', room: 'AB3-302' },
      { day: 'Wednesday', period: 2, subject: 'Data Structures Lab', faculty: 'Dr. K. Radhakrishnan', room: 'Computing Lab 3' },
      { day: 'Wednesday', period: 3, subject: 'Constitution of India', faculty: 'Prof. V. Gupta', room: 'AB1-108' },

      { day: 'Thursday', period: 1, subject: 'Digital Electronics Lab', faculty: 'Prof. M. Varma', room: 'Hardware Lab 1' },
      { day: 'Thursday', period: 2, subject: 'Environmental Sciences', faculty: 'Dr. R. Menon', room: 'AB2-202' },
      { day: 'Thursday', period: 3, subject: 'Mentor Consultation / Tutorial', faculty: 'Dr. K. Radhakrishnan', room: 'AB3-412' },

      { day: 'Friday', period: 1, subject: 'Data Structures & Algorithms', faculty: 'Dr. K. Radhakrishnan', room: 'AB3-302' },
      { day: 'Friday', period: 2, subject: 'AI Seminar & Ethics', faculty: 'Prof. Anand Kumar', room: 'Auditorium 2' },
      { day: 'Friday', period: 3, subject: 'Co-Curricular / Project Hours', faculty: 'Staff Advisors', room: 'Innovation Hub' },
    ];

    for (let i = 0; i < ttEntries.length; i++) {
      const e = ttEntries[i];
      db.run(
        `INSERT INTO timetable_entries (id, resource_id, day, period, subject, faculty, room, department, year, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [`tte_seed_${i + 1}`, resTtId, e.day, e.period, e.subject, e.faculty, e.room, 'School of Computing Sciences', '1st Year']
      );
    }

    // 2. Academic Calendar
    const resCalId = 'res_seed_cal_01';
    db.run(
      `INSERT INTO resources (id, title, category, department, academic_year, description, file_url, status, version, effective_date, uploaded_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-5 days'), datetime('now', '-5 days'))`,
      [
        resCalId,
        'University Academic Calendar (2025-26)',
        'calendar',
        'All',
        'All',
        'Official Academic Senate calendar specifying working instructional days, continuous assessment windows, mid-term examinations, and vacation schedules.',
        '/uploads/res_1791802256957_de2aa2d1d66e02a2264e91c66936e591.pdf',
        'published',
        1,
        '2025-07-15',
        adminId,
      ]
    );

    // 3. Circular for Mid-Term Examination Registration
    const resCirc1Id = 'res_seed_circ_01';
    db.run(
      `INSERT INTO resources (id, title, category, department, academic_year, description, file_url, status, version, effective_date, uploaded_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-1 days'), datetime('now', '-1 days'))`,
      [
        resCirc1Id,
        'Circular: Mid-Term Examination Clearance & Attendance Threshold',
        'circular',
        'School of Computing Sciences',
        '1st Year',
        'Important notification regarding mandatory 75% attendance threshold verification for Mid-Term examinations starting October 15. Students below 75% must submit condonation dockets before deadline.',
        '/uploads/res_1791802257008_389b85ef3167f33e281cf30da08b616b.pdf',
        'published',
        1,
        '2025-10-10',
        adminId,
      ]
    );

    // 4. Circular for Campus Innovation & Hackathon
    const resCirc2Id = 'res_seed_circ_02';
    db.run(
      `INSERT INTO resources (id, title, category, department, academic_year, description, file_url, status, version, effective_date, uploaded_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-2 days'), datetime('now', '-2 days'))`,
      [
        resCirc2Id,
        'Circular: National AI & Robotics Hackathon 2025 Registration',
        'circular',
        'All',
        'All',
        'All undergraduate students are invited to form teams for the 48-Hour National AI Hackathon. Special OD (On-Duty) attendance exemption applies under Sec 4.3.',
        '/uploads/res_1791802256979_f5a96c671bccdaba91b70b3bbaec3401.docx',
        'published',
        1,
        '2025-10-05',
        adminId,
      ]
    );

    console.log('[Database] Seeded initial published resources (timetables, academic calendar, circulars)');
  }
}

