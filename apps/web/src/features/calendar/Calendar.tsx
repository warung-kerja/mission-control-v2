import { FC, useState, useMemo } from 'react'
import { useCalendarSummary, useCalendarEvents } from '../../hooks/useCalendar'
import { useProjects } from '../../hooks/useDashboard'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export const Calendar: FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<string>('')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1

  // Fetch calendar summary for the current month
  const { data: summary, isLoading: summaryLoading } = useCalendarSummary(
    year,
    month,
    selectedProject || undefined
  )

  // Fetch projects for filter
  const { data: projects } = useProjects()

  // Calculate date range for events query
  const dateRange = useMemo(() => {
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0)
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    }
  }, [year, month])

  // Fetch events for the current month
  const { data: events, isLoading: eventsLoading } = useCalendarEvents(
    dateRange.startDate,
    dateRange.endDate,
    selectedProject || undefined
  )

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate || !events) return []
    return events.filter(event => event.date === selectedDate)
  }, [selectedDate, events])

  // Calendar grid calculations
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const today = new Date().toISOString().split('T')[0]

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
    setSelectedDate(null)
  }

  const getDayStatus = (day: number): 'none' | 'low' | 'medium' | 'high' => {
    if (!summary?.summary) return 'none'
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const dayData = summary.summary[dateKey]
    if (!dayData) return 'none'
    if (dayData.count >= 4) return 'high'
    if (dayData.count >= 2) return 'medium'
    return 'low'
  }

  const isToday = (day: number) => {
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return dateKey === today
  }

  const isSelected = (day: number) => {
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return dateKey === selectedDate
  }

  const handleDayClick = (day: number) => {
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setSelectedDate(dateKey === selectedDate ? null : dateKey)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DONE': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'IN_PROGRESS': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'TODO': return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-400'
      case 'HIGH': return 'text-orange-400'
      case 'MEDIUM': return 'text-yellow-400'
      case 'LOW': return 'text-green-400'
      default: return 'text-gray-400'
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-mission-text">Calendar</h2>
          <p className="text-mission-muted">Schedule and manage task deadlines</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Project Filter */}
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-3 py-2 bg-mission-card border border-mission-border rounded-lg text-sm text-mission-text focus:outline-none focus:border-primary-500"
          >
            <option value="">All Projects</option>
            {projects?.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-mission-card border border-mission-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-mission-text">
              {MONTHS[month - 1]} {year}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => navigateMonth('prev')}
                className="px-3 py-1.5 text-sm text-mission-muted hover:text-mission-text transition-colors"
              >
                ← Previous
              </button>
              <button
                onClick={() => navigateMonth('next')}
                className="px-3 py-1.5 text-sm text-mission-muted hover:text-mission-text transition-colors"
              >
                Next →
              </button>
            </div>
          </div>

          {summaryLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-2 text-center mb-2">
                {DAYS.map((day) => (
                  <div key={day} className="text-xs font-medium text-mission-muted py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {/* Empty cells for days before the first day of month */}
                {Array.from({ length: firstDayOfMonth }, (_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {/* Days of the month */}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const status = getDayStatus(day)
                  const dayIsToday = isToday(day)
                  const dayIsSelected = isSelected(day)

                  return (
                    <button
                      key={day}
                      onClick={() => handleDayClick(day)}
                      className={`
                        aspect-square rounded-lg flex flex-col items-center justify-center text-sm
                        transition-all relative overflow-hidden
                        ${dayIsSelected
                          ? 'bg-primary-600 text-white ring-2 ring-primary-400'
                          : dayIsToday
                            ? 'bg-primary-600/30 text-primary-400 border border-primary-500/50'
                            : 'text-mission-text hover:bg-mission-border/50'
                        }
                      `}
                    >
                      <span className="font-medium">{day}</span>
                      {status !== 'none' && (
                        <div className={`
                          absolute bottom-1 w-1.5 h-1.5 rounded-full
                          ${status === 'high' ? 'bg-red-400' : status === 'medium' ? 'bg-yellow-400' : 'bg-green-400'}
                        `} />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-mission-border">
                <span className="text-xs text-mission-muted">Task load:</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-xs text-mission-muted">Light (1)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-400" />
                  <span className="text-xs text-mission-muted">Medium (2-3)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-xs text-mission-muted">Heavy (4+)</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Events Panel */}
        <div className="bg-mission-card border border-mission-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-mission-text mb-4">
            {selectedDate
              ? `Tasks for ${new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
              : 'Select a date'
            }
          </h3>

          {eventsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
            </div>
          ) : selectedDate ? (
            selectedDateEvents.length > 0 ? (
              <div className="space-y-3">
                {selectedDateEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 bg-mission-background rounded-lg border border-mission-border hover:border-mission-border/80 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-medium text-mission-text line-clamp-2">
                        {event.title}
                      </h4>
                      <span className={`text-xs ${getPriorityColor(event.priority)}`}>
                        {event.priority}
                      </span>
                    </div>
                    {event.project && (
                      <p className="text-xs text-mission-muted mt-1">
                        {event.project.name}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded border ${getStatusColor(event.status)}`}>
                        {event.status.replace('_', ' ')}
                      </span>
                      {event.assignee && (
                        <div className="flex items-center gap-1">
                          {event.assignee.avatar ? (
                            <img
                              src={event.assignee.avatar}
                              alt={event.assignee.name}
                              className="w-4 h-4 rounded-full"
                            />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-primary-600 flex items-center justify-center text-[8px] text-white">
                              {event.assignee.name.charAt(0)}
                            </div>
                          )}
                          <span className="text-xs text-mission-muted">{event.assignee.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-mission-muted text-sm">No tasks due on this date</p>
              </div>
            )
          ) : (
            <div className="text-center py-8">
              <p className="text-mission-muted text-sm">Click a date to view tasks</p>
            </div>
          )}

          {/* Month Summary */}
          {summary && (
            <div className="mt-6 pt-4 border-t border-mission-border">
              <h4 className="text-sm font-medium text-mission-text mb-3">Month Summary</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-mission-background rounded-lg">
                  <p className="text-2xl font-bold text-mission-text">{summary.totalTasks}</p>
                  <p className="text-xs text-mission-muted">Total Tasks</p>
                </div>
                <div className="p-3 bg-mission-background rounded-lg">
                  <p className="text-2xl font-bold text-mission-text">
                    {Object.keys(summary.summary).length}
                  </p>
                  <p className="text-xs text-mission-muted">Active Days</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
