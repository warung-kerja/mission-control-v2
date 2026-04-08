import { useQuery } from '@tanstack/react-query'
import { calendarApi } from '../services/api.js'

export interface CalendarEvent {
  id: string
  title: string
  description: string | null
  date: string
  time: string
  status: string
  priority: string
  type: string
  project: {
    id: string
    name: string
    status: string
  }
  assignee: {
    id: string
    name: string
    avatar: string | null
  } | null
}

export interface CalendarSummary {
  year: number
  month: number
  summary: Record<string, {
    count: number
    tasks: Array<{
      id: string
      title: string
      status: string
      priority: string
      dueDate: string
    }>
  }>
  totalTasks: number
}

export function useCalendarEvents(startDate?: string, endDate?: string, projectId?: string) {
  return useQuery({
    queryKey: ['calendar', 'events', startDate, endDate, projectId],
    queryFn: async () => {
      const response = await calendarApi.events({ startDate, endDate, projectId })
      return response.data.data as CalendarEvent[]
    },
    enabled: !!startDate && !!endDate,
  })
}

export function useCalendarSummary(year?: number, month?: number, projectId?: string) {
  return useQuery({
    queryKey: ['calendar', 'summary', year, month, projectId],
    queryFn: async () => {
      const response = await calendarApi.summary({ year, month, projectId })
      return response.data.data as CalendarSummary
    },
  })
}
