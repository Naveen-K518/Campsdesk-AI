/**
 * Priority Classification Engine (CampusDesk AI)
 * 
 * Deterministic rule-based heuristic scoring engine that evaluates:
 * 1. High-severity emergency & examination regex triggers
 * 2. Medium-severity academic and procedural keywords
 * 3. Temporal deadline / time-sensitive indicators
 * 4. Student academic context from DB (attendance < 75%, CGPA < 5.0)
 * 5. Student self-reported urgency
 */

export type PriorityLevel = 'normal' | 'high' | 'urgent';

export interface StudentAcademicContext {
  attendance?: number | null;
  cgpa?: number | null;
  department?: string | null;
}

export interface PriorityTriageResult {
  priority: PriorityLevel;
  score: number;
  reason: string;
  matchedTriggers: string[];
}

// 1. Critical / Urgent Severity Patterns (+70 points)
const URGENT_PATTERNS: { regex: RegExp; label: string }[] = [
  { regex: /exam(ination)?\s*(tomorrow|today|within\s*24\s*h(ours)?)/i, label: 'Exam within 24h/tomorrow' },
  { regex: /hall\s*ticket\s*(blocked|denied|issue|not\s*issued|withheld|missing)/i, label: 'Hall ticket / admit card blocked' },
  { regex: /admit\s*card\s*(not\s*found|download\s*failed|error|blocked)/i, label: 'Admit card withheld' },
  { regex: /barred\s*from\s*exam|debarred|detained/i, label: 'Debarred from examination' },
  { regex: /hospital(ized|isation)?/i, label: 'Hospitalization reported' },
  { regex: /medical\s+(emergency|crisis)/i, label: 'Medical emergency' },
  { regex: /accident|casualty|ambulance/i, label: 'Accident / emergency injury' },
  { regex: /attendance\s*(shortage|<|below)\s*(6[0-5]|5\d|4\d)%/i, label: 'Critical attendance shortage (<65%)' },
  { regex: /condonation\s*(cutoff|last\s*date\s*today|deadline\s*today)/i, label: 'Condonation cutoff deadline today' },
  { regex: /fee\s*(cutoff|fine|penalty)\s*(today|tomorrow|last\s*day)/i, label: 'Fee penalty cutoff immediate' },
  { regex: /ragging|harassment|assault/i, label: 'Safety / grievance priority alert' },
];

// 2. High Priority Patterns (+35 points)
const HIGH_PATTERNS: { regex: RegExp; label: string }[] = [
  { regex: /condonation/i, label: 'Attendance condonation request' },
  { regex: /on\s*duty|od\s*(leave|claim|form|permission)/i, label: 'On-duty (OD) approval' },
  { regex: /re-?evaluation|paper\s*re-?check/i, label: 'Paper re-evaluation deadline' },
  { regex: /supplementary|backlog|arrear\s*exam/i, label: 'Arrear / supplementary examination' },
  { regex: /grade\s*(rectification|discrepancy|correction)/i, label: 'Grade discrepancy review' },
  { regex: /scholarship\s*(deadline|last\s*date|portal)/i, label: 'Scholarship disbursement cutoff' },
  { regex: /hostel\s*(permission|gate\s*pass|vacate|outpass)/i, label: 'Hostel outpass / security permit' },
  { regex: /noc\s*(certificate|letter)/i, label: 'Urgent NOC certificate request' },
  { regex: /bonafide\s*(urgent|for\s*passport|for\s*visa)/i, label: 'Time-critical bonafide application' },
];

// 3. Temporal / Time-Sensitive Keywords (+20 points)
const TIME_SENSITIVE_PATTERNS: { regex: RegExp; label: string }[] = [
  { regex: /\btoday\b/i, label: 'Due today' },
  { regex: /\btomorrow\b/i, label: 'Due tomorrow' },
  { regex: /\bwithin\s*24\s*hours\b/i, label: 'Window < 24 hours' },
  { regex: /\burgent(ly)?\b/i, label: 'Student marked urgent keyword' },
  { regex: /\bimmediate(ly)?\b/i, label: 'Immediate intervention sought' },
  { regex: /\blast\s*date\b/i, label: 'Last date deadline' },
  { regex: /\bdeadline\b/i, label: 'Approaching deadline' },
];

/**
 * Evaluates text and student database context to compute query priority.
 *
 * @param title Query title / subject
 * @param description Detailed student problem statement
 * @param category Department / academic category
 * @param studentContext Live student database record (attendance, CGPA)
 * @param requestedPriority Optional self-selected priority from student UI
 */
export function determinePriority(
  title: string,
  description: string,
  category: string,
  studentContext?: StudentAcademicContext,
  requestedPriority?: string
): PriorityTriageResult {
  const combinedText = `${title || ''} ${description || ''}`.trim();
  let score = 0;
  const matchedTriggers: string[] = [];

  // Step 1: Check Critical / Urgent Regex Triggers (+70 pts)
  for (const item of URGENT_PATTERNS) {
    if (item.regex.test(combinedText)) {
      score += 70;
      matchedTriggers.push(item.label);
      break; // One urgent trigger is enough to elevate
    }
  }

  // Step 2: Check High-Priority Procedural Patterns (+35 pts)
  for (const item of HIGH_PATTERNS) {
    if (item.regex.test(combinedText)) {
      score += 35;
      matchedTriggers.push(item.label);
      break;
    }
  }

  // Step 3: Check Time Sensitivity (+20 pts)
  for (const item of TIME_SENSITIVE_PATTERNS) {
    if (item.regex.test(combinedText)) {
      score += 20;
      matchedTriggers.push(item.label);
      break;
    }
  }

  // Step 4: Inject Student Academic Database Context
  if (studentContext) {
    // Check Attendance Context
    if (
      studentContext.attendance !== null &&
      studentContext.attendance !== undefined &&
      studentContext.attendance < 75
    ) {
      const isAttendanceRelated =
        /attendance|leave|condonation|absent|medical/i.test(combinedText) ||
        /attendance/i.test(category);

      if (studentContext.attendance < 65 && isAttendanceRelated) {
        // Critical debarment cutoff breach: student cannot sit for exams without senate order
        score += 65;
        matchedTriggers.push(`Attendance below mandatory debarment threshold (${studentContext.attendance}%)`);
      } else if (isAttendanceRelated) {
        score += 40;
        matchedTriggers.push(`Student attendance critical (${studentContext.attendance}%)`);
      } else {
        score += 15;
        matchedTriggers.push(`Student low attendance profile (${studentContext.attendance}%)`);
      }
    }

    // Check CGPA Academic Probation Context
    if (
      studentContext.cgpa !== null &&
      studentContext.cgpa !== undefined &&
      studentContext.cgpa < 5.0
    ) {
      if (/grade|backlog|arrear|course|exam/i.test(combinedText) || /academic/i.test(category)) {
        score += 25;
        matchedTriggers.push(`Student on academic watch (CGPA: ${studentContext.cgpa})`);
      }
    }
  }

  // Step 5: Category Base Weight
  if (/emergency|disciplinary/i.test(category)) {
    score += 50;
    matchedTriggers.push(`High priority category (${category})`);
  } else if (/attendance|exam/i.test(category)) {
    score += 10;
  }

  // Step 6: Respect Student Selected Urgency (if provided)
  if (requestedPriority === 'urgent') {
    score = Math.max(score, 65);
    matchedTriggers.push('Student flagged as Urgent');
  } else if (requestedPriority === 'high') {
    score = Math.max(score, 40);
    matchedTriggers.push('Student flagged as High Priority');
  }

  // Step 7: Map Final Score to Priority Tier
  let priority: PriorityLevel = 'normal';
  if (score >= 65) {
    priority = 'urgent';
  } else if (score >= 35) {
    priority = 'high';
  }

  const reason =
    matchedTriggers.length > 0
      ? `Auto-triaged as ${priority.toUpperCase()}: ${matchedTriggers.join('; ')}`
      : 'Standard routine docket';

  return {
    priority,
    score,
    reason,
    matchedTriggers,
  };
}
