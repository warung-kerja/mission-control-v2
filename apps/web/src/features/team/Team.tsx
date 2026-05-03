import { FC, useMemo } from 'react'
import {
  AlertTriangle,
  ArrowDown,
  Loader2,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react'
import { useCanonicalTeam, type CanonicalTeamMember } from '../../hooks/useCanonical'

// ── helpers ──────────────────────────────────────────────────────────

const RESTRICTED_MODELS = ['google/gemini-3.1-flash-lite-preview']

function groupByParent(members: CanonicalTeamMember[]) {
  const independent = members.filter((m) => m.group === 'independent')
  const subagents = members.filter((m) => m.group === 'subagent')
  const ecosystem = members.filter((m) => m.group === 'ecosystem')

  const byParent = new Map<string, CanonicalTeamMember[]>()
  for (const m of subagents) {
    const parent = m.parentAgent ?? 'Unassigned'
    if (!byParent.has(parent)) byParent.set(parent, [])
    byParent.get(parent)!.push(m)
  }

  return { independent, byParent, ecosystem }
}

// ── component ────────────────────────────────────────────────────────

export const Team: FC = () => {
  const { data: canonicalTeam, isLoading } = useCanonicalTeam()

  const structure = useMemo(() => {
    const roster = canonicalTeam ?? []
    const { independent, byParent, ecosystem } = groupByParent(roster)

    // Find the human (Raz)
    const human = independent.find((m) => m.role.toLowerCase().includes('boss') || m.model === 'human')
    // Peer agents (reporting to Raz)
    const peers = independent.filter((m) => m !== human && !m.parentAgent)

    const restrictedAssignments = roster.filter((member) => RESTRICTED_MODELS.includes(member.model))

    return { roster, human, peers, byParent, ecosystem, restrictedAssignments }
  }, [canonicalTeam])

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center animate-fade-in">
        <Loader2 className="h-8 w-8 animate-spin text-mission-muted" />
      </div>
    )
  }

  const { roster, human, peers, byParent, ecosystem, restrictedAssignments } = structure

  if (roster.length === 0) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-10 animate-fade-in">
        <Users className="h-10 w-10 text-mission-muted" />
        <p className="mt-4 text-lg font-medium text-white">No crew data</p>
        <p className="mt-1 text-sm text-mission-muted">
          The canonical agent roster is unavailable. Check that AGENTS_ROSTER.md is readable.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── header ── */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium uppercase tracking-[0.22em]">
        <span className="border border-fuchsia-400/20 bg-fuchsia-400/10 px-2.5 py-1 text-fuchsia-300">canonical truth</span>
        <span className="border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-emerald-300">
          {roster.length} crew members
        </span>
      </div>

      {/* ── org chart ── */}
      <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Users className="h-4 w-4 text-fuchsia-300" />
          Crew structure
        </h2>
        <p className="mt-1 text-sm text-mission-muted">
          Peer-agent model. Raz at the top, independent agents reporting directly, sub-agents under their leads.
        </p>

        <div className="mt-8 space-y-8">
          {/* ── Raz (human) ── */}
          {human && (
            <div className="flex flex-col items-center">
              <AgentNode member={human} isHuman />
            </div>
          )}

          {/* ── connecting line ── */}
          <div className="flex justify-center">
            <ArrowDown className="h-6 w-6 text-mission-muted/40" />
          </div>

          {/* ── Peer agents (Baro, Noona, Obey) ── */}
          {peers.length > 0 && (
            <div className="flex flex-wrap justify-center gap-6">
              {peers.map((peer) => {
                const subs = byParent.get(peer.name) ?? []
                return (
                  <div key={peer.name} className="flex flex-col items-center gap-3">
                    <AgentNode member={peer} />
                    {subs.length > 0 && (
                      <>
                        <ArrowDown className="h-4 w-4 text-mission-muted/30" />
                        <div className="flex flex-wrap justify-center gap-2">
                          {subs.map((sub) => (
                            <AgentNode key={sub.name} member={sub} isSub />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Ecosystem ── */}
          {ecosystem.length > 0 && (
            <>
              <div className="flex justify-center">
                <ArrowDown className="h-6 w-6 text-mission-muted/30" />
              </div>
              <div>
                <p className="mb-3 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-purple-300/70">
                  Ecosystem
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  {ecosystem.map((m) => (
                    <AgentNode key={m.name} member={m} isEcosystem />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── model policy watch ── */}
      <div className={`rounded-3xl border p-6 shadow-[0_20px_80px_rgba(0,0,0,0.25)] ${
        restrictedAssignments.length > 0
          ? 'border-rose-400/20 bg-rose-400/[0.05]'
          : 'border-emerald-400/15 bg-emerald-400/[0.04]'
      }`}
      >
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          {restrictedAssignments.length > 0 ? (
            <AlertTriangle className="h-4 w-4 text-rose-300" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
          )}
          Restricted model watch
        </h2>
        <p className="mt-1 text-sm text-mission-muted">
          Canonical roster check for models Raz has explicitly blocked for agents or cron work.
        </p>
        <div className="mt-4 rounded-2xl border border-white/8 bg-[#07111f]/70 p-4">
          {restrictedAssignments.length > 0 ? (
            <div>
              <p className="text-sm font-medium text-rose-200">Restricted model assignment detected</p>
              <ul className="mt-2 space-y-1 text-sm text-rose-100/80">
                {restrictedAssignments.map((member) => (
                  <li key={member.name}>{member.name} → <code>{member.model}</code></li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-emerald-200">
              Clear — no canonical roster member is assigned to <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[11px]">google/gemini-3.1-flash-lite-preview</code>.
            </p>
          )}
        </div>
      </div>

      {/* ── roster detail table ── */}
      <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Wrench className="h-4 w-4 text-cyan-300" />
          Full roster detail
        </h2>
        <p className="mt-1 text-sm text-mission-muted">
          Every tracked agent with model, role, and reporting line.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-left text-[11px] uppercase tracking-[0.15em] text-mission-muted">
                <th className="pb-3 pr-4 font-medium">Agent</th>
                <th className="pb-3 pr-4 font-medium">Role</th>
                <th className="pb-3 pr-4 font-medium">Model</th>
                <th className="pb-3 pr-4 font-medium">Group</th>
                <th className="pb-3 pr-4 font-medium">Reports to</th>
                <th className="pb-3 font-medium">Workspace</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((member) => (
                <tr
                  key={member.name}
                  className="border-b border-white/5 transition-colors hover:bg-white/[0.02]"
                >
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                          member.model === 'human'
                            ? 'bg-amber-400/15 text-amber-300'
                            : member.group === 'independent'
                              ? 'bg-fuchsia-400/15 text-fuchsia-300'
                              : 'bg-cyan-400/15 text-cyan-300'
                        }`}
                      >
                        {member.name.charAt(0)}
                      </span>
                      <span className="font-medium text-white">{member.name}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-mission-text">{member.role}</td>
                  <td className="py-3 pr-4">
                    <code className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[11px] text-mission-muted">
                      {member.model}
                    </code>
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                        member.group === 'independent'
                          ? 'border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-300'
                          : member.group === 'ecosystem'
                            ? 'border-purple-400/20 bg-purple-400/10 text-purple-300'
                            : 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300'
                      }`}
                    >
                      {member.group === 'independent' ? 'Independent' : member.group === 'ecosystem' ? 'Ecosystem' : 'Sub-agent'}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-mission-muted">
                    {member.parentAgent ?? (member.model === 'human' ? '—' : 'Raz')}
                  </td>
                  <td className="py-3 text-mission-muted text-[11px]">
                    {member.agentPath ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── sub-component: agent node ─────────────────────────────────────────

const AgentNode: FC<{
  member: CanonicalTeamMember
  isHuman?: boolean
  isSub?: boolean
  isEcosystem?: boolean
}> = ({ member, isHuman, isSub, isEcosystem }) => {
  const size = isSub ? 'sm' : isEcosystem ? 'sm' : 'md'
  const borderRing = isHuman
    ? 'border-amber-400/30 ring-2 ring-amber-400/20'
    : isEcosystem
      ? 'border-purple-400/20 ring-1 ring-purple-400/10'
      : isSub
        ? 'border-cyan-400/20 ring-1 ring-cyan-400/10'
        : 'border-fuchsia-400/30 ring-2 ring-fuchsia-400/15'

  const bg = isHuman
    ? 'bg-amber-400/[0.08]'
    : isEcosystem
      ? 'bg-purple-400/[0.05]'
      : isSub
        ? 'bg-cyan-400/[0.05]'
        : 'bg-fuchsia-400/[0.06]'

  return (
    <div
      className={`rounded-2xl border ${borderRing} ${bg} px-4 py-3 transition-all hover:border-white/15 ${
        size === 'sm' ? 'min-w-[160px] max-w-[200px]' : 'min-w-[200px] max-w-[260px]'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            isHuman
              ? 'bg-amber-400/20 text-amber-300'
              : isEcosystem
                ? 'bg-purple-400/15 text-purple-300'
                : isSub
                  ? 'bg-cyan-400/15 text-cyan-300'
                  : 'bg-fuchsia-400/15 text-fuchsia-300'
          }`}
        >
          {member.name.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{member.name}</p>
          <p className="text-[11px] text-mission-muted truncate">{member.role}</p>
        </div>
      </div>
      {!isHuman && (
        <p className="mt-2 text-[10px] font-mono text-mission-muted/60 truncate">
          {member.model}
        </p>
      )}
    </div>
  )
}
