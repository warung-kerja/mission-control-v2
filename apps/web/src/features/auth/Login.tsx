import { FC, useState, FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { Lock, Mail, AlertCircle, Loader2, Rocket } from 'lucide-react'

export const Login: FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, isLoading, error, clearError } = useAuthStore()
  
  const navigate = useNavigate()
  const location = useLocation()
  
  // Get the page they were trying to visit before redirecting to login
  const from = location.state?.from?.pathname || '/'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    clearError()
    
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      // Error is handled by the store
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-mission-bg p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600/20 mb-4 border border-primary-500/30">
            <Rocket className="w-8 h-8 text-primary-400" />
          </div>
          <h1 className="text-3xl font-bold text-mission-text tracking-tight">Mission Control</h1>
          <p className="text-mission-muted mt-2">Enter your credentials to access the bridge</p>
        </div>

        {/* Login Card */}
        <div className="mission-card p-8 shadow-2xl backdrop-blur-sm bg-mission-card/80">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-error/10 border border-error/20 text-error animate-fade-in text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-mission-muted ml-1" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-mission-muted pointer-events-none transition-colors group-focus-within:text-primary-400" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mission-input pl-10 h-11"
                  placeholder="name@company.com"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-mission-muted ml-1" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-mission-muted pointer-events-none transition-colors group-focus-within:text-primary-400" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mission-input pl-10 h-11"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mission-btn-primary w-full h-11 text-lg group relative overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  Launch Session
                </span>
              )}
            </button>
          </form>

          {/* Optional: Demo Hint */}
          <div className="mt-8 pt-6 border-t border-mission-border/50">
            <p className="text-xs text-center text-mission-muted">
              Secure authentication for authorized personnel only.
            </p>
          </div>
        </div>
        
        {/* Security Footer */}
        <p className="text-center text-xs text-mission-muted mt-8 opacity-50">
          &copy; 2026 Warung Kerja. All systems operational.
        </p>
      </div>
    </div>
  )
}
