export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export interface AdminUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'mentor' | 'student' | 'faculty'
  department?: string
}

export interface Mentor {
  id: string
  name: string
  email: string
  role: string
  mentee_count: number
}

export interface Student {
  id: string
  name: string
  rollNo: string
  program: string
  year: string
  batch: string
  email: string
  department: string
  mentor?: {
    id: string
    name: string
    email: string
    assignedAt: string
  } | null
}

export interface MentorAssignment {
  id: string
  assigned_at: string
  mentor_id: string
  mentor_name: string
  mentor_email: string
  student_id: string
  student_name: string
  student_roll_no: string
  student_department: string
}

export interface QueryDocket {
  id: string
  code: string
  title: string
  subject: string
  description: string
  category: string
  priority: 'normal' | 'high' | 'urgent'
  status: 'active' | 'under_review' | 'action_required' | 'resolved' | 'completed' | 'unassigned' | 'live_agent_sync'
  assignedTo?: string
  assignedMentorId?: string | null
  mentorName?: string
  mentorEmail?: string
  studentId?: string
  studentName?: string
  studentRollNo?: string
  studentDepartment?: string
  createdAt: string
  updatedAt: string
}

export interface Guideline {
  id: string
  section: string
  title: string
  body: string
  category: string
  verificationCriteria?: string[]
  mostConsulted?: boolean
  lastUpdated?: string
}

export interface ResourceVersion {
  id: string
  resource_id: string
  version: number
  file_url: string
  uploaded_by: string
  change_summary?: string
  created_at: string
}

export interface TimetableEntry {
  id?: string
  resource_id?: string
  day: string
  period: number
  subject: string
  faculty?: string
  room?: string
  department?: string
  year?: string
}

export interface ResourceItem {
  id: string
  title: string
  category: 'rules' | 'timetable' | 'calendar' | 'circular' | 'form' | 'other'
  department?: string
  academic_year?: string
  description?: string
  file_url?: string
  status: 'draft' | 'published' | 'archived'
  version: number
  effective_date?: string
  uploaded_by?: string
  created_at: string
  updated_at: string
  versionsCount?: number
  timetableCount?: number
  versions?: ResourceVersion[]
  timetableEntries?: TimetableEntry[]
}

export interface ExtractedBylawSection {
  section: string
  title: string
  category: string
  body: string
}

export interface ExtractedPdfResult {
  filename?: string
  resourceId?: string
  extractedText: string
  suggestedSections: ExtractedBylawSection[]
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('campusdesk_admin_token')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  let data: any
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!res.ok) {
    const errorMsg = data?.error || data?.message || `Request failed with status ${res.status}`
    throw new ApiError(errorMsg, res.status)
  }

  return data as T
}

async function requestFormData<T>(path: string, formData: FormData, method = 'POST'): Promise<T> {
  const token = localStorage.getItem('campusdesk_admin_token')
  const headers: Record<string, string> = {}

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: formData,
  })

  let data: any
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!res.ok) {
    const errorMsg = data?.error || data?.message || `Request failed with status ${res.status}`
    throw new ApiError(errorMsg, res.status)
  }

  return data as T
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: AdminUser }> {
    return request<{ token: string; user: AdminUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

  async loginWithGoogle(idToken: string): Promise<{ token: string; user: AdminUser }> {
    return request<{ token: string; user: AdminUser }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    })
  },

  async getMe(): Promise<{ user: AdminUser }> {
    return request<{ user: AdminUser }>('/api/auth/me')
  },

  async importUsersCsv(csvData: string): Promise<{ imported: number; updated: number; message: string }> {
    return request<{ imported: number; updated: number; message: string }>('/api/admin/users/import-csv', {
      method: 'POST',
      body: JSON.stringify({ csvData }),
    })
  },

  async getAuthLogs(): Promise<any[]> {
    return request<any[]>('/api/admin/auth-logs')
  },

  // Mentors
  async getMentors(): Promise<Mentor[]> {
    return request<Mentor[]>('/api/mentors')
  },

  // Students
  async getStudents(): Promise<Student[]> {
    return request<Student[]>('/api/mentors/students/all')
  },

  // Mentor Assignments
  async getAssignments(): Promise<MentorAssignment[]> {
    return request<MentorAssignment[]>('/api/mentors/assignments/all')
  },

  async assignMentor(mentorId: string, studentId: string) {
    return request<any>('/api/mentors/assign', {
      method: 'POST',
      body: JSON.stringify({ mentorId, studentId }),
    })
  },

  // Queries
  async getQueries(): Promise<QueryDocket[]> {
    return request<QueryDocket[]>('/api/queries')
  },

  async getQueryById(id: string): Promise<QueryDocket> {
    return request<QueryDocket>(`/api/queries/${id}`)
  },

  async updateQueryStatus(id: string, status: string, facultyRemark?: string) {
    return request<QueryDocket>(`/api/queries/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, facultyRemark }),
    })
  },

  // Guidelines
  async getGuidelines(): Promise<Guideline[]> {
    return request<Guideline[]>('/api/guidelines')
  },

  async createGuideline(data: {
    section: string
    category: string
    title: string
    body: string
    verificationCriteria?: string[]
    mostConsulted?: boolean
  }): Promise<Guideline> {
    return request<Guideline>('/api/admin/guidelines', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateGuideline(
    id: string,
    data: Partial<Guideline> & { verificationCriteria?: string[]; mostConsulted?: boolean }
  ): Promise<Guideline> {
    return request<Guideline>(`/api/admin/guidelines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async deleteGuideline(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/api/admin/guidelines/${id}`, {
      method: 'DELETE',
    })
  },

  // Resources Management
  async getAdminResources(filters?: {
    category?: string
    status?: string
    department?: string
    academic_year?: string
  }): Promise<ResourceItem[]> {
    const query = new URLSearchParams()
    if (filters?.category) query.set('category', filters.category)
    if (filters?.status) query.set('status', filters.status)
    if (filters?.department) query.set('department', filters.department)
    if (filters?.academic_year) query.set('academic_year', filters.academic_year)
    const qs = query.toString() ? `?${query.toString()}` : ''
    return request<ResourceItem[]>(`/api/admin/resources${qs}`)
  },

  async getAdminResourceById(id: string): Promise<ResourceItem> {
    return request<ResourceItem>(`/api/admin/resources/${id}`)
  },

  async createResource(formData: FormData): Promise<ResourceItem> {
    return requestFormData<ResourceItem>('/api/admin/resources', formData, 'POST')
  },

  async updateResource(id: string, data: Partial<ResourceItem>): Promise<ResourceItem> {
    return request<ResourceItem>(`/api/admin/resources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async replaceResourceFile(id: string, formData: FormData): Promise<ResourceItem> {
    return requestFormData<ResourceItem>(`/api/admin/resources/${id}/replace-file`, formData, 'POST')
  },

  async updateResourceStatus(id: string, status: 'draft' | 'published' | 'archived'): Promise<ResourceItem> {
    return request<ResourceItem>(`/api/admin/resources/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },

  async deleteResource(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/api/admin/resources/${id}`, {
      method: 'DELETE',
    })
  },

  async extractPdfText(formData: FormData): Promise<ExtractedPdfResult> {
    return requestFormData<ExtractedPdfResult>('/api/admin/resources/extract-text', formData, 'POST')
  },

  async extractPdfTextFromResource(resourceId: string): Promise<ExtractedPdfResult> {
    return request<ExtractedPdfResult>(`/api/admin/resources/${resourceId}/extract-text`, {
      method: 'POST',
    })
  },

  // Admin User Creation & Updates
  async createUser(userData: {
    email: string
    password: string
    name: string
    role: 'student' | 'mentor' | 'admin'
    rollNo?: string
    program?: string
    department?: string
  }): Promise<{ message: string; user: any; student?: any }> {
    return request<{ message: string; user: any; student?: any }>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  },

  async updateMentor(
    id: string,
    data: { name?: string; email?: string }
  ): Promise<{ message: string; mentor: Mentor }> {
    return request<{ message: string; mentor: Mentor }>(`/api/admin/mentors/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async updateStudent(
    id: string,
    data: { name?: string; email?: string; rollNo?: string; department?: string; program?: string }
  ): Promise<{ message: string; student: Student }> {
    return request<{ message: string; student: Student }>(`/api/admin/students/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },
}
