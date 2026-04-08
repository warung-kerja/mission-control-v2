import { FC } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Calendar,
  Users,
  Building2,
  Brain,
  MessageSquare,
  BarChart3,
  X,
} from 'lucide-react'

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/projects', icon: FolderKanban, label: 'Projects' },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { path: '/calendar', icon: Calendar, label: 'Calendar' },
  { path: '/team', icon: Users, label: 'Team' },
  { path: '/office', icon: Building2, label: 'Office' },
  { path: '/memories', icon: Brain, label: 'Memories' },
  { path: '/collaboration', icon: MessageSquare, label: 'Collab' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
]

interface SidebarProps {
  mobile?: boolean
  onClose?: () => void
}

export const Sidebar: FC<SidebarProps> = ({ mobile, onClose }) => {
  const { user } = useAuthStore()

  return (
    <aside className={`${mobile ? 'w-72' : 'w-64'} bg-mission-card border-r border-mission-border flex flex-col h-full`}>
      <div className="p-6 border-b border-mission-border flex items-center justify-between">
        <h1 className="text-xl font-bold text-mission-accent flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6" />
          Mission Control
        </h1>
        {mobile && onClose && (
          <button
            onClick={onClose}
            className="p-2 text-mission-muted hover:text-mission-text hover:bg-mission-border/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <p className="text-xs text-mission-muted mt-1 hidden">V2.0</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            onClick={() => mobile && onClose?.()}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-600/20 text-primary-400'
                  : 'text-mission-muted hover:text-mission-text hover:bg-mission-border/50'
              }`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-mission-border">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-mission-bg/50">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-sm font-semibold flex-shrink-0">
            N
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-mission-text truncate">{user?.name || 'Mission Control User'}</p>
            <p className="text-xs text-mission-muted">{user?.role || 'Team Member'}</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
        </div>
      </div>
    </aside>
  )
}
