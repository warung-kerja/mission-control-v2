import { FC, useState } from 'react'
import { Plus, Search, Filter, MoreVertical, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { projectsApi } from '../../services/api'
import { Button, Badge } from '../../components/common/ui'

interface Project {
  id: string
  name: string
  description: string | null
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED'
  startDate: string | null
  endDate: string | null
  ownerId: string
  owner: {
    id: string
    name: string
    avatar: string | null
  }
  _count?: {
    tasks: number
    members: number
  }
  progress?: number
}

export const Projects: FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', 'list'],
    queryFn: async () => {
      const response = await projectsApi.list()
      return response.data.data as Project[]
    },
  })

  const filteredProjects = projects?.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || project.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      ACTIVE: { className: 'bg-green-100 text-green-800', label: 'Active' },
      ON_HOLD: { className: 'bg-yellow-100 text-yellow-800', label: 'On Hold' },
      COMPLETED: { className: 'bg-blue-100 text-blue-800', label: 'Completed' },
      ARCHIVED: { className: 'bg-gray-100 text-gray-800', label: 'Archived' },
    }
    const config = variants[status] || { className: 'bg-gray-100 text-gray-800', label: status }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const calculateProgress = (project: Project) => {
    if (project.progress !== undefined) return project.progress
    // Fallback calculation if progress not provided
    return 0
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-mission-text">Projects</h2>
          <p className="text-sm text-mission-muted">Manage and track all your projects</p>
        </div>
        <Button variant="primary" className="w-full sm:w-auto justify-center">
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Filters - Responsive */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1 max-w-none sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mission-muted" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-mission-card border border-mission-border rounded-lg text-mission-text placeholder-mission-muted focus:outline-none focus:border-primary-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-mission-muted hidden sm:block" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 sm:flex-none bg-mission-card border border-mission-border rounded-lg px-3 py-2 text-mission-text focus:outline-none focus:border-primary-500"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-mission-muted" />
        </div>
      ) : filteredProjects && filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="bg-mission-card border border-mission-border rounded-xl p-5 hover:border-primary-500/50 transition-colors group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {project.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(project.status)}
                  <button className="p-1 text-mission-muted hover:text-mission-text opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-mission-text mb-1">{project.name}</h3>
              <p className="text-sm text-mission-muted mb-4 line-clamp-2">
                {project.description || 'No description'}
              </p>
              <div className="flex items-center justify-between text-xs text-mission-muted mb-2">
                <span>{project._count?.tasks || 0} tasks</span>
                <span>{calculateProgress(project)}% complete</span>
              </div>
              <div className="h-1.5 bg-mission-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all"
                  style={{ width: `${calculateProgress(project)}%` }}
                />
              </div>
              {project.owner && (
                <div className="mt-4 flex items-center gap-2 pt-4 border-t border-mission-border">
                  <div className="w-6 h-6 rounded-full bg-mission-border flex items-center justify-center text-xs text-mission-muted">
                    {project.owner.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-mission-muted">{project.owner.name}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-mission-card border border-mission-border flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-mission-muted" />
          </div>
          <h3 className="text-lg font-medium text-mission-text mb-1">No projects found</h3>
          <p className="text-mission-muted">
            {searchQuery || statusFilter !== 'ALL'
              ? 'Try adjusting your filters'
              : 'Get started by creating your first project'}
          </p>
        </div>
      )}
    </div>
  )
}
