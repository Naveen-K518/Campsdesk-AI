import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, QueryDocket } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingState, ErrorState, EmptyState } from '@/components/common/StateView'
import {
  Users2,
  GraduationCap,
  Inbox,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { Link } from 'react-router-dom'

export const DashboardPage: React.FC = () => {
  const mentorsQuery = useQuery({
    queryKey: ['mentors'],
    queryFn: () => api.getMentors(),
  })

  const studentsQuery = useQuery({
    queryKey: ['students'],
    queryFn: () => api.getStudents(),
  })

  const queriesQuery = useQuery({
    queryKey: ['queries'],
    queryFn: () => api.getQueries(),
  })

  const isLoading = mentorsQuery.isLoading || studentsQuery.isLoading || queriesQuery.isLoading
  const isError = mentorsQuery.isError || studentsQuery.isError || queriesQuery.isError

  if (isLoading) {
    return <LoadingState message="Loading administrative dashboard metrics..." rows={5} />
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load dashboard metrics"
        message="Could not connect to the CampusDesk AI server. Please verify backend is running on port 5000."
        onRetry={() => {
          mentorsQuery.refetch()
          studentsQuery.refetch()
          queriesQuery.refetch()
        }}
      />
    )
  }

  const mentors = mentorsQuery.data || []
  const students = studentsQuery.data || []
  const queries = queriesQuery.data || []

  const unassignedQueries = queries.filter(
    (q) => q.status === 'unassigned' || !q.assignedMentorId
  )
  const pendingQueries = queries.filter(
    (q) => q.status === 'under_review' || q.status === 'active'
  )
  const resolvedQueries = queries.filter(
    (q) => q.status === 'resolved' || q.status === 'completed'
  )

  const unassignedStudents = students.filter((s) => !s.mentor)

  return (
    <div className="space-y-8 animate-in fade-in-50">
      {/* Top Banner / Breadcrumb */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          System Overview
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Administrative intelligence dashboard, mentor assignment quotas, and docket triage.
        </p>
      </div>

      {/* Unassigned Triage Notice if any */}
      {unassignedQueries.length > 0 && (
        <div className="rounded-lg border border-amber-300/60 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/30 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-500 text-white">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                {unassignedQueries.length} Unassigned Docket{unassignedQueries.length > 1 ? 's' : ''} Awaiting Triage
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300/80">
                Students without designated mentors have submitted queries that require administrative review.
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="default" className="bg-amber-600 hover:bg-amber-700 text-white shrink-0">
            <Link to="/queries?filter=unassigned">Triage Dockets &rarr;</Link>
          </Button>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Mentors */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Faculty Mentors
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Users2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{mentors.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Max capacity: {mentors.length * 20} mentees (20/mentor)
            </p>
          </CardContent>
        </Card>

        {/* Total Students */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Enrolled Students
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <GraduationCap className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{students.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {unassignedStudents.length > 0 ? (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {unassignedStudents.length} without mentor
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  100% paired with mentors
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Total Queries */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Dockets
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Inbox className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{queries.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {pendingQueries.length} in active review
            </p>
          </CardContent>
        </Card>

        {/* Resolution Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Resolved Cases
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {queries.length > 0 ? Math.round((resolvedQueries.length / queries.length) * 100) : 0}%
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {resolvedQueries.length} resolved of {queries.length} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout: Mentor Quota & Recent Queries */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Mentor Load Distribution */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Mentor Capacity Roster</CardTitle>
                <CardDescription className="text-xs">
                  Max 20 mentees per mentor quota enforcement
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-xs gap-1">
                <Link to="/mentors">
                  View All <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {mentors.slice(0, 5).map((m) => {
              const percentage = Math.min(Math.round((m.mentee_count / 20) * 100), 100)
              const isFull = m.mentee_count >= 20

              return (
                <div key={m.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground truncate max-w-[180px]">
                      {m.name}
                    </span>
                    <span className="text-muted-foreground font-mono">
                      {m.mentee_count} / 20
                      {isFull && (
                        <span className="ml-1.5 text-amber-600 dark:text-amber-400 font-bold">
                          [FULL]
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isFull
                          ? 'bg-amber-500'
                          : percentage > 75
                          ? 'bg-blue-600'
                          : 'bg-primary'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Recent Dockets Feed */}
        <Card className="lg:col-span-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Recent University Inquiries</CardTitle>
                <CardDescription className="text-xs">
                  Latest student requests across departments
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-xs gap-1">
                <Link to="/queries">
                  All Queries <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {queries.length === 0 ? (
              <EmptyState title="No queries logged" description="There are no active queries in the system." />
            ) : (
              <div className="space-y-3">
                {queries.slice(0, 5).map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between rounded-md border border-border p-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="space-y-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">
                          {q.code}
                        </span>
                        <span className="text-xs font-semibold text-foreground truncate">
                          {q.subject || q.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{q.studentName || 'Student'}</span>
                        <span>•</span>
                        <span>{q.category}</span>
                        <span>•</span>
                        <span>Mentor: {q.mentorName || 'Unassigned'}</span>
                      </div>
                    </div>

                    <div>
                      {q.status === 'unassigned' ? (
                        <Badge variant="warning">Unassigned</Badge>
                      ) : q.status === 'under_review' ? (
                        <Badge variant="info">Under Review</Badge>
                      ) : q.status === 'resolved' ? (
                        <Badge variant="success">Resolved</Badge>
                      ) : (
                        <Badge variant="secondary">{q.status}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
