import React, { useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  FileSpreadsheet,
  Upload,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Download,
} from 'lucide-react'

interface CsvImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  defaultRole?: 'mentor' | 'student'
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultRole = 'mentor',
}) => {
  const [csvContent, setCsvContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ imported: number; updated: number; message?: string } | null>(null)

  if (!isOpen) return null

  const sampleMentorCsv = `name,email,role,department\nDr. Saravanan K,mentor.saravanan@campus.edu,mentor,Computer Science & Engineering\nDr. Ananya Roy,mentor.ananya@campus.edu,mentor,Information Technology`
  const sampleStudentCsv = `name,email,role,department,rollNo,program\nRahul Sharma,rahul.sharma@campus.edu,student,Computer Science & Engineering,22BCS10103,B.Tech · Computer Science & Engineering\nPooja Patel,pooja.patel@campus.edu,student,Computer Science & Engineering,22BCS10104,B.Tech · Computer Science & Engineering`

  const handleUseTemplate = () => {
    setCsvContent(defaultRole === 'mentor' ? sampleMentorCsv : sampleStudentCsv)
    setError(null)
    setResult(null)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setCsvContent(text)
      setError(null)
      setResult(null)
    }
    reader.readAsText(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!csvContent.trim()) {
      setError('Please paste CSV content or upload a CSV file.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setResult(null)

    try {
      const res = await api.importUsersCsv(csvContent.trim())
      setResult({ imported: res.imported, updated: res.updated, message: res.message })
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Failed to import CSV accounts.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-50">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <span>Bulk Import Users (CSV)</span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground rounded p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Import mentors or students with their verified institutional Google emails. Existing users
          with matching emails are safely preserved.
        </p>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Successfully processed: <strong>{result.imported}</strong> users imported,{' '}
              <strong>{result.updated}</strong> existing users updated.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                CSV Data
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleUseTemplate}
                  className="text-[11px] text-primary hover:underline flex items-center gap-1"
                >
                  <Download className="h-3 w-3" /> Insert Template
                </button>
              </div>
            </div>
            <textarea
              className="w-full h-36 rounded-md border border-input bg-background p-2.5 font-mono text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 resize-none"
              placeholder={`name,email,role,department,rollNo,program\n...`}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <label className="cursor-pointer text-xs font-medium text-primary hover:underline flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              <span>Upload .csv file</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isSubmitting}
              />
            </label>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting || !csvContent.trim()} className="gap-1.5 font-medium">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <span>Import Accounts</span>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
