import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, Student } from '@/lib/api'
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
import { Search, GraduationCap, UserCheck, AlertCircle, RefreshCw, UserX, UserPlus, Pencil, X, FileSpreadsheet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CsvImportModal } from '@/components/users/CsvImportModal'

export const StudentsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMode, setFilterMode] = useState<'all' | 'assigned' | 'unassigned'>('all')
  const [showCsvModal, setShowCsvModal] = useState(false)

  // Add Student Modal State
  const [showAddModal, setShowAddModal] = useState(false)
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addRollNo, setAddRollNo] = useState('')
  const [addProgram, setAddProgram] = useState('B.Tech · Computer Science & Engineering')
  const [addDept, setAddDept] = useState('School of Computing Sciences')
  const [addPassword, setAddPassword] = useState('student123')
  const [addError, setAddError] = useState<string | null>(null)
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false)

  // Edit Student Modal State
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRollNo, setEditRollNo] = useState('')
  const [editProgram, setEditProgram] = useState('')
  const [editDept, setEditDept] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false)

  const {
    data: students = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['students'],
    queryFn: () => api.getStudents(),
  })

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student)
    setEditName(student.name)
    setEditEmail(student.email)
    setEditRollNo(student.rollNo)
    setEditProgram(student.program || 'B.Tech · Computer Science & Engineering')
    setEditDept(student.department || 'School of Computing Sciences')
    setEditError(null)
  }

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addName.trim() || !addEmail.trim() || !addRollNo.trim()) {
      setAddError('Full name, institutional email, and roll number are required.')
      return
    }

    setIsSubmittingAdd(true)
    setAddError(null)

    try {
      await api.createUser({
        name: addName.trim(),
        email: addEmail.trim(),
        rollNo: addRollNo.trim(),
        program: addProgram.trim(),
        department: addDept.trim(),
        password: addPassword || 'student123',
        role: 'student',
      })
      setShowAddModal(false)
      setAddName('')
      setAddEmail('')
      setAddRollNo('')
      setAddPassword('student123')
      await refetch()
    } catch (err: any) {
      setAddError(err.message || 'Failed to create student account')
    } finally {
      setIsSubmittingAdd(false)
    }
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStudent) return
    if (!editName.trim() || !editEmail.trim() || !editRollNo.trim()) {
      setEditError('Full name, institutional email, and roll number are required.')
      return
    }

    setIsSubmittingEdit(true)
    setEditError(null)

    try {
      await api.updateStudent(editingStudent.id, {
        name: editName.trim(),
        email: editEmail.trim(),
        rollNo: editRollNo.trim(),
        program: editProgram.trim(),
        department: editDept.trim(),
      })
      setEditingStudent(null)
      await refetch()
    } catch (err: any) {
      setEditError(err.message || 'Failed to update student record')
    } finally {
      setIsSubmittingEdit(false)
    }
  }

  if (isLoading) {
    return <LoadingState message="Loading enrolled students roster..." rows={6} />
  }

  if (isError) {
    return (
      <ErrorState
        title="Could not load students"
        message="Failed to retrieve student records from server."
        onRetry={() => refetch()}
      />
    )
  }

  const filteredStudents = students.filter((s) => {
    // Mode filter
    if (filterMode === 'assigned' && !s.mentor) return false
    if (filterMode === 'unassigned' && s.mentor) return false

    // Search filter
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      s.name.toLowerCase().includes(term) ||
      s.rollNo.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term) ||
      (s.department && s.department.toLowerCase().includes(term))
    )
  })

  const unassignedCount = students.filter((s) => !s.mentor).length

  return (
    <div className="space-y-6 animate-in fade-in-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Students Directory
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enrolled student roster, program affiliations, and 1:1 mentor assignments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCsvModal(true)}
            className="gap-1.5 text-xs font-medium border-emerald-600/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> Import CSV
          </Button>
          <Button size="sm" onClick={() => setShowAddModal(true)} className="gap-1.5 text-xs font-medium">
            <UserPlus className="h-3.5 w-3.5" /> Add Student
          </Button>
          <Button asChild size="sm" variant="secondary" className="gap-1.5 text-xs font-medium">
            <Link to="/assignments">Manage Assignments &rarr;</Link>
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <Button
                variant={filterMode === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterMode('all')}
                className="text-xs h-8"
              >
                All Students ({students.length})
              </Button>
              <Button
                variant={filterMode === 'assigned' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterMode('assigned')}
                className="text-xs h-8"
              >
                Assigned ({students.length - unassignedCount})
              </Button>
              <Button
                variant={filterMode === 'unassigned' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setFilterMode('unassigned')}
                className={`text-xs h-8 ${unassignedCount > 0 && filterMode !== 'unassigned' ? 'border-amber-400 text-amber-600' : ''}`}
              >
                Unassigned ({unassignedCount})
              </Button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, roll no, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredStudents.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No students match criteria"
                description={searchTerm ? `No results for "${searchTerm}" in ${filterMode} mode.` : 'No students found.'}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Roll Number</TableHead>
                  <TableHead>Department & Program</TableHead>
                  <TableHead>Designated Faculty Mentor</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                          <GraduationCap className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{s.name}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">{s.email}</div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="font-mono text-xs font-semibold text-foreground">
                      {s.rollNo}
                    </TableCell>

                    <TableCell>
                      <div className="text-xs font-medium text-foreground">{s.department || 'Computer Science'}</div>
                      <div className="text-[11px] text-muted-foreground">{s.program}</div>
                    </TableCell>

                    <TableCell>
                      {s.mentor ? (
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-xs font-semibold text-foreground">
                            {s.mentor.name}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                          <UserX className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">Unassigned</span>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(s)}
                          className="h-7 text-xs gap-1"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </Button>
                        <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                          <Link to={`/assignments?studentId=${s.id}`}>
                            {s.mentor ? 'Reassign' : 'Assign'}
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* MODAL: Add Student */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in-0">
          <div className="bg-card border border-border shadow-2xl rounded-2xl max-w-lg w-full p-6 text-card-foreground space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">Add Enrolled Student</h3>
                  <p className="text-xs text-muted-foreground">Register new student profile to campus directory</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-muted-foreground hover:text-foreground rounded-lg p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {addError && (
              <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleCreateStudent} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Full Name</label>
                  <Input
                    required
                    placeholder="e.g. Kavya Sundaram"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Roll Number</label>
                  <Input
                    required
                    placeholder="e.g. 24BCS10892"
                    value={addRollNo}
                    onChange={(e) => setAddRollNo(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Institutional Email ID (Mail ID)</label>
                <Input
                  required
                  type="email"
                  placeholder="name@campus.edu"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Program / Branch</label>
                  <Input
                    placeholder="B.Tech Computer Science"
                    value={addProgram}
                    onChange={(e) => setAddProgram(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Department</label>
                  <Input
                    placeholder="School of Computing Sciences"
                    value={addDept}
                    onChange={(e) => setAddDept(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Initial Temporary Password</label>
                <Input
                  required
                  type="password"
                  placeholder="student123"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                  disabled={isSubmittingAdd}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmittingAdd} className="gap-1.5">
                  {isSubmittingAdd ? 'Creating...' : 'Create Student'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Student */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in-0">
          <div className="bg-card border border-border shadow-2xl rounded-2xl max-w-lg w-full p-6 text-card-foreground space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Pencil className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">Edit Student Details</h3>
                  <p className="text-xs text-muted-foreground">Modify name, mail ID, and roll number</p>
                </div>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="text-muted-foreground hover:text-foreground rounded-lg p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {editError && (
              <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Full Name</label>
                  <Input
                    required
                    placeholder="e.g. Priya Sundaram"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Roll Number</label>
                  <Input
                    required
                    placeholder="e.g. 24BCS10892"
                    value={editRollNo}
                    onChange={(e) => setEditRollNo(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Institutional Email ID (Mail ID)</label>
                <Input
                  required
                  type="email"
                  placeholder="name@campus.edu"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Program / Branch</label>
                  <Input
                    placeholder="B.Tech Computer Science"
                    value={editProgram}
                    onChange={(e) => setEditProgram(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Department</label>
                  <Input
                    placeholder="School of Computing Sciences"
                    value={editDept}
                    onChange={(e) => setEditDept(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingStudent(null)}
                  disabled={isSubmittingEdit}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmittingEdit} className="gap-1.5">
                  {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV Import Modal */}
      <CsvImportModal
        isOpen={showCsvModal}
        onClose={() => setShowCsvModal(false)}
        onSuccess={() => {
          refetch()
        }}
        defaultRole="student"
      />
    </div>
  )
}
