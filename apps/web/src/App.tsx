import { FC, lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { FeatureErrorBoundary, LoadingState } from './components/common'

const Dashboard = lazy(() => import('./features/dashboard/Dashboard').then((m) => ({ default: m.Dashboard })))
const Projects = lazy(() => import('./features/projects/Projects').then((m) => ({ default: m.Projects })))
const Tasks = lazy(() => import('./features/tasks/Tasks').then((m) => ({ default: m.Tasks })))
const Calendar = lazy(() => import('./features/calendar/Calendar').then((m) => ({ default: m.Calendar })))
const Team = lazy(() => import('./features/team/Team').then((m) => ({ default: m.Team })))
const Office = lazy(() => import('./features/office/Office').then((m) => ({ default: m.Office })))
const Memories = lazy(() => import('./features/memories/Memories').then((m) => ({ default: m.Memories })))
const Collaboration = lazy(() =>
  import('./features/collaboration/Collaboration').then((m) => ({ default: m.Collaboration }))
)
const Analytics = lazy(() => import('./features/analytics/Analytics').then((m) => ({ default: m.Analytics })))

const withFeatureShell = (Component: FC, featureName: string) => {
  return (
    <FeatureErrorBoundary featureName={featureName}>
      <Suspense fallback={<LoadingState message={`Loading ${featureName}...`} />}>
        <Component />
      </Suspense>
    </FeatureErrorBoundary>
  )
}

const App: FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={withFeatureShell(Dashboard, 'Dashboard')} />
        <Route path="projects" element={withFeatureShell(Projects, 'Projects')} />
        <Route path="tasks" element={withFeatureShell(Tasks, 'Tasks')} />
        <Route path="calendar" element={withFeatureShell(Calendar, 'Calendar')} />
        <Route path="team" element={withFeatureShell(Team, 'Team')} />
        <Route path="office" element={withFeatureShell(Office, 'Office')} />
        <Route path="memories" element={withFeatureShell(Memories, 'Memories')} />
        <Route path="collaboration" element={withFeatureShell(Collaboration, 'Collaboration')} />
        <Route path="analytics" element={withFeatureShell(Analytics, 'Analytics')} />
      </Route>
    </Routes>
  )
}

export default App
