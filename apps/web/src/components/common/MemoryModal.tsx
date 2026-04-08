import { FC, useState, useEffect } from 'react'
import { Memory } from '../../hooks/useMemories'

interface MemoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    title: string
    content: string
    category: string
    tags: string[]
    importance: number
    archived: boolean
  }) => void
  memory?: Memory | null
  isLoading?: boolean
}

const categories = [
  { value: 'general', label: 'General', color: 'bg-slate-500' },
  { value: 'conversation', label: 'Conversation', color: 'bg-blue-500' },
  { value: 'file', label: 'File', color: 'bg-green-500' },
  { value: 'system', label: 'System', color: 'bg-purple-500' },
  { value: 'decision', label: 'Decision', color: 'bg-amber-500' },
  { value: 'milestone', label: 'Milestone', color: 'bg-rose-500' },
]

export const MemoryModal: FC<MemoryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  memory,
  isLoading = false,
}) => {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('general')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [importance, setImportance] = useState(3)
  const [archived, setArchived] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when modal opens/closes or memory changes
  useEffect(() => {
    if (isOpen) {
      if (memory) {
        setTitle(memory.title)
        setContent(memory.content)
        setCategory(memory.category)
        setTags(memory.tags || [])
        setImportance(memory.importance)
        setArchived(memory.archived)
      } else {
        setTitle('')
        setContent('')
        setCategory('general')
        setTags([])
        setTagInput('')
        setImportance(3)
        setArchived(false)
      }
      setErrors({})
    }
  }, [isOpen, memory])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!title.trim()) {
      newErrors.title = 'Title is required'
    } else if (title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters'
    }
    
    if (!content.trim()) {
      newErrors.content = 'Content is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    
    onSubmit({
      title: title.trim(),
      content: content.trim(),
      category,
      tags,
      importance,
      archived,
    })
  }

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase()
    if (trimmed && !tags.includes(trimmed) && tags.length < 10) {
      setTags([...tags, trimmed])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-mission-surface border border-mission-border rounded-2xl shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-mission-border">
          <h2 className="text-xl font-bold text-mission-text">
            {memory ? 'Edit Memory' : 'New Memory'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-mission-muted hover:text-mission-text hover:bg-mission-card rounded-lg transition-colors"
            disabled={isLoading}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-mission-text mb-2">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter memory title..."
              className={`w-full px-4 py-3 bg-mission-card border rounded-lg text-mission-text placeholder-mission-muted focus:outline-none focus:border-primary-500 transition-colors ${
                errors.title ? 'border-red-500' : 'border-mission-border'
              }`}
              disabled={isLoading}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-400">{errors.title}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-mission-text mb-2">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    category === cat.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-mission-card border border-mission-border text-mission-muted hover:text-mission-text'
                  }`}
                  disabled={isLoading}
                >
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${cat.color}`} />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-mission-text mb-2">
              Content <span className="text-red-400">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter memory content..."
              rows={6}
              className={`w-full px-4 py-3 bg-mission-card border rounded-lg text-mission-text placeholder-mission-muted focus:outline-none focus:border-primary-500 transition-colors resize-none ${
                errors.content ? 'border-red-500' : 'border-mission-border'
              }`}
              disabled={isLoading}
            />
            {errors.content && (
              <p className="mt-1 text-sm text-red-400">{errors.content}</p>
            )}
            <p className="mt-1 text-xs text-mission-muted text-right">
              {content.length} characters
            </p>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-mission-text mb-2">
              Tags <span className="text-mission-muted">({tags.length}/10)</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-primary-500/20 text-primary-400 rounded-lg text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-white transition-colors"
                    disabled={isLoading}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add a tag..."
                className="flex-1 px-4 py-2 bg-mission-card border border-mission-border rounded-lg text-mission-text placeholder-mission-muted focus:outline-none focus:border-primary-500 transition-colors"
                disabled={isLoading || tags.length >= 10}
              />
              <button
                type="button"
                onClick={handleAddTag}
                disabled={!tagInput.trim() || tags.length >= 10 || isLoading}
                className="px-4 py-2 bg-mission-card border border-mission-border text-mission-muted rounded-lg hover:text-mission-text hover:border-primary-500 transition-colors disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>

          {/* Importance */}
          <div>
            <label className="block text-sm font-medium text-mission-text mb-2">
              Importance: <span className="text-primary-400">{importance}/5</span>
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={1}
                max={5}
                value={importance}
                onChange={(e) => setImportance(Number(e.target.value))}
                className="flex-1 h-2 bg-mission-card rounded-lg appearance-none cursor-pointer accent-primary-500"
                disabled={isLoading}
              />
              <div className="flex gap-1">
                {Array(5).fill(0).map((_, i) => (
                  <span
                    key={i}
                    className={`w-3 h-3 rounded-full ${
                      i < importance ? 'bg-primary-400' : 'bg-mission-border'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Archived */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="archived"
              checked={archived}
              onChange={(e) => setArchived(e.target.checked)}
              className="w-5 h-5 rounded border-mission-border bg-mission-card text-primary-500 focus:ring-primary-500"
              disabled={isLoading}
            />
            <label htmlFor="archived" className="text-sm text-mission-muted cursor-pointer">
              Archive this memory
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-mission-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-mission-muted hover:text-mission-text transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {memory ? 'Update Memory' : 'Create Memory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
