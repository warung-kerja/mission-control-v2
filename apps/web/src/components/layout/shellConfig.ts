import type { FC, SVGProps } from 'react'
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Calendar,
  Users,
  Building2,
  Brain,
  BarChart3,
} from 'lucide-react'

export type TruthSourceTone = 'canonical' | 'runtime' | 'fallback'

type NavIcon = FC<SVGProps<SVGSVGElement>>

export interface ShellNavItem {
  path: string
  icon: NavIcon
  label: string
  shortLabel?: string
}

export interface ShellPageMeta {
  title: string
  eyebrow: string
  question: string
  truthSources: TruthSourceTone[]
  isLegacy?: boolean
}

export const primaryNavItems: ShellNavItem[] = [
  { path: '/', icon: LayoutDashboard, label: 'Control Room', shortLabel: 'Room' },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { path: '/calendar', icon: Calendar, label: 'Calendar' },
  { path: '/projects', icon: FolderKanban, label: 'Projects' },
  { path: '/memories', icon: Brain, label: 'Memory Vault' },
]

export const systemNavItems: ShellNavItem[] = [
  { path: '/team', icon: Users, label: 'Team' },
  { path: '/office', icon: Building2, label: 'Office' },
]

export const utilityNavItems: ShellNavItem[] = [
  { path: '/analytics', icon: BarChart3, label: 'Signals' },
]

const pageMetaByPath: Record<string, ShellPageMeta> = {
  '/': {
    title: 'Control Room',
    eyebrow: 'Mission Control V3',
    question: 'What is live, what needs attention, and what should move next?',
    truthSources: ['canonical', 'runtime', 'fallback'],
  },
  '/dashboard': {
    title: 'Control Room',
    eyebrow: 'Mission Control V3',
    question: 'What is live, what needs attention, and what should move next?',
    truthSources: ['canonical', 'runtime', 'fallback'],
  },
  '/tasks': {
    title: 'Tasks',
    eyebrow: 'Execution Surface',
    question: 'What is being worked on right now?',
    truthSources: ['runtime', 'fallback'],
  },
  '/calendar': {
    title: 'Calendar',
    eyebrow: 'Automation Audit',
    question: 'What is scheduled and is it healthy?',
    truthSources: ['runtime'],
  },
  '/projects': {
    title: 'Projects',
    eyebrow: 'Movement Board',
    question: 'Which project should move next?',
    truthSources: ['canonical', 'fallback'],
  },
  '/memories': {
    title: 'Memory Vault',
    eyebrow: 'Context Surface',
    question: 'What do we already know?',
    truthSources: ['canonical', 'runtime'],
  },
  '/team': {
    title: 'Team',
    eyebrow: 'Crew Structure',
    question: 'Who exists in the system and how are they organised?',
    truthSources: ['canonical', 'runtime'],
  },
  '/office': {
    title: 'Office',
    eyebrow: 'Presence View',
    question: 'Who is active right now and what are they doing?',
    truthSources: ['runtime', 'fallback'],
  },
  '/analytics': {
    title: 'Signals',
    eyebrow: 'Utility Surface',
    question: 'What patterns are worth noticing without losing truth?',
    truthSources: ['canonical', 'runtime', 'fallback'],
  },
  '/collaboration': {
    title: 'Collaboration',
    eyebrow: 'Coordination Watch',
    question: 'Who looks live, what moved recently, and which project lanes are active?',
    truthSources: ['canonical', 'runtime'],
  },
  '/dashboard-v2': {
    title: 'Dashboard',
    eyebrow: 'Legacy V2 Surface',
    question: 'This is the older dashboard path preserved for reference only.',
    truthSources: ['runtime', 'fallback'],
    isLegacy: true,
  },
  '/memories-db': {
    title: 'Memories DB',
    eyebrow: 'Legacy V2 Surface',
    question: 'This is the older memories interface preserved while V3 uses Memory Vault.',
    truthSources: ['runtime', 'fallback'],
    isLegacy: true,
  },
  '/analytics-db': {
    title: 'Analytics',
    eyebrow: 'Legacy V2 Surface',
    question: 'This is the older analytics surface preserved while V3 uses Signals.',
    truthSources: ['runtime', 'fallback'],
    isLegacy: true,
  },
}

export function getPageMeta(pathname: string): ShellPageMeta {
  return pageMetaByPath[pathname] ?? {
    title: 'Mission Control',
    eyebrow: 'Operational Surface',
    question: 'What matters here right now?',
    truthSources: ['fallback'],
  }
}
