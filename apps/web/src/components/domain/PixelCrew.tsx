import { FC, useMemo } from 'react'
import { useCanonicalTeam, type CanonicalTeamMember } from '../../hooks/useCanonical'

// ── Pixel-art character definitions ───────────────────────────────────
//
// Each character is a grid of on/off cells, rendered via box-shadow.
// Characters are 8×8 pixels, scaled up via CSS.
// This is pure CSS — zero external assets.

type PixelGrid = number[][] // 1 = lit, 0 = dark

interface PixelCharacter {
  role: string // matched against member.role.toLowerCase() substring
  grid: PixelGrid
}

// 8×8 pixel character designs
const CHARACTERS: PixelCharacter[] = [
  // 👤 Boss / Human — standing figure, crown-like top
  {
    role: 'boss',
    grid: [
      [0,0,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,0],
      [0,0,1,0,0,1,0,0],
      [0,0,1,1,1,1,0,0],
      [0,0,0,1,1,0,0,0],
      [0,0,1,0,0,1,0,0],
      [0,1,0,0,0,0,1,0],
      [0,1,1,1,1,1,1,0],
    ],
  },
  // 🧠 Creative Lead / Designer — head with ideas (antenna)
  {
    role: 'creative',
    grid: [
      [0,0,0,1,1,0,0,0],
      [0,0,1,0,0,1,0,0],
      [0,1,0,1,1,0,1,0],
      [0,1,1,1,1,1,1,0],
      [0,0,1,0,0,1,0,0],
      [0,0,1,1,1,1,0,0],
      [0,0,1,0,0,1,0,0],
      [0,1,0,0,0,0,1,0],
    ],
  },
  // 👨‍💻 Tech Lead / Developer — glasses, squared
  {
    role: 'tech',
    grid: [
      [0,0,1,1,1,1,0,0],
      [0,1,0,0,0,0,1,0],
      [1,1,0,1,0,1,1,1],
      [0,1,1,1,1,1,1,0],
      [0,1,0,1,0,1,0,0],
      [0,1,1,0,0,1,1,0],
      [0,1,0,0,0,0,1,0],
      [0,1,1,0,0,1,1,0],
    ],
  },
  // 🤖 Agent / General — robot-like face
  {
    role: 'agent',
    grid: [
      [0,0,1,1,1,1,0,0],
      [0,1,0,0,0,0,1,0],
      [1,0,1,0,0,1,0,1],
      [1,0,1,1,1,1,0,1],
      [0,1,0,0,0,0,1,0],
      [0,0,1,1,1,1,0,0],
      [0,0,1,0,0,1,0,0],
      [0,1,0,0,0,0,1,0],
    ],
  },
  // 🎨 Design / Art — paint-like pattern
  {
    role: 'design',
    grid: [
      [0,0,0,1,1,0,0,0],
      [0,0,1,0,0,1,0,0],
      [0,1,0,1,1,0,1,0],
      [0,1,0,1,0,0,1,0],
      [0,1,0,1,1,0,1,0],
      [0,1,1,0,0,1,1,0],
      [0,1,1,1,1,1,1,0],
      [0,1,0,0,0,0,1,0],
    ],
  },
  // 📊 Trends / Research — magnifying glass eye
  {
    role: 'trends',
    grid: [
      [0,1,1,1,1,1,0,0],
      [1,0,1,1,1,0,1,0],
      [1,1,0,1,0,1,1,0],
      [1,1,1,0,1,1,1,0],
      [0,1,1,1,0,1,0,0],
      [0,0,1,0,0,0,1,0],
      [0,0,0,1,0,0,1,0],
      [0,0,0,0,1,1,0,0],
    ],
  },
  // 🛠️ Ops / Operations — wrench-like
  {
    role: 'ops',
    grid: [
      [0,1,0,0,0,0,1,0],
      [0,0,1,0,0,1,0,0],
      [0,0,1,1,1,1,0,0],
      [0,0,0,1,1,0,0,0],
      [0,0,0,1,1,0,0,0],
      [0,0,0,1,1,0,0,0],
      [0,1,1,0,0,1,1,0],
      [0,1,0,0,0,0,1,0],
    ],
  },
  // 🔬 Research / Analysis — beaker/brain
  {
    role: 'research',
    grid: [
      [0,0,1,1,1,1,0,0],
      [0,1,0,0,0,0,1,0],
      [0,1,0,1,1,0,1,0],
      [0,1,0,1,1,0,1,0],
      [0,1,0,1,1,0,1,0],
      [0,0,1,0,0,1,0,0],
      [0,0,0,1,1,0,0,0],
      [0,0,0,1,1,0,0,0],
    ],
  },
  // 🪄 Default / unknown — sprite question-mark
  {
    role: 'default',
    grid: [
      [0,0,1,1,1,0,0,0],
      [0,1,0,0,0,1,0,0],
      [0,0,0,0,1,0,1,0],
      [0,0,0,1,0,1,0,0],
      [0,0,0,1,0,0,0,0],
      [0,0,0,1,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,1,0,0,0,0],
    ],
  },
]

// ── Color palette per member group ────────────────────────────────────

const GROUP_COLORS: Record<string, { lit: string; dark: string; glow: string; accent: string }> = {
  human: {
    lit: '#fbbf24',
    dark: '#78350f',
    glow: 'rgba(251,191,36,0.5)',
    accent: 'border-amber-400/30',
  },
  boss: {
    lit: '#fbbf24',
    dark: '#78350f',
    glow: 'rgba(251,191,36,0.5)',
    accent: 'border-amber-400/30',
  },
  independent: {
    lit: '#e879f9',
    dark: '#4a1942',
    glow: 'rgba(232,121,249,0.5)',
    accent: 'border-fuchsia-400/25',
  },
  subagent: {
    lit: '#22d3ee',
    dark: '#0c3d47',
    glow: 'rgba(34,211,238,0.5)',
    accent: 'border-cyan-400/25',
  },
  ecosystem: {
    lit: '#c084fc',
    dark: '#2e1065',
    glow: 'rgba(192,132,252,0.5)',
    accent: 'border-purple-400/25',
  },
}

const DEFAULT_COLORS = GROUP_COLORS.subagent

// ── helpers ──────────────────────────────────────────────────────────

function matchCharacter(member: CanonicalTeamMember): PixelGrid {
  const roleLower = member.role.toLowerCase()
  const modelLower = member.model.toLowerCase()

  // Human gets the boss sprite
  if (modelLower === 'human' || roleLower.includes('boss')) {
    const char = CHARACTERS.find((c) => c.role === 'boss')!
    return char.grid
  }

  for (const char of CHARACTERS) {
    if (char.role === 'default' || char.role === 'boss') continue
    if (roleLower.includes(char.role)) return char.grid
  }

  // Try name-based matching
  const nameLower = member.name.toLowerCase()
  for (const char of CHARACTERS) {
    if (char.role === 'default' || char.role === 'boss') continue
    if (nameLower.includes(char.role)) return char.grid
  }

  return CHARACTERS.find((c) => c.role === 'default')!.grid
}

function getColors(member: CanonicalTeamMember) {
  // Human detection
  if (member.model === 'human' || member.role.toLowerCase().includes('boss')) {
    return GROUP_COLORS.human
  }
  return GROUP_COLORS[member.group] ?? DEFAULT_COLORS
}

// ── PixelGrid sub-component ──────────────────────────────────────────

const PixelSprite: FC<{ grid: PixelGrid; colors: { lit: string; dark: string; glow: string }; scale?: number }> = ({
  grid,
  colors,
  scale = 3,
}) => {
  // Build box-shadow string for all lit pixels
  const shadows: string[] = []
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] === 1) {
        shadows.push(`${x * scale}px ${y * scale}px 0 ${colors.lit}`)
      }
    }
  }

  const pixelSize = scale
  const gridW = grid[0].length * pixelSize
  const gridH = grid.length * pixelSize

  return (
    <div className="relative shrink-0" style={{ width: gridW, height: gridH }}>
      {/* Base dark grid */}
      <div
        className="absolute inset-0 rounded-sm"
        style={{
          backgroundColor: colors.dark,
          width: gridW,
          height: gridH,
        }}
      />
      {/* Lit pixels */}
      <div
        className="absolute"
        style={{
          width: pixelSize,
          height: pixelSize,
          boxShadow: shadows.join(', '),
          borderRadius: '1px',
        }}
      />
      {/* Glow overlay */}
      <div
        className="absolute inset-0 rounded-sm opacity-40"
        style={{
          boxShadow: `inset 0 0 ${pixelSize * 2}px ${colors.glow}`,
        }}
      />
    </div>
  )
}

// ── Crew tile sub-component ──────────────────────────────────────────

const CrewTile: FC<{
  member: CanonicalTeamMember
  index: number
  total: number
}> = ({ member, index }) => {
  const grid = useMemo(() => matchCharacter(member), [member])
  const colors = useMemo(() => getColors(member), [member])
  const initials = member.name.charAt(0)

  return (
    <div
      className={`group relative rounded-2xl border ${colors.accent} bg-[#07111f]/80 p-4 transition-all hover:border-white/15 hover:bg-[#0a1628]`}
      style={{
        animationDelay: `${index * 80}ms`,
        animation: 'fadeInUp 0.4s ease-out both',
      }}
    >
      {/* Pixel sprite */}
      <div className="flex justify-center mb-3">
        <PixelSprite grid={grid} colors={colors} scale={3} />
      </div>

      {/* Name + role */}
      <div className="text-center min-w-0">
        <p className="text-sm font-semibold text-white truncate group-hover:text-white/90 transition-colors">
          {member.name}
        </p>
        <p className="text-[10px] text-mission-muted/70 mt-0.5 truncate">{member.role}</p>
      </div>

      {/* Group badge */}
      <div className="mt-2 flex justify-center">
        <span
          className="rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider"
          style={{
            borderColor: colors.lit + '33',
            color: colors.lit,
            backgroundColor: colors.lit + '11',
          }}
        >
          {member.model === 'human' ? 'Human' : member.group === 'independent' ? 'Lead' : member.group}
        </span>
      </div>

      {/* Initials overlay on hover */}
      <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <span
          className="text-3xl font-black tracking-tight"
          style={{ color: colors.lit }}
        >
          {initials}
        </span>
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────

export const PixelCrew: FC = () => {
  const { data: canonicalTeam, isLoading } = useCanonicalTeam()

  const roster = canonicalTeam ?? []

  // Sort: human first, then independent, subagents, ecosystem
  const sorted = useMemo(() => {
    const order = { human: 0, independent: 1, subagent: 2, ecosystem: 3 }
    return [...roster].sort((a, b) => {
      const aOrd = a.model === 'human' ? 0 : order[a.group] ?? 99
      const bOrd = b.model === 'human' ? 0 : order[b.group] ?? 99
      return aOrd - bOrd
    })
  }, [roster])

  if (isLoading || roster.length === 0) {
    return null
  }

  return (
    <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <span className="text-base">🕹️</span>
            Pixel crew
          </h3>
          <p className="mt-1 text-sm text-mission-muted">
            8-bit avatars mapped from the canonical roster. No generic circles.
          </p>
        </div>
        <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-xs text-mission-muted">
          {sorted.length} sprites
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {sorted.map((member, idx) => (
          <CrewTile key={member.name} member={member} index={idx} total={sorted.length} />
        ))}
      </div>

      {/* Inline keyframe for staggered animation */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  )
}
