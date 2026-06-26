import { NextRequest, NextResponse } from 'next/server';

const identity = {
  colony_id: 'aether',
  colony_name: 'Aether',
  role: 'revenue',
  description: 'Revenue engine and Web3 integration colony',
  hive: 'sovereign-hive',
  queen: 'https://github.com/tehutirael/sovereign-hive-meta',
  repo: 'https://github.com/tehutirael/aether',
  guilds: ['defi', 'nft', 'payments'],
  agents: ['revenue-agent', 'defi-agent', 'web3-bridge'],
  capabilities: ['smart-contracts', 'defi-integration', 'payment-processing'],
  constitution_version: '1.0.0',
};

const start = Date.now();
const events: Array<Record<string, unknown>> = [];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const route = path.join('/');

  switch (route) {
    case 'health':
      return NextResponse.json({
        colony_id: identity.colony_id,
        status: 'healthy',
        uptime_seconds: Math.floor((Date.now() - start) / 1000),
        timestamp: new Date().toISOString(),
      });

    case 'agents':
      return NextResponse.json({
        colony_id: identity.colony_id,
        agents: identity.agents.map((name) => ({
          id: name,
          status: 'active',
          capabilities: identity.capabilities,
        })),
      });

    case 'manifest':
      return NextResponse.json({
        ...identity,
        endpoints: {
          info: '/api/colony',
          health: '/api/colony/health',
          agents: '/api/colony/agents',
          events: '/api/colony/events',
          manifest: '/api/colony/manifest',
        },
      });

    default:
      return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const route = path.join('/');

  if (route === 'events') {
    const body = await req.json();
    const evt = { ts: new Date().toISOString(), ...body };
    events.push(evt);
    if (events.length > 100) events.shift();
    return NextResponse.json({ status: 'accepted', event_id: `evt-${Date.now()}` });
  }

  return NextResponse.json({ error: 'not found' }, { status: 404 });
}
