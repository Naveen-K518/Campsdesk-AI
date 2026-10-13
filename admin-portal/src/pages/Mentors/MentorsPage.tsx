import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, Mentor } from '@/lib/api'
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
import { Search, UserCheck, Users, Mail, AlertCircle, RefreshCw, UserPlus, Pencil, X, FileSpreadsheet } from 'lucide-react'
import { CsvImportModal } from '@/components/users/CsvImportModal'

export const MentorsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [showCsvModal, setShowCsvModal] = useState(false)

  // Add Mentor Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addPassword, setAddPassword] = useState('mentor123')
  const [addDept, setAddDept] = useState('School of Computing Sciences')
  const [addError, setAddError] = useState<string | null>(null)
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false)

  // Edit Mentor Modal state
  const [editingMentor, setEditingMentor] = useState<Mentor | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false)

  const {
    data: mentors = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['mentors'],
    queryFn: () => api.getMentors(),
  })

  const handleOpenEdit = (mentor: Mentor) => {
    setEditingMentor(mentor)
    setEditName(mentor.name)
    setEditEmail(mentor.email)
    setEditError(null)
  }

  const handleCreateMentor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addName.trim() || !addEmail.trim()) {
      setAddError('Name and email are required.')
      return
    }

    setIsSubmittingAdd(true)
    setAddError(null)

    try {
      await api.createUser({
        name: addName.trim(),
        email: addEmail.trim(),
        password: addPassword || 'mentor123',
        department: addDept.trim(),
        role: 'mentor',
      })
      setShowAddModal(false)
      setAddName('')
      setAddEmail('')
      setAddPassword('mentor123')
      await refetch()
    } catch (err: any) {
      setAddError(err.message || 'Failed to create faculty mentor')
    } finally {
      setIsSubmittingAdd(false)
    }
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMentor) return
    if (!editName.trim() || !editEmail.trim()) {
      setEditError('Name and email are required.')
      return
    }

    setIsSubmittingEdit(true)
    setEditError(null)

    try {
      await api.updateMentor(editingMentor.id, {
        name: editName.trim(),
        email: editEmail.trim(),
      })
      setEditingMentor(null)
      await refetch()
    } catch (err: any) {
      setEditError(err.message || 'Failed to update faculty mentor')
    } finally {
      setIsSubmittingEdit(false)
    }
  }

  if (isLoading) {
    return <LoadingState message="Loading faculty mentors roster..." rows={6} />
  }

  if (isError) {
    return (
      <ErrorState
        title="Could not load faculty mentors"
        message="Failed to retrieve mentors from server."
        onRetry={() => refetch()}
      />
    )
  }

  const filteredMentors = mentors.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalMentees = mentors.reduce((acc, m) => acc + (m.mentee_count || 0), 0)

  return (
    <div className="space-y-6 animate-in fade-in-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Faculty Mentors
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Academic mentor roster, mentee quotas (MAX_MENTEES_PER_MENTOR = 20), and load balancing.
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
            <UserPlus className="h-3.5 w-3.5" /> Add Mentor
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground font-semibold uppercase">Total Mentors</div>
          <div className="text-xl font-bold text-foreground mt-1">{mentors.length} Faculty</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground font-semibold uppercase">Assigned Mentees</div>
          <div className="text-xl font-bold text-primary mt-1">{totalMentees} Students</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground font-semibold uppercase">Total Capacity</div>
          <div className="text-xl font-bold text-foreground mt-1">{mentors.length * 20} Seats (20 max)</div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">Active Mentor Directory</CardTitle>
              <CardDescription className="text-xs">
                Each faculty mentor can be assigned a maximum of 20 mentees
              </CardDescription>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search mentors by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredMentors.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No mentors found"
                description={searchTerm ? `No mentors matching "${searchTerm}"` : 'No faculty mentors registered.'}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Faculty Name</TableHead>
                  <TableHead>Official Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Mentee Load</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMentors.map((m) => {
                  const count = m.mentee_count || 0
                  const isFull = count >= 20
                  const percent = Math.min(Math.round((count / 20) * 100), 100)

                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                            <UserCheck className="h-4 w-4" />
                          </div>
                          <span>{m.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {m.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-[11px]">
                          {m.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-[160px]">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="font-semibold text-foreground">{count} / 20</span>
                            <span className="text-muted-foreground">{percent}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isFull
                                  ? 'bg-amber-500'
                                  : percent > 75
                                  ? 'bg-blue-600'
                                  : 'bg-primary'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isFull ? (
                          <Badge variant="warning" className="text-[11px]">
                            Capacity Reached (20/20)
                          </Badge>
                        ) : (
                          <Badge variant="success" className="text-[11px]">
                            Available ({20 - count} spots)
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(m)}
                          className="h-7 text-xs gap-1"
                        >
                          <Pencil className="h-3 w-3" /> Edit
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

      {/* MODAL: Add Faculty Mentor */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in-0">
          <div className="bg-card border border-border shadow-2xl rounded-2xl max-w-md w-full p-6 text-card-foreground space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">Add Faculty Mentor</h3>
                  <p className="text-xs text-muted-foreground">Register new academic mentor to advise students</p>
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

            <form onSubmit={handleCreateMentor} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Faculty Full Name</label>
                <Input
                  required
                  placeholder="e.g. Dr. Rajesh Kumar"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Official Email ID</label>
                <Input
                  required
                  type="email"
                  placeholder="name@campus.edu"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Department</label>
                <Input
                  placeholder="e.g. School of Computing Sciences"
                  value={addDept}
                  onChange={(e) => setAddDept(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Initial Temporary Password</label>
                <Input
                  required
                  type="password"
                  placeholder="mentor123"
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
                  {isSubmittingAdd ? 'Creating...' : 'Create Mentor'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Faculty Mentor */}
      {editingMentor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in-0">
          <div className="bg-card border border-border shadow-2xl rounded-2xl max-w-md w-full p-6 text-card-foreground space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Pencil className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">Edit Faculty Mentor</h3>
                  <p className="text-xs text-muted-foreground">Update faculty name and official email</p>
                </div>
              </div>
              <button
                onClick={() => setEditingMentor(null)}
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
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Faculty Full Name</label>
                <Input
                  required
                  placeholder="e.g. Dr. Priya Sharma"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Official Email ID</label>
                <Input
                  required
                  type="email"
                  placeholder="name@campus.edu"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingMentor(null)}
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
        defaultRole="mentor"
      />
    </div>
  )
}
