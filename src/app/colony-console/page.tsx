'use client'

import { useCallback, useEffect, useState } from 'react'

type HealthResp = { status?: string; uptime_seconds?: number; __error?: string }
type InfoResp = Record<string, unknown> & { __error?: string }
type ManifestResp = { endpoints?: string[]; capabilities?: string[]; __error?: string }
type Agent = { agent_id?: string; name?: string; status?: string }
type AgentsResp = Agent[] | { __error: string }

const POLL_MS = 30_000

function formatUptime(s?: number) {
  if (s === undefined || s === null) return '—'
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
}

async function fetchJSON<T>(path: string): Promise<T> {
  try {
    const r = await fetch(path, { cache: 'no-store', signal: AbortSignal.timeout(8000) })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return (await r.json()) as T
  } catch (e) {
    return { __error: e instanceof Error ? e.message : String(e) } as T
  }
}

export default function ColonyConsolePage() {
  const [health, setHealth] = useState<HealthResp>({})
  const [info, setInfo] = useState<InfoResp>({})
  const [manifest, setManifest] = useState<ManifestResp>({})
  const [agents, setAgents] = useState<AgentsResp>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string>('—')

  const refresh = useCallback(async () => {
    setLoading(true)
    const [h, i, m, a] = await Promise.all([
      fetchJSON<HealthResp>('/api/colony/health'),
      fetchJSON<InfoResp>('/api/colony/info'),
      fetchJSON<ManifestResp>('/api/colony/manifest'),
      fetchJSON<AgentsResp>('/api/colony/agents'),
    ])
    setHealth(h)
    setInfo(i)
    setManifest(m)
    setAgents(a)
    setLastUpdated(new Date().toLocaleTimeString())
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, POLL_MS)
    return () => clearInterval(id)
  }, [refresh])

  const errored = Boolean(health.__error)
  const healthy = !errored && health.status === 'healthy'
  const statusClass = errored ? 'unreachable' : healthy ? 'healthy' : 'loading'
  const agentsErrored = !Array.isArray(agents)

  return (
    <div className="console-root">
      <style>{`
        :root {
          --bg:#0a0e1a; --panel:#0f1523; --border:#1a2540; --accent:#6366f1;
          --success:#22c55e; --warning:#eab308; --danger:#ef4444; --text:#e2e8f0;
          --muted:#64748b; --dim:#334155;
        }
        .console-root { background:var(--bg); color:var(--text); font-family:ui-monospace,'Cascadia Code','Fira Code',monospace; font-size:13px; min-height:100vh; }
        .console-header { padding:20px 24px 16px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:12px; }
        .console-logo { font-size:22px; line-height:1; }
        h1 { font-size:16px; font-weight:700; letter-spacing:.04em; margin:0; }
        .subtitle { font-size:11px; color:var(--muted); margin-top:2px; }
        .header-right { margin-left:auto; text-align:right; }
        .timestamp { font-size:10px; color:var(--dim); }
        main { padding:24px; max-width:900px; }
        .status-banner { display:flex; align-items:center; gap:16px; padding:16px; background:var(--panel); border:1px solid var(--border); border-radius:8px; margin-bottom:24px; }
        .status-dot { width:12px; height:12px; border-radius:50%; flex-shrink:0; }
        .status-dot.healthy { background:var(--success); animation:pulse 2s infinite; }
        .status-dot.unreachable { background:var(--danger); }
        .status-dot.loading { background:var(--dim); animation:pulse 1s infinite; }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.35; } }
        .status-text { font-size:15px; font-weight:700; }
        .status-text.healthy { color:var(--success); }
        .status-text.unreachable { color:var(--danger); }
        .status-text.loading { color:var(--muted); }
        .refresh-btn { margin-left:auto; background:var(--accent); color:#fff; border:none; border-radius:5px; padding:6px 14px; font-family:inherit; font-size:11px; cursor:pointer; }
        .refresh-btn:hover { background:#4f52d0; }
        .panel-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:16px; }
        .panel-card { background:var(--panel); border:1px solid var(--border); border-radius:8px; padding:16px; }
        .panel-title { font-size:11px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); margin-bottom:10px; }
        .kv { display:grid; grid-template-columns:100px 1fr; gap:4px 8px; font-size:11px; }
        .kv dt { color:var(--muted); }
        .kv dd { color:var(--text); word-break:break-word; }
        .agents-list { list-style:none; font-size:11px; padding:0; margin:0; }
        .agents-list li { padding:4px 0; border-bottom:1px solid #0a0e1a; }
        .agents-list li:last-child { border-bottom:none; }
        .empty-note { color:var(--dim); font-size:11px; }
        footer { margin-top:28px; padding:0 24px 24px; font-size:10px; color:var(--dim); }
      `}</style>

      <header className="console-header">
        <span className="console-logo" aria-hidden>⬡</span>
        <div>
          <h1>AETHER — COLONY CONSOLE</h1>
          <p className="subtitle">Commerce colony · Sovereign Hive federation</p>
        </div>
        <div className="header-right">
          <div className="timestamp">{lastUpdated === '—' ? '—' : `updated ${lastUpdated}`}</div>
        </div>
      </header>

      <main>
        <div className="status-banner" role="status" aria-live="polite">
          <span className={`status-dot ${statusClass}`} />
          <span className={`status-text ${statusClass}`}>
            {errored ? `unreachable — ${health.__error}` : `${health.status ?? 'checking…'}${
              health.uptime_seconds !== undefined ? ` · uptime ${formatUptime(health.uptime_seconds)}` : ''
            }`}
          </span>
          <button className="refresh-btn" onClick={refresh} disabled={loading}>
            {loading ? '↻ Checking…' : '↻ Refresh'}
          </button>
        </div>

        <div className="panel-grid">
          <div className="panel-card">
            <div className="panel-title">Identity</div>
            <dl className="kv">
              {info.__error ? (
                <>
                  <dt>error</dt>
                  <dd>{info.__error}</dd>
                </>
              ) : (
                Object.entries(info).map(([k, v]) => (
                  <span key={k} style={{ display: 'contents' }}>
                    <dt>{k}</dt>
                    <dd>{Array.isArray(v) ? v.join(', ') : String(v)}</dd>
                  </span>
                ))
              )}
            </dl>
          </div>

          <div className="panel-card">
            <div className="panel-title">Manifest</div>
            <dl className="kv">
              {manifest.__error ? (
                <>
                  <dt>error</dt>
                  <dd>{manifest.__error}</dd>
                </>
              ) : (
                <>
                  <dt>endpoints</dt>
                  <dd>{(manifest.endpoints ?? []).join(', ')}</dd>
                  <dt>capabilities</dt>
                  <dd>{(manifest.capabilities ?? []).join(', ')}</dd>
                </>
              )}
            </dl>
          </div>

          <div className="panel-card">
            <div className="panel-title">Agents</div>
            <ul className="agents-list">
              {agentsErrored ? (
                <li className="empty-note">{(agents as { __error: string }).__error}</li>
              ) : agents.length ? (
                agents.map((a, idx) => (
                  <li key={a.agent_id ?? idx}>
                    {a.name ?? a.agent_id} — {a.status}
                  </li>
                ))
              ) : (
                <li className="empty-note">No active agents.</li>
              )}
            </ul>
          </div>
        </div>
      </main>

      <footer>Sovereign Hive Colony Standard Layer · Auto-refresh every 30s</footer>
    </div>
  )
}
