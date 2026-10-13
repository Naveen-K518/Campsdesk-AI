const { determinePriority } = require('./dist/services/priorityEngine');

console.log('--- Testing Deterministic Priority Engine ---');

const testCases = [
  {
    name: 'Critical Exam Tomorrow',
    title: 'Exam tomorrow morning hall ticket missing',
    description: 'I was unable to download my hall ticket and my semester exam starts tomorrow at 9 AM.',
    category: 'Examinations & Grading',
    student: { attendance: 82, cgpa: 8.1 },
    expectedPriority: 'urgent',
  },
  {
    name: 'Hospitalization / Medical Emergency',
    title: 'Emergency Medical Leave Condonation',
    description: 'I was hospitalized due to severe malaria for 2 weeks. Submitting doctor discharge certificate.',
    category: 'Academics & Attendance',
    student: { attendance: 68, cgpa: 7.2 },
    expectedPriority: 'urgent',
  },
  {
    name: 'Low Attendance Student asking about leave',
    title: 'Attendance shortage and leave application',
    description: 'Please regularize my 3 days absent in Digital Signal Processing.',
    category: 'Academics & Attendance',
    student: { attendance: 64, cgpa: 6.8 }, // critical attendance < 75%
    expectedPriority: 'urgent',
  },
  {
    name: 'High Priority: On-Duty (OD) Leave Request',
    title: 'On duty form submission for Inter-College Hackathon',
    description: 'Attending Smart India Hackathon representing our university department.',
    category: 'Academics & Attendance',
    student: { attendance: 88, cgpa: 8.5 },
    expectedPriority: 'high',
  },
  {
    name: 'Routine Syllabus Inquiry',
    title: 'Elective course syllabus query',
    description: 'Where can I access the course material and textbook reference for Machine Learning elective?',
    category: 'Academics & Attendance',
    student: { attendance: 90, cgpa: 8.9 },
    expectedPriority: 'normal',
  },
];

let allPassed = true;
testCases.forEach((tc, idx) => {
  const result = determinePriority(tc.title, tc.description, tc.category, tc.student);
  const passed = result.priority === tc.expectedPriority;
  if (!passed) allPassed = false;
  console.log(`[Test ${idx + 1}] ${tc.name}:`);
  console.log(`   Assigned: ${result.priority} (Score: ${result.score}) - Expected: ${tc.expectedPriority}`);
  console.log(`   Reason:   ${result.reason}`);
  console.log(`   Status:   ${passed ? 'PASS' : 'FAIL'}\n`);
});

if (allPassed) {
  console.log('ALL PRIORITY TRIAGE TESTS PASSED SUCCESSFULLY!');
} else {
  console.error('Some tests failed!');
  process.exit(1);
}
