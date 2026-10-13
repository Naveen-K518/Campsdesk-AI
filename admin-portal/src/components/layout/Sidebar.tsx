import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  UserCheck,
  GraduationCap,
  Users2,
  Inbox,
  FileText,
  Settings,
  ShieldCheck,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Mentors', path: '/mentors', icon: UserCheck },
  { name: 'Students', path: '/students', icon: GraduationCap },
  { name: 'Mentor Assignments', path: '/assignments', icon: Users2 },
  { name: 'Queries', path: '/queries', icon: Inbox },
  { name: 'Documents', path: '/documents', icon: FileText },
  { name: 'Settings', path: '/settings', icon: Settings },
]

export const Sidebar: React.FC<{ onCloseMobile?: () => void }> = ({ onCloseMobile }) => {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card text-card-foreground">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight text-foreground">
            CampusDesk AI
          </span>
          <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            <ShieldCheck className="h-3 w-3 text-primary" /> Admin Portal
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
          Management
        </div>

        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onCloseMobile}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Institutional Footer Info */}
      <div className="border-t border-border p-4 bg-muted/20">
        <div className="rounded-md border border-border/70 bg-card p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-semibold text-foreground">Academic Node</span>
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-[11px] text-muted-foreground">
            System Online • Role Engine 3.0 (No HOD)
          </p>
        </div>
      </div>
    </aside>
  )
}
