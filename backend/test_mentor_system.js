/**
 * CampusDesk AI - Mentor System Integration Test Suite
 * 
 * Verifies:
 * 1. 3 mentors, 1 admin, 12 students authentication & role verification.
 * 2. Automatic mentor lookup on POST /api/queries (assigned_mentor_id set automatically).
 * 3. Assigned mentor can list and open their mentee's docket.
 * 4. Another mentor gets HTTP 403 Forbidden when opening or modifying the docket.
 * 5. Another student gets HTTP 403 Forbidden on foreign docket.
 * 6. Student without mentor gets marked 'unassigned' with assigned_mentor_id = null.
 * 7. Admin can view and open all dockets (including unassigned).
 * 8. Quota enforcement: Rejecting the 21st mentee assignment when MAX_MENTEES_PER_MENTOR is reached.
 */

const http = require('http');

const API_BASE = 'http://localhost:5000';

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.path, API_BASE);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function login(email, password) {
  const res = await request({ path: '/api/auth/login', method: 'POST' }, { email, password });
  if (res.status !== 200 || !res.body.token) {
    throw new Error(`Login failed for ${email}: status ${res.status} - ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.token, user: res.body.user, student: res.body.student };
}

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
    throw new Error(message);
  } else {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  }
}

async function runTests() {
  console.log('========================================================================');
  console.log('🎓 CampusDesk AI - Mentor System Integration Test Suite');
  console.log('========================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // Phase 1: Authentication and Role Verification
    // -------------------------------------------------------------------------
    console.log('[Phase 1] Authenticating all user roles...');

    const mentor1 = await login('faculty@campus.edu', 'faculty123');
    assert(mentor1.user.role === 'mentor', `Mentor 1 role is 'mentor' (id: ${mentor1.user.id})`);

    const mentor2 = await login('mentor.priya@campus.edu', 'mentor123');
    assert(mentor2.user.role === 'mentor', `Mentor 2 role is 'mentor' (id: ${mentor2.user.id})`);

    const mentor3 = await login('mentor.anand@campus.edu', 'mentor123');
    assert(mentor3.user.role === 'mentor', `Mentor 3 role is 'mentor' (id: ${mentor3.user.id})`);

    const admin = await login('admin@campus.edu', 'admin123');
    assert(admin.user.role === 'admin', `Admin role is 'admin' (id: ${admin.user.id})`);

    const kishor = await login('kishorkumarp.cs24@bitsathy.ac.in', 'password123');
    assert(kishor.user.role === 'student', `Kishor is student (id: ${kishor.user.id}, studentId: ${kishor.user.studentId})`);
    assert(kishor.student?.mentor?.name === 'Dr. K. Radhakrishnan', 'Kishor profile has designated mentor Dr. K. Radhakrishnan');

    const aarav = await login('aarav.sharma@campus.edu', 'password123');
    assert(aarav.user.role === 'student', `Aarav is student (id: ${aarav.user.id})`);
    assert(aarav.student?.mentor?.name === 'Dr. Priya Sharma', 'Aarav profile has designated mentor Dr. Priya Sharma');

    const rahul = await login('rahul.menon@campus.edu', 'password123');
    assert(rahul.user.role === 'student', `Rahul is unassigned student (id: ${rahul.user.id})`);

    console.log('\n[Phase 2] Testing Automatic Mentor Lookup on Query Creation...');

    // -------------------------------------------------------------------------
    // Phase 2: Kishor creates query -> auto-assigned to Mentor 1
    // -------------------------------------------------------------------------
    const createKishorQuery = await request(
      {
        path: '/api/queries',
        method: 'POST',
        headers: { Authorization: `Bearer ${kishor.token}` },
      },
      {
        category: 'Lab Clearance',
        subject: 'Compiler Design Lab Access',
        title: 'Special GPU Cluster Access for Final Project',
        description: 'Need access to DGX Station in CS Lab 4 for parallel computing evaluation.',
        priority: 'high',
      }
    );

    assert(createKishorQuery.status === 201, 'Kishor created query with status 201');
    const kishorDocket = createKishorQuery.body;
    assert(kishorDocket.assignedMentorId === mentor1.user.id, `Docket auto-assigned to Mentor 1 (${mentor1.user.id})`);
    assert(kishorDocket.status === 'under_review', 'Docket status is under_review');
    assert(kishorDocket.studentName === 'Kishorkumar P', 'Docket returned mentee name: Kishorkumar P');
    assert(kishorDocket.studentRollNo === '7376241CS249', 'Docket returned mentee roll number: 7376241CS249');

    // -------------------------------------------------------------------------
    // Phase 3: Mentor 1 access verification
    // -------------------------------------------------------------------------
    console.log('\n[Phase 3] Testing Assigned Mentor Access...');

    const mentor1List = await request({
      path: '/api/queries',
      headers: { Authorization: `Bearer ${mentor1.token}` },
    });
    assert(mentor1List.status === 200, 'Mentor 1 retrieved their queue (status 200)');
    const inMentor1Queue = mentor1List.body.some((q) => q.id === kishorDocket.id);
    assert(inMentor1Queue === true, "Kishor's docket appears in Mentor 1 queue");

    const mentor1Detail = await request({
      path: `/api/queries/${kishorDocket.id}`,
      headers: { Authorization: `Bearer ${mentor1.token}` },
    });
    assert(mentor1Detail.status === 200, 'Mentor 1 can open Kishor docket (status 200)');
    assert(mentor1Detail.body.code === kishorDocket.code, 'Mentor 1 retrieved matching docket code');

    // -------------------------------------------------------------------------
    // Phase 4: Another Mentor (Mentor 2) gets HTTP 403 Forbidden
    // -------------------------------------------------------------------------
    console.log('\n[Phase 4] Testing Cross-Mentor Isolation (Expected 403 Forbidden)...');

    const mentor2Detail = await request({
      path: `/api/queries/${kishorDocket.id}`,
      headers: { Authorization: `Bearer ${mentor2.token}` },
    });
    assert(mentor2Detail.status === 403, 'Mentor 2 opening Kishor docket gets HTTP 403 Forbidden');

    const mentor2List = await request({
      path: '/api/queries',
      headers: { Authorization: `Bearer ${mentor2.token}` },
    });
    const inMentor2Queue = mentor2List.body.some((q) => q.id === kishorDocket.id);
    assert(inMentor2Queue === false, "Kishor's docket is NOT visible in Mentor 2's queue");

    const mentor2Update = await request(
      {
        path: `/api/queries/${kishorDocket.id}/status`,
        method: 'PATCH',
        headers: { Authorization: `Bearer ${mentor2.token}` },
      },
      { status: 'resolved', facultyRemark: 'Unauthorized attempt by other mentor' }
    );
    assert(mentor2Update.status === 403, 'Mentor 2 trying to update docket status gets HTTP 403 Forbidden');

    const mentor2Audit = await request(
      {
        path: `/api/queries/${kishorDocket.id}/audit`,
        method: 'POST',
        headers: { Authorization: `Bearer ${mentor2.token}` },
      },
      { text: 'Unauthorized message attempt by Mentor 2' }
    );
    assert(mentor2Audit.status === 403, 'Mentor 2 trying to add audit message gets HTTP 403 Forbidden');

    // -------------------------------------------------------------------------
    // Phase 5: Another Student gets HTTP 403 Forbidden
    // -------------------------------------------------------------------------
    console.log('\n[Phase 5] Testing Student Privacy Isolation (Expected 403 Forbidden)...');

    const foreignStudentDetail = await request({
      path: `/api/queries/${kishorDocket.id}`,
      headers: { Authorization: `Bearer ${aarav.token}` },
    });
    assert(foreignStudentDetail.status === 403, 'Foreign student accessing Kishor docket gets HTTP 403 Forbidden');

    // -------------------------------------------------------------------------
    // Phase 6: Student without mentor -> marked "unassigned"
    // -------------------------------------------------------------------------
    console.log('\n[Phase 6] Testing Unassigned Student Query Flow...');

    // Guarantee unassigned state for Rahul
    await request(
      {
        path: '/api/mentors/unassign',
        method: 'POST',
        headers: { Authorization: `Bearer ${admin.token}` },
      },
      { studentId: 'std_12' }
    );

    const createRahulQuery = await request(
      {
        path: '/api/queries',
        method: 'POST',
        headers: { Authorization: `Bearer ${rahul.token}` },
      },
      {
        category: 'Course Add/Drop',
        subject: 'Elective Selection Clarification',
        title: 'Need to add Advanced Machine Learning elective',
        description: 'Portal says prerequisite pending but I completed Foundations course.',
      }
    );

    assert(createRahulQuery.status === 201, 'Unassigned student created query with status 201');
    const rahulDocket = createRahulQuery.body;
    assert(rahulDocket.assignedMentorId === null, 'Docket has assignedMentorId = null');
    assert(rahulDocket.status === 'unassigned', "Docket status marked as 'unassigned'");
    assert(rahulDocket.assignedTo === 'Unassigned', "Docket assignedTo is 'Unassigned'");

    // -------------------------------------------------------------------------
    // Phase 7: Admin can see everything
    // -------------------------------------------------------------------------
    console.log('\n[Phase 7] Testing Admin Universal Visibility...');

    const adminList = await request({
      path: '/api/queries',
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    assert(adminList.status === 200, 'Admin listed all queries (status 200)');
    const adminHasKishor = adminList.body.some((q) => q.id === kishorDocket.id);
    const adminHasRahul = adminList.body.some((q) => q.id === rahulDocket.id);
    assert(adminHasKishor === true, "Admin queue contains Kishor's docket");
    assert(adminHasRahul === true, "Admin queue contains Rahul's unassigned docket");

    const adminOpenKishor = await request({
      path: `/api/queries/${kishorDocket.id}`,
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    assert(adminOpenKishor.status === 200, 'Admin successfully opened Kishor docket');

    const adminOpenRahul = await request({
      path: `/api/queries/${rahulDocket.id}`,
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    assert(adminOpenRahul.status === 200, 'Admin successfully opened Rahul unassigned docket');

    // -------------------------------------------------------------------------
    // Phase 8: 20-Mentee Quota Limit and 21st Mentee Rejection
    // -------------------------------------------------------------------------
    console.log('\n[Phase 8] Testing MAX_MENTEES_PER_MENTOR (20 Mentees Rule)...');

    // Check Mentor 3's current mentees
    const mentor3Mentees = await request({
      path: '/api/mentors/my-mentees',
      headers: { Authorization: `Bearer ${mentor3.token}` },
    });
    console.log(`  ℹ Mentor 3 initial mentee count: ${mentor3Mentees.body.count}`);

    // Create mock students to fill Mentor 3's quota up to 20
    const needed = 20 - mentor3Mentees.body.count;
    console.log(`  ℹ Filling Mentor 3 quota with ${needed} students to reach exactly 20...`);

    // Register dummy test students
    for (let i = 1; i <= needed; i++) {
      const email = `quota_test_student_${i}_${Date.now()}@campus.edu`;
      const regRes = await request(
        { path: '/api/auth/register', method: 'POST' },
        {
          name: `Quota Student ${i}`,
          email,
          password: 'password123',
          role: 'student',
        }
      );
      assert(regRes.status === 201, `Registered quota student ${i}`);
      const studentId = regRes.body.student.id;

      // Assign to Mentor 3
      const assignRes = await request(
        {
          path: '/api/mentors/assign',
          method: 'POST',
          headers: { Authorization: `Bearer ${admin.token}` },
        },
        { mentorId: mentor3.user.id, studentId }
      );
      assert(assignRes.status === 200, `Assigned quota student ${i} to Mentor 3 (status 200)`);
    }

    // Verify Mentor 3 now has exactly 20 mentees
    const mentor3Filled = await request({
      path: '/api/mentors/my-mentees',
      headers: { Authorization: `Bearer ${mentor3.token}` },
    });
    assert(mentor3Filled.body.count === 20, `Mentor 3 has reached max quota: ${mentor3Filled.body.count}/20`);

    // Now register the 21st student
    const student21Email = `student_21_overflow_${Date.now()}@campus.edu`;
    const reg21 = await request(
      { path: '/api/auth/register', method: 'POST' },
      {
        name: 'Overflow Student 21',
        email: student21Email,
        password: 'password123',
        role: 'student',
      }
    );
    assert(reg21.status === 201, 'Registered 21st student');
    const student21Id = reg21.body.student.id;

    // Attempt to assign 21st mentee to Mentor 3 -> MUST BE REJECTED WITH HTTP 400
    console.log('  ℹ Attempting to assign 21st mentee to Mentor 3 (expecting rejection)...');
    const assign21Res = await request(
      {
        path: '/api/mentors/assign',
        method: 'POST',
        headers: { Authorization: `Bearer ${admin.token}` },
      },
      { mentorId: mentor3.user.id, studentId: student21Id }
    );

    assert(assign21Res.status === 400, `21st mentee assignment rejected with HTTP 400 (got ${assign21Res.status})`);
    assert(
      assign21Res.body.error && assign21Res.body.error.includes('maximum limit of 20 mentees'),
      `Correct error message received: "${assign21Res.body.error}"`
    );

    console.log('\n========================================================================');
    console.log(`🎉 ALL INTEGRATION TESTS PASSED: ${passedTests} passed, ${failedTests} failed`);
    console.log('========================================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err.message);
    console.log(`Results: ${passedTests} passed, ${failedTests + 1} failed\n`);
    process.exit(1);
  }
}

runTests();
