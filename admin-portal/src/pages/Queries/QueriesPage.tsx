import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { api, QueryDocket } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Inbox,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  Clock,
  Eye,
  X,
  Loader2,
} from 'lucide-react'

export const QueriesPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const initialFilter = searchParams.get('filter') || 'all'

  const queryClient = useQueryClient()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter)
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [selectedDocket, setSelectedDocket] = useState<QueryDocket | null>(null)
  const [statusUpdate, setStatusUpdate] = useState<string>('')
  const [facultyRemark, setFacultyRemark] = useState<string>('')
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const {
    data: queries = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['queries'],
    queryFn: () => api.getQueries(),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, remark }: { id: string; status: string; remark?: string }) =>
      api.updateQueryStatus(id, status, remark),
    onSuccess: (updated) => {
      setActionSuccess(`Docket ${updated.code} status updated to ${updated.status}.`)
      setSelectedDocket(null)
      queryClient.invalidateQueries({ queryKey: ['queries'] })
    },
  })

  if (isLoading) {
    return <LoadingState message="Loading administrative query queue..." rows={6} />
  }

  if (isError) {
    return (
      <ErrorState
        title="Could not load queries"
        message="Unable to retrieve dockets from backend."
        onRetry={() => refetch()}
      />
    )
  }

  const PRIORITY_WEIGHT: Record<string, number> = { urgent: 1, high: 2, normal: 3 }

  const filteredQueries = queries
    .filter((q) => {
      // Status filter
      if (statusFilter === 'unassigned') {
        if (q.status !== 'unassigned' && q.assignedMentorId) return false
      } else if (statusFilter === 'under_review') {
        if (q.status !== 'under_review') return false
      } else if (statusFilter === 'resolved') {
        if (q.status !== 'resolved' && q.status !== 'completed') return false
      }

      // Priority filter
      if (priorityFilter !== 'all' && q.priority !== priorityFilter) return false

      // Search filter
      if (!searchTerm.trim()) return true
      const term = searchTerm.toLowerCase()
      return (
        q.code.toLowerCase().includes(term) ||
        (q.subject && q.subject.toLowerCase().includes(term)) ||
        (q.studentName && q.studentName.toLowerCase().includes(term)) ||
        (q.studentRollNo && q.studentRollNo.toLowerCase().includes(term)) ||
        (q.category && q.category.toLowerCase().includes(term))
      )
    })
    .sort((a, b) => {
      const pA = PRIORITY_WEIGHT[a.priority] || 4
      const pB = PRIORITY_WEIGHT[b.priority] || 4
      if (pA !== pB) return pA - pB
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  const unassignedCount = queries.filter(
    (q) => q.status === 'unassigned' || !q.assignedMentorId
  ).length

  const urgentCount = queries.filter((q) => q.priority === 'urgent').length
  const highCount = queries.filter((q) => q.priority === 'high').length

  return (
    <div className="space-y-6 animate-in fade-in-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Queries & Docket Triage
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete institutional queue with automatic mentor lookup, unassigned docket alerts, and audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {actionSuccess && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/40 p-3.5 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-muted-foreground hover:text-foreground">
            &times;
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card>
        <CardHeader className="pb-3 border-b border-border space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
                className="text-xs h-8"
              >
                All Dockets ({queries.length})
              </Button>
              <Button
                variant={statusFilter === 'unassigned' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('unassigned')}
                className={`text-xs h-8 ${unassignedCount > 0 && statusFilter !== 'unassigned' ? 'border-amber-400 text-amber-600' : ''}`}
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                Unassigned ({unassignedCount})
              </Button>
              <Button
                variant={statusFilter === 'under_review' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('under_review')}
                className="text-xs h-8"
              >
                Under Review
              </Button>
              <Button
                variant={statusFilter === 'resolved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('resolved')}
                className="text-xs h-8"
              >
                Resolved
              </Button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by code, mentee, subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>
          </div>

          {/* Priority Quick Filter Sub-bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-border/50">
            <span className="text-[11px] font-semibold text-muted-foreground mr-1">Priority:</span>
            <Button
              variant={priorityFilter === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setPriorityFilter('all')}
              className="text-[11px] h-6 px-2"
            >
              All
            </Button>
            <Button
              variant={priorityFilter === 'urgent' ? 'destructive' : 'ghost'}
              size="sm"
              onClick={() => setPriorityFilter('urgent')}
              className={`text-[11px] h-6 px-2 gap-1 ${priorityFilter !== 'urgent' ? 'text-red-600 dark:text-red-400 hover:bg-red-50' : ''}`}
            >
              🔥 Urgent ({urgentCount})
            </Button>
            <Button
              variant={priorityFilter === 'high' ? 'outline' : 'ghost'}
              size="sm"
              onClick={() => setPriorityFilter('high')}
              className={`text-[11px] h-6 px-2 gap-1 ${priorityFilter === 'high' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' : 'text-amber-600'}`}
            >
              ⚡ High ({highCount})
            </Button>
            <Button
              variant={priorityFilter === 'normal' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setPriorityFilter('normal')}
              className="text-[11px] h-6 px-2"
            >
              Normal
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredQueries.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No dockets found"
                description={searchTerm ? `No results for "${searchTerm}" with current filters.` : 'No queries match selected filters.'}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Docket Code</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Mentee / Student</TableHead>
                  <TableHead>Subject & Category</TableHead>
                  <TableHead>Assigned Mentor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQueries.map((q) => {
                  const isUnassigned = q.status === 'unassigned' || !q.assignedMentorId

                  return (
                    <TableRow
                      key={q.id}
                      className={q.priority === 'urgent' ? 'bg-red-500/5 hover:bg-red-500/10' : isUnassigned ? 'bg-amber-500/5' : ''}
                    >
                      <TableCell className="font-mono text-xs font-bold text-primary">
                        {q.code}
                      </TableCell>

                      <TableCell>
                        {q.priority === 'urgent' ? (
                          <Badge variant="destructive" className="text-[11px] font-bold gap-1 shadow-xs">
                            🔥 Urgent
                          </Badge>
                        ) : q.priority === 'high' ? (
                          <Badge variant="warning" className="text-[11px] font-semibold gap-1">
                            ⚡ High
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[11px] text-muted-foreground">
                            Normal
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="text-xs font-semibold text-foreground">
                          {q.studentName || 'Student'}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {q.studentRollNo || 'N/A'}
                        </div>
                      </TableCell>

                      <TableCell className="max-w-xs">
                        <div className="text-xs font-semibold text-foreground truncate">
                          {q.subject || q.title}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {q.category}
                        </div>
                      </TableCell>

                      <TableCell>
                        {isUnassigned ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="h-3.5 w-3.5" /> Unassigned
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-foreground">
                            <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="truncate max-w-[140px]">{q.mentorName || q.assignedTo}</span>
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        {q.status === 'unassigned' ? (
                          <Badge variant="warning" className="text-[11px]">Unassigned</Badge>
                        ) : q.status === 'under_review' ? (
                          <Badge variant="info" className="text-[11px]">Under Review</Badge>
                        ) : q.status === 'resolved' ? (
                          <Badge variant="success" className="text-[11px]">Resolved</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[11px]">{q.status}</Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDocket(q)
                            setStatusUpdate(q.status)
                            setFacultyRemark('')
                          }}
                          className="h-7 text-xs gap-1"
                        >
                          <Eye className="h-3 w-3" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Docket Detail & Adjudication Modal */}
      {selectedDocket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-lg border-border bg-card shadow-2xl animate-in zoom-in-95 duration-150">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <span className="font-mono text-primary">{selectedDocket.code}</span>
                  <span>Docket Review</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Submitted by {selectedDocket.studentName} ({selectedDocket.studentRollNo})
                </CardDescription>
              </div>
              <button
                onClick={() => setSelectedDocket(null)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>

            <CardContent className="space-y-4 pt-4 text-sm max-h-[70vh] overflow-y-auto">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase">Subject</span>
                <p className="font-medium text-foreground mt-0.5">{selectedDocket.subject || selectedDocket.title}</p>
              </div>

              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase">Description</span>
                <div className="mt-1 rounded-md border border-border bg-muted/30 p-3 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                  {selectedDocket.description}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="font-semibold text-muted-foreground">Category:</span>{' '}
                  <span className="text-foreground">{selectedDocket.category}</span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">Assigned Mentor:</span>{' '}
                  <span className="text-foreground font-medium">
                    {selectedDocket.mentorName || selectedDocket.assignedTo || 'Unassigned'}
                  </span>
                </div>
              </div>

              {/* Status Update Controls */}
              <div className="border-t border-border pt-3 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Update Docket Status (Admin Override)
                </span>

                <div className="grid grid-cols-3 gap-2">
                  {['under_review', 'resolved', 'action_required'].map((st) => (
                    <Button
                      key={st}
                      type="button"
                      variant={statusUpdate === st ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStatusUpdate(st)}
                      className="text-xs capitalize h-8"
                    >
                      {st.replace('_', ' ')}
                    </Button>
                  ))}
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Administrative Remark (Optional)</label>
                  <Input
                    placeholder="Enter remark or resolution notes..."
                    value={facultyRemark}
                    onChange={(e) => setFacultyRemark(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDocket(null)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    updateStatusMutation.mutate({
                      id: selectedDocket.id,
                      status: statusUpdate,
                      remark: facultyRemark,
                    })
                  }
                  disabled={updateStatusMutation.isPending}
                  className="gap-1.5"
                >
                  {updateStatusMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Status</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
