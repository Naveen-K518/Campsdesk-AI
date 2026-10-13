-- CampusDesk AI - Database Schema

-- 1. Students Table
CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    roll_no VARCHAR(50) UNIQUE NOT NULL,
    program VARCHAR(100) NOT NULL,
    year VARCHAR(20) NOT NULL,
    batch VARCHAR(20) NOT NULL,
    avatar_url TEXT,
    mobile VARCHAR(20) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    cgpa DECIMAL(3, 2),
    credits INT,
    attendance_aggregate DECIMAL(5, 2),
    department VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Guidelines & Bylaws Table
CREATE TABLE IF NOT EXISTS guidelines (
    id VARCHAR(50) PRIMARY KEY,
    section VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    verification_criteria JSON,
    last_updated VARCHAR(50),
    most_consulted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Queries / Dockets Table
CREATE TABLE IF NOT EXISTS queries (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    student_id VARCHAR(50) REFERENCES students(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    sub_line TEXT,
    priority VARCHAR(20) DEFAULT 'normal', -- normal, high, urgent
    status VARCHAR(50) DEFAULT 'active', -- active, under_review, action_required, resolved, completed, live_agent_sync
    citation VARCHAR(100),
    ai_confidence INT,
    resolution_time_mins INT,
    rating INT,
    assigned_mentor_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Mentor Assignments Table (1:1 student-to-mentor)
CREATE TABLE IF NOT EXISTS mentor_assignments (
    id VARCHAR(50) PRIMARY KEY,
    mentor_id VARCHAR(50) NOT NULL,
    student_id VARCHAR(50) UNIQUE NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Workflow Steps Table
CREATE TABLE IF NOT EXISTS workflow_steps (
    id VARCHAR(50) PRIMARY KEY,
    query_id VARCHAR(50) REFERENCES queries(id) ON DELETE CASCADE,
    step_order INT NOT NULL,
    label VARCHAR(255) NOT NULL,
    detail TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'in_progress', -- done, in_progress, locked
    highlight_key VARCHAR(100),
    highlight_value VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Audit Entries / Audit Log Table
CREATE TABLE IF NOT EXISTS audit_entries (
    id VARCHAR(50) PRIMARY KEY,
    query_id VARCHAR(50) REFERENCES queries(id) ON DELETE CASCADE,
    sender VARCHAR(30) NOT NULL, -- student, agent, mentor, faculty, admin
    author_name VARCHAR(100) NOT NULL,
    role_badge VARCHAR(50),
    timestamp VARCHAR(50) NOT NULL,
    text TEXT,
    action_taken TEXT,
    status_banner TEXT,
    token_ref VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Admin Resources Table
CREATE TABLE IF NOT EXISTS resources (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- rules, timetable, calendar, circular, form, other
    department VARCHAR(100),
    academic_year VARCHAR(50),
    description TEXT,
    file_url TEXT,
    status VARCHAR(30) DEFAULT 'draft', -- draft, published, archived
    version INT DEFAULT 1,
    effective_date VARCHAR(50),
    uploaded_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Resource Versions Table
CREATE TABLE IF NOT EXISTS resource_versions (
    id VARCHAR(50) PRIMARY KEY,
    resource_id VARCHAR(50) NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    version INT NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_by VARCHAR(50) NOT NULL,
    change_summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Timetable Entries Table
CREATE TABLE IF NOT EXISTS timetable_entries (
    id VARCHAR(50) PRIMARY KEY,
    resource_id VARCHAR(50) NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    day VARCHAR(20) NOT NULL,
    period INT NOT NULL,
    subject VARCHAR(255) NOT NULL,
    faculty VARCHAR(100),
    room VARCHAR(50),
    department VARCHAR(100),
    year VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


