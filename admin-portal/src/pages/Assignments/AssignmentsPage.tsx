import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { api, Mentor, Student, MentorAssignment } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  Users2,
  UserCheck,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Plus,
  Loader2,
  X,
} from 'lucide-react'

export const AssignmentsPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const preselectedStudentId = searchParams.get('studentId')

  const queryClient = useQueryClient()

  const [selectedStudentId, setSelectedStudentId] = useState<string>(preselectedStudentId || '')
  const [selectedMentorId, setSelectedMentorId] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showAssignForm, setShowAssignForm] = useState<boolean>(!!preselectedStudentId)

  useEffect(() => {
    if (preselectedStudentId) {
      setSelectedStudentId(preselectedStudentId)
      setShowAssignForm(true)
    }
  }, [preselectedStudentId])

  const assignmentsQuery = useQuery({
    queryKey: ['assignments'],
    queryFn: () => api.getAssignments(),
  })

  const mentorsQuery = useQuery({
    queryKey: ['mentors'],
    queryFn: () => api.getMentors(),
  })

  const studentsQuery = useQuery({
    queryKey: ['students'],
    queryFn: () => api.getStudents(),
  })

  const assignMutation = useMutation({
    mutationFn: ({ mentorId, studentId }: { mentorId: string; studentId: string }) =>
      api.assignMentor(mentorId, studentId),
    onSuccess: (res) => {
      setSuccessMessage(res.message || 'Mentor assignment saved successfully.')
      setErrorMessage(null)
      setShowAssignForm(false)
      setSelectedStudentId('')
      setSelectedMentorId('')
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      queryClient.invalidateQueries({ queryKey: ['mentors'] })
      queryClient.invalidateQueries({ queryKey: ['students'] })
      queryClient.invalidateQueries({ queryKey: ['queries'] })
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to assign mentor.')
      setSuccessMessage(null)
    },
  })

  const isLoading =
    assignmentsQuery.isLoading || mentorsQuery.isLoading || studentsQuery.isLoading
  const isError =
    assignmentsQuery.isError || mentorsQuery.isError || studentsQuery.isError

  if (isLoading) {
    return <LoadingState message="Loading mentor assignments..." rows={6} />
  }

  if (isError) {
    return (
      <ErrorState
        title="Could not load assignments"
        message="Unable to communicate with the assignments service."
        onRetry={() => {
          assignmentsQuery.refetch()
          mentorsQuery.refetch()
          studentsQuery.refetch()
        }}
      />
    )
  }

  const assignments = assignmentsQuery.data || []
  const mentors = mentorsQuery.data || []
  const students = studentsQuery.data || []

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMessage(null)
    setErrorMessage(null)

    if (!selectedStudentId || !selectedMentorId) {
      setErrorMessage('Please select both a student and a faculty mentor.')
      return
    }

    assignMutation.mutate({
      mentorId: selectedMentorId,
      studentId: selectedStudentId,
    })
  }

  return (
    <div className="space-y-6 animate-in fade-in-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Mentor Assignments
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enforce 1:1 student-to-mentor pairings and manage capacity limits (MAX_MENTEES_PER_MENTOR = 20).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              assignmentsQuery.refetch()
              mentorsQuery.refetch()
              studentsQuery.refetch()
            }}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => setShowAssignForm(!showAssignForm)}
            className="gap-1.5 text-xs font-semibold"
          >
            {showAssignForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showAssignForm ? 'Close Form' : 'New Assignment'}
          </Button>
        </div>
      </div>

      {/* Alert Notices */}
      {successMessage && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/40 p-4 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-muted-foreground hover:text-foreground">
            &times;
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-xs text-destructive flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-muted-foreground hover:text-foreground">
            &times;
          </button>
        </div>
      )}

      {/* Assignment Form Card */}
      {showAssignForm && (
        <Card className="border-primary/30 bg-card shadow-sm animate-in slide-in-from-top-3 duration-200">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base font-semibold">Assign or Reassign Student to Mentor</CardTitle>
            <CardDescription className="text-xs">
              Each student is guaranteed exactly one mentor. Mentor capacity is capped at 20 mentees.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Student Select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Select Student
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                    disabled={assignMutation.isPending}
                  >
                    <option value="" className="bg-card text-foreground">-- Select a student --</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id} className="bg-card text-foreground">
                        {s.name} ({s.rollNo}) - {s.mentor ? `Current: ${s.mentor.name}` : '[Unassigned]'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Mentor Select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Assign to Mentor (Max 20 Mentees)
                  </label>
                  <select
                    value={selectedMentorId}
                    onChange={(e) => setSelectedMentorId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                    disabled={assignMutation.isPending}
                  >
                    <option value="" className="bg-card text-foreground">-- Select a faculty mentor --</option>
                    {mentors.map((m) => (
                      <option
                        key={m.id}
                        value={m.id}
                        disabled={m.mentee_count >= 20}
                        className="bg-card text-foreground"
                      >
                        {m.name} ({m.mentee_count}/20 mentees) {m.mentee_count >= 20 ? '[FULL - REJECTS 21st]' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAssignForm(false)}
                  disabled={assignMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={assignMutation.isPending}
                  className="gap-2 font-semibold"
                >
                  {assignMutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving Assignment...</span>
                    </>
                  ) : (
                    <span>Save Assignment</span>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Existing Assignments Table */}
      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base font-semibold">Current Active Assignments ({assignments.length})</CardTitle>
          <CardDescription className="text-xs">
            1:1 pairings stored in database table mentor_assignments
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {assignments.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No assignments recorded"
                description="There are currently no active mentor-student assignments in the database."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Roll Number</TableHead>
                  <TableHead>Assigned Faculty Mentor</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Assigned Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span>{a.student_name}</span>
                      </div>
                    </TableCell>

                    <TableCell className="font-mono text-xs font-semibold text-foreground">
                      {a.student_roll_no}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <div>
                          <div className="text-xs font-semibold text-foreground">{a.mentor_name}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">{a.mentor_email}</div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {a.student_department || 'Computer Science'}
                    </TableCell>

                    <TableCell className="text-right text-xs text-muted-foreground font-mono">
                      {a.assigned_at ? new Date(a.assigned_at).toLocaleDateString() : 'Active'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
