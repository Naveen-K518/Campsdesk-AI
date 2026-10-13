import React from 'react'
import { AlertCircle, FolderOpen, RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface LoadingStateProps {
  message?: string
  rows?: number
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading data...',
  rows = 4,
}) => {
  return (
    <div className="w-full space-y-4 py-8">
      <div className="flex items-center justify-center gap-2.5 text-sm text-muted-foreground pb-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span>{message}</span>
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-12 w-full animate-pulse rounded-md bg-muted/60"
          />
        ))}
      </div>
    </div>
  )
}

interface EmptyStateProps {
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  icon?: React.ReactNode
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No records found',
  description = 'There are currently no items matching this view.',
  actionLabel,
  onAction,
  icon,
}) => {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center animate-in fade-in-50">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/80 text-muted-foreground mb-3.5">
        {icon || <FolderOpen className="h-6 w-6 stroke-[1.5]" />}
      </div>
      <h4 className="text-base font-medium text-foreground">{title}</h4>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="outline" size="sm" className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Unable to load data',
  message = 'An unexpected communication error occurred with the CampusDesk server.',
  onRetry,
}) => {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center animate-in fade-in-50">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-3.5">
        <AlertCircle className="h-6 w-6 stroke-[1.5]" />
      </div>
      <h4 className="text-base font-semibold text-destructive">{title}</h4>
      <p className="mt-1 text-sm text-muted-foreground max-w-md">
        {message}
      </p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          size="sm"
          className="mt-4 gap-1.5 border-destructive/30 hover:bg-destructive/10 text-destructive"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Try Again</span>
        </Button>
      )}
    </div>
  )
}
