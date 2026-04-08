import { FC, useState } from 'react'
import { useMemories, useMemoryCategories, useMemoryStats, useSearchMemories, useCreateMemory, useUpdateMemory, useDeleteMemory, useRealTimeMemories } from '../../hooks'
import { Memory } from '../../hooks/useMemories'
import { ErrorDisplay, LoadingState, MemoryModal } from '../../components/common'

const categoryColors: Record<string, string> = {
  general: 'bg-slate-500/20 text-slate-400',
  conversation: 'bg-blue-500/20 text-blue-400',
  file: 'bg-green-500/20 text-green-400',
  system: 'bg-purple-500/20 text-purple-400',
  decision: 'bg-amber-500/20 text-amber-400',
  milestone: 'bg-rose-500/20 text-rose-400',
}

const categoryIcons: Record<string, string> = {
  general: 'M',
  conversation: 'C',
  file: 'F',
  system: 'S',
  decision: 'D',
  milestone: '🏆',
}

const importanceDots = (level: number) => {
  return Array(5).fill(0).map((_, i) => (
    <span
      key={i}
      className={`w-1.5 h-1.5 rounded-full ${
        i < level ? 'bg-primary-400' : 'bg-mission-border'
      }`}
    />
  ))
}

export const Memories: FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null)
  
  // Enable real-time memory updates
  useRealTimeMemories()
  
  const { data: memories, isLoading: memoriesLoading, error: memoriesError, refetch: refetchMemories } = useMemories({
    category: selectedCategory === 'all' ? undefined : selectedCategory,
  })

  const { data: categories, isLoading: categoriesLoading, error: categoriesError, refetch: refetchCategories } = useMemoryCategories()
  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useMemoryStats()
  const { data: searchResults, isLoading: searchLoading } = useSearchMemories(searchQuery)
  
  const createMemory = useCreateMemory()
  const updateMemory = useUpdateMemory()
  const deleteMemory = useDeleteMemory()
  
  const displayMemories = searchQuery.trim() ? searchResults : memories
  const isLoading = memoriesLoading || categoriesLoading || statsLoading || searchLoading
  const isMutating = createMemory.isPending || updateMemory.isPending || deleteMemory.isPending

  const handleOpenModal = (memory?: Memory) => {
    setEditingMemory(memory || null)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingMemory(null)
  }

  const handleSubmit = async (data: {
    title: string
    content: string
    category: string
    tags: string[]
    importance: number
    archived: boolean
  }) => {
    if (editingMemory) {
      await updateMemory.mutateAsync({ id: editingMemory.id, data })
    } else {
      await createMemory.mutateAsync(data)
    }
    handleCloseModal()
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this memory?')) {
      await deleteMemory.mutateAsync(id)
    }
  }
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }
  
  const getCategoryStyle = (category: string) => {
    return categoryColors[category] || categoryColors.general
  }
  
  const getCategoryIcon = (category: string) => {
    return categoryIcons[category] || categoryIcons.general
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-mission-text">Memories</h2>
          <p className="text-mission-muted">Browse agent memories and context</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + New Memory
        </button>
      </div>
      
      {/* Stats */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-mission-card border border-mission-border rounded-xl p-4">
            <p className="text-2xl font-bold text-mission-text">{stats.total}</p>
            <p className="text-sm text-mission-muted">Total Memories</p>
          </div>
          <div className="bg-mission-card border border-mission-border rounded-xl p-4">
            <p className="text-2xl font-bold text-green-400">{stats.active}</p>
            <p className="text-sm text-mission-muted">Active</p>
          </div>
          <div className="bg-mission-card border border-mission-border rounded-xl p-4">
            <p className="text-2xl font-bold text-blue-400">{stats.recent}</p>
            <p className="text-sm text-mission-muted">This Week</p>
          </div>
          <div className="bg-mission-card border border-mission-border rounded-xl p-4">
            <p className="text-2xl font-bold text-mission-muted">{stats.archived}</p>
            <p className="text-sm text-mission-muted">Archived</p>
          </div>
        </div>
      )}
      
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-mission-card border border-mission-border rounded-lg text-mission-text placeholder-mission-muted focus:outline-none focus:border-primary-500 transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-mission-card border border-mission-border text-mission-muted hover:text-mission-text'
            }`}
          >
            All
          </button>
          {categories?.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === cat.name
                  ? 'bg-primary-600 text-white'
                  : 'bg-mission-card border border-mission-border text-mission-muted hover:text-mission-text'
              }`}
            >
              {cat.name} ({cat.count})
            </button>
          ))}
        </div>
      </div>
      
      {/* Error State */}
      {(memoriesError || categoriesError || statsError) && (
        <ErrorDisplay
          title="Failed to load memories"
          message="Unable to fetch memories data. Please check your connection and try again."
          onRetry={() => {
            refetchMemories()
            refetchCategories()
            refetchStats()
          }}
        />
      )}

      {/* Loading State */}
      {isLoading && !memoriesError && !categoriesError && !statsError && (
        <LoadingState message="Loading memories..." />
      )}
      
      {/* Memories Grid */}
      {!isLoading && displayMemories && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayMemories.map((memory: Memory) => (
            <div
              key={memory.id}
              className="bg-mission-card border border-mission-border rounded-xl p-5 hover:border-primary-500/50 transition-all group relative"
            >
              {/* Actions */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button
                  onClick={() => handleOpenModal(memory)}
                  className="p-1.5 text-mission-muted hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-colors"
                  title="Edit"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(memory.id)}
                  className="p-1.5 text-mission-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <div 
                className="flex items-start gap-3 mb-3 cursor-pointer"
                onClick={() => handleOpenModal(memory)}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${getCategoryStyle(memory.category)}`}>
                  <span className="font-bold">{getCategoryIcon(memory.category)}</span>
                </div>
                <div className="flex-1 min-w-0 pr-16">
                  <h3 className="font-medium text-mission-text truncate group-hover:text-primary-400 transition-colors">
                    {memory.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-mission-muted">
                    <span>{formatDate(memory.createdAt)}</span>
                    {memory.user && (
                      <>
                        <span>•</span>
                        <span>{memory.user.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <p 
                className="text-sm text-mission-muted line-clamp-3 mb-3 cursor-pointer"
                onClick={() => handleOpenModal(memory)}
              >
                {memory.content}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {importanceDots(memory.importance)}
                </div>
                <div className="flex items-center gap-2">
                  {memory.tags && memory.tags.length > 0 && (
                    <span className="text-xs px-2 py-1 bg-mission-surface rounded-full text-mission-muted">
                      {memory.tags.length} tag{memory.tags.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${getCategoryStyle(memory.category)}`}>
                    {memory.category}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Memory Modal */}
      <MemoryModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        memory={editingMemory}
        isLoading={isMutating}
      />
      
      {/* Empty State */}
      {!isLoading && (!displayMemories || displayMemories.length === 0) && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-mission-card border border-mission-border flex items-center justify-center">
            <span className="text-2xl">📝</span>
          </div>
          <h3 className="text-lg font-medium text-mission-text mb-1">
            {searchQuery ? 'No memories found' : 'No memories yet'}
          </h3>
          <p className="text-mission-muted">
            {searchQuery
              ? 'Try adjusting your search or filters'
              : 'Create your first memory to get started'}
          </p>
        </div>
      )}
    </div>
  )
}
