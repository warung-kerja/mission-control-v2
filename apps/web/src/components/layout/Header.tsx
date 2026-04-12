import { FC } from 'react'
import { Search, Settings, Menu, LogOut, User as UserIcon } from 'lucide-react'
import { NotificationBell } from '../common/NotificationBell'
import { useAuthStore } from '../../stores/authStore'
import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  onMenuClick?: () => void
}

export const Header: FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="h-16 bg-mission-card border-b border-mission-border flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-mission-muted hover:text-mission-text hover:bg-mission-border/50 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search - Responsive width */}
        <div className="relative flex-1 max-w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mission-muted" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 bg-mission-bg border border-mission-border rounded-lg text-sm text-mission-text placeholder:text-mission-muted focus:outline-none focus:border-primary-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-3">
        <NotificationBell />
        <button className="p-2 text-mission-muted hover:text-mission-text hover:bg-mission-border/50 rounded-lg transition-colors">
          <Settings className="w-5 h-5" />
        </button>
        
        {/* User Profile & Logout */}
        <div className="flex items-center gap-3 pl-2 lg:pl-3 border-l border-mission-border">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium text-mission-text leading-tight">{user?.name || 'Authorized'}</span>
            <span className="text-[10px] text-mission-muted uppercase tracking-wider leading-tight">{user?.role || 'Guest'}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-mission-border flex items-center justify-center text-primary-400 border border-mission-border">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <UserIcon className="w-5 h-5" />
            )}
          </div>
          <button 
            onClick={handleLogout}
            title="Log Out Session"
            className="p-2 text-mission-muted hover:text-error hover:bg-error/10 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  )
}
