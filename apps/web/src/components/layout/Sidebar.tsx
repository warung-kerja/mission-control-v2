import { FC } from 'react'
import { NavLink } from 'react-router-dom'
import { X, Sparkles } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { primaryNavItems, systemNavItems, utilityNavItems, type ShellNavItem, type TruthSourceTone } from './shellConfig'

interface SidebarProps {
  mobile?: boolean
  onClose?: () => void
}

const truthToneClass: Record<TruthSourceTone, string> = {
  canonical: 'bg-cyan-400/10 text-cyan-300 border border-cyan-400/20',
  runtime: 'bg-fuchsia-400/10 text-fuchsia-300 border border-fuchsia-400/20',
  fallback: 'bg-amber-400/10 text-amber-300 border border-amber-400/20',
}

function NavSection({
  title,
  items,
  mobile,
  onClose,
}: {
  title: string
  items: ShellNavItem[]
  mobile?: boolean
  onClose?: () => void
}) {
  return (
    <div className="space-y-1.5">
      <p className="px-3 text-[11px] uppercase tracking-[0.24em] text-mission-muted/80">{title}</p>
      {items.map(({ path, icon: Icon, label }) => (
        <NavLink
          key={path}
          to={path}
          onClick={() => mobile && onClose?.()}
          className={({ isActive }) =>
            `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
              isActive
                ? 'bg-gradient-to-r from-cyan-400/15 via-fuchsia-500/10 to-transparent text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                : 'text-mission-muted hover:bg-white/5 hover:text-mission-text'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${isActive ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300' : 'border-mission-border bg-mission-bg/60 text-mission-muted group-hover:border-white/10 group-hover:text-mission-text'}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="truncate">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  )
}

export const Sidebar: FC<SidebarProps> = ({ mobile, onClose }) => {
  const { user } = useAuthStore()

  return (
    <aside className={`${mobile ? 'w-80' : 'w-72'} flex h-full flex-col border-r border-white/8 bg-[#07111f]/95 text-mission-text backdrop-blur-xl`}>
      <div className="border-b border-white/8 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-cyan-300">
              <Sparkles className="h-3.5 w-3.5" />
              V3 Control Room
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-white">Mission Control</h1>
            <p className="mt-1 max-w-[24ch] text-sm text-mission-muted">
              One live surface for crew state, automation truth, and project movement.
            </p>
          </div>
          {mobile && onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-mission-muted transition-colors hover:bg-white/5 hover:text-mission-text"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <nav className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-4">
        <NavSection title="Primary Surfaces" items={primaryNavItems} mobile={mobile} onClose={onClose} />
        <NavSection title="System View" items={systemNavItems} mobile={mobile} onClose={onClose} />
        <NavSection title="Utility" items={utilityNavItems} mobile={mobile} onClose={onClose} />
      </nav>

      <div className="space-y-4 border-t border-white/8 p-4">
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-mission-muted/80">Truth Legend</p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium">
            {(['canonical', 'runtime', 'fallback'] as const).map((tone) => (
              <span key={tone} className={`rounded-full px-2.5 py-1 ${truthToneClass[tone]}`}>
                {tone}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-mission-muted">
            Every V3 surface should say whether it reflects file truth, live runtime, or a fallback state.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/15 text-sm font-semibold text-cyan-300">
            N
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user?.name || 'Noona'}</p>
            <p className="text-xs text-mission-muted">{user?.role || 'Operator session'}</p>
          </div>
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.75)]" />
        </div>
      </div>
    </aside>
  )
}
