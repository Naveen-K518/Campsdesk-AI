// Automated Real-Time Socket.io Security & Isolation Integration Test Suite
const { io } = require('socket.io-client');

const BASE_URL = 'http://localhost:5000';

async function runSocketRealtimeTest() {
  console.log('=== RUNNING REAL-TIME SECURE SOCKET.IO INTEGRATION TESTS ===\n');

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

  // -------------------------------------------------------------
  // Test 1: Socket connection without a token is rejected during handshake
  // -------------------------------------------------------------
  console.log('[Test 1] Testing unauthenticated socket connection handshake rejection...');
  const unauthSocket = io(BASE_URL, {
    transports: ['websocket'],
    reconnection: false,
    timeout: 3000,
  });

  const unauthResult = await new Promise((resolve) => {
    unauthSocket.on('connect_error', (err) => {
      resolve({ rejected: true, message: err.message });
    });
    unauthSocket.on('connect', () => {
      resolve({ rejected: false, message: 'Connected unexpectedly without token' });
    });
    setTimeout(() => {
      resolve({ rejected: true, message: 'Handshake timed out / rejected' });
    }, 3000);
  });
  unauthSocket.disconnect();

  assert(
    'Socket connection without token is rejected by handshake middleware',
    unauthResult.rejected,
    `(${unauthResult.message})`
  );

  // -------------------------------------------------------------
  // Test 2: Socket connection with an invalid token is rejected
  // -------------------------------------------------------------
  console.log('[Test 2] Testing invalid JWT token rejection...');
  const invalidSocket = io(BASE_URL, {
    transports: ['websocket'],
    auth: { token: 'invalid.bearer.token.payload' },
    reconnection: false,
    timeout: 3000,
  });

  const invalidResult = await new Promise((resolve) => {
    invalidSocket.on('connect_error', (err) => {
      resolve({ rejected: true, message: err.message });
    });
    invalidSocket.on('connect', () => {
      resolve({ rejected: false, message: 'Connected unexpectedly with invalid token' });
    });
    setTimeout(() => {
      resolve({ rejected: true, message: 'Handshake timed out / rejected' });
    }, 3000);
  });
  invalidSocket.disconnect();

  assert(
    'Socket connection with invalid token is rejected by handshake middleware',
    invalidResult.rejected,
    `(${invalidResult.message})`
  );

  // -------------------------------------------------------------
  // Test 3: Authenticate Student A, Mentor, and Student B via REST API
  // -------------------------------------------------------------
  console.log('[Test 3] Authenticating Student A, Student B, and Mentor via REST...');

  // Student A: Kishor (Assigned to Mentor 1 Dr. K. Radhakrishnan)
  const studentALoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'kishorkumarp.cs24@bitsathy.ac.in', password: 'password123' }),
  });
  const studentAData = await studentALoginRes.json();
  const studentAToken = studentAData.token;
  assert('Student A REST login succeeds', Boolean(studentAToken));

  // Student B: Aarav Sharma (Assigned to Mentor 2 Dr. Priya Sharma)
  const studentBLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'aarav.sharma@campus.edu', password: 'password123' }),
  });
  const studentBData = await studentBLoginRes.json();
  const studentBToken = studentBData.token;
  assert('Student B REST login succeeds', Boolean(studentBToken));

  // Mentor: Dr. K. Radhakrishnan (Assigned mentor for Student A)
  const mentorLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'faculty@campus.edu', password: 'faculty123' }),
  });
  const mentorData = await mentorLoginRes.json();
  const mentorToken = mentorData.token;
  assert('Mentor REST login succeeds', Boolean(mentorToken));

  // -------------------------------------------------------------
  // Test 4: Establish Authenticated WebSockets with Server-Decided Rooms
  // (No client-controlled join:student or join:faculty events emitted!)
  // -------------------------------------------------------------
  console.log('[Test 4] Connecting authenticated WebSockets via handshake auth.token...');

  const studentASocket = io(BASE_URL, {
    transports: ['websocket'],
    auth: { token: studentAToken },
  });

  const studentBSocket = io(BASE_URL, {
    transports: ['websocket'],
    auth: { token: studentBToken },
  });

  const mentorSocket = io(BASE_URL, {
    transports: ['websocket'],
    auth: { token: mentorToken },
  });

  await new Promise((resolve, reject) => {
    let connectedCount = 0;
    const timeout = setTimeout(() => reject(new Error('Timeout waiting for authenticated sockets to connect')), 5000);

    const onConnect = () => {
      connectedCount++;
      if (connectedCount === 3) {
        clearTimeout(timeout);
        resolve();
      }
    };

    studentASocket.once('connect', onConnect);
    studentBSocket.once('connect', onConnect);
    mentorSocket.once('connect', onConnect);
  });

  assert(
    'All three sockets (Student A, Student B, Mentor) connected via JWT handshake',
    studentASocket.connected && studentBSocket.connected && mentorSocket.connected
  );

  // -------------------------------------------------------------
  // Test 5: Real-Time Docket Creation & Room Isolation
  // - Student A socket receives query:created
  // - Assigned Mentor socket receives query:created
  // - Student B socket NEVER receives Student A's query:created
  // -------------------------------------------------------------
  console.log('[Test 5] Testing docket creation emission and student isolation...');

  let studentBReceivedEvents = [];
  const studentBTracker = (eventName) => (data) => {
    studentBReceivedEvents.push({ event: eventName, data });
  };
  studentBSocket.on('query:created', studentBTracker('query:created'));
  studentBSocket.on('query:updated', studentBTracker('query:updated'));

  let studentAReceivedCreated = null;
  let mentorReceivedCreated = null;

  const creationPromise = new Promise((resolve, reject) => {
    let count = 0;
    const timeout = setTimeout(() => reject(new Error('Timeout waiting for authorized query:created events')), 6000);

    studentASocket.once('query:created', (data) => {
      studentAReceivedCreated = data;
      count++;
      if (count === 2) {
        clearTimeout(timeout);
        resolve();
      }
    });

    mentorSocket.once('query:created', (data) => {
      mentorReceivedCreated = data;
      count++;
      if (count === 2) {
        clearTimeout(timeout);
        resolve();
      }
    });
  });

  const createRes = await fetch(`${BASE_URL}/api/queries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentAToken}`,
    },
    body: JSON.stringify({
      category: 'Attendance & Leave',
      subject: 'Secure Isolation Test',
      title: 'Confidential Docket for Student A',
      description: 'Docket pushed via secure WebSocket room architecture',
    }),
  });
  const newDocket = await createRes.json();
  assert('HTTP POST /api/queries succeeds for Student A', createRes.status === 201 && Boolean(newDocket.id));

  await creationPromise;
  assert(
    'Student A socket received real-time query:created',
    studentAReceivedCreated && studentAReceivedCreated.id === newDocket.id,
    `(Docket Code: ${studentAReceivedCreated?.code})`
  );
  assert(
    'Assigned Mentor socket received real-time query:created',
    mentorReceivedCreated && mentorReceivedCreated.id === newDocket.id,
    `(Mentor: ${mentorReceivedCreated?.mentorName})`
  );

  // Wait a grace period to verify Student B received 0 events
  await new Promise((r) => setTimeout(r, 600));
  const studentBLeakedCreation = studentBReceivedEvents.filter(
    (e) => e.event === 'query:created' && e.data?.id === newDocket.id
  );
  assert(
    'ISOLATION VERIFIED: Student B never received Student A query:created event',
    studentBLeakedCreation.length === 0,
    `(Student B received ${studentBLeakedCreation.length} unauthorized events)`
  );

  // -------------------------------------------------------------
  // Test 6: Real-Time Status Update & Isolation
  // - Mentor updates status -> Student A receives query:updated
  // - Student B NEVER receives Student A's query:updated
  // -------------------------------------------------------------
  console.log('[Test 6] Testing docket status update emission and student isolation...');

  let studentAReceivedUpdated = null;
  const updatePromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout waiting for Student A query:updated')), 6000);
    studentASocket.once('query:updated', (data) => {
      if (data.id === newDocket.id && data.status === 'resolved') {
        clearTimeout(timeout);
        studentAReceivedUpdated = data;
        resolve(data);
      }
    });
  });

  const patchRes = await fetch(`${BASE_URL}/api/queries/${newDocket.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mentorToken}`,
    },
    body: JSON.stringify({
      status: 'resolved',
      facultyRemark: 'Approved via secure mentor channel',
    }),
  });
  assert('HTTP PATCH /api/queries/:id/status succeeds', patchRes.status === 200);

  await updatePromise;
  assert(
    'Student A socket received real-time query:updated with status=resolved',
    studentAReceivedUpdated && studentAReceivedUpdated.status === 'resolved'
  );

  // Verify Student B never received Student A's status update
  await new Promise((r) => setTimeout(r, 600));
  const studentBLeakedUpdate = studentBReceivedEvents.filter(
    (e) => e.event === 'query:updated' && e.data?.id === newDocket.id
  );
  assert(
    'ISOLATION VERIFIED: Student B never received Student A query:updated event',
    studentBLeakedUpdate.length === 0,
    `(Student B received ${studentBLeakedUpdate.length} unauthorized update events)`
  );

  // -------------------------------------------------------------
  // Test 7: Real-Time Audit Entry & Isolation
  // - Mentor posts audit entry -> Student A receives query:updated with audit entry
  // - Student B NEVER receives Student A's audit entry
  // -------------------------------------------------------------
  console.log('[Test 7] Testing audit log append emission and student isolation...');

  let studentAReceivedAudit = null;
  const auditPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout waiting for Student A audit event')), 6000);
    studentASocket.on('query:updated', function auditHandler(data) {
      if (data.id === newDocket.id && Array.isArray(data.auditTranscript)) {
        const hasRemark = data.auditTranscript.some((a) => a.text && a.text.includes('Secure Room Audit Signature'));
        if (hasRemark) {
          clearTimeout(timeout);
          studentASocket.off('query:updated', auditHandler);
          studentAReceivedAudit = data;
          resolve(data);
        }
      }
    });
  });

  const auditRes = await fetch(`${BASE_URL}/api/queries/${newDocket.id}/audit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mentorToken}`,
    },
    body: JSON.stringify({
      text: 'Secure Room Audit Signature Verified',
      actionTaken: 'Final Faculty Sign-Off',
      statusBanner: 'ROOM-ISOLATED AUDIT',
    }),
  });
  assert('HTTP POST /api/queries/:id/audit succeeds', auditRes.status === 201);

  await auditPromise;
  assert(
    'Student A received real-time query:updated containing new audit entry',
    Boolean(studentAReceivedAudit)
  );

  // Verify Student B never received Student A's audit entry
  await new Promise((r) => setTimeout(r, 600));
  const studentBTotalLeaked = studentBReceivedEvents.filter((e) => e.data?.id === newDocket.id);
  assert(
    'TOTAL ISOLATION VERIFIED: Student B received zero events across the entire lifecycle of Student A docket',
    studentBTotalLeaked.length === 0,
    `(Total unauthorized events to Student B: ${studentBTotalLeaked.length})`
  );

  // Cleanup
  studentASocket.disconnect();
  studentBSocket.disconnect();
  mentorSocket.disconnect();

  console.log(`\n=== REAL-TIME TEST SUMMARY ===`);
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runSocketRealtimeTest().catch((err) => {
  console.error('Fatal socket test error:', err);
  process.exit(1);
});
