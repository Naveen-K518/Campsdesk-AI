import React from 'react'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { API_BASE } from '@/lib/api'
import { Settings, ShieldCheck, Database, Server, KeyRound, Cpu } from 'lucide-react'

export const SettingsPage: React.FC = () => {
  const { user } = useAuth()

  return (
    <div className="space-y-6 animate-in fade-in-50">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          System Settings & Environment
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Autonomous role configurations, quota enforcement variables, and server topology.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Administrator Identity */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="h-5 w-5" />
              <CardTitle className="text-base">Active Administrative Identity</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Current authenticated session metadata
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Admin Name:</span>
              <span className="font-semibold text-foreground">{user?.name}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Admin Email:</span>
              <span className="font-mono text-foreground">{user?.email}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">System Role:</span>
              <Badge variant="default" className="text-[10px] uppercase font-bold">
                {user?.role}
              </Badge>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Token Authority:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Valid (JWT Signed)</span>
            </div>
          </CardContent>
        </Card>

        {/* Role Engine Topology */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <Cpu className="h-5 w-5" />
              <CardTitle className="text-base">Role Hierarchy Model</CardTitle>
            </div>
            <CardDescription className="text-xs">
              CampusDesk AI 3-Role Architecture
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">HOD Role:</span>
              <span className="text-destructive font-semibold">REMOVED (Deprecated)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Active Roles:</span>
              <span className="font-semibold text-foreground">student, mentor (faculty), admin</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Mentorship Model:</span>
              <span className="font-semibold text-foreground">Strict 1:1 (Unique constraint)</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Max Mentees / Mentor:</span>
              <Badge variant="warning" className="font-mono text-[11px]">
                20 Mentees (Enforced)
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Server & Backend Connection */}
        <Card className="sm:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <Server className="h-5 w-5" />
              <CardTitle className="text-base">Backend API Services</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Live runtime configuration and environment settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-1.5 border-b border-border gap-1">
              <span className="text-muted-foreground">Target API Endpoint (VITE_API_URL):</span>
              <span className="font-mono text-foreground font-medium">{API_BASE}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-1.5 border-b border-border gap-1">
              <span className="text-muted-foreground">Database Storage:</span>
              <span className="font-mono text-foreground">SQLite (WAL Mode Enabled)</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-1.5 gap-1">
              <span className="text-muted-foreground">Real-Time WebSocket Layer:</span>
              <span className="font-mono text-foreground">Socket.io (:5000 / join:mentor, join:student, join:admin)</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
