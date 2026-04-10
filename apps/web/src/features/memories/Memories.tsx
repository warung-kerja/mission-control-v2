import { FC, useState } from 'react'
import { FileText, Database, FolderOpen, Clock, Search, ChevronRight } from 'lucide-react'
import { useMemories, useMemoryCategories, useMemoryStats, useSearchMemories, useCreateMemory, useUpdateMemory, useDeleteMemory, useRealTimeMemories } from '../../hooks'
import { Memory } from '../../hooks/useMemories'
import { ErrorDisplay, LoadingState, MemoryModal } from '../../components/common'
import { useCanonicalMemories, type CanonicalMemoryFile } from '../../hooks/useCanonicalMemories'

// ─── Shared helpers ──────────────────────────────────────────────────────────

const categoryColors: Record<string, string> = {
  general:      'bg-slate-500/20 text-slate-400',
  conversation: 'bg-blue-500/20 text-blue-400',
  file:         'bg-green-500/20 text-green-400',
  system:       'bg-purple-500/20 text-purple-400',
  decision:     'bg-amber-500/20 text-amber-400',
  milestone:    'bg-rose-500/20 text-rose-400',
}

const categoryIcons: Record<string, string> = {
  general:      'M',
  conversation: 'C',
  file:         'F',
  system:       'S',
  decision:     'D',
  milestone:    '🏆',
}

const CANONICAL_CATEGORY_COLOR: Record<string, string> = {
  root:           'bg-primary-500/10 text-primary-400',
  Business_Plans: 'bg-amber-500/10 text-amber-400',
  Decisions:      'bg-rose-500/10 text-rose-400',
  Lessons_Learned:'bg-emerald-500/10 text-emerald-400',
  Projects:       'bg-blue-500/10 text-blue-400',
}

const importanceDots = (level: number) =>
  Array(5).fill(0).map((_, i) => (
    <span
      key={i}
      className={`w-1.5 h-1.5 rounded-full ${i < level ? 'bg-primary-400' : 'bg-mission-border'}`}
    />
  ))

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

// ─── Canonical file viewer ───────────────────────────────────────────────────

const CanonicalFileCard: FC<{ file: CanonicalMemoryFile; onClick: () => void }> = ({ file, onClick }) => {
  const badgeCls = CANONICAL_CATEGORY_COLOR[file.category] ?? CANONICAL_CATEGORY_COLOR.root
  const preview = file.content.replace(/^#.*\n/m, '').trim().slice(0, 160)

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-mission-card border border-mission-border rounded-xl p-5 hover:border-primary-500/50 transition-all group"
    >
      <div className="flex items-start gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4 text-primary-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-mission-text truncate group-hover:text-primary-400 transition-colors">
            {file.filename}
          </p>
          <div className="flex items-center gap-2 text-xs text-mission-muted mt-0.5">
            <Clock className="w-3 h-3" />
            {formatDate(file.modifiedAt)}
            <span>·</span>
            {formatBytes(file.sizeBytes)}
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${badgeCls}`}>
          {file.category === 'root' ? 'shared' : file.category.replace(/_/g, ' ').toLowerCase()}
        </span>
      </div>
      <p className="text-xs text-mission-muted line-clamp-3 leading-relaxed">{preview}</p>
      <div className="flex items-center justify-end mt-2 text-xs text-mission-muted group-hover:text-primary-400 transition-colors">
        <span>View</span>
        <ChevronRight className="w-3 h-3 ml-0.5" />
      </div>
    </button>
  )
}

const CanonicalFileModal: FC<{ file: CanonicalMemoryFile; onClose: () => void }> = ({ file, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/60" onClick={onClose} />
    <div className="relative bg-mission-card border border-mission-border rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-mission-border flex-shrink-0">
        <div>
          <h3 className="font-semibold text-mission-text">{file.filename}</h3>
          <p className="text-xs text-mission-muted mt-0.5">{file.relativePath} · {formatBytes(file.sizeBytes)} · modified {formatDate(file.modifiedAt)}</p>
        </div>
        <button onClick={onClose} className="text-mission-muted hover:text-mission-text transition-colors p-1">✕</button>
      </div>
      {/* Content */}
      <div className="overflow-y-auto flex-1 p-5">
        <pre className="text-sm text-mission-text whitespace-pre-wrap font-mono leading-relaxed">{file.content}</pre>
      </div>
    </div>
  </div>
)

// ─── DB Memories tab ─────────────────────────────────────────────────────────

const DBMemoriesTab: FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery]           = useState('')
  const [isModalOpen, setIsModalOpen]           = useState(false)
  const [editingMemory, setEditingMemory]       = useState<Memory | null>(null)

  useRealTimeMemories()

  const { data: memories,   isLoading: memoriesLoading,   error: memoriesError,   refetch: refetchMemories }   = useMemories({ category: selectedCategory === 'all' ? undefined : selectedCategory })
  const { data: categories, isLoading: categoriesLoading, error: categoriesError, refetch: refetchCategories } = useMemoryCategories()
  const { data: stats,      isLoading: statsLoading,      error: statsError,      refetch: refetchStats }      = useMemoryStats()
  const { data: searchResults, isLoading: searchLoading } = useSearchMemories(searchQuery)

  const createMemory = useCreateMemory()
  const updateMemory = useUpdateMemory()
  const deleteMemory = useDeleteMemory()

  const displayMemories = searchQuery.trim() ? searchResults : memories
  const isLoading = memoriesLoading || categoriesLoading || statsLoading || searchLoading
  const isMutating = createMemory.isPending || updateMemory.isPending || deleteMemory.isPending

  const handleOpenModal  = (memory?: Memory) => { setEditingMemory(memory || null); setIsModalOpen(true) }
  const handleCloseModal = () => { setIsModalOpen(false); setEditingMemory(null) }

  const handleSubmit = async (data: { title: string; content: string; category: string; tags: string[]; importance: number; archived: boolean }) => {
    if (editingMemory) await updateMemory.mutateAsync({ id: editingMemory.id, data })
    else await createMemory.mutateAsync(data)
    handleCloseModal()
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this memory?')) await deleteMemory.mutateAsync(id)
  }

  const getCategoryStyle = (cat: string) => categoryColors[cat] || categoryColors.general
  const getCategoryIcon  = (cat: string) => categoryIcons[cat] || categoryIcons.general

  return (
    <div className="space-y-6">
      {/* Stats */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-mission-card border border-mission-border rounded-xl p-4">
            <p className="text-2xl font-bold text-mission-text">{stats.total}</p>
            <p className="text-sm text-mission-muted">Total</p>
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

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mission-muted" />
          <input
            type="text"
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-mission-card border border-mission-border rounded-lg text-mission-text placeholder-mission-muted focus:outline-none focus:border-primary-500 transition-colors"
          />
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors flex-shrink-0"
        >
          + New Memory
        </button>
        <div className="flex gap-2 flex-wrap">
          {['all', ...(categories?.map((c) => c.name) ?? [])].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-primary-600 text-white'
                  : 'bg-mission-card border border-mission-border text-mission-muted hover:text-mission-text'
              }`}
            >
              {cat === 'all' ? 'All' : `${cat} (${categories?.find((c) => c.name === cat)?.count ?? 0})`}
            </button>
          ))}
        </div>
      </div>

      {/* Errors */}
      {(memoriesError || categoriesError || statsError) && (
        <ErrorDisplay
          title="Failed to load memories"
          message="Unable to fetch memories data."
          onRetry={() => { refetchMemories(); refetchCategories(); refetchStats() }}
        />
      )}

      {isLoading && !memoriesError && <LoadingState message="Loading memories..." />}

      {/* Grid */}
      {!isLoading && displayMemories && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayMemories.map((memory: Memory) => (
            <div
              key={memory.id}
              className="bg-mission-card border border-mission-border rounded-xl p-5 hover:border-primary-500/50 transition-all group relative"
            >
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button onClick={() => handleOpenModal(memory)} className="p-1.5 text-mission-muted hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-colors" title="Edit">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button onClick={() => handleDelete(memory.id)} className="p-1.5 text-mission-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
              <div className="flex items-start gap-3 mb-3 cursor-pointer" onClick={() => handleOpenModal(memory)}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${getCategoryStyle(memory.category)}`}>
                  <span className="font-bold">{getCategoryIcon(memory.category)}</span>
                </div>
                <div className="flex-1 min-w-0 pr-16">
                  <h3 className="font-medium text-mission-text truncate group-hover:text-primary-400 transition-colors">{memory.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-mission-muted">
                    <span>{formatDate(memory.createdAt)}</span>
                    {memory.user && <><span>·</span><span>{memory.user.name}</span></>}
                  </div>
                </div>
              </div>
              <p className="text-sm text-mission-muted line-clamp-3 mb-3 cursor-pointer" onClick={() => handleOpenModal(memory)}>{memory.content}</p>
              <div className="flex items-center justify-between">
                <div className="flex gap-1">{importanceDots(memory.importance)}</div>
                <div className="flex items-center gap-2">
                  {memory.tags && memory.tags.length > 0 && (
                    <span className="text-xs px-2 py-1 bg-mission-surface rounded-full text-mission-muted">
                      {memory.tags.length} tag{memory.tags.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${getCategoryStyle(memory.category)}`}>{memory.category}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <MemoryModal isOpen={isModalOpen} onClose={handleCloseModal} onSubmit={handleSubmit} memory={editingMemory} isLoading={isMutating} />

      {!isLoading && (!displayMemories || displayMemories.length === 0) && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-mission-card border border-mission-border flex items-center justify-center">
            <span className="text-2xl">📝</span>
          </div>
          <h3 className="text-lg font-medium text-mission-text mb-1">
            {searchQuery ? 'No memories found' : 'No memories yet'}
          </h3>
          <p className="text-mission-muted">
            {searchQuery ? 'Try adjusting your search or filters' : 'Create your first memory to get started'}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Canonical Files tab ─────────────────────────────────────────────────────

const CanonicalFilesTab: FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [search, setSearch]                     = useState('')
  const [openFile, setOpenFile]                 = useState<CanonicalMemoryFile | null>(null)

  const { data: files, isLoading, error } = useCanonicalMemories()

  const categories = files
    ? ['all', ...Array.from(new Set(files.map((f) => f.category))).sort()]
    : ['all']

  const filtered = files?.filter((f) => {
    const matchCat  = selectedCategory === 'all' || f.category === selectedCategory
    const matchSearch = !search.trim() ||
      f.filename.toLowerCase().includes(search.toLowerCase()) ||
      f.content.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const getCatLabel = (cat: string) => {
    if (cat === 'all') return 'All'
    if (cat === 'root') return 'Shared'
    return cat.replace(/_/g, ' ')
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      {files && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-mission-card border border-mission-border rounded-xl p-4">
            <p className="text-2xl font-bold text-mission-text">{files.length}</p>
            <p className="text-sm text-mission-muted">Memory Files</p>
          </div>
          <div className="bg-mission-card border border-mission-border rounded-xl p-4">
            <p className="text-2xl font-bold text-primary-400">{categories.length - 1}</p>
            <p className="text-sm text-mission-muted">Categories</p>
          </div>
          <div className="bg-mission-card border border-mission-border rounded-xl p-4 col-span-2">
            <p className="text-sm text-mission-muted mb-1">Source</p>
            <p className="text-xs text-mission-text font-mono truncate">06_Agents/_Shared_Memory/</p>
          </div>
        </div>
      )}

      {/* Search + category filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mission-muted" />
          <input
            type="text"
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-mission-card border border-mission-border rounded-lg text-mission-text placeholder-mission-muted focus:outline-none focus:border-primary-500 transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-primary-600 text-white'
                  : 'bg-mission-card border border-mission-border text-mission-muted hover:text-mission-text'
              }`}
            >
              {getCatLabel(cat)}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <LoadingState message="Reading memory files..." />}

      {error && (
        <div className="bg-mission-card border border-mission-border rounded-xl p-8 text-center">
          <p className="text-rose-400">Failed to load canonical memory files</p>
          <p className="text-xs text-mission-muted mt-1">{error.message}</p>
        </div>
      )}

      {!isLoading && filtered && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((file) => (
            <CanonicalFileCard key={file.relativePath} file={file} onClick={() => setOpenFile(file)} />
          ))}
        </div>
      )}

      {!isLoading && filtered && filtered.length === 0 && (
        <div className="text-center py-12">
          <FolderOpen className="w-12 h-12 text-mission-muted mx-auto mb-3" />
          <p className="text-mission-muted">{search ? 'No files match your search' : 'No memory files found'}</p>
        </div>
      )}

      {openFile && <CanonicalFileModal file={openFile} onClose={() => setOpenFile(null)} />}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export const Memories: FC = () => {
  const [tab, setTab] = useState<'db' | 'files'>('db')

  const { data: files } = useCanonicalMemories()

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-mission-text">Memories</h2>
        <p className="text-mission-muted">Agent memories and shared knowledge files</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-mission-border">
        <button
          onClick={() => setTab('db')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'db'
              ? 'border-primary-500 text-primary-400'
              : 'border-transparent text-mission-muted hover:text-mission-text'
          }`}
        >
          <Database className="w-4 h-4" />
          DB Memories
        </button>
        <button
          onClick={() => setTab('files')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'files'
              ? 'border-primary-500 text-primary-400'
              : 'border-transparent text-mission-muted hover:text-mission-text'
          }`}
        >
          <FileText className="w-4 h-4" />
          Files
          {files && files.length > 0 && (
            <span className="text-xs bg-primary-500/20 text-primary-400 px-1.5 py-0.5 rounded-full">
              {files.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab content */}
      {tab === 'db'    && <DBMemoriesTab />}
      {tab === 'files' && <CanonicalFilesTab />}
    </div>
  )
}
