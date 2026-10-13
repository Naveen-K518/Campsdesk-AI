export type PriorityLevel = 'normal' | 'high' | 'urgent';

export type QueryStatus = 
  | 'active' 
  | 'under_review' 
  | 'action_required' 
  | 'resolved' 
  | 'completed' 
  | 'live_agent_sync'
  | 'unassigned';

export interface Student {
  id: string;
  name: string;
  rollNo: string;
  program: string;
  year: string;
  batch: string;
  avatarUrl: string;
  mobile: string;
  email: string;
  cgpa?: number;
  credits?: number;
  attendanceAggregate?: number;
  department?: string;
  facultyAdvisor?: {
    name: string;
    office: string;
    hours: string;
    email: string;
  };
  mentor?: {
    id?: string;
    name: string;
    office?: string;
    hours?: string;
    email: string;
  };
}

export interface WorkflowStep {
  id: string;
  queryId?: string;
  order: number;
  label: string;
  detail: string;
  status: 'done' | 'in_progress' | 'locked';
  timestamp?: string;
  highlightKey?: string;
  highlightValue?: string;
}

export interface AuditEntry {
  id: string;
  sender: 'student' | 'agent' | 'faculty' | 'mentor' | 'admin';
  authorName: string;
  roleBadge?: string;
  timestamp: string;
  text?: string;
  bulletPoints?: string[];
  actionTaken?: string;
  statusBanner?: string;
  tokenRef?: string;
  attachedDoc?: {
    name: string;
    size: string;
    caption: string;
  };
}

export interface Query {
  id: string;
  code: string; // e.g. #CS-4921
  studentId?: string;
  studentName?: string;
  studentRollNo?: string;
  studentDepartment?: string;
  category: string;
  subject: string;
  title: string;
  description: string;
  subLine?: string;
  priority: PriorityLevel;
  status: QueryStatus;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  assignedMentorId?: string | null;
  mentorName?: string;
  mentorEmail?: string;
  aiConfidence?: number;
  resolutionTimeMins?: number;
  rating?: number;
  citation?: string;
  workflowSteps?: WorkflowStep[];
  auditTranscript?: AuditEntry[];
  daysCondonation?: number;
}


export interface ChatMessage {
  id: string;
  queryId?: string;
  sender: 'agent' | 'student' | 'faculty';
  text: string;
  timestamp: string;
  tag?: string;
  attachments?: Array<{
    name: string;
    size: string;
    uri?: string;
  }>;
  workflowExecution?: WorkflowStep[];
  verifiedPolicy?: {
    code: string;
    title: string;
    caseId: string;
  };
  requiresUpload?: boolean;
}

export interface Guideline {
  id: string;
  section: string; // e.g. "Sec 4.2"
  category: string;
  title: string;
  body: string;
  verificationCriteria: string[];
  lastUpdated: string;
  mostConsulted?: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  type: 'alert' | 'approval' | 'update' | 'system';
  linkQueryId?: string;
}

export interface TimetableEntry {
  id?: string;
  resource_id?: string;
  day: string;
  period: number;
  subject: string;
  faculty?: string;
  room?: string;
  department?: string;
  year?: string;
  created_at?: string;
}

export type ResourceCategory = 'rules' | 'timetable' | 'calendar' | 'circular' | 'form' | 'other';
export type ResourceStatus = 'draft' | 'published' | 'archived';

export interface ResourceItem {
  id: string;
  title: string;
  category: ResourceCategory;
  department?: string;
  academic_year?: string;
  description?: string;
  file_url?: string;
  status: ResourceStatus;
  version: number;
  effective_date?: string;
  uploaded_by?: string;
  created_at?: string;
  updated_at?: string;
  timetableEntries?: TimetableEntry[];
}

