import React, { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  api,
  ResourceItem,
  Guideline,
  TimetableEntry,
  ExtractedPdfResult,
  ExtractedBylawSection,
  API_BASE,
} from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LoadingState, ErrorState, EmptyState } from '@/components/common/StateView'
import {
  FileText,
  Search,
  BookOpen,
  Calendar,
  Clock,
  Upload,
  Plus,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
  FileUp,
  History,
  Archive,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  X,
  FileCode,
  FileSpreadsheet,
  Image as ImageIcon,
  AlertCircle,
  Download,
  CalendarDays,
  GraduationCap,
} from 'lucide-react'

const DEPARTMENTS = [
  'All Departments',
  'School of Computing Sciences',
  'Computer Science & Engineering',
  'Electronics and Communication Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical and Electronics Engineering',
]

const YEARS = ['All Years', '1st Year', '2nd Year', '3rd Year', '4th Year']

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'rules', label: 'Rules & Bylaws' },
  { value: 'timetable', label: 'Class Timetable' },
  { value: 'calendar', label: 'Academic Calendar' },
  { value: 'circular', label: 'Official Circular' },
  { value: 'form', label: 'Student Forms' },
  { value: 'other', label: 'Other Document' },
]

export const DocumentsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'resources' | 'guidelines' | 'timetable'>('resources')

  // Search & Filters for Resources Table
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All Departments')

  // Modals state
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingResource, setEditingResource] = useState<ResourceItem | null>(null)
  const [showReplaceModal, setShowReplaceModal] = useState(false)
  const [replacingResource, setReplacingResource] = useState<ResourceItem | null>(null)
  const [previewResource, setPreviewResource] = useState<ResourceItem | null>(null)
  const [deleteConfirmResource, setDeleteConfirmResource] = useState<ResourceItem | null>(null)

  // Upload Form state
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadCategory, setUploadCategory] = useState<ResourceItem['category']>('rules')
  const [uploadDept, setUploadDept] = useState('All Departments')
  const [uploadYear, setUploadYear] = useState('All Years')
  const [uploadEffectiveDate, setUploadEffectiveDate] = useState('')
  const [uploadStatus, setUploadStatus] = useState<'draft' | 'published'>('draft')
  const [uploadDescription, setUploadDescription] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit Form state
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState<ResourceItem['category']>('rules')
  const [editDept, setEditDept] = useState('All Departments')
  const [editYear, setEditYear] = useState('All Years')
  const [editEffectiveDate, setEditEffectiveDate] = useState('')
  const [editStatus, setEditStatus] = useState<'draft' | 'published' | 'archived'>('draft')
  const [editDescription, setEditDescription] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  // Replace File Form state
  const [replaceFile, setReplaceFile] = useState<File | null>(null)
  const [replaceChangeSummary, setReplaceChangeSummary] = useState('')
  const [replaceError, setReplaceError] = useState<string | null>(null)
  const [isReplacing, setIsReplacing] = useState(false)
  const replaceFileInputRef = useRef<HTMLInputElement>(null)

  // Guidelines Tab state
  const [showGuidelineModal, setShowGuidelineModal] = useState(false)
  const [editingGuideline, setEditingGuideline] = useState<Guideline | null>(null)
  const [guidelineSection, setGuidelineSection] = useState('')
  const [guidelineTitle, setGuidelineTitle] = useState('')
  const [guidelineCategory, setGuidelineCategory] = useState('Attendance & Leave')
  const [guidelineBody, setGuidelineBody] = useState('')
  const [guidelineCriteria, setGuidelineCriteria] = useState('')
  const [guidelineMostConsulted, setGuidelineMostConsulted] = useState(false)
  const [guidelineError, setGuidelineError] = useState<string | null>(null)
  const [isSavingGuideline, setIsSavingGuideline] = useState(false)
  const [deleteGuidelineConfirm, setDeleteGuidelineConfirm] = useState<Guideline | null>(null)

  // AI PDF Extraction state
  const [showExtractModal, setShowExtractModal] = useState(false)
  const [extractFile, setExtractFile] = useState<File | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionResult, setExtractionResult] = useState<ExtractedPdfResult | null>(null)
  const [extractError, setExtractError] = useState<string | null>(null)

  // Timetable Planner state
  const [ttDepartment, setTtDepartment] = useState('School of Computing Sciences')
  const [ttYear, setTtYear] = useState('1st Year')
  const [ttTitle, setTtTitle] = useState('Academic Semester Timetable')
  const [ttStatus, setTtStatus] = useState<'draft' | 'published'>('published')
  const [ttFile, setTtFile] = useState<File | null>(null)
  const [ttEntries, setTtEntries] = useState<TimetableEntry[]>([
    { day: 'Monday', period: 1, subject: 'Operating Systems', faculty: 'Dr. K. Radhakrishnan', room: 'CS-101' },
    { day: 'Monday', period: 2, subject: 'Database Management Systems', faculty: 'Dr. Priya Sharma', room: 'CS-102' },
    { day: 'Tuesday', period: 1, subject: 'Computer Networks', faculty: 'Dr. Anand Kumar', room: 'CS-103' },
    { day: 'Wednesday', period: 1, subject: 'Design & Analysis of Algorithms', faculty: 'Dr. K. Radhakrishnan', room: 'CS-101' },
  ])
  const [isSavingTimetable, setIsSavingTimetable] = useState(false)
  const [timetableFeedback, setTimetableFeedback] = useState<string | null>(null)

  // Queries
  const {
    data: resources = [],
    isLoading: isResourcesLoading,
    isError: isResourcesError,
    refetch: refetchResources,
  } = useQuery({
    queryKey: ['adminResources'],
    queryFn: () => api.getAdminResources(),
  })

  const {
    data: guidelines = [],
    isLoading: isGuidelinesLoading,
    isError: isGuidelinesError,
    refetch: refetchGuidelines,
  } = useQuery({
    queryKey: ['guidelines'],
    queryFn: () => api.getGuidelines(),
  })

  // Handlers for Upload Modal
  const handleOpenUpload = () => {
    setUploadTitle('')
    setUploadCategory('rules')
    setUploadDept('All Departments')
    setUploadYear('All Years')
    setUploadEffectiveDate('')
    setUploadStatus('draft')
    setUploadDescription('')
    setUploadFile(null)
    setUploadProgress(0)
    setUploadError(null)
    setShowUploadModal(true)
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      setUploadFile(file)
      if (!uploadTitle) {
        setUploadTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '))
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setUploadFile(file)
      if (!uploadTitle) {
        setUploadTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '))
      }
    }
  }

  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadTitle.trim()) {
      setUploadError('Please provide a document title.')
      return
    }

    try {
      setIsUploading(true)
      setUploadError(null)

      // Simulate progress
      setUploadProgress(30)
      const formData = new FormData()
      formData.append('title', uploadTitle.trim())
      formData.append('category', uploadCategory)
      formData.append('department', uploadDept === 'All Departments' ? 'All' : uploadDept)
      formData.append('academic_year', uploadYear === 'All Years' ? 'All' : uploadYear)
      formData.append('status', uploadStatus)
      if (uploadEffectiveDate) formData.append('effective_date', uploadEffectiveDate)
      if (uploadDescription) formData.append('description', uploadDescription.trim())
      if (uploadFile) formData.append('file', uploadFile)

      setUploadProgress(65)
      await api.createResource(formData)
      setUploadProgress(100)

      await queryClient.invalidateQueries({ queryKey: ['adminResources'] })
      setShowUploadModal(false)
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload document.')
    } finally {
      setIsUploading(false)
    }
  }

  // Handlers for Edit
  const handleOpenEdit = (res: ResourceItem) => {
    setEditingResource(res)
    setEditTitle(res.title)
    setEditCategory(res.category)
    setEditDept(res.department || 'All Departments')
    setEditYear(res.academic_year || 'All Years')
    setEditEffectiveDate(res.effective_date || '')
    setEditStatus(res.status)
    setEditDescription(res.description || '')
    setEditError(null)
    setShowEditModal(true)
  }

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingResource) return
    if (!editTitle.trim()) {
      setEditError('Title is required.')
      return
    }

    try {
      setIsSavingEdit(true)
      setEditError(null)
      await api.updateResource(editingResource.id, {
        title: editTitle.trim(),
        category: editCategory,
        department: editDept === 'All Departments' ? 'All' : editDept,
        academic_year: editYear === 'All Years' ? 'All' : editYear,
        effective_date: editEffectiveDate || undefined,
        status: editStatus,
        description: editDescription.trim(),
      })
      await queryClient.invalidateQueries({ queryKey: ['adminResources'] })
      setShowEditModal(false)
    } catch (err: any) {
      setEditError(err.message || 'Failed to update resource.')
    } finally {
      setIsSavingEdit(false)
    }
  }

  // Handlers for Replace File
  const handleOpenReplace = (res: ResourceItem) => {
    setReplacingResource(res)
    setReplaceFile(null)
    setReplaceChangeSummary('')
    setReplaceError(null)
    setShowReplaceModal(true)
  }

  const handleSubmitReplace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replacingResource) return
    if (!replaceFile) {
      setReplaceError('Please select a replacement file.')
      return
    }

    try {
      setIsReplacing(true)
      setReplaceError(null)
      const formData = new FormData()
      formData.append('file', replaceFile)
      if (replaceChangeSummary.trim()) {
        formData.append('changeSummary', replaceChangeSummary.trim())
      }
      await api.replaceResourceFile(replacingResource.id, formData)
      await queryClient.invalidateQueries({ queryKey: ['adminResources'] })
      setShowReplaceModal(false)
    } catch (err: any) {
      setReplaceError(err.message || 'Failed to replace file.')
    } finally {
      setIsReplacing(false)
    }
  }

  // Status Toggles
  const handleTogglePublish = async (res: ResourceItem) => {
    const nextStatus = res.status === 'published' ? 'draft' : 'published'
    try {
      await api.updateResourceStatus(res.id, nextStatus)
      await queryClient.invalidateQueries({ queryKey: ['adminResources'] })
    } catch (err: any) {
      alert(`Could not change status: ${err.message}`)
    }
  }

  const handleToggleArchive = async (res: ResourceItem) => {
    const nextStatus = res.status === 'archived' ? 'published' : 'archived'
    try {
      await api.updateResourceStatus(res.id, nextStatus)
      await queryClient.invalidateQueries({ queryKey: ['adminResources'] })
    } catch (err: any) {
      alert(`Could not archive: ${err.message}`)
    }
  }

  // Delete Handlers
  const handleDeleteResource = async () => {
    if (!deleteConfirmResource) return
    try {
      await api.deleteResource(deleteConfirmResource.id)
      await queryClient.invalidateQueries({ queryKey: ['adminResources'] })
      setDeleteConfirmResource(null)
    } catch (err: any) {
      alert(`Could not delete: ${err.message}`)
    }
  }

  // Guidelines Handlers
  const handleOpenAddGuideline = () => {
    setEditingGuideline(null)
    setGuidelineSection('')
    setGuidelineTitle('')
    setGuidelineCategory('Attendance & Leave')
    setGuidelineBody('')
    setGuidelineCriteria('')
    setGuidelineMostConsulted(false)
    setGuidelineError(null)
    setShowGuidelineModal(true)
  }

  const handleOpenEditGuideline = (g: Guideline) => {
    setEditingGuideline(g)
    setGuidelineSection(g.section)
    setGuidelineTitle(g.title)
    setGuidelineCategory(g.category)
    setGuidelineBody(g.body)
    setGuidelineCriteria(Array.isArray(g.verificationCriteria) ? g.verificationCriteria.join(', ') : '')
    setGuidelineMostConsulted(Boolean(g.mostConsulted))
    setGuidelineError(null)
    setShowGuidelineModal(true)
  }

  const handleSubmitGuideline = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guidelineSection.trim() || !guidelineTitle.trim() || !guidelineBody.trim()) {
      setGuidelineError('Section number, title, and body are required.')
      return
    }

    try {
      setIsSavingGuideline(true)
      setGuidelineError(null)

      const criteriaList = guidelineCriteria
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      if (editingGuideline) {
        await api.updateGuideline(editingGuideline.id, {
          section: guidelineSection.trim(),
          category: guidelineCategory.trim(),
          title: guidelineTitle.trim(),
          body: guidelineBody.trim(),
          verificationCriteria: criteriaList,
          mostConsulted: guidelineMostConsulted,
        })
      } else {
        await api.createGuideline({
          section: guidelineSection.trim(),
          category: guidelineCategory.trim(),
          title: guidelineTitle.trim(),
          body: guidelineBody.trim(),
          verificationCriteria: criteriaList,
          mostConsulted: guidelineMostConsulted,
        })
      }

      await queryClient.invalidateQueries({ queryKey: ['guidelines'] })
      setShowGuidelineModal(false)
    } catch (err: any) {
      setGuidelineError(err.message || 'Failed to save bylaw section.')
    } finally {
      setIsSavingGuideline(false)
    }
  }

  const handleDeleteGuideline = async () => {
    if (!deleteGuidelineConfirm) return
    try {
      await api.deleteGuideline(deleteGuidelineConfirm.id)
      await queryClient.invalidateQueries({ queryKey: ['guidelines'] })
      setDeleteGuidelineConfirm(null)
    } catch (err: any) {
      alert(`Could not delete bylaw: ${err.message}`)
    }
  }

  // AI PDF Extraction Handlers
  const handleRunExtract = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!extractFile) {
      setExtractError('Please select a PDF document to analyze.')
      return
    }

    try {
      setIsExtracting(true)
      setExtractError(null)
      setExtractionResult(null)
      const formData = new FormData()
      formData.append('file', extractFile)
      const res = await api.extractPdfText(formData)
      setExtractionResult(res)
    } catch (err: any) {
      setExtractError(err.message || 'AI document extraction failed.')
    } finally {
      setIsExtracting(false)
    }
  }

  const handleAdoptSection = (section: ExtractedBylawSection) => {
    setEditingGuideline(null)
    setGuidelineSection(section.section || '4.2')
    setGuidelineTitle(section.title || 'Extracted Policy')
    setGuidelineCategory(section.category || 'Attendance & Leave')
    setGuidelineBody(section.body || '')
    setGuidelineCriteria('')
    setGuidelineMostConsulted(false)
    setGuidelineError(null)
    setShowExtractModal(false)
    setShowGuidelineModal(true)
  }

  // Timetable Grid Handlers
  const handleAddTimetableRow = () => {
    setTtEntries([
      ...ttEntries,
      {
        day: 'Monday',
        period: ttEntries.length + 1,
        subject: '',
        faculty: '',
        room: '',
      },
    ])
  }

  const handleUpdateTimetableRow = (index: number, field: keyof TimetableEntry, value: any) => {
    const updated = [...ttEntries]
    updated[index] = { ...updated[index], [field]: value }
    setTtEntries(updated)
  }

  const handleRemoveTimetableRow = (index: number) => {
    setTtEntries(ttEntries.filter((_, idx) => idx !== index))
  }

  const handleSaveTimetable = async () => {
    try {
      setIsSavingTimetable(true)
      setTimetableFeedback(null)

      const formData = new FormData()
      formData.append('title', ttTitle.trim() || `${ttDepartment} - Year ${ttYear} Timetable`)
      formData.append('category', 'timetable')
      formData.append('department', ttDepartment)
      formData.append('academic_year', ttYear)
      formData.append('status', ttStatus)
      formData.append('timetableEntries', JSON.stringify(ttEntries))
      if (ttFile) {
        formData.append('file', ttFile)
      }

      await api.createResource(formData)
      await queryClient.invalidateQueries({ queryKey: ['adminResources'] })
      setTimetableFeedback('Class timetable and period slots successfully saved and published!')
    } catch (err: any) {
      setTimetableFeedback(`Error saving timetable: ${err.message}`)
    } finally {
      setIsSavingTimetable(false)
    }
  }

  // Filtering Resources
  const filteredResources = resources.filter((res) => {
    const matchesSearch =
      !searchTerm.trim() ||
      res.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (res.description && res.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (res.department && res.department.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCategory = selectedCategory === 'all' || res.category === selectedCategory
    const matchesStatus = selectedStatus === 'all' || res.status === selectedStatus
    const matchesDept =
      selectedDepartment === 'All Departments' ||
      !res.department ||
      res.department === 'All' ||
      res.department.toLowerCase() === selectedDepartment.toLowerCase()

    return matchesSearch && matchesCategory && matchesStatus && matchesDept
  })

  return (
    <div className="space-y-6 animate-in fade-in-50">
      {/* Page Title & Tab Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Document & Content Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage official bylaws, class schedules, university circulars, forms, and academic resources.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'resources' && (
            <Button onClick={handleOpenUpload} className="gap-2 shadow-sm">
              <Upload className="h-4 w-4" />
              Upload Document
            </Button>
          )}
          {activeTab === 'guidelines' && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setExtractFile(null)
                  setExtractionResult(null)
                  setExtractError(null)
                  setShowExtractModal(true)
                }}
                className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
              >
                <Sparkles className="h-4 w-4" />
                AI Extract from PDF
              </Button>
              <Button onClick={handleOpenAddGuideline} className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" />
                Add Bylaw Section
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center border-b border-border bg-card/40 rounded-t-lg px-2 pt-2">
        <button
          onClick={() => setActiveTab('resources')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'resources'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          All Documents & Resources
          <Badge variant="secondary" className="ml-1 text-xs">
            {resources.length}
          </Badge>
        </button>

        <button
          onClick={() => setActiveTab('guidelines')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'guidelines'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4" />
          Rules & Bylaws
          <Badge variant="secondary" className="ml-1 text-xs">
            {guidelines.length}
          </Badge>
        </button>

        <button
          onClick={() => setActiveTab('timetable')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'timetable'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          Timetable Planner
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: ALL DOCUMENTS & RESOURCES TABLE */}
      {/* ==================================================================== */}
      {activeTab === 'resources' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <Card className="bg-card/60 backdrop-blur-sm border-border/70">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by title, department, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    aria-label="Category Filter"
                    className="h-9 px-3 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    aria-label="Status Filter"
                    className="h-9 px-3 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="all">All Statuses</option>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>

                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    aria-label="Department Filter"
                    className="h-9 px-3 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => refetchResources()}
                    className="h-9 w-9 text-muted-foreground hover:text-foreground"
                    title="Refresh List"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resources Table */}
          {isResourcesLoading ? (
            <LoadingState message="Loading documents and published university resources..." rows={5} />
          ) : isResourcesError ? (
            <ErrorState
              title="Could not load resources"
              message="Failed to retrieve resources from server."
              onRetry={() => refetchResources()}
            />
          ) : filteredResources.length === 0 ? (
            <EmptyState
              title="No documents found"
              description={
                searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all'
                  ? 'No documents match your active search filters.'
                  : 'Start by uploading your first university document, timetable, or policy.'
              }
              actionLabel="Upload Document"
              onAction={handleOpenUpload}
            />
          ) : (
            <Card className="border-border/70 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Document Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Target Department & Year</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResources.map((res) => {
                    const isDraft = res.status === 'draft'
                    const isPublished = res.status === 'published'
                    const isArchived = res.status === 'archived'

                    return (
                      <TableRow key={res.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="font-medium max-w-[260px]">
                          <div className="flex items-start gap-2.5">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5 shrink-0">
                              {res.category === 'timetable' ? (
                                <CalendarDays className="h-4 w-4" />
                              ) : res.category === 'rules' ? (
                                <BookOpen className="h-4 w-4" />
                              ) : (
                                <FileText className="h-4 w-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">{res.title}</p>
                              {res.description && (
                                <p className="text-xs text-muted-foreground truncate">{res.description}</p>
                              )}
                              {res.file_url && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-primary/80 mt-0.5">
                                  <FileCode className="h-3 w-3" />
                                  {res.file_url.split('.').pop()?.toUpperCase()} Document
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs font-normal">
                            {res.category}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col gap-1 text-xs">
                            <span className="text-foreground">{res.department || 'All Departments'}</span>
                            <span className="text-muted-foreground text-[11px]">{res.academic_year || 'All Years'}</span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant="secondary" className="font-mono text-xs">
                            v{res.version}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          {isPublished && (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                              Published
                            </Badge>
                          )}
                          {isDraft && (
                            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
                              Draft
                            </Badge>
                          )}
                          {isArchived && (
                            <Badge className="bg-slate-500/15 text-slate-500 border-slate-500/30">Archived</Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(res.updated_at || res.created_at).toLocaleDateString()}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {res.file_url && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                onClick={() => setPreviewResource(res)}
                                title="Preview Document"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => handleOpenEdit(res)}
                              title="Edit Metadata"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={() => handleOpenReplace(res)}
                              title="Replace File (New Version)"
                            >
                              <FileUp className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 ${
                                isPublished
                                  ? 'text-emerald-600 hover:text-amber-600'
                                  : 'text-amber-600 hover:text-emerald-600'
                              }`}
                              onClick={() => handleTogglePublish(res)}
                              title={isPublished ? 'Unpublish (Mark Draft)' : 'Publish Resource'}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-slate-600"
                              onClick={() => handleToggleArchive(res)}
                              title={isArchived ? 'Unarchive' : 'Archive Document'}
                            >
                              <Archive className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteConfirmResource(res)}
                              title="Delete Resource"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: RULES & BYLAWS MANAGEMENT TAB */}
      {/* ==================================================================== */}
      {activeTab === 'guidelines' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">University Bylaw Ordinances</h2>
              <p className="text-xs text-muted-foreground">
                These sections directly feed into CampusDesk Autonomous AI reasoning with accurate section numbers.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchGuidelines()}
              className="gap-1.5 h-8 text-xs text-muted-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh Bylaws
            </Button>
          </div>

          {isGuidelinesLoading ? (
            <LoadingState message="Loading bylaw sections..." rows={4} />
          ) : isGuidelinesError ? (
            <ErrorState
              title="Could not load bylaws"
              message="Unable to fetch official bylaws."
              onRetry={() => refetchGuidelines()}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {guidelines.map((g) => (
                <Card
                  key={g.id}
                  className="bg-card/70 border-border/70 hover:border-primary/40 transition-all flex flex-col justify-between"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className="font-mono text-xs bg-primary/10 text-primary border-primary/20">
                        Section {g.section}
                      </Badge>
                      <Badge variant="secondary" className="text-[11px]">
                        {g.category}
                      </Badge>
                    </div>
                    <CardTitle className="text-base text-foreground mt-2 line-clamp-2">{g.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <p className="text-xs text-muted-foreground line-clamp-4 leading-relaxed">{g.body}</p>

                    {Array.isArray(g.verificationCriteria) && g.verificationCriteria.length > 0 && (
                      <div className="pt-2 border-t border-border/50">
                        <span className="text-[11px] font-semibold text-foreground/80 block mb-1">
                          Verification Proof:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {g.verificationCriteria.map((c, i) => (
                            <span
                              key={i}
                              className="text-[10px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded"
                            >
                              ✓ {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-1 pt-2 border-t border-border/50">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditGuideline(g)}
                        className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteGuidelineConfirm(g)}
                        className="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: TIMETABLE PLANNER & PERIOD GRID */}
      {/* ==================================================================== */}
      {activeTab === 'timetable' && (
        <div className="space-y-6">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                Department Class Timetable Builder
              </CardTitle>
              <CardDescription>
                Define day periods, assign faculty & rooms, and publish class schedules for student mobile sync.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {timetableFeedback && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    timetableFeedback.includes('Error')
                      ? 'bg-destructive/15 text-destructive border border-destructive/20'
                      : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  }`}
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {timetableFeedback}
                </div>
              )}

              {/* Schedule Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Department</label>
                  <select
                    value={ttDepartment}
                    onChange={(e) => setTtDepartment(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background text-foreground"
                  >
                    {DEPARTMENTS.filter((d) => d !== 'All Departments').map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Academic Year</label>
                  <select
                    value={ttYear}
                    onChange={(e) => setTtYear(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background text-foreground"
                  >
                    {YEARS.filter((y) => y !== 'All Years').map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Schedule Title</label>
                  <Input
                    value={ttTitle}
                    onChange={(e) => setTtTitle(e.target.value)}
                    className="h-9 text-xs"
                    placeholder="e.g. Fall 2024 Class Schedule"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Publish Status</label>
                  <select
                    value={ttStatus}
                    onChange={(e) => setTtStatus(e.target.value as any)}
                    className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background text-foreground"
                  >
                    <option value="published">Published (Visible to Students)</option>
                    <option value="draft">Draft (Admin Only)</option>
                  </select>
                </div>
              </div>

              {/* Optional Timetable File Attachment */}
              <div className="p-3 rounded-lg border border-dashed border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-primary shrink-0" />
                  <div className="text-xs">
                    <p className="font-semibold text-foreground">Attach Timetable Document (Optional)</p>
                    <p className="text-muted-foreground">Upload official PDF or XLSX schedule for student downloads</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".pdf,.xlsx,.png,.jpg,.jpeg"
                    onChange={(e) => setTtFile(e.target.files?.[0] || null)}
                    className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-primary file:text-primary-foreground hover:file:opacity-90"
                  />
                  {ttFile && (
                    <Badge variant="secondary" className="text-xs font-mono">
                      {ttFile.name}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Editable Class Periods Grid */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="bg-muted/40 px-4 py-2 flex items-center justify-between border-b border-border">
                  <span className="text-xs font-semibold text-foreground">Scheduled Daily Periods ({ttEntries.length})</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddTimetableRow}
                    className="h-7 text-xs gap-1 border-primary/30 text-primary"
                  >
                    <Plus className="h-3 w-3" />
                    Add Class Period
                  </Button>
                </div>

                <div className="divide-y divide-border/60 max-h-[380px] overflow-y-auto">
                  {ttEntries.map((entry, idx) => (
                    <div
                      key={idx}
                      className="p-3 grid grid-cols-1 sm:grid-cols-6 gap-2 items-center hover:bg-muted/10 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Day</span>
                        <select
                          value={entry.day}
                          onChange={(e) => handleUpdateTimetableRow(idx, 'day', e.target.value)}
                          className="w-full h-8 px-2 text-xs rounded border border-input bg-background"
                        >
                          <option value="Monday">Monday</option>
                          <option value="Tuesday">Tuesday</option>
                          <option value="Wednesday">Wednesday</option>
                          <option value="Thursday">Thursday</option>
                          <option value="Friday">Friday</option>
                          <option value="Saturday">Saturday</option>
                        </select>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Period</span>
                        <select
                          value={entry.period}
                          onChange={(e) => handleUpdateTimetableRow(idx, 'period', Number(e.target.value))}
                          className="w-full h-8 px-2 text-xs rounded border border-input bg-background"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                            <option key={p} value={p}>
                              Period {p}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-0.5 sm:col-span-2">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Subject</span>
                        <Input
                          value={entry.subject}
                          onChange={(e) => handleUpdateTimetableRow(idx, 'subject', e.target.value)}
                          placeholder="Course / Subject name"
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Faculty / Prof</span>
                        <Input
                          value={entry.faculty || ''}
                          onChange={(e) => handleUpdateTimetableRow(idx, 'faculty', e.target.value)}
                          placeholder="Faculty Advisor"
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 pt-4 sm:pt-0">
                        <div className="flex-1 space-y-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">Room / Hall</span>
                          <Input
                            value={entry.room || ''}
                            onChange={(e) => handleUpdateTimetableRow(idx, 'room', e.target.value)}
                            placeholder="Hall / Lab"
                            className="h-8 text-xs"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveTimetableRow(idx)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 mt-3"
                          title="Remove period"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleSaveTimetable} disabled={isSavingTimetable} className="gap-2 shadow-sm">
                  {isSavingTimetable ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Saving Timetable...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Save & Publish Timetable
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 1: UPLOAD RESOURCE MODAL WITH DRAG & DROP & PROGRESS BAR */}
      {/* ==================================================================== */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-xl max-w-xl w-full p-6 shadow-2xl relative my-8 animate-in fade-in-50 zoom-in-95">
            <button
              onClick={() => !isUploading && setShowUploadModal(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4">
              <h3 className="text-lg font-bold text-foreground">Upload University Resource</h3>
              <p className="text-xs text-muted-foreground">
                Publish regulations, timetables, circulars, or forms for faculty and student access.
              </p>
            </div>

            {uploadError && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/15 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {uploadError}
              </div>
            )}

            <form onSubmit={handleSubmitUpload} className="space-y-4">
              {/* Drag & Drop Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-primary bg-primary/10'
                    : uploadFile
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-border hover:border-primary/50 bg-muted/20'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
                  className="hidden"
                />

                {uploadFile ? (
                  <div className="flex flex-col items-center gap-1.5">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    <p className="text-sm font-semibold text-foreground">{uploadFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB • Click or drag to change
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">
                      Drag and drop document here, or <span className="text-primary underline">browse</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supported: PDF, DOCX, XLSX, PNG, JPG (Maximum 10 MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Upload Progress Bar */}
              {isUploading && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Uploading & verifying integrity...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Document Title *</label>
                  <Input
                    required
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. 2024-2025 Autonomous Regulation Handbook"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Category</label>
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value as any)}
                      className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background text-foreground"
                    >
                      {CATEGORIES.filter((c) => c.value !== 'all').map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Publication Status</label>
                    <select
                      value={uploadStatus}
                      onChange={(e) => setUploadStatus(e.target.value as any)}
                      className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background text-foreground"
                    >
                      <option value="draft">Draft (Review before publishing)</option>
                      <option value="published">Published (Live to Students)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Target Department</label>
                    <select
                      value={uploadDept}
                      onChange={(e) => setUploadDept(e.target.value)}
                      className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background text-foreground"
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Academic Year</label>
                    <select
                      value={uploadYear}
                      onChange={(e) => setUploadYear(e.target.value)}
                      className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background text-foreground"
                    >
                      {YEARS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Effective Date (Optional)</label>
                  <Input
                    type="date"
                    value={uploadEffectiveDate}
                    onChange={(e) => setUploadEffectiveDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Description & Overview (Optional)</label>
                  <textarea
                    rows={2}
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="Brief description of the ordinance or purpose..."
                    className="w-full p-2 text-xs rounded-md border border-input bg-background text-foreground resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowUploadModal(false)}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isUploading} className="gap-2">
                  {isUploading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Complete Upload
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: EDIT RESOURCE METADATA */}
      {/* ==================================================================== */}
      {showEditModal && editingResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in-50 zoom-in-95">
            <button
              onClick={() => !isSavingEdit && setShowEditModal(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-foreground mb-1">Edit Resource Details</h3>
            <p className="text-xs text-muted-foreground mb-4">Update metadata, department targeting, or publish state.</p>

            {editError && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/15 text-destructive text-xs">{editError}</div>
            )}

            <form onSubmit={handleSubmitEdit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Title</label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as any)}
                    className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background"
                  >
                    {CATEGORIES.filter((c) => c.value !== 'all').map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Target Department</label>
                  <select
                    value={editDept}
                    onChange={(e) => setEditDept(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Academic Year</label>
                  <select
                    value={editYear}
                    onChange={(e) => setEditYear(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background"
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Description</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full p-2 text-xs rounded-md border border-input bg-background resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSavingEdit}>
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: REPLACE FILE WITH VERSION HISTORY */}
      {/* ==================================================================== */}
      {showReplaceModal && replacingResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in-50 zoom-in-95">
            <button
              onClick={() => !isReplacing && setShowReplaceModal(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-foreground mb-1">Replace Document File</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Current version: <span className="font-semibold text-foreground">v{replacingResource.version}</span>.
              Uploading a new file will increment the document to{' '}
              <span className="font-semibold text-primary">v{replacingResource.version + 1}</span>.
            </p>

            {replaceError && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/15 text-destructive text-xs">{replaceError}</div>
            )}

            <form onSubmit={handleSubmitReplace} className="space-y-4">
              <div
                onClick={() => replaceFileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-primary rounded-xl p-5 text-center cursor-pointer bg-muted/20"
              >
                <input
                  type="file"
                  ref={replaceFileInputRef}
                  onChange={(e) => setReplaceFile(e.target.files?.[0] || null)}
                  accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
                  className="hidden"
                />
                <FileUp className="h-6 w-6 text-primary mx-auto mb-1" />
                <p className="text-xs font-semibold text-foreground">
                  {replaceFile ? replaceFile.name : 'Select revised document file'}
                </p>
                <p className="text-[11px] text-muted-foreground">PDF, DOCX, XLSX, PNG, JPG (Max 10 MB)</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Revision Summary / Note</label>
                <Input
                  value={replaceChangeSummary}
                  onChange={(e) => setReplaceChangeSummary(e.target.value)}
                  placeholder="e.g. Revised exam condonation threshold to 65%"
                  className="h-9 text-xs"
                />
              </div>

              {/* Version History List */}
              <div className="border border-border rounded-lg p-3 bg-muted/30 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <History className="h-4 w-4 text-muted-foreground" />
                  Version History Log
                </div>
                <div className="text-xs space-y-1.5 max-h-32 overflow-y-auto">
                  <div className="flex justify-between items-center text-muted-foreground text-[11px] bg-background/60 p-1.5 rounded">
                    <span>
                      v{replacingResource.version} (Active) •{' '}
                      {new Date(replacingResource.updated_at || replacingResource.created_at).toLocaleDateString()}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      Current
                    </Badge>
                  </div>
                  {replacingResource.versions?.map((v) => (
                    <div key={v.id} className="flex justify-between items-center text-muted-foreground text-[11px] p-1">
                      <span>v{v.version} • {v.change_summary || 'Updated'}</span>
                      <span>{new Date(v.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setShowReplaceModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isReplacing}>
                  {isReplacing ? 'Deploying Revision...' : `Deploy Version ${replacingResource.version + 1}`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 4: PREVIEW PANEL (PDFs & Images) */}
      {/* ==================================================================== */}
      {previewResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-xl max-w-4xl w-full h-[85vh] flex flex-col p-6 shadow-2xl relative animate-in fade-in-50">
            <button
              onClick={() => setPreviewResource(null)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-start justify-between gap-4 pb-3 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-foreground">{previewResource.title}</h3>
                <p className="text-xs text-muted-foreground">
                  Version {previewResource.version} • {previewResource.category.toUpperCase()} •{' '}
                  {previewResource.department || 'All Departments'}
                </p>
              </div>
              {previewResource.file_url && (
                <a
                  href={`${API_BASE}${previewResource.file_url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline shrink-0 mr-8"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open in New Tab
                </a>
              )}
            </div>

            {/* Embedded Preview Canvas */}
            <div className="flex-1 overflow-hidden mt-4 rounded-lg border border-border bg-muted/20 flex items-center justify-center">
              {previewResource.file_url?.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={`${API_BASE}${previewResource.file_url}`}
                  className="w-full h-full rounded-lg"
                  title="PDF Preview"
                />
              ) : previewResource.file_url?.match(/\.(png|jpg|jpeg)$/i) ? (
                <img
                  src={`${API_BASE}${previewResource.file_url}`}
                  alt={previewResource.title}
                  className="max-h-full max-w-full object-contain rounded-lg"
                />
              ) : (
                <div className="text-center p-6 space-y-3">
                  <FileSpreadsheet className="h-12 w-12 text-primary mx-auto" />
                  <p className="text-sm font-semibold text-foreground">Direct Preview Not Supported for this File Type</p>
                  <p className="text-xs text-muted-foreground max-w-md">
                    Word (.docx) and Excel (.xlsx) files are stored securely and served with attachment headers.
                  </p>
                  <a
                    href={`${API_BASE}${previewResource.file_url}`}
                    download
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold shadow hover:opacity-90"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download File to View
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 5: DELETE RESOURCE CONFIRMATION */}
      {/* ==================================================================== */}
      {deleteConfirmResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl max-w-sm w-full p-6 shadow-2xl relative animate-in fade-in-50 zoom-in-95">
            <h3 className="text-lg font-bold text-destructive mb-2">Delete University Resource?</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Are you sure you want to permanently delete{' '}
              <span className="font-semibold text-foreground">"{deleteConfirmResource.title}"</span>? This will also remove
              all prior version logs and timetable slots.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirmResource(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteResource}>
                Yes, Delete Resource
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 6: ADD/EDIT BYLAW GUIDELINE MODAL */}
      {/* ==================================================================== */}
      {showGuidelineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full p-6 shadow-2xl relative my-8 animate-in fade-in-50 zoom-in-95">
            <button
              onClick={() => !isSavingGuideline && setShowGuidelineModal(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-foreground mb-1">
              {editingGuideline ? 'Edit Bylaw Section' : 'Create Bylaw Section'}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Section numbers are strictly preserved so Autonomous AI can cite specific clauses in student inquiries.
            </p>

            {guidelineError && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/15 text-destructive text-xs">{guidelineError}</div>
            )}

            <form onSubmit={handleSubmitGuideline} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Section # *</label>
                  <Input
                    required
                    value={guidelineSection}
                    onChange={(e) => setGuidelineSection(e.target.value)}
                    placeholder="e.g. 4.2"
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-semibold text-foreground">Category *</label>
                  <Input
                    required
                    value={guidelineCategory}
                    onChange={(e) => setGuidelineCategory(e.target.value)}
                    placeholder="e.g. Attendance & Leave"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Bylaw Title *</label>
                <Input
                  required
                  value={guidelineTitle}
                  onChange={(e) => setGuidelineTitle(e.target.value)}
                  placeholder="e.g. Medical Leave Condonation Policy"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Bylaw Text & Policy Body *</label>
                <textarea
                  required
                  rows={4}
                  value={guidelineBody}
                  onChange={(e) => setGuidelineBody(e.target.value)}
                  placeholder="Official clause text, conditions, percentage criteria..."
                  className="w-full p-2 text-xs rounded-md border border-input bg-background text-foreground resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Verification Proof Criteria (Comma-separated)</label>
                <Input
                  value={guidelineCriteria}
                  onChange={(e) => setGuidelineCriteria(e.target.value)}
                  placeholder="e.g. Medical certificate, Parent consent, Hospital discharge slip"
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="mostConsulted"
                  checked={guidelineMostConsulted}
                  onChange={(e) => setGuidelineMostConsulted(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary"
                />
                <label htmlFor="mostConsulted" className="text-xs text-foreground cursor-pointer">
                  Feature as "Frequently Consulted" bylaw on student dashboards
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setShowGuidelineModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSavingGuideline}>
                  {isSavingGuideline ? 'Saving...' : 'Save Bylaw Section'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 7: AI PDF EXTRACTION & REVIEW MODAL */}
      {/* ==================================================================== */}
      {showExtractModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-xl max-w-2xl w-full p-6 shadow-2xl relative my-8 animate-in fade-in-50 zoom-in-95">
            <button
              onClick={() => !isExtracting && setShowExtractModal(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold text-foreground">Extract Bylaw Sections from PDF with AI</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Upload a scanned or digital university regulatory PDF. Gemini will extract clauses and organize them into
              bylaw sections for your review before saving.
            </p>

            {extractError && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/15 text-destructive text-xs">{extractError}</div>
            )}

            {!extractionResult ? (
              <form onSubmit={handleRunExtract} className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center bg-muted/20">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setExtractFile(e.target.files?.[0] || null)}
                    className="text-xs file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-primary file:text-primary-foreground"
                  />
                  <p className="text-xs text-muted-foreground mt-2">Select an official university regulation PDF</p>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowExtractModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isExtracting || !extractFile} className="gap-2">
                    {isExtracting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Analyzing with Gemini...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Extract Bylaws
                      </>
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
                  <span className="font-semibold text-foreground">Extracted Document Preview:</span>
                  <p className="text-muted-foreground line-clamp-3 italic">"{extractionResult.extractedText}"</p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Suggested Bylaw Sections ({extractionResult.suggestedSections.length})
                  </h4>

                  {extractionResult.suggestedSections.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No structured sections were parsed. You can still copy text from above.</p>
                  ) : (
                    extractionResult.suggestedSections.map((sec, idx) => (
                      <Card key={idx} className="bg-card border-border/80">
                        <CardHeader className="p-3 pb-1">
                          <div className="flex justify-between items-center">
                            <Badge variant="outline" className="font-mono text-xs text-primary">
                              Section {sec.section || '4.2'}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px]">
                              {sec.category || 'General'}
                            </Badge>
                          </div>
                          <CardTitle className="text-sm font-semibold mt-1">{sec.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-1 space-y-2">
                          <p className="text-xs text-muted-foreground line-clamp-3">{sec.body}</p>
                          <Button
                            size="sm"
                            onClick={() => handleAdoptSection(sec)}
                            className="w-full text-xs h-7 gap-1.5"
                          >
                            <Plus className="h-3 w-3" />
                            Review & Save as Section {sec.section}
                          </Button>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>

                <div className="flex justify-end pt-2 border-t border-border">
                  <Button variant="outline" onClick={() => setExtractionResult(null)}>
                    Analyze Another Document
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 8: DELETE GUIDELINE CONFIRMATION */}
      {/* ==================================================================== */}
      {deleteGuidelineConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl max-w-sm w-full p-6 shadow-2xl relative animate-in fade-in-50 zoom-in-95">
            <h3 className="text-lg font-bold text-destructive mb-2">Delete Bylaw Section?</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Delete <span className="font-semibold text-foreground">Section {deleteGuidelineConfirm.section}</span> (
              {deleteGuidelineConfirm.title})? Autonomous AI will no longer cite this clause.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteGuidelineConfirm(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteGuideline}>
                Delete Section
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
