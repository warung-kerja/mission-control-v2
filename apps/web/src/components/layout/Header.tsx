import { FC } from 'react'
import { Search, Settings, Menu, LogOut, User as UserIcon, RadioTower } from 'lucide-react'
import { NotificationBell } from '../common/NotificationBell'
import { useAuthStore } from '../../stores/authStore'
import { useLocation, useNavigate } from 'react-router-dom'
import { getPageMeta, type TruthSourceTone } from './shellConfig'

interface HeaderProps {
  onMenuClick?: () => void
}

const truthToneClass: Record<TruthSourceTone, string> = {
  canonical: 'border border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
  runtime: 'border border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-300',
  fallback: 'border border-amber-400/20 bg-amber-400/10 text-amber-300',
}

export const Header: FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const pageMeta = getPageMeta(location.pathname)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="border-b border-white/8 bg-[#091423]/90 px-4 py-4 backdrop-blur-xl lg:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 flex-1 gap-3">
          <button
            onClick={onMenuClick}
            className="mt-0.5 rounded-xl p-2 text-mission-muted transition-colors hover:bg-white/5 hover:text-mission-text lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.24em] text-mission-muted/80">{pageMeta.eyebrow}</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                <RadioTower className="h-3.5 w-3.5" />
                Live control room
              </span>
            </div>
            <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <h2 className="truncate text-2xl font-semibold tracking-tight text-white">{pageMeta.title}</h2>
                <p className="mt-1 max-w-3xl text-sm text-mission-muted">{pageMeta.question}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] font-medium">
                {pageMeta.truthSources.map((tone) => (
                  <span key={tone} className={`rounded-full px-2.5 py-1 ${truthToneClass[tone]}`}>
                    {tone}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:w-[30rem] xl:items-end">
          <div className="relative w-full xl:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mission-muted" />
            <input
              type="text"
              placeholder="Search screens, memories, docs..."
              className="w-full rounded-xl border border-white/8 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-mission-text placeholder:text-mission-muted focus:border-cyan-400/40 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 lg:gap-3">
            <NotificationBell />
            <button className="rounded-xl p-2 text-mission-muted transition-colors hover:bg-white/5 hover:text-mission-text">
              <Settings className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 border-l border-white/8 pl-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-medium leading-tight text-mission-text">{user?.name || 'Authorized'}</span>
                <span className="text-[10px] uppercase tracking-wider leading-tight text-mission-muted">{user?.role || 'Guest'}</span>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/8 bg-white/[0.03] text-primary-400">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="h-full w-full rounded-full object-cover" />
                ) : (
                  <UserIcon className="h-5 w-5" />
                )}
              </div>
              <button
                onClick={handleLogout}
                title="Log Out Session"
                className="rounded-xl p-2 text-mission-muted transition-colors hover:bg-error/10 hover:text-error"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
