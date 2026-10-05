// Comprehensive Integration Test Suite for CampusDesk AI
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';
let studentToken = '';
let facultyToken = '';
let createdQueryId = '';
const results = {};

async function runTests() {
  console.log('--- STARTING CAMPUSDESK AI INTEGRATION TEST SUITE ---');

  // Test 1: Health Check
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    if (res.status === 200 && data.status === 'ok') {
      results['GET /health'] = { status: 'PASS', details: data };
    } else {
      results['GET /health'] = { status: 'FAIL', details: data };
    }
  } catch (err) {
    results['GET /health'] = { status: 'FAIL', error: err.message };
  }

  // Test 2: Register New Student
  try {
    const testEmail = `test.student.${Date.now()}@campus.edu`;
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'password123',
        name: 'Test Student',
        rollNo: `24BCS${Math.floor(10000 + Math.random() * 90000)}`,
        program: 'B.Tech CSE',
      }),
    });
    const data = await res.json();
    if (res.status === 201 && data.token && data.user) {
      results['POST /api/auth/register'] = { status: 'PASS', user: data.user.email };
    } else {
      results['POST /api/auth/register'] = { status: 'FAIL', details: data };
    }
  } catch (err) {
    results['POST /api/auth/register'] = { status: 'FAIL', error: err.message };
  }

  // Test 3: Login Student
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'aarav.sharma@campus.edu',
        password: 'password123',
      }),
    });
    const data = await res.json();
    if (res.status === 200 && data.token) {
      studentToken = data.token;
      results['POST /api/auth/login (Student)'] = {
        status: 'PASS',
        user: data.user.email,
        studentName: data.student ? data.student.name : 'N/A',
      };
    } else {
      results['POST /api/auth/login (Student)'] = { status: 'FAIL', details: data };
    }
  } catch (err) {
    results['POST /api/auth/login (Student)'] = { status: 'FAIL', error: err.message };
  }

  // Test 4: Login Faculty
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'faculty@campus.edu',
        password: 'faculty123',
      }),
    });
    const data = await res.json();
    if (res.status === 200 && data.token && data.user.role === 'faculty') {
      facultyToken = data.token;
      results['POST /api/auth/login (Faculty)'] = {
        status: 'PASS',
        facultyName: data.user.name,
        role: data.user.role,
      };
    } else {
      results['POST /api/auth/login (Faculty)'] = { status: 'FAIL', details: data };
    }
  } catch (err) {
    results['POST /api/auth/login (Faculty)'] = { status: 'FAIL', error: err.message };
  }

  // Test 5: Verify GET /api/auth/me
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const data = await res.json();
    if (res.status === 200 && data.user) {
      results['GET /api/auth/me'] = { status: 'PASS', email: data.user.email };
    } else {
      results['GET /api/auth/me'] = { status: 'FAIL', details: data };
    }
  } catch (err) {
    results['GET /api/auth/me'] = { status: 'FAIL', error: err.message };
  }

  // Test 6: GET /api/guidelines
  try {
    const res = await fetch(`${BASE_URL}/api/guidelines`);
    const data = await res.json();
    if (res.status === 200 && Array.isArray(data) && data.length > 0) {
      results['GET /api/guidelines'] = { status: 'PASS', count: data.length, sample: data[0].title };
    } else {
      results['GET /api/guidelines'] = { status: 'FAIL', details: data };
    }
  } catch (err) {
    results['GET /api/guidelines'] = { status: 'FAIL', error: err.message };
  }

  // Test 7: Create Query
  try {
    const res = await fetch(`${BASE_URL}/api/queries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        category: 'Attendance & Leave',
        subject: 'Hospitalization Condonation Verification',
        title: 'OS Attendance Condonation Request',
        description: 'Hospital certificate attached for 6 days absence due to dengue fever.',
        priority: 'urgent',
        status: 'under_review',
        daysCondonation: 6,
        citation: 'Sec 4.2 Medical Leave Condonation',
      }),
    });
    const data = await res.json();
    if (res.status === 201 && data.id && data.code) {
      createdQueryId = data.id;
      results['POST /api/queries'] = {
        status: 'PASS',
        queryId: data.id,
        code: data.code,
        workflowStepsCount: data.workflowSteps ? data.workflowSteps.length : 0,
      };
    } else {
      results['POST /api/queries'] = { status: 'FAIL', details: data };
    }
  } catch (err) {
    results['POST /api/queries'] = { status: 'FAIL', error: err.message };
  }

  // Test 8: List Queries (Student)
  try {
    const res = await fetch(`${BASE_URL}/api/queries`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const data = await res.json();
    if (res.status === 200 && Array.isArray(data)) {
      results['GET /api/queries (Student)'] = { status: 'PASS', count: data.length };
    } else {
      results['GET /api/queries (Student)'] = { status: 'FAIL', details: data };
    }
  } catch (err) {
    results['GET /api/queries (Student)'] = { status: 'FAIL', error: err.message };
  }

  // Test 9: Get Query Details
  try {
    const res = await fetch(`${BASE_URL}/api/queries/${createdQueryId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const data = await res.json();
    if (res.status === 200 && data.id === createdQueryId) {
      results['GET /api/queries/:id'] = {
        status: 'PASS',
        code: data.code,
        hasAuditTranscript: Array.isArray(data.auditTranscript),
      };
    } else {
      results['GET /api/queries/:id'] = { status: 'FAIL', details: data };
    }
  } catch (err) {
    results['GET /api/queries/:id'] = { status: 'FAIL', error: err.message };
  }

  // Test 10: Update Query Status (Faculty resolution)
  try {
    const res = await fetch(`${BASE_URL}/api/queries/${createdQueryId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyToken}`,
      },
      body: JSON.stringify({
        status: 'resolved',
        facultyRemark: 'Approved 6 days condonation as per Senate Bylaws Sec 4.2.',
      }),
    });
    const data = await res.json();
    if (res.status === 200 && data.status === 'resolved') {
      results['PATCH /api/queries/:id/status'] = { status: 'PASS', newStatus: data.status };
    } else {
      results['PATCH /api/queries/:id/status'] = { status: 'FAIL', details: data };
    }
  } catch (err) {
    results['PATCH /api/queries/:id/status'] = { status: 'FAIL', error: err.message };
  }

  // Test 11: Add Audit Entry
  try {
    const res = await fetch(`${BASE_URL}/api/queries/${createdQueryId}/audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        text: 'Thank you Dr. Radhakrishnan, I will collect the physical hall ticket today.',
        actionTaken: 'Student Acknowledgement',
      }),
    });
    const data = await res.json();
    if (res.status === 201 && Array.isArray(data.auditTranscript) && data.auditTranscript.length > 0) {
      results['POST /api/queries/:id/audit'] = {
        status: 'PASS',
        auditsCount: data.auditTranscript.length,
      };
    } else {
      results['POST /api/queries/:id/audit'] = { status: 'FAIL', details: data };
    }
  } catch (err) {
    results['POST /api/queries/:id/audit'] = { status: 'FAIL', error: err.message };
  }

  // Test 12: File Upload (multipart/form-data)
  try {
    const tempFilePath = path.resolve(__dirname, 'test_certificate.pdf');
    fs.writeFileSync(tempFilePath, '%PDF-1.4 Mock Stamped Medical Certificate for Integration Test');

    const form = new FormData();
    const fileBlob = new Blob([fs.readFileSync(tempFilePath)], { type: 'application/pdf' });
    form.append('file', fileBlob, 'hospital_stamped_cert.pdf');

    const res = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: form,
    });
    const data = await res.json();
    fs.unlinkSync(tempFilePath);

    if (res.status === 201 && data.url) {
      results['POST /api/upload'] = { status: 'PASS', fileUrl: data.url, size: data.size };
    } else {
      results['POST /api/upload'] = { status: 'FAIL', details: data };
    }
  } catch (err) {
    results['POST /api/upload'] = { status: 'FAIL', error: err.message };
  }

  // Test 13: Gemini AI Query
  try {
    const res = await fetch(`${BASE_URL}/api/ai/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'What are the rules for hostel leave gate pass after curfew?',
        guidelinesContext: 'Sec 6.1 Hostel Curfew is 9:30 PM. Overnight passes require digital parent consent.',
      }),
    });
    const data = await res.json();
    if (res.status === 200 && data.response) {
      results['POST /api/ai/query'] = {
        status: 'PASS',
        responseSnippet: data.response.slice(0, 120) + '...',
      };
    } else {
      results['POST /api/ai/query'] = { status: 'FAIL', details: data };
    }
  } catch (err) {
    results['POST /api/ai/query'] = { status: 'FAIL', error: err.message };
  }

  console.log('\n--- INTEGRATION TEST RESULTS ---');
  console.log(JSON.stringify(results, null, 2));
}

runTests();
