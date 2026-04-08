import { FC } from 'react'
import { Search, Settings, Menu } from 'lucide-react'
import { NotificationBell } from '../common/NotificationBell'

interface HeaderProps {
  onMenuClick?: () => void
}

export const Header: FC<HeaderProps> = ({ onMenuClick }) => {
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
      </div>
    </header>
  )
}
