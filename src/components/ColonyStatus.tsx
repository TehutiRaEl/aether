'use client';

import { useEffect, useState, useCallback } from 'react';

interface ColonyHealth {
  status: 'healthy' | 'degraded' | string;
  colony: string;
  role?: string;
  uptime_seconds?: number;
  soul_md_hash?: string;
  timestamp?: string;
  db?: string;
}

interface ColonyStatusProps {
  colonyId: string;
  colonyName: string;
  healthUrl?: string;
  pollIntervalMs?: number;
  className?: string;
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function ColonyStatus({
  colonyId,
  colonyName,
  healthUrl,
  pollIntervalMs = 30_000,
  className = '',
}: ColonyStatusProps) {
  const url = healthUrl ?? `/colony/health`;
  const [data, setData] = useState<ColonyHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ColonyHealth = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unreachable');
      setData(null);
    } finally {
      setLoading(false);
      setLastChecked(new Date());
    }
  }, [url]);

  useEffect(() => {
    fetchHealth();
    const id = setInterval(fetchHealth, pollIntervalMs);
    return () => clearInterval(id);
  }, [fetchHealth, pollIntervalMs]);

  const status = error ? 'unreachable' : (data?.status ?? 'unknown');
  const isHealthy = status === 'healthy';
  const isDegraded = status === 'degraded';

  const statusColor = isHealthy
    ? '#22c55e'
    : isDegraded
    ? '#eab308'
    : '#ef4444';

  const statusBg = isHealthy
    ? 'rgba(34,197,94,0.1)'
    : isDegraded
    ? 'rgba(234,179,8,0.1)'
    : 'rgba(239,68,68,0.1)';

  return (
    <article
      className={className}
      aria-label={`Colony status: ${colonyName}`}
      style={{
        border: `1px solid ${statusColor}40`,
        borderRadius: '8px',
        padding: '16px',
        background: '#0f1117',
        minWidth: '220px',
        fontFamily: 'ui-monospace, monospace',
        fontSize: '12px',
      }}
    >
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span
          role="img"
          aria-label={status}
          style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: statusColor,
            flexShrink: 0,
            ...(isHealthy ? { animation: 'pulse 2s infinite' } : {}),
          }}
        />
        <strong style={{ color: '#e2e8f0', fontSize: '13px' }}>{colonyName}</strong>
        <code style={{ color: '#64748b', marginLeft: 'auto', fontSize: '10px' }}>{colonyId}</code>
      </header>

      {/* Status badge */}
      <div
        role="status"
        aria-live="polite"
        aria-label={`Status: ${status}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '4px',
          background: statusBg,
          color: statusColor,
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}
      >
        {loading ? 'checking…' : status}
      </div>

      {/* Details */}
      {data && (
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px' }}>
          {data.uptime_seconds !== undefined && (
            <>
              <dt style={{ color: '#64748b' }}>uptime</dt>
              <dd style={{ margin: 0, color: '#94a3b8' }}>{formatUptime(data.uptime_seconds)}</dd>
            </>
          )}
          {data.role && (
            <>
              <dt style={{ color: '#64748b' }}>role</dt>
              <dd style={{ margin: 0, color: '#94a3b8' }}>{data.role}</dd>
            </>
          )}
          {data.db && (
            <>
              <dt style={{ color: '#64748b' }}>db</dt>
              <dd style={{ margin: 0, color: data.db === 'ok' ? '#22c55e' : '#ef4444' }}>{data.db}</dd>
            </>
          )}
          {data.soul_md_hash && (
            <>
              <dt style={{ color: '#64748b' }}>soul</dt>
              <dd style={{ margin: 0, color: '#94a3b8', fontFamily: 'monospace' }}>
                {data.soul_md_hash.slice(0, 12)}…
              </dd>
            </>
          )}
        </dl>
      )}

      {error && (
        <p role="alert" style={{ margin: '8px 0 0', color: '#ef4444', fontSize: '11px' }}>
          {error}
        </p>
      )}

      {lastChecked && (
        <p style={{ margin: '8px 0 0', color: '#334155', fontSize: '10px' }}>
          checked {lastChecked.toLocaleTimeString()}
        </p>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </article>
  );
}
