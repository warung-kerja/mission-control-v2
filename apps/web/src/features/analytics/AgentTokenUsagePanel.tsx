import { FC, useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Gauge, Zap } from 'lucide-react'
import { type TokenUsageData, type TokenUsageTotal } from '../../hooks/useAnalytics'

const KNOWN_SUB_AGENTS = new Set(['jen', 'haji', 'lin', 'bob', 'soba', 'claude'])

const formatTokens = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`
  return value.toLocaleString()
}

const formatChartDate = (iso: string) => {
  const [, month, day] = iso.split('-')
  return `${day}/${month}`
}

const TokenUsageTooltip: FC<{ active?: boolean; payload?: Array<{ name: string; value: number; color?: string }>; label?: string }> = ({ active, payload, label }) => {
  if (!active || !payload?.length || !label) return null

  const rows = payload
    .filter((item) => Number(item.value) > 0)
    .sort((a, b) => Number(b.value) - Number(a.value))
  const total = rows.reduce((sum, item) => sum + Number(item.value), 0)

  return (
    <div className="rounded-xl border border-mission-border bg-mission-bg/95 px-3 py-2 shadow-xl backdrop-blur">
      <p className="text-xs font-semibold text-mission-text">{formatChartDate(label)}</p>
      <p className="mb-2 text-[11px] text-mission-muted">{formatTokens(total)} tokens total</p>
      <div className="space-y-1">
        {rows.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-5 text-xs">
            <span className="flex items-center gap-2 capitalize text-mission-muted">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              {item.name}
            </span>
            <span className="font-mono text-mission-text">{formatTokens(Number(item.value))}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const AgentTokenRow: FC<{ agent: TokenUsageTotal; max: number }> = ({ agent, max }) => {
  const width = max > 0 ? Math.max((agent.totalTokens / max) * 100, agent.totalTokens > 0 ? 3 : 0) : 0

  return (
    <div className="group space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: agent.color }} />
          <span className="truncate font-medium capitalize text-mission-text">{agent.agent}</span>
          <span className="text-xs text-mission-muted">{agent.turns} turns</span>
        </div>
        <div className="flex flex-shrink-0 items-baseline gap-2">
          <span className="font-mono text-sm text-mission-text">{formatTokens(agent.totalTokens)}</span>
          <span className="hidden text-[11px] text-mission-muted sm:inline">avg {formatTokens(agent.averageTokensPerTurn)}</span>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-mission-border">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out group-hover:brightness-125"
          style={{ width: `${width}%`, backgroundColor: agent.color }}
        />
      </div>
    </div>
  )
}

export const AgentTokenUsagePanel: FC<{ data?: TokenUsageData; isLoading: boolean; period: string }> = ({ data, isLoading, period }) => {
  const totals = data?.totals ?? []
  const series = data?.series ?? []
  const agents = data?.agents ?? []
  const topAgent = totals[0]
  const totalTokens = totals.reduce((sum, agent) => sum + agent.totalTokens, 0)
  const totalTurns = totals.reduce((sum, agent) => sum + agent.turns, 0)
  const maxAgentTotal = Math.max(...totals.map((agent) => agent.totalTokens), 1)
  const subAgentTotals = totals.filter((agent) => KNOWN_SUB_AGENTS.has(agent.agent.toLowerCase()))
  const activeSubAgents = subAgentTotals.filter((agent) => agent.totalTokens > 0)
  const idleSubAgents = subAgentTotals.filter((agent) => agent.totalTokens === 0)

  const agentColor = useMemo(() => {
    return totals.reduce<Record<string, string>>((acc, agent) => {
      acc[agent.agent] = agent.color
      return acc
    }, {})
  }, [totals])

  return (
    <section className="rounded-2xl border border-mission-border bg-mission-card p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-mission-text">Agent & Sub-Agent Token Burn</h3>
            <span className="rounded-full border border-mission-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-mission-muted">
              model-agnostic
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-mission-muted">
            Daily tokens by every agent and sub-agent, grouped regardless of model, so we can spot who is using the most context and optimise behaviour.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-right">
          <div>
            <p className="font-mono text-lg font-semibold text-mission-text">{formatTokens(totalTokens)}</p>
            <p className="text-[11px] uppercase tracking-wide text-mission-muted">tokens</p>
          </div>
          <div>
            <p className="font-mono text-lg font-semibold text-mission-text">{totalTurns}</p>
            <p className="text-[11px] uppercase tracking-wide text-mission-muted">turns</p>
          </div>
          <div>
            <p className="font-mono text-lg font-semibold text-mission-text capitalize">{topAgent?.agent ?? '—'}</p>
            <p className="text-[11px] uppercase tracking-wide text-mission-muted">top user</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[1.8fr_1fr]">
          <div className="h-72 animate-pulse rounded-xl bg-mission-border/40" />
          <div className="space-y-3">
            {[0, 1, 2, 3].map((item) => <div key={item} className="h-12 animate-pulse rounded-lg bg-mission-border/40" />)}
          </div>
        </div>
      ) : !data?.sourceAvailable ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 text-sm text-amber-200">
          Token source is not available yet. Expected OpenClaw agent sessions at {data?.sourcePath ?? '~/.openclaw/agents'}.
        </div>
      ) : agents.length === 0 ? (
        <div className="rounded-xl border border-mission-border bg-mission-bg/40 p-8 text-center">
          <Zap className="mx-auto mb-3 h-6 w-6 text-mission-muted" />
          <p className="text-sm font-medium text-mission-text">No token usage found for any agent in the last {period} days</p>
          <p className="mt-1 text-xs text-mission-muted">New OpenClaw runs will appear here after they write session usage logs.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.8fr_1fr]">
          <div className="min-h-72">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatChartDate}
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(value) => formatTokens(Number(value))}
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip content={<TokenUsageTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }} />
                {agents.map((agent) => (
                  <Bar
                    key={agent}
                    dataKey={agent}
                    stackId="tokens"
                    fill={agentColor[agent] ?? '#94A3B8'}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={54}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-mission-border bg-mission-bg/30 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-mission-muted">Usage ranking</p>
              <div className="space-y-4">
                {totals.map((agent) => (
                  <AgentTokenRow key={agent.agent} agent={agent} max={maxAgentTotal} />
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-mission-border bg-mission-bg/30 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-mission-muted">Sub-agent breakdown</p>
                <span className="font-mono text-[11px] text-mission-muted">{activeSubAgents.length}/{subAgentTotals.length} active</span>
              </div>
              <div className="space-y-2">
                {subAgentTotals.map((agent) => (
                  <div key={agent.agent} className="flex items-center justify-between gap-3 rounded-lg border border-mission-border/60 bg-mission-card/40 px-3 py-2 text-xs">
                    <span className="flex min-w-0 items-center gap-2 capitalize text-mission-text">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: agent.color }} />
                      {agent.agent}
                    </span>
                    <span className={agent.totalTokens > 0 ? 'font-mono text-mission-text' : 'font-mono text-mission-muted'}>
                      {agent.totalTokens > 0 ? formatTokens(agent.totalTokens) : 'idle'}
                    </span>
                  </div>
                ))}
                {subAgentTotals.length === 0 && (
                  <p className="text-xs text-mission-muted">No sub-agent session directories found yet.</p>
                )}
              </div>
              {idleSubAgents.length > 0 && (
                <p className="mt-3 text-[11px] leading-relaxed text-mission-muted">
                  Idle means the agent exists but has no token-bearing session logs in this selected window.
                </p>
              )}
            </div>
            <p className="text-[11px] leading-relaxed text-mission-muted">
              Source: OpenClaw session logs. Totals include input, output, cache read and cache write tokens when reported by the provider.
            </p>
          </div>
        </div>
      )}
    </section>
  )
}

