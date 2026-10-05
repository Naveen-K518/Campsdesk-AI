import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

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
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      name TEXT NOT NULL,
      student_id TEXT,
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
  `);

  // Seed default data
  await seedInitialData();

  saveDb();
  console.log('[Database] SQLite initialized successfully at', dbFilePath);
}

async function seedInitialData(): Promise<void> {
  // 1. Seed guidelines
  const existingGuidelines = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM guidelines');
  if (!existingGuidelines || existingGuidelines.count === 0) {
    const guidelinesSeedPath = path.resolve(__dirname, '../../../db/seeds/guidelines.json');
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

  // 2. Seed students and users
  const existingStudents = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM students');
  if (!existingStudents || existingStudents.count === 0) {
    const studentsSeedPath = path.resolve(__dirname, '../../../db/seeds/students.json');
    if (fs.existsSync(studentsSeedPath)) {
      const raw = fs.readFileSync(studentsSeedPath, 'utf-8');
      const items = JSON.parse(raw);
      for (const s of items) {
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
            'k.radhakrishnan@campus.edu',
          ]
        );

        // Create matching student user
        const passwordHash = bcrypt.hashSync('password123', 10);
        db.run(
          `INSERT INTO users (id, email, password_hash, role, name, student_id)
           VALUES (?, ?, ?, 'student', ?, ?)`,
          [`u_${s.id}`, s.email, passwordHash, s.name, s.id]
        );
      }
      console.log(`[Database] Seeded ${items.length} student profiles and user logins`);
    }
  }

  // 3. Seed Faculty/Admin user if not present
  const existingFaculty = queryOne('SELECT * FROM users WHERE role = ?', ['faculty']);
  if (!existingFaculty) {
    const facultyHash = bcrypt.hashSync('faculty123', 10);
    db.run(
      `INSERT INTO users (id, email, password_hash, role, name, student_id)
       VALUES (?, ?, ?, 'faculty', ?, ?)`,
      ['u_faculty_01', 'faculty@campus.edu', facultyHash, 'Dr. K. Radhakrishnan', null]
    );
    console.log('[Database] Seeded default faculty user (faculty@campus.edu / faculty123)');
  }

  // 4. Seed sample queries if empty
  const existingQueries = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM queries');
  if (!existingQueries || existingQueries.count === 0) {
    const student = queryOne<{ id: string }>('SELECT id FROM students LIMIT 1');
    const studentId = student ? student.id : 'std_01';

    // Sample Query 1: Medical leave condonation
    const q1Id = 'q_1001';
    db.run(
      `INSERT INTO queries (id, code, student_id, category, subject, title, description, sub_line, priority, status, citation, assigned_to, ai_confidence, resolution_time_mins, days_condonation, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-2 days'), datetime('now', '-1 hours'))`,
      [
        q1Id,
        '#CS-4921',
        studentId,
        'Attendance & Leave',
        'Medical Leave Condonation',
        'Medical Leave Condonation (Verified by AI)',
        'Student submitted St. Jude Hospital Certificate (1.2 MB). Verified under Ordinance Sec 4.2.',
        'Routed to HOD • Case Medical-Cert.pdf',
        'urgent',
        'under_review',
        'Cited Attendance Bylaws Sec 4.2',
        'Dr. K. Radhakrishnan (HOD CSE)',
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
      { order: 4, label: 'Forwarded to HOD', detail: 'Docket forwarded to Dr. K. Radhakrishnan for executive sign-off.', status: 'in_progress', hk: 'Target', hv: 'Faculty HOD' },
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
       VALUES (?, ?, 'agent', 'CampusDesk Autonomous Triage Agent', 'Autonomous Triage', '10:16 AM', 'Validated medical certificate format and doctor registration. Effective attendance projection: 88.5% post-condonation. Admissible under Senate Ordinance Sec 4.2.', 'Docket escalated to HOD CSE for executive approval.')`,
      [`at_${q1Id}_2`, q1Id]
    );

    // Sample Query 2: Hostel Leave Pass
    const q2Id = 'q_1002';
    db.run(
      `INSERT INTO queries (id, code, student_id, category, subject, title, description, sub_line, priority, status, citation, assigned_to, ai_confidence, resolution_time_mins, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-5 days'), datetime('now', '-4 days'))`,
      [
        q2Id,
        '#CS-4890',
        studentId,
        'Hostel & Mess',
        'Weekend Leave Pass',
        'Hostel Weekend Leave Pass (Gate Clearance)',
        'Weekend leave pass to home city with digital parent acknowledgement token.',
        'Auto-approved via Warden Bot',
        'normal',
        'resolved',
        'Cited Hostel Regulations Sec 6.1',
        'Warden (Hostel Block B)',
        98.2,
        12,
      ]
    );

    db.run(
      `INSERT INTO audit_entries (id, query_id, sender, author_name, role_badge, timestamp, text, status_banner, token_ref)
       VALUES (?, ?, 'faculty', 'Warden (Hostel Block B)', 'Hostel Administration', '11:00 AM', 'Parent SMS verification token verified. Gate exit authorized until Sunday 8:00 PM.', 'LEAVE PASS GRANTED', 'TOKEN-HP-84920')`,
      [`at_${q2Id}_1`, q2Id]
    );

    console.log('[Database] Seeded initial sample queries with workflow steps and audit transcripts');
  }
}
