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
      <div className="ambient-shell" />
      <div className="pointer-events-none fixed inset-x-8 top-6 z-0 h-px bg-gradient-to-r from-transparent via-cyan-300/25 to-transparent" />

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
        <main className="custom-scrollbar flex-1 overflow-auto px-4 pb-7 pt-5 lg:px-7 lg:pb-10 lg:pt-6">
          <div className="mx-auto w-full max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
