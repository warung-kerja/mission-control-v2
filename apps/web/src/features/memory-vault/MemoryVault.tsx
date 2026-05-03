import { FC, useMemo, useState } from 'react'
import {
  BookOpen,
  ChevronRight,
  Clock3,
  Database,
  FileText,
  Loader2,
  Search,
  Sparkles,
} from 'lucide-react'
import { useCanonicalMemories, type CanonicalMemoryFile } from '../../hooks/useCanonicalMemories'
import { useMemories, useMemoryStats, useSearchMemories, type Memory } from '../../hooks/useMemories'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatRelative(value: string) {
  const now = Date.now()
  const then = new Date(value).getTime()
  const diffMs = now - then
  const hours = Math.round(diffMs / 3600000)
  const days = Math.round(diffMs / 86400000)

  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function filePreview(file: CanonicalMemoryFile) {
  return file.content.replace(/^#.*\n/m, '').trim().slice(0, 180)
}

const categoryTone: Record<string, string> = {
  root: 'border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-300',
  Projects: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
  Decisions: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
  Lessons_Learned: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  Business_Plans: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
}

export const MemoryVault: FC = () => {
  const [query, setQuery] = useState('')
  const [openFile, setOpenFile] = useState<CanonicalMemoryFile | null>(null)
  const { data: files, isLoading: filesLoading, error: filesError } = useCanonicalMemories()
  const { data: memoryStats, isLoading: statsLoading } = useMemoryStats()
  const { data: runtimeMemories, isLoading: runtimeLoading } = useMemories()
  const { data: searchResults, isLoading: searchLoading } = useSearchMemories(query)

  const canonicalFiles = useMemo(() => {
    const list = files ?? []
    const filtered = !query.trim()
      ? list
      : list.filter((file) => {
          const haystack = `${file.filename} ${file.relativePath} ${file.content}`.toLowerCase()
          return haystack.includes(query.trim().toLowerCase())
        })

    return [...filtered].sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())
  }, [files, query])

  const runtimeList = useMemo(() => {
    if (query.trim().length >= 2) return searchResults ?? []
    return runtimeMemories ?? []
  }, [query, runtimeMemories, searchResults])

  const recentFiles = canonicalFiles.slice(0, 3)
  const recentRuntime = [...runtimeList].slice(0, 5)

  const canonicalCategories = useMemo(() => {
    const counts = canonicalFiles.reduce<Record<string, number>>((acc, file) => {
      acc[file.category] = (acc[file.category] || 0) + 1
      return acc
    }, {})

    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [canonicalFiles])

  const isLoading = filesLoading || statsLoading || runtimeLoading || searchLoading

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
          <div className="mb-2 flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-[0.22em]">
            <span className="border border-fuchsia-400/20 bg-fuchsia-400/10 px-2.5 py-1 text-fuchsia-300">canonical truth</span>
            <span className="border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-cyan-300">runtime memory</span>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">Memory vault</h3>
              <p className="mt-1 max-w-2xl text-sm text-mission-muted">
                Shared memory files first, runtime notes second — a single surface for what the system already knows.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-fuchsia-400/15 bg-fuchsia-400/[0.06] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-fuchsia-100/80">Shared files</p>
              <p className="mt-2 text-3xl font-semibold text-fuchsia-300">{files?.length ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.06] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">Runtime active</p>
              <p className="mt-2 text-3xl font-semibold text-cyan-300">{memoryStats?.active ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/80">Recent</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-300">{memoryStats?.recent ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.06] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-100/80">Archived</p>
              <p className="mt-2 text-3xl font-semibold text-amber-300">{memoryStats?.archived ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="h-4 w-4 text-cyan-300" />
            <h3 className="text-lg font-semibold">What we already know</h3>
          </div>
          <div className="mt-4 space-y-3">
            {recentFiles.length > 0 ? recentFiles.map((file) => (
              <button
                key={file.relativePath}
                onClick={() => setOpenFile(file)}
                className="w-full rounded-2xl border border-white/8 bg-[#07111f]/80 p-4 text-left transition-colors hover:border-white/15"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-white truncate">{file.filename}</p>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] ${categoryTone[file.category] ?? categoryTone.root}`}>
                    {file.category === 'root' ? 'shared' : file.category.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="mt-2 text-xs text-mission-muted">Updated {formatRelative(file.modifiedAt)}</p>
                <p className="mt-3 line-clamp-3 text-sm text-mission-text">{filePreview(file)}</p>
              </button>
            )) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#07111f]/60 p-4 text-sm text-mission-muted">
                No shared memory files surfaced yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mission-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search shared files and runtime memories..."
              className="w-full rounded-xl border border-white/8 bg-[#07111f]/70 py-2.5 pl-10 pr-4 text-sm text-mission-text placeholder:text-mission-muted focus:border-cyan-400/40 focus:outline-none"
            />
          </div>
          <p className="text-xs text-mission-muted">
            Source: canonical shared files + runtime memory DB
          </p>
        </div>

        {filesError && (
          <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/[0.06] p-4 text-sm text-rose-100">
            Failed to load canonical memory files: {filesError.message}
          </div>
        )}

        {isLoading ? (
          <div className="flex min-h-[220px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-mission-muted" />
          </div>
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-white">
                <BookOpen className="h-4 w-4 text-fuchsia-300" />
                <h3 className="text-lg font-semibold">Shared memory files</h3>
              </div>

              {canonicalFiles.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {canonicalFiles.slice(0, 8).map((file) => (
                    <button
                      key={file.relativePath}
                      onClick={() => setOpenFile(file)}
                      className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4 text-left transition-colors hover:border-white/15"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-fuchsia-400/10 p-2 text-fuchsia-300">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate font-medium text-white">{file.filename}</p>
                            <ChevronRight className="h-4 w-4 text-mission-muted" />
                          </div>
                          <p className="mt-1 text-xs text-mission-muted">{file.relativePath}</p>
                          <p className="mt-3 line-clamp-3 text-sm text-mission-text">{filePreview(file)}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-[#07111f]/60 p-6 text-sm text-mission-muted">
                  No shared files match this view.
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 text-white">
                <Database className="h-4 w-4 text-cyan-300" />
                <h3 className="text-lg font-semibold">Runtime memory</h3>
              </div>

              <div className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-mission-muted/70">Canonical categories</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {canonicalCategories.length > 0 ? canonicalCategories.slice(0, 6).map(([category, count]) => (
                    <span key={category} className={`rounded-full border px-2.5 py-1 text-[11px] ${categoryTone[category] ?? categoryTone.root}`}>
                      {category === 'root' ? 'shared' : category.replace(/_/g, ' ')} · {count}
                    </span>
                  )) : (
                    <span className="text-sm text-mission-muted">No categories available.</span>
                  )}
                </div>
              </div>

              {recentRuntime.length > 0 ? (
                <div className="space-y-3">
                  {recentRuntime.map((memory: Memory) => (
                    <div key={memory.id} className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-white">{memory.title}</p>
                          <p className="mt-1 text-xs text-mission-muted">
                            {memory.user?.name ?? 'Unknown'} · updated {formatRelative(memory.updatedAt)}
                          </p>
                        </div>
                        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] text-cyan-300">
                          {memory.category}
                        </span>
                      </div>
                      <p className="mt-3 line-clamp-3 text-sm text-mission-text">{memory.content}</p>
                      <div className="mt-3 flex items-center gap-3 text-xs text-mission-muted">
                        <span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{formatDate(memory.updatedAt)}</span>
                        <span>Importance {memory.importance}/5</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-[#07111f]/60 p-6 text-sm text-mission-muted">
                  No runtime memories match this view.
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {openFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpenFile(null)} />
          <div className="relative max-h-[80vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-[#08111d] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/8 p-5">
              <div>
                <h3 className="font-semibold text-white">{openFile.filename}</h3>
                <p className="mt-1 text-xs text-mission-muted">{openFile.relativePath} · {formatDate(openFile.modifiedAt)}</p>
              </div>
              <button
                onClick={() => setOpenFile(null)}
                className="rounded-lg border border-white/8 px-3 py-1.5 text-sm text-mission-muted transition-colors hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto p-5">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed text-mission-text">{openFile.content}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
