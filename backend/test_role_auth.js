// Role-Based Authorization Integration Test Suite
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';

async function runRoleAuthTests() {
  console.log('=== RUNNING SERVER-SIDE ROLE AUTHORIZATION TESTS ===\n');
  let passed = 0;
  let failed = 0;

  function assert(title, condition, extra = '') {
    if (condition) {
      console.log(`PASS: ${title} ${extra}`);
      passed++;
    } else {
      console.error(`FAIL: ${title} ${extra}`);
      failed++;
    }
  }

  // 1. Authenticate Student (Kishor, assigned to Mentor Dr. K. Radhakrishnan)
  const studentLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'kishorkumarp.cs24@bitsathy.ac.in', password: 'password123' }),
  });
  const studentData = await studentLoginRes.json();
  const studentToken = studentData.token;
  assert('Student login succeeds', studentLoginRes.status === 200 && Boolean(studentToken));

  // 2. Authenticate Faculty / Mentor
  const facultyLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'faculty@campus.edu', password: 'faculty123' }),
  });
  const facultyData = await facultyLoginRes.json();
  const facultyToken = facultyData.token;
  assert('Faculty login succeeds', facultyLoginRes.status === 200 && Boolean(facultyToken));


  // 3. Register a Second Student (Student B) to test cross-tenant isolation
  const studentBEmail = `student.b.${Date.now()}@campus.edu`;
  const studentBRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: studentBEmail,
      password: 'password123',
      name: 'Student B',
      rollNo: `24BCS${Math.floor(10000 + Math.random() * 90000)}`,
    }),
  });
  const studentBData = await studentBRes.json();
  const studentBToken = studentBData.token;
  assert('Student B registration succeeds', studentBRes.status === 201 && Boolean(studentBToken));

  // 4. Student A creates a docket
  const createDocketRes = await fetch(`${BASE_URL}/api/queries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({
      category: 'Attendance & Leave',
      subject: 'Role Auth Test Docket',
      title: 'Testing Role Authorization',
      description: 'Docket created by Student A',
    }),
  });
  const createdDocket = await createDocketRes.json();
  const docketId = createdDocket.id;
  assert('Student A creates docket', createDocketRes.status === 201 && Boolean(docketId), `(Docket ID: ${docketId})`);

  // 5. TEST: Student A attempts to change docket status (Privilege Escalation Attack)
  const studentStatusAttempt = await fetch(`${BASE_URL}/api/queries/${docketId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({ status: 'resolved', facultyRemark: 'Illegal self-approval' }),
  });
  assert(
    'Student blocked from PATCH /api/queries/:id/status (HTTP 403)',
    studentStatusAttempt.status === 403,
    `(Got ${studentStatusAttempt.status})`
  );

  // 6. TEST: Unauthenticated user attempts to change docket status
  const unauthStatusAttempt = await fetch(`${BASE_URL}/api/queries/${docketId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'resolved' }),
  });
  assert(
    'Unauthenticated request blocked from PATCH /api/queries/:id/status (HTTP 401)',
    unauthStatusAttempt.status === 401,
    `(Got ${unauthStatusAttempt.status})`
  );

  // 7. TEST: Faculty authorizes status change
  const facultyStatusRes = await fetch(`${BASE_URL}/api/queries/${docketId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${facultyToken}`,
    },
    body: JSON.stringify({
      status: 'under_review',
      facultyRemark: 'Under faculty review by HOD',
    }),
  });
  const facultyStatusData = await facultyStatusRes.json();
  assert(
    'Faculty allowed to PATCH /api/queries/:id/status (HTTP 200)',
    facultyStatusRes.status === 200 && facultyStatusData.status === 'under_review',
    `(New status: ${facultyStatusData.status})`
  );

  // 8. TEST: Student B attempts to append audit entry to Student A\'s docket (Cross-Student Tampering)
  const crossAuditRes = await fetch(`${BASE_URL}/api/queries/${docketId}/audit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentBToken}`,
    },
    body: JSON.stringify({ text: 'Malicious student comment injected into another docket' }),
  });
  assert(
    'Student B blocked from commenting on Student A docket (HTTP 403)',
    crossAuditRes.status === 403,
    `(Got ${crossAuditRes.status})`
  );

  // 9. TEST: Student A appends legitimate audit entry to own docket
  const ownAuditRes = await fetch(`${BASE_URL}/api/queries/${docketId}/audit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({ text: 'Legitimate follow-up note from Student A' }),
  });
  assert(
    'Student A allowed to comment on own docket (HTTP 201)',
    ownAuditRes.status === 201
  );

  // 10. TEST: Unauthenticated file upload blocked
  const unauthUploadRes = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
  });
  assert(
    'Unauthenticated upload blocked (HTTP 401)',
    unauthUploadRes.status === 401,
    `(Got ${unauthUploadRes.status})`
  );

  // 11. TEST: Role-filtered queries list
  const studentQueriesRes = await fetch(`${BASE_URL}/api/queries`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const studentQueries = await studentQueriesRes.json();
  const allMatchStudent = Array.isArray(studentQueries) && studentQueries.every(q => q.studentId === studentData.student.id);
  assert(
    'Student queries endpoint returns only student\'s own dockets',
    studentQueriesRes.status === 200 && allMatchStudent,
    `(Found ${studentQueries.length} dockets for student)`
  );

  const facultyQueriesRes = await fetch(`${BASE_URL}/api/queries`, {
    headers: { Authorization: `Bearer ${facultyToken}` },
  });
  const facultyQueries = await facultyQueriesRes.json();
  const mentorHasMenteeDocket = Array.isArray(facultyQueries) && facultyQueries.some(q => q.id === docketId);
  assert(
    'Mentor queries endpoint returns assigned mentee dockets',
    facultyQueriesRes.status === 200 && mentorHasMenteeDocket,
    `(Mentor sees ${facultyQueries.length} mentee dockets, including ${docketId})`
  );

  // 12. TEST: Admin queries endpoint returns all dockets
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@campus.edu', password: 'admin123' }),
  });
  const adminData = await adminLoginRes.json();
  const adminQueriesRes = await fetch(`${BASE_URL}/api/queries`, {
    headers: { Authorization: `Bearer ${adminData.token}` },
  });
  const adminQueries = await adminQueriesRes.json();
  assert(
    'Admin queries endpoint returns all university dockets',
    adminQueriesRes.status === 200 && Array.isArray(adminQueries) && adminQueries.length >= facultyQueries.length,
    `(Admin sees ${adminQueries.length} total dockets)`
  );

  // 13. TEST: Registering with role "admin" still creates role "student"
  const spoofAdminEmail = `spoof.admin.${Date.now()}@campus.edu`;
  const spoofAdminRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: spoofAdminEmail,
      password: 'password123',
      name: 'Spoof Admin Hacker',
      role: 'admin',
    }),
  });
  const spoofAdminData = await spoofAdminRes.json();
  assert(
    'Registering with role "admin" is ignored and creates role "student"',
    spoofAdminRes.status === 201 && spoofAdminData.user?.role === 'student',
    `(Actual role returned: ${spoofAdminData.user?.role})`
  );

  // 14. TEST: Registering with role "mentor" still creates role "student"
  const spoofMentorEmail = `spoof.mentor.${Date.now()}@campus.edu`;
  const spoofMentorRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: spoofMentorEmail,
      password: 'password123',
      name: 'Spoof Mentor Hacker',
      role: 'mentor',
    }),
  });
  const spoofMentorData = await spoofMentorRes.json();
  assert(
    'Registering with role "mentor" is ignored and creates role "student"',
    spoofMentorRes.status === 201 && spoofMentorData.user?.role === 'student',
    `(Actual role returned: ${spoofMentorData.user?.role})`
  );

  // 15. TEST: POST /api/admin/users without token returns 401
  const unauthAdminUserRes = await fetch(`${BASE_URL}/api/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `new.mentor.${Date.now()}@campus.edu`,
      password: 'password123',
      name: 'New Faculty Mentor',
      role: 'mentor',
    }),
  });
  assert(
    'POST /api/admin/users without token returns 401 Unauthorized',
    unauthAdminUserRes.status === 401,
    `(Got ${unauthAdminUserRes.status})`
  );

  // 16. TEST: POST /api/admin/users with student token returns 403
  const studentAdminUserRes = await fetch(`${BASE_URL}/api/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({
      email: `new.mentor.${Date.now()}@campus.edu`,
      password: 'password123',
      name: 'New Faculty Mentor',
      role: 'mentor',
    }),
  });
  assert(
    'POST /api/admin/users with student token returns 403 Forbidden',
    studentAdminUserRes.status === 403,
    `(Got ${studentAdminUserRes.status})`
  );

  // 17. TEST: POST /api/admin/users with mentor token returns 403
  const mentorAdminUserRes = await fetch(`${BASE_URL}/api/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${facultyToken}`,
    },
    body: JSON.stringify({
      email: `new.mentor.${Date.now()}@campus.edu`,
      password: 'password123',
      name: 'New Faculty Mentor',
      role: 'mentor',
    }),
  });
  assert(
    'POST /api/admin/users with mentor token returns 403 Forbidden',
    mentorAdminUserRes.status === 403,
    `(Got ${mentorAdminUserRes.status})`
  );

  // 18. TEST: POST /api/admin/users with admin token successfully creates mentor
  const validAdminNewMentorEmail = `legit.mentor.${Date.now()}@campus.edu`;
  const adminCreateMentorRes = await fetch(`${BASE_URL}/api/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminData.token}`,
    },
    body: JSON.stringify({
      email: validAdminNewMentorEmail,
      password: 'mentorPassword123',
      name: 'Dr. Valid New Mentor',
      role: 'mentor',
      department: 'School of Computing Sciences',
    }),
  });
  const createdMentorData = await adminCreateMentorRes.json();
  assert(
    'POST /api/admin/users with admin token creates mentor with role "mentor"',
    adminCreateMentorRes.status === 201 && createdMentorData.user?.role === 'mentor',
    `(Got status ${adminCreateMentorRes.status}, role: ${createdMentorData.user?.role})`
  );

  // Cleanup the newly created test mentor so the roster remains pristine
  const { initDb: dbInit, run: dbRun, saveDb: dbSave } = require('./dist/db');
  await dbInit();
  dbRun('DELETE FROM users WHERE lower(email) = ?', [validAdminNewMentorEmail]);
  dbSave();


  console.log(`\n=== ROLE AUTHORIZATION TEST SUMMARY ===`);
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runRoleAuthTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
