// Automated Integration Test Suite for Admin Content Management Backend
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('=== RUNNING ADMIN CONTENT MANAGEMENT INTEGRATION TESTS ===\n');

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

  // 1. Authenticate users
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@campus.edu', password: 'admin123' }),
  });
  const adminData = await adminLoginRes.json();
  const adminToken = adminData.token;
  assert('Admin login succeeds', adminLoginRes.status === 200 && Boolean(adminToken));

  const studentLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'kishorkumarp.cs24@bitsathy.ac.in', password: 'password123' }),
  });
  const studentData = await studentLoginRes.json();
  const studentToken = studentData.token;
  assert('Student login succeeds', studentLoginRes.status === 200 && Boolean(studentToken));

  const mentorLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'faculty@campus.edu', password: 'faculty123' }),
  });
  const mentorData = await mentorLoginRes.json();
  const mentorToken = mentorData.token;
  assert('Mentor login succeeds', mentorLoginRes.status === 200 && Boolean(mentorToken));

  // Helper to create multipart form-data body
  function makeMultipartBody(fields, file) {
    const boundary = '----CampusDeskBoundary' + Date.now();
    let body = '';

    for (const [key, val] of Object.entries(fields)) {
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
      body += `${val}\r\n`;
    }

    if (file) {
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="file"; filename="${file.name}"\r\n`;
      body += `Content-Type: ${file.type}\r\n\r\n`;
      body += file.content.toString('binary') + '\r\n';
    }

    body += `--${boundary}--\r\n`;
    return {
      body: Buffer.from(body, 'binary'),
      contentType: `multipart/form-data; boundary=${boundary}`,
    };
  }

  // Fake file buffers
  const dummyPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (Academic Regulations) >>\nendobj\nstream\n(Section 4.2 Medical Leave Policy)\nendstream\nxref\n0 1\n0000000000 65535 f \ntrailer\n<< /Size 1 >>\nstartxref\n100\n%%EOF');
  const dummyHtml = Buffer.from('<html><body><script>alert(1)</script></body></html>');
  const dummyDocx = Buffer.from('PK\x03\x04\x14\x00\x06\x00Dummy docx content');

  // =========================================================================
  // Section A: POST /api/admin/resources Security & Validation Tests
  // =========================================================================
  console.log('\n--- Section A: Resource Creation & Security ---');

  // Test 1: 401 without token
  const unauthRes = await fetch(`${BASE_URL}/api/admin/resources`, { method: 'POST' });
  assert('POST /api/admin/resources returns 401 without token', unauthRes.status === 401);

  // Test 2: 403 for student
  const studentForbidden = await fetch(`${BASE_URL}/api/admin/resources`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert('POST /api/admin/resources returns 403 for student', studentForbidden.status === 403);

  // Test 3: 403 for mentor
  const mentorForbidden = await fetch(`${BASE_URL}/api/admin/resources`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${mentorToken}` },
  });
  assert('POST /api/admin/resources returns 403 for mentor', mentorForbidden.status === 403);

  // Test 4: 400 for disallowed file types (.html)
  const badFileMp = makeMultipartBody(
    { title: 'Malicious HTML', category: 'rules' },
    { name: 'exploit.html', type: 'text/html', content: dummyHtml }
  );
  const badFileRes = await fetch(`${BASE_URL}/api/admin/resources`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': badFileMp.contentType,
    },
    body: badFileMp.body,
  });
  assert('POST /api/admin/resources rejects .html file with HTTP 400', badFileRes.status === 400);

  // Test 5: 400 for missing title
  const noTitleMp = makeMultipartBody({ category: 'rules' }, { name: 'rules.pdf', type: 'application/pdf', content: dummyPdf });
  const noTitleRes = await fetch(`${BASE_URL}/api/admin/resources`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': noTitleMp.contentType,
    },
    body: noTitleMp.body,
  });
  assert('POST /api/admin/resources rejects missing title with HTTP 400', noTitleRes.status === 400);

  // Test 6: 400 for invalid category
  const badCatMp = makeMultipartBody({ title: 'Test', category: 'invalid_cat' }, null);
  const badCatRes = await fetch(`${BASE_URL}/api/admin/resources`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': badCatMp.contentType,
    },
    body: badCatMp.body,
  });
  assert('POST /api/admin/resources rejects invalid category with HTTP 400', badCatRes.status === 400);

  // Test 7: Successful resource creation (Rules PDF) in draft status
  const validMp = makeMultipartBody(
    {
      title: 'University Academic Regulations 2024-2025',
      category: 'rules',
      department: 'All',
      academic_year: '2024-2025',
      description: 'Official academic policies and attendance ordinances',
      status: 'draft',
      effective_date: '2024-08-01',
    },
    { name: 'Academic_Rules.pdf', type: 'application/pdf', content: dummyPdf }
  );

  const createRuleRes = await fetch(`${BASE_URL}/api/admin/resources`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': validMp.contentType,
    },
    body: validMp.body,
  });
  const createdRule = await createRuleRes.json();
  assert(
    'Admin successfully creates rules resource with PDF (HTTP 201)',
    createRuleRes.status === 201 && Boolean(createdRule.id) && createdRule.status === 'draft'
  );
  assert(
    'Server-side filename is randomized and file_url is generated',
    createdRule.file_url && createdRule.file_url.startsWith('/uploads/res_')
  );
  assert('Resource initial version is set to 1', createdRule.version === 1);

  // Test 8: Create timetable resource with timetable_entries
  const timetableEntries = [
    { day: 'Monday', period: 1, subject: 'Operating Systems', faculty: 'Dr. Radhakrishnan', room: 'CS-101', department: 'Computer Science and Engineering', year: '2' },
    { day: 'Monday', period: 2, subject: 'Database Systems', faculty: 'Dr. Priya Sharma', room: 'CS-102', department: 'Computer Science and Engineering', year: '2' },
    { day: 'Tuesday', period: 1, subject: 'Computer Networks', faculty: 'Dr. Anand Kumar', room: 'CS-103', department: 'Computer Science and Engineering', year: '2' },
  ];

  const ttMp = makeMultipartBody(
    {
      title: 'Computing Sciences Class Timetable',
      category: 'timetable',
      department: 'School of Computing Sciences',
      academic_year: '1st Year',
      description: 'Weekly timetable schedule for Computing Sciences students',
      status: 'published',
      timetableEntries: JSON.stringify(timetableEntries),
    },
    { name: 'CSE_Timetable.pdf', type: 'application/pdf', content: dummyPdf }
  );

  const createTtRes = await fetch(`${BASE_URL}/api/admin/resources`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': ttMp.contentType,
    },
    body: ttMp.body,
  });
  const createdTt = await createTtRes.json();
  assert('Admin successfully creates timetable resource with entries (HTTP 201)', createTtRes.status === 201);
  assert('Timetable entries persisted in database', Array.isArray(createdTt.timetableEntries) && createdTt.timetableEntries.length === 3);

  // Create an ECE-only published resource to test student department filtering
  const eceMp = makeMultipartBody(
    {
      title: 'ECE Semiconductor Lab Timetable',
      category: 'timetable',
      department: 'Electronics and Communication Engineering',
      academic_year: '4',
      status: 'published',
    },
    null
  );
  const createEceRes = await fetch(`${BASE_URL}/api/admin/resources`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': eceMp.contentType,
    },
    body: eceMp.body,
  });
  const createdEce = await createEceRes.json();
  assert('Admin creates ECE-only published resource', createEceRes.status === 201);

  // =========================================================================
  // Section B: PUT, REPLACE-FILE, PATCH Status & Versioning
  // =========================================================================
  console.log('\n--- Section B: Resource Updates, File Replacement & Versioning ---');

  // Test 9: PUT /api/admin/resources/:id (Update metadata)
  const putRes = await fetch(`${BASE_URL}/api/admin/resources/${createdRule.id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'University Academic Regulations 2024-2025 (Updated Senate Edition)',
      description: 'Comprehensive guidelines approved by Senate',
    }),
  });
  const putData = await putRes.json();
  assert('PUT /api/admin/resources/:id succeeds (HTTP 200)', putRes.status === 200 && putData.title.includes('Updated Senate Edition'));

  // Test 10: POST /api/admin/resources/:id/replace-file (Increments version & adds to resource_versions)
  const replaceMp = makeMultipartBody(
    { changeSummary: 'Uploaded revised 2025 amendments to section 4' },
    { name: 'Revised_Rules.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', content: dummyDocx }
  );
  const replaceRes = await fetch(`${BASE_URL}/api/admin/resources/${createdRule.id}/replace-file`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': replaceMp.contentType,
    },
    body: replaceMp.body,
  });
  const replaceData = await replaceRes.json();
  assert('POST /api/admin/resources/:id/replace-file succeeds (HTTP 200)', replaceRes.status === 200);
  assert('Resource version incremented to 2', replaceData.version === 2);
  assert('resource_versions contains 2 version records', Array.isArray(replaceData.versions) && replaceData.versions.length >= 2);

  // Test 11: PATCH /api/admin/resources/:id/status
  const badStatusRes = await fetch(`${BASE_URL}/api/admin/resources/${createdRule.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'unapproved' }),
  });
  assert('PATCH /api/admin/resources/:id/status rejects invalid status with HTTP 400', badStatusRes.status === 400);

  const publishRes = await fetch(`${BASE_URL}/api/admin/resources/${createdRule.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'published' }),
  });
  const publishData = await publishRes.json();
  assert('PATCH /api/admin/resources/:id/status transitions draft -> published (HTTP 200)', publishRes.status === 200 && publishData.status === 'published');

  // =========================================================================
  // Section C: GET /api/resources (Student & Mentor Visibility & Department Filtering)
  // =========================================================================
  console.log('\n--- Section C: Student and Mentor Department / Year Access Isolation ---');

  // Test 12: GET /api/resources without token returns 401
  const unauthGetRes = await fetch(`${BASE_URL}/api/resources`);
  assert('GET /api/resources returns 401 without token', unauthGetRes.status === 401);

  // Test 13: Student A (Kishorkumar P - CSE, Year 2) fetches published resources
  const studentGetRes = await fetch(`${BASE_URL}/api/resources`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const studentResources = await studentGetRes.json();
  assert('Student fetches resources with HTTP 200', studentGetRes.status === 200 && Array.isArray(studentResources));

  const hasRules = studentResources.some((r) => r.id === createdRule.id);
  const hasCseTimetable = studentResources.some((r) => r.id === createdTt.id);
  const hasEceTimetable = studentResources.some((r) => r.id === createdEce.id);

  assert('Student sees published resource for All departments', hasRules);
  assert('Student sees published timetable for their own CSE department', hasCseTimetable);
  assert('Student NEVER sees published timetable for another department (ECE)', hasEceTimetable === false);

  const cseItem = studentResources.find((r) => r.id === createdTt.id);
  assert(
    'Timetable resource contains associated timetable_entries for student view',
    Boolean(cseItem && Array.isArray(cseItem.timetableEntries) && cseItem.timetableEntries.length > 0)
  );

  // Test 14: Mentor fetches published resources
  const mentorGetRes = await fetch(`${BASE_URL}/api/resources`, {
    headers: { Authorization: `Bearer ${mentorToken}` },
  });
  const mentorResources = await mentorGetRes.json();
  assert('Mentor fetches published resources with HTTP 200', mentorGetRes.status === 200 && Array.isArray(mentorResources));

  // =========================================================================
  // Section D: PDF Extract-Text via Gemini Step
  // =========================================================================
  console.log('\n--- Section D: PDF Rule Text Extraction via Gemini ---');

  const extractUnauth = await fetch(`${BASE_URL}/api/admin/resources/extract-text`, { method: 'POST' });
  assert('POST /api/admin/resources/extract-text returns 401 without token', extractUnauth.status === 401);

  const extractStudent = await fetch(`${BASE_URL}/api/admin/resources/extract-text`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert('POST /api/admin/resources/extract-text returns 403 for student', extractStudent.status === 403);

  // Extract text from uploaded PDF
  const extractMp = makeMultipartBody({}, { name: 'Campus_Rules.pdf', type: 'application/pdf', content: dummyPdf });
  const extractRes = await fetch(`${BASE_URL}/api/admin/resources/extract-text`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': extractMp.contentType,
    },
    body: extractMp.body,
  });
  const extractData = await extractRes.json();
  assert('POST /api/admin/resources/extract-text returns HTTP 200', extractRes.status === 200);
  assert('Extraction result contains readable text', Boolean(extractData.extractedText));
  assert('Extraction result contains suggestedSections array', Array.isArray(extractData.suggestedSections));

  // Also test extracting from existing resourceId
  const extractFromIdRes = await fetch(`${BASE_URL}/api/admin/resources/${createdRule.id}/extract-text`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const extractFromIdData = await extractFromIdRes.json();
  assert('POST /api/admin/resources/:id/extract-text returns HTTP 200 for existing PDF', extractFromIdRes.status === 200 && Boolean(extractFromIdData.extractedText));

  // =========================================================================
  // Section E: Bylaw / Guidelines Management & Gemini Context Feeding
  // =========================================================================
  console.log('\n--- Section E: Guidelines Bylaw Sections & Gemini Context Feeding ---');

  // Test 15: Security on /api/admin/guidelines
  const glUnauth = await fetch(`${BASE_URL}/api/admin/guidelines`, { method: 'POST' });
  assert('POST /api/admin/guidelines returns 401 without token', glUnauth.status === 401);

  const glStudent = await fetch(`${BASE_URL}/api/admin/guidelines`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert('POST /api/admin/guidelines returns 403 for student', glStudent.status === 403);

  const glMentor = await fetch(`${BASE_URL}/api/admin/guidelines`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${mentorToken}` },
  });
  assert('POST /api/admin/guidelines returns 403 for mentor', glMentor.status === 403);

  // Test 16: Admin creates new bylaw section "4.3"
  const newGuidelineRes = await fetch(`${BASE_URL}/api/admin/guidelines`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      section: '4.3',
      category: 'Attendance & Grievance',
      title: 'Continuous Assessment Grievance Protocol',
      body: 'Students with discrepancies in internal continuous assessments must petition within 5 academic days of mark publication.',
      verificationCriteria: ['Official exam transcript sheet', 'Course instructor signature'],
      mostConsulted: true,
    }),
  });
  const newGuideline = await newGuidelineRes.json();
  assert('Admin creates guideline section 4.3 (HTTP 201)', newGuidelineRes.status === 201 && newGuideline.section === '4.3');

  // Test 17: Admin edits bylaw section
  const editGuidelineRes = await fetch(`${BASE_URL}/api/admin/guidelines/${newGuideline.id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'Continuous Assessment Grievance & Re-evaluation Protocol',
      body: 'Students with mark discrepancies in internal assessments must petition within 7 academic days with mentor endorsement.',
    }),
  });
  const editedGuideline = await editGuidelineRes.json();
  assert('Admin edits guideline section 4.3 (HTTP 200)', editGuidelineRes.status === 200 && editedGuideline.title.includes('Re-evaluation Protocol'));

  // Test 18: Public GET /api/guidelines reflects new section 4.3
  const publicGlRes = await fetch(`${BASE_URL}/api/guidelines`);
  const publicGuidelines = await publicGlRes.json();
  const has43 = publicGuidelines.some((g) => g.section === '4.3');
  assert('GET /api/guidelines includes the new bylaw section 4.3', has43);

  // Test 19: Gemini Query includes database guidelines context
  const aiRes = await fetch(`${BASE_URL}/api/ai/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'What is the procedure for medical condonation under section 4.2?',
    }),
  });
  const aiData = await aiRes.json();
  assert('POST /api/ai/query processes with injected guidelines context', aiRes.status === 200 && Boolean(aiData.response));

  // =========================================================================
  // Section F: Cleanup & Deletion
  // =========================================================================
  console.log('\n--- Section F: Resource & Guideline Deletion ---');

  // Delete guideline section
  const delGlRes = await fetch(`${BASE_URL}/api/admin/guidelines/${newGuideline.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert('DELETE /api/admin/guidelines/:id succeeds (HTTP 200)', delGlRes.status === 200);

  // Delete resource
  const delRes = await fetch(`${BASE_URL}/api/admin/resources/${createdRule.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert('DELETE /api/admin/resources/:id succeeds (HTTP 200)', delRes.status === 200);

  // Verify deleted resource is not in GET /api/admin/resources/:id
  const getDeleted = await fetch(`${BASE_URL}/api/admin/resources/${createdRule.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert('Deleted resource returns HTTP 404', getDeleted.status === 404);

  // Clean up test timetable resource
  await fetch(`${BASE_URL}/api/admin/resources/${createdTt.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  await fetch(`${BASE_URL}/api/admin/resources/${createdEce.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  console.log(`\n=== TEST SUMMARY ===`);
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
