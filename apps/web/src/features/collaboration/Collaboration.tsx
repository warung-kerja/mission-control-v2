import { FC, useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { useProjects } from '../../hooks/useDashboard'
import { useProjectMessages, useSendMessage, type Message } from '../../hooks/useMessages'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useAuthStore } from '../../stores/authStore'

const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const Collaboration: FC = () => {
  const { user } = useAuthStore()
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [messageInput, setMessageInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: projects, isLoading: projectsLoading } = useProjects()
  const { data: messages, isLoading: messagesLoading } = useProjectMessages(
    selectedProjectId || null
  )
  const sendMessage = useSendMessage()
  const { socket } = useWebSocket()

  // Auto-select first project if none selected
  useEffect(() => {
    if (projects && projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Listen for real-time messages
  useEffect(() => {
    if (!socket || !selectedProjectId) return

    const handleNewMessage = (_message: Message) => {
      // The React Query cache will be updated via invalidation
      // This is just for additional real-time handling if needed
    }

    socket.on(`project:${selectedProjectId}:message`, handleNewMessage)

    return () => {
      socket.off(`project:${selectedProjectId}:message`, handleNewMessage)
    }
  }, [socket, selectedProjectId])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageInput.trim() || !selectedProjectId || sendMessage.isPending) return

    await sendMessage.mutateAsync({
      projectId: selectedProjectId,
      content: messageInput.trim(),
    })

    setMessageInput('')
    inputRef.current?.focus()
  }

  const selectedProject = projects?.find((p) => p.id === selectedProjectId)

  return (
    <div className="space-y-6 animate-fade-in h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-mission-text">Collaboration</h2>
          <p className="text-mission-muted">Stub view only, primary agent collaboration happens outside Mission Control</p>
        </div>

        {/* Project Selector */}
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          disabled={projectsLoading}
          className="px-4 py-2 bg-mission-card border border-mission-border rounded-lg text-sm text-mission-text focus:outline-none focus:border-primary-500 disabled:opacity-50"
        >
          {projectsLoading ? (
            <option>Loading projects...</option>
          ) : projects && projects.length > 0 ? (
            projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))
          ) : (
            <option>No projects available</option>
          )}
        </select>
      </div>

      <div className="bg-mission-card border border-mission-border rounded-xl flex flex-col h-full overflow-hidden">
        {/* Channel Header */}
        <div className="p-4 border-b border-mission-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-mission-text">
              {selectedProject ? `#${selectedProject.name.toLowerCase().replace(/\s+/g, '-')}` : '#general'}
            </h3>
            <p className="text-xs text-mission-muted">
              {messages?.length || 0} messages
            </p>
          </div>
          {sendMessage.isPending && (
            <div className="flex items-center gap-2 text-xs text-mission-muted">
              <Loader2 className="w-3 h-3 animate-spin" />
              Sending...
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {messagesLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : messages && messages.length > 0 ? (
            <>
              {messages.map((msg) => {
                const isSelf = msg.sender.id === user?.id
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isSelf ? 'flex-row-reverse' : ''}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        isSelf ? 'bg-primary-600' : 'bg-purple-600'
                      } text-white`}
                    >
                      {msg.sender.avatar ? (
                        <img
                          src={msg.sender.avatar}
                          alt={msg.sender.name}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        msg.sender.name.charAt(0).toUpperCase()
                      )}
                    </div>

                    {/* Message Content */}
                    <div className={`max-w-[70%] ${isSelf ? 'text-right' : ''}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-mission-text">
                          {isSelf ? 'You' : msg.sender.name}
                        </span>
                        <span className="text-xs text-mission-muted">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                      <div
                        className={`inline-block px-4 py-2 rounded-xl text-sm text-left ${
                          isSelf
                            ? 'bg-primary-600 text-white'
                            : 'bg-mission-bg text-mission-text'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-12 h-12 rounded-full bg-mission-bg flex items-center justify-center mb-3">
                <Send className="w-5 h-5 text-mission-muted" />
              </div>
              <p className="text-mission-muted text-sm">No in-app collaboration history</p>
              <p className="text-mission-muted text-xs mt-1">
                This page is intentionally lightweight while team coordination stays in external comms
              </p>
            </div>
          )}
        </div>

        {/* Input Area */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-mission-border">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder={
                selectedProject
                  ? `Message #${selectedProject.name.toLowerCase().replace(/\s+/g, '-')}`
                  : 'Select a project to start messaging'
              }
              disabled={!selectedProjectId || sendMessage.isPending}
              className="flex-1 px-4 py-2 bg-mission-bg border border-mission-border rounded-lg text-sm text-mission-text placeholder:text-mission-muted focus:outline-none focus:border-primary-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!messageInput.trim() || !selectedProjectId || sendMessage.isPending}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {sendMessage.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-mission-muted mt-2">
            Temporary stub only • external comms remain the source of truth for collaboration
          </p>
        </form>
      </div>
    </div>
  )
}
