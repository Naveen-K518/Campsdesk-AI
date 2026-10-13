const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';

async function req(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, options);
  let data;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    data = await res.text();
  }
  return { status: res.status, headers: res.headers, data };
}

async function uploadFile({ token, filename, content, mimeType, queryId }) {
  const form = new FormData();
  const blob = new Blob([content], { type: mimeType });
  form.append('file', blob, filename);
  if (queryId) {
    form.append('queryId', queryId);
  }

  return req('/api/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
}

async function runUploadSecurityTests() {
  console.log('=== RUNNING SECURE FILE UPLOAD INTEGRATION TEST SUITE ===\n');
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

  // 1. Authenticate Student A (Kishor)
  const studentALogin = await req('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'kishorkumarp.cs24@bitsathy.ac.in', password: 'password123' }),
  });
  assert('Student A login succeeds', studentALogin.status === 200 && Boolean(studentALogin.data?.token));
  const studentAToken = studentALogin.data.token;

  // 2. Register/Authenticate Student B
  const studentBEmail = `sec_upload_b_${Date.now()}@campus.edu`;
  const studentBReg = await req('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: studentBEmail,
      password: 'password123',
      name: 'Security Test Student B',
    }),
  });
  assert('Student B registration succeeds', studentBReg.status === 201 && Boolean(studentBReg.data?.token));
  const studentBToken = studentBReg.data.token;

  // 3. Student A creates a docket
  const createDocketRes = await req('/api/queries', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentAToken}`,
    },
    body: JSON.stringify({
      category: 'Attendance & Leave',
      subject: 'Security Upload Verification',
      title: 'Medical Certificate Verification Docket',
      description: 'Docket to test secure document attachment verification.',
      priority: 'normal',
    }),
  });
  assert('Student A docket creation succeeds', createDocketRes.status === 201 && Boolean(createDocketRes.data?.id));
  const docketAId = createDocketRes.data.id;

  // 4. TEST: Uploading an .html file must be rejected with 400
  const htmlUpload = await uploadFile({
    token: studentAToken,
    filename: 'xss_payload.html',
    content: '<html><script>alert("XSS")</script></html>',
    mimeType: 'text/html',
  });
  assert(
    'Upload of .html file is rejected with HTTP 400',
    htmlUpload.status === 400,
    `(Got ${htmlUpload.status}: ${JSON.stringify(htmlUpload.data?.error)})`
  );

  // 5. TEST: Uploading an .svg file must be rejected with 400
  const svgUpload = await uploadFile({
    token: studentAToken,
    filename: 'vector_graphic.svg',
    content: '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    mimeType: 'image/svg+xml',
  });
  assert(
    'Upload of .svg file is rejected with HTTP 400',
    svgUpload.status === 400,
    `(Got ${svgUpload.status}: ${JSON.stringify(svgUpload.data?.error)})`
  );

  // 6. TEST: Uploading a file with fake extension (.exe) must be rejected with 400
  const exeUpload = await uploadFile({
    token: studentAToken,
    filename: 'malicious_binary.exe',
    content: 'MZ\x90\x00\x03\x00\x00\x00BinaryPayload',
    mimeType: 'application/x-msdownload',
  });
  assert(
    'Upload of .exe file is rejected with HTTP 400',
    exeUpload.status === 400,
    `(Got ${exeUpload.status}: ${JSON.stringify(exeUpload.data?.error)})`
  );

  // 7. TEST: Uploading a file with fake extension / MIME mismatch must be rejected with 400
  const fakeExtUpload = await uploadFile({
    token: studentAToken,
    filename: 'fake_document.pdf',
    content: 'Plain text payload',
    mimeType: 'text/plain',
  });
  assert(
    'Upload with MIME mismatch (.pdf with text/plain) is rejected with HTTP 400',
    fakeExtUpload.status === 400,
    `(Got ${fakeExtUpload.status}: ${JSON.stringify(fakeExtUpload.data?.error)})`
  );

  // 8. TEST: Student B attempts to attach a file to Student A\'s docket -> HTTP 403 Forbidden
  const crossTenantUpload = await uploadFile({
    token: studentBToken,
    filename: 'forged_certificate.pdf',
    content: '%PDF-1.4 Mock Stamped Medical Cert',
    mimeType: 'application/pdf',
    queryId: docketAId,
  });
  assert(
    'Student B cannot attach file to Student A docket (HTTP 403 Forbidden)',
    crossTenantUpload.status === 403,
    `(Got ${crossTenantUpload.status}: ${JSON.stringify(crossTenantUpload.data?.error)})`
  );

  // 9. TEST: Student A attaches valid .pdf to their own docket -> HTTP 201 Created
  const validPdfUpload = await uploadFile({
    token: studentAToken,
    filename: 'authentic_hospital_report.pdf',
    content: '%PDF-1.4 Authentic Doctor Signed Stamped Record',
    mimeType: 'application/pdf',
    queryId: docketAId,
  });
  assert(
    'Student A attaches valid .pdf to own docket (HTTP 201 Created)',
    validPdfUpload.status === 201 && Boolean(validPdfUpload.data?.url),
    `(Got ${validPdfUpload.status}, url: ${validPdfUpload.data?.url})`
  );

  // 10. TEST: Verify server-side filename is randomized and does not contain original name
  const serverFilename = validPdfUpload.data?.filename || '';
  const doesNotContainOriginal =
    !serverFilename.includes('authentic_hospital_report') &&
    serverFilename.startsWith('doc_') &&
    serverFilename.endsWith('.pdf');
  assert(
    'Server-side filename is randomized and never uses original name in path',
    doesNotContainOriginal,
    `(Generated: ${serverFilename})`
  );

  // 11. TEST: Student A uploads a valid .png image -> HTTP 201 Created
  const validPngUpload = await uploadFile({
    token: studentAToken,
    filename: 'rx_prescription.png',
    content: '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4',
    mimeType: 'image/png',
    queryId: docketAId,
  });
  assert(
    'Student A attaches valid .png image to own docket (HTTP 201 Created)',
    validPngUpload.status === 201 && Boolean(validPngUpload.data?.url),
    `(Got ${validPngUpload.status}, url: ${validPngUpload.data?.url})`
  );

  // 12. TEST: Check static /uploads headers for the non-image .pdf
  const pdfFetch = await req(validPdfUpload.data.url);
  const pdfNosniff = pdfFetch.headers.get('x-content-type-options') === 'nosniff';
  const pdfCsp = (pdfFetch.headers.get('content-security-policy') || '').includes("default-src 'none'");
  const pdfDisposition = (pdfFetch.headers.get('content-disposition') || '').includes('attachment');
  assert(
    'Static route serves PDF with X-Content-Type-Options: nosniff',
    pdfNosniff,
    `(Got: ${pdfFetch.headers.get('x-content-type-options')})`
  );
  assert(
    'Static route serves PDF with restrictive Content-Security-Policy',
    pdfCsp,
    `(Got: ${pdfFetch.headers.get('content-security-policy')})`
  );
  assert(
    'Static route serves PDF with Content-Disposition: attachment',
    pdfDisposition,
    `(Got: ${pdfFetch.headers.get('content-disposition')})`
  );

  // 13. TEST: Check static /uploads headers for the image .png
  const pngFetch = await req(validPngUpload.data.url);
  const pngNosniff = pngFetch.headers.get('x-content-type-options') === 'nosniff';
  const pngCsp = (pngFetch.headers.get('content-security-policy') || '').includes("default-src 'none'");
  const pngNotForcedAttachment = !(pngFetch.headers.get('content-disposition') || '').includes('attachment');
  assert(
    'Static route serves PNG with nosniff and CSP without forced attachment',
    pngNosniff && pngCsp && pngNotForcedAttachment,
    `(Nosniff: ${pngNosniff}, CSP: ${pngCsp}, Not forced attachment: ${pngNotForcedAttachment})`
  );

  console.log('\n=== SECURE FILE UPLOAD TEST SUMMARY ===');
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runUploadSecurityTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
