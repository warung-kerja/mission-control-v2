import { FC, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useSocketBootstrap } from '../../hooks/useWebSocket'

export const Layout: FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Initialise the singleton socket once for the entire authenticated session.
  useSocketBootstrap()

  return (
    <div className="flex h-screen overflow-hidden bg-[#050b14] text-mission-text">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(217,70,239,0.08),transparent_24%),linear-gradient(180deg,#050b14_0%,#09111d_55%,#060c16_100%)]" />

      {/* Desktop Sidebar */}
      <div className="relative z-10 hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <>
          <div
            data-testid="mobile-sidebar-overlay"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed left-0 top-0 z-50 h-full lg:hidden">
            <Sidebar mobile onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="custom-scrollbar flex-1 overflow-auto px-4 pb-6 pt-4 lg:px-6 lg:pb-8 lg:pt-5">
          <div className="mx-auto w-full max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
