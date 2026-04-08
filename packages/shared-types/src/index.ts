// User types
export interface User {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'MANAGER' | 'USER'
  avatar?: string
  status: 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE'
  createdAt: string
}

export interface CreateUserInput {
  email: string
  name: string
  password: string
  role?: 'ADMIN' | 'MANAGER' | 'USER'
}

// Project types
export interface Project {
  id: string
  name: string
  description?: string
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  progress: number
  startDate?: string
  endDate?: string
  ownerId: string
  owner: User
  members: ProjectMember[]
  createdAt: string
}

export interface ProjectMember {
  id: string
  role: string
  user: User
  joinedAt: string
}

export interface CreateProjectInput {
  name: string
  description?: string
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  startDate?: string
  endDate?: string
}

// Task types
export interface Task {
  id: string
  title: string
  description?: string
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: string
  estimatedHours?: number
  actualHours?: number
  projectId: string
  assigneeId?: string
  assignee?: User
  creatorId: string
  creator: User
  createdAt: string
}

export interface CreateTaskInput {
  title: string
  description?: string
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: string
  estimatedHours?: number
  projectId: string
  assigneeId?: string
}

// Message types
export interface Message {
  id: string
  content: string
  sender: User
  projectId: string
  createdAt: string
}

// Activity types
export interface Activity {
  id: string
  type: string
  user: User
  metadata?: Record<string, unknown>
  createdAt: string
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Socket event types
export interface ServerToClientEvents {
  'user:status': (userId: string, status: User['status']) => void
  'message:new': (message: Message) => void
  'task:updated': (task: Task) => void
  'activity:new': (activity: Activity) => void
}

export interface ClientToServerEvents {
  'message:send': (projectId: string, content: string) => void
  'user:join': (projectId: string) => void
  'user:leave': (projectId: string) => void
}
