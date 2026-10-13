/**
 * Comprehensive Automated Test Suite: Google Auth with Role-Based Routing
 *
 * Verifies:
 * 1. Registered student gets student role.
 * 2. Registered mentor gets mentor role.
 * 3. Admin gets admin role.
 * 4. Unknown email gets HTTP 403 with exact message:
 *    "This email is not registered with CampusDesk. Please contact your administrator."
 * 5. Unverified email (email_verified: false) gets HTTP 403.
 * 6. Invalid token gets HTTP 401.
 * 7. Client-supplied role is completely ignored; role comes strictly from database.
 * 8. Student can never become mentor through this endpoint.
 * 9. Mentors and admins cannot be auto-created through Google sign-in.
 * 10. Google sub mismatch on subsequent login is rejected with HTTP 403.
 * 11. Deactivated user (is_active = 0) is rejected with HTTP 403.
 * 12. Every sign-in attempt is recorded in auth_audit_log.
 * 13. Admin bulk CSV import works for adding mentor and student institutional emails.
 */

const http = require('http');
const { initDb, query, queryOne, run } = require('./dist/db');

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

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
    throw new Error(message);
  } else {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  }
}

function createMockGoogleToken(payloadOrError) {
  return 'mock_google_token:' + Buffer.from(JSON.stringify(payloadOrError)).toString('base64');
}

async function runGoogleAuthTests() {
  console.log('========================================================================');
  console.log('🛡️ CampusDesk AI - Google Authentication & Role-Based Routing Tests');
  console.log('========================================================================\n');

  await initDb();

  // Create mock tokens
  const tokenStudentKishor = createMockGoogleToken({
    sub: 'google_sub_kishor_101',
    email: 'kishorkumarp.cs24@bitsathy.ac.in',
    emailVerified: true,
    name: 'Kishorkumar P',
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  const tokenMentorRadhakrishnan = createMockGoogleToken({
    sub: 'google_sub_radhakrishnan_202',
    email: 'mentor.radhakrishnan@campus.edu',
    emailVerified: true,
    name: 'Dr. K. Radhakrishnan',
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  const tokenAdmin = createMockGoogleToken({
    sub: 'google_sub_admin_303',
    email: 'admin@campus.edu',
    emailVerified: true,
    name: 'System Administrator',
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  const tokenUnknownStudent = createMockGoogleToken({
    sub: 'google_sub_stranger_404',
    email: 'unknown.stranger@random.com',
    emailVerified: true,
    name: 'Unknown Person',
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  const tokenUnverifiedEmail = createMockGoogleToken({
    sub: 'google_sub_unverified_505',
    email: 'unverified.user@campus.edu',
    emailVerified: false, // NOT verified
    name: 'Unverified Student',
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  const tokenInvalid = createMockGoogleToken({
    error: 'Google token verification failed: Invalid token signature',
  });

  const tokenExpired = createMockGoogleToken({
    error: 'Google token verification failed: Google ID token has expired',
  });

  const tokenAudience = createMockGoogleToken({
    error: 'Google token verification failed: Wrong recipient, audience mismatch',
  });

  try {
    // -------------------------------------------------------------------------
    // Test 1: Registered Student gets student role
    // -------------------------------------------------------------------------
    console.log('[Test 1] Registered Student Google Sign-In...');
    const resStudent = await request(
      { path: '/api/auth/google', method: 'POST' },
      { idToken: tokenStudentKishor }
    );
    assert(resStudent.status === 200, 'Student login returned HTTP 200');
    assert(resStudent.body.user.role === 'student', 'User role resolved strictly as student');
    assert(resStudent.body.user.email === 'kishorkumarp.cs24@bitsathy.ac.in', 'User email matched');
    assert(resStudent.body.student !== null, 'Student profile returned with advisor/mentor data');
    assert(typeof resStudent.body.token === 'string', 'JWT bearer token issued');

    // -------------------------------------------------------------------------
    // Test 2: Registered Mentor gets mentor role
    // -------------------------------------------------------------------------
    console.log('\n[Test 2] Registered Mentor Google Sign-In...');
    const resMentor = await request(
      { path: '/api/auth/google', method: 'POST' },
      { idToken: tokenMentorRadhakrishnan }
    );
    assert(resMentor.status === 200, 'Mentor login returned HTTP 200');
    assert(resMentor.body.user.role === 'mentor', 'User role resolved strictly as mentor');
    assert(resMentor.body.user.name === 'Dr. K. Radhakrishnan', 'Mentor name resolved');
    assert(typeof resMentor.body.token === 'string', 'JWT bearer token issued for mentor');

    // -------------------------------------------------------------------------
    // Test 3: Admin gets admin role
    // -------------------------------------------------------------------------
    console.log('\n[Test 3] Admin Google Sign-In...');
    const resAdmin = await request(
      { path: '/api/auth/google', method: 'POST' },
      { idToken: tokenAdmin }
    );
    assert(resAdmin.status === 200, 'Admin login returned HTTP 200');
    assert(resAdmin.body.user.role === 'admin', 'User role resolved strictly as admin');
    assert(typeof resAdmin.body.token === 'string', 'JWT bearer token issued for admin');

    // -------------------------------------------------------------------------
    // Test 4: Unknown email gets HTTP 403 with exact required message
    // -------------------------------------------------------------------------
    console.log('\n[Test 4] Unknown Unregistered Email...');
    const resUnknown = await request(
      { path: '/api/auth/google', method: 'POST' },
      { idToken: tokenUnknownStudent }
    );
    assert(resUnknown.status === 403, 'Unknown email rejected with HTTP 403');
    assert(
      resUnknown.body.error === 'This email is not registered with CampusDesk. Please contact your administrator.',
      'Exact error message returned: "This email is not registered with CampusDesk. Please contact your administrator."'
    );

    // -------------------------------------------------------------------------
    // Test 5: Unverified Google Email gets HTTP 403
    // -------------------------------------------------------------------------
    console.log('\n[Test 5] Unverified Google Email (email_verified: false)...');
    const resUnverified = await request(
      { path: '/api/auth/google', method: 'POST' },
      { idToken: tokenUnverifiedEmail }
    );
    assert(resUnverified.status === 403, 'Unverified email rejected with HTTP 403');
    assert(
      resUnverified.body.error.includes('Google email is not verified'),
      'Clear unverified email explanation returned'
    );

    // -------------------------------------------------------------------------
    // Test 6: Invalid token, expired token, wrong audience get HTTP 401
    // -------------------------------------------------------------------------
    console.log('\n[Test 6] Invalid, Expired, and Wrong-Audience Tokens...');
    const resInvalid = await request(
      { path: '/api/auth/google', method: 'POST' },
      { idToken: tokenInvalid }
    );
    assert(resInvalid.status === 401, 'Invalid signature rejected with HTTP 401');

    const resExpired = await request(
      { path: '/api/auth/google', method: 'POST' },
      { idToken: tokenExpired }
    );
    assert(resExpired.status === 401, 'Expired token rejected with HTTP 401');

    const resAudience = await request(
      { path: '/api/auth/google', method: 'POST' },
      { idToken: tokenAudience }
    );
    assert(resAudience.status === 401, 'Wrong audience rejected with HTTP 401');

    // -------------------------------------------------------------------------
    // Test 7: Client-supplied role is completely ignored
    // -------------------------------------------------------------------------
    console.log('\n[Test 7] Client-Supplied Role Tampering Ignored...');
    const resTamper = await request(
      { path: '/api/auth/google', method: 'POST' },
      {
        idToken: tokenStudentKishor,
        role: 'admin',      // Tamper attempt
        email: 'hacker@xyz', // Tamper attempt
        name: 'Hacker Name', // Tamper attempt
      }
    );
    assert(resTamper.status === 200, 'Student login succeeded');
    assert(resTamper.body.user.role === 'student', 'Tampered role "admin" was completely IGNORED; role is student');
    assert(resTamper.body.user.email === 'kishorkumarp.cs24@bitsathy.ac.in', 'Tampered email ignored; DB email used');

    // -------------------------------------------------------------------------
    // Test 8: Student can never become mentor through this endpoint
    // -------------------------------------------------------------------------
    console.log('\n[Test 8] Student cannot escalate to mentor...');
    const resEscalate = await request(
      { path: '/api/auth/google', method: 'POST' },
      { idToken: tokenStudentKishor, role: 'mentor' }
    );
    assert(resEscalate.body.user.role === 'student', 'Role remains student, escalation impossible');

    // -------------------------------------------------------------------------
    // Test 9: Mentors and Admins cannot be auto-created through Google sign-in
    // -------------------------------------------------------------------------
    console.log('\n[Test 9] Mentors and Admins cannot be auto-created...');
    const tokenFakeMentor = createMockGoogleToken({
      sub: 'google_sub_mentor_fake_999',
      email: 'new.fake.mentor@campus.edu',
      emailVerified: true,
      name: 'Fake Mentor',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const resFakeMentor = await request(
      { path: '/api/auth/google', method: 'POST' },
      { idToken: tokenFakeMentor, role: 'mentor' }
    );
    assert(resFakeMentor.status === 403, 'Unregistered mentor attempt rejected with 403');
    assert(
      resFakeMentor.body.error === 'This email is not registered with CampusDesk. Please contact your administrator.',
      'Unregistered mentor got "This email is not registered with CampusDesk. Please contact your administrator."'
    );

    // -------------------------------------------------------------------------
    // Test 10: Google Sub Mismatch Rejection
    // -------------------------------------------------------------------------
    console.log('\n[Test 10] Google sub mismatch on subsequent login...');
    const tokenSubMismatch = createMockGoogleToken({
      sub: 'DIFFERENT_HIJACKED_SUB_9999',
      email: 'kishorkumarp.cs24@bitsathy.ac.in',
      emailVerified: true,
      name: 'Kishor Impersonator',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const resSubMismatch = await request(
      { path: '/api/auth/google', method: 'POST' },
      { idToken: tokenSubMismatch }
    );
    assert(resSubMismatch.status === 403, 'Sub mismatch rejected with HTTP 403');
    assert(
      resSubMismatch.body.error.includes('Google account mismatch'),
      'Rejection indicates Google account mismatch'
    );

    // -------------------------------------------------------------------------
    // Test 11: Deactivated User Rejection
    // -------------------------------------------------------------------------
    console.log('\n[Test 11] Deactivated user rejection...');
    const adminAuthRes = await request(
      { path: '/api/auth/login', method: 'POST' },
      { email: 'admin@campus.edu', password: 'admin123' }
    );
    const adminTokenForDeact = adminAuthRes.body.token;

    const deactEmail = `deactivated.student.${Date.now()}@campus.edu`;
    const createDeactRes = await request(
      {
        path: '/api/admin/users',
        method: 'POST',
        headers: { Authorization: `Bearer ${adminTokenForDeact}` },
      },
      {
        email: deactEmail,
        password: 'password123',
        name: 'Deactivated Student',
        role: 'student',
      }
    );
    const createdUserId = createDeactRes.body.user.id;

    // Deactivate user via admin endpoint
    await request(
      {
        path: `/api/admin/users/${createdUserId}/status`,
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminTokenForDeact}` },
      },
      { isActive: false }
    );

    const tokenDeact = createMockGoogleToken({
      sub: 'google_sub_deact_111',
      email: deactEmail,
      emailVerified: true,
      name: 'Deactivated Student',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const resDeact = await request(
      { path: '/api/auth/google', method: 'POST' },
      { idToken: tokenDeact }
    );
    assert(resDeact.status === 403, 'Deactivated user rejected with HTTP 403');
    assert(
      resDeact.body.error.includes('deactivated'),
      'Clear account deactivated message returned'
    );

    // -------------------------------------------------------------------------
    // Test 12: Audit Log Verification
    // -------------------------------------------------------------------------
    console.log('\n[Test 12] Audit Logging of sign-in attempts...');
    const auditLogs = query('SELECT * FROM auth_audit_log WHERE provider = ? ORDER BY created_at DESC LIMIT 20', ['google']);
    assert(auditLogs.length > 0, `Recorded ${auditLogs.length} Google auth audit logs`);
    const successLog = auditLogs.find((l) => l.status === 'success');
    const failureLog = auditLogs.find((l) => l.status === 'failure');
    assert(!!successLog, 'Recorded successful sign-in audit entry');
    assert(!!failureLog, 'Recorded failed sign-in audit entry');

    // -------------------------------------------------------------------------
    // Test 13: Admin Bulk CSV / User Import
    // -------------------------------------------------------------------------
    console.log('\n[Test 13] Admin User Import (CSV and JSON)...');
    const adminLoginRes = await request(
      { path: '/api/auth/login', method: 'POST' },
      { email: 'admin@campus.edu', password: 'admin123' }
    );
    const adminToken = adminLoginRes.body.token;

    const ts = Date.now();
    const newMentorEmail = `new.mentor.${ts}@campus.edu`;
    const newStudentEmail = `new.student.${ts}@campus.edu`;

    const sampleCsv = `name,email,role,department
Dr. New Mentor,${newMentorEmail},mentor,Computer Science
New Student One,${newStudentEmail},student,Information Technology`;

    const importRes = await request(
      {
        path: '/api/admin/users/import-csv',
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      },
      { csvData: sampleCsv }
    );
    assert(importRes.status === 200, 'Admin CSV import returned HTTP 200');
    assert(importRes.body.imported >= 2, `Imported ${importRes.body.imported} user accounts from CSV`);

    // Verify imported mentor can now sign in via Google!
    const tokenImportedMentor = createMockGoogleToken({
      sub: `google_sub_imported_mentor_${ts}`,
      email: newMentorEmail,
      emailVerified: true,
      name: 'Dr. New Mentor',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const resImportedMentorGoogle = await request(
      { path: '/api/auth/google', method: 'POST' },
      { idToken: tokenImportedMentor }
    );
    assert(resImportedMentorGoogle.status === 200, 'Imported mentor successfully signed in via Google');
    assert(resImportedMentorGoogle.body.user.role === 'mentor', 'Imported mentor assigned mentor role');

    console.log('\n========================================================================');
    console.log(`🎉 ALL GOOGLE AUTH TESTS PASSED: ${passed} passed, ${failed} failed`);
    console.log('========================================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err.message);
    console.log(`Results: ${passed} passed, ${failed + 1} failed\n`);
    process.exit(1);
  }
}

runGoogleAuthTests();
