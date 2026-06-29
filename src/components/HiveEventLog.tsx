'use client';

import { useEffect, useRef, useState } from 'react';

export interface HiveEvent {
  event_id?: string;
  event_type: string;
  source_colony?: string;
  payload?: Record<string, unknown>;
  timestamp?: string;
  received_at?: string;
}

interface HiveEventLogProps {
  /** External events array (e.g. from a parent component or WebSocket handler). */
  events?: HiveEvent[];
  /** If provided, poll this URL for new events and merge with `events`. */
  pollUrl?: string;
  pollIntervalMs?: number;
  maxItems?: number;
  className?: string;
}

const EVENT_COLORS: Record<string, string> = {
  constitution_update: '#818cf8',
  agent_migrated: '#34d399',
  soul_transfer: '#f59e0b',
  task_dispatch: '#60a5fa',
  health_check: '#94a3b8',
};

function eventColor(type: string): string {
  return EVENT_COLORS[type] ?? '#e2e8f0';
}

function shortTime(ts?: string): string {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleTimeString();
  } catch {
    return ts;
  }
}

export default function HiveEventLog({
  events: externalEvents = [],
  pollUrl,
  pollIntervalMs = 10_000,
  maxItems = 50,
  className = '',
}: HiveEventLogProps) {
  const [polledEvents, setPolledEvents] = useState<HiveEvent[]>([]);
  const [pollError, setPollError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pollUrl) return;
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(pollUrl!, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        const items: HiveEvent[] = Array.isArray(json)
          ? json
          : Array.isArray(json?.events)
          ? json.events
          : [];
        setPolledEvents(items);
        setPollError(null);
      } catch (err) {
        if (!cancelled) {
          setPollError(err instanceof Error ? err.message : 'poll error');
        }
      }
    }

    poll();
    const id = setInterval(poll, pollIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pollUrl, pollIntervalMs]);

  const allEvents = [...polledEvents, ...externalEvents]
    .sort((a, b) => {
      const ta = a.timestamp ?? a.received_at ?? '';
      const tb = b.timestamp ?? b.received_at ?? '';
      return ta < tb ? -1 : ta > tb ? 1 : 0;
    })
    .slice(-maxItems);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allEvents.length]);

  return (
    <section
      className={className}
      aria-label="Hive event log"
      style={{
        background: '#0f1117',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        fontFamily: 'ui-monospace, monospace',
        fontSize: '12px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '200px',
        maxHeight: '400px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        <span aria-hidden style={{ fontSize: '14px' }}>⬡</span>
        <strong style={{ color: '#e2e8f0', fontSize: '12px', letterSpacing: '0.05em' }}>
          HIVE EVENT LOG
        </strong>
        <span
          style={{
            marginLeft: 'auto',
            color: '#475569',
            fontSize: '10px',
          }}
        >
          {allEvents.length}/{maxItems}
        </span>
        {pollError && (
          <span role="alert" style={{ color: '#ef4444', fontSize: '10px' }}>
            poll: {pollError}
          </span>
        )}
      </header>

      {/* Event list */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Incoming hive events"
        style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}
      >
        {allEvents.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#334155',
              padding: '24px',
              textAlign: 'center',
            }}
          >
            <span aria-hidden style={{ fontSize: '24px', marginBottom: '8px' }}>⬡</span>
            <p style={{ margin: 0 }}>No events yet.</p>
            <p style={{ margin: '4px 0 0', fontSize: '10px' }}>
              Events appear here as the hive dispatches them.
            </p>
          </div>
        ) : (
          allEvents.map((ev, i) => (
            <div
              key={ev.event_id ?? `${ev.event_type}-${i}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '90px 1fr',
                gap: '4px 12px',
                padding: '6px 14px',
                borderBottom: '1px solid #0f172a',
                alignItems: 'start',
              }}
            >
              <span
                style={{
                  color: eventColor(ev.event_type),
                  fontWeight: 600,
                  fontSize: '10px',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  paddingTop: '1px',
                }}
              >
                {ev.event_type.replace(/_/g, '·')}
              </span>
              <div>
                {ev.source_colony && (
                  <span style={{ color: '#64748b', fontSize: '10px' }}>
                    from <code style={{ color: '#94a3b8' }}>{ev.source_colony}</code>
                    {ev.timestamp || ev.received_at
                      ? ` · ${shortTime(ev.timestamp ?? ev.received_at)}`
                      : ''}
                  </span>
                )}
                {ev.payload && Object.keys(ev.payload).length > 0 && (
                  <details style={{ marginTop: '2px' }}>
                    <summary style={{ color: '#475569', cursor: 'pointer', fontSize: '10px' }}>
                      payload
                    </summary>
                    <pre
                      style={{
                        margin: '4px 0 0',
                        color: '#64748b',
                        fontSize: '10px',
                        overflowX: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                      }}
                    >
                      {JSON.stringify(ev.payload, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </section>
  );
}
