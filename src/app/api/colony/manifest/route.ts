import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json({
    colony_id: 'aether',
    endpoints: ['/api/colony/health', '/api/colony/info', '/api/colony/manifest',
                '/api/colony/events', '/api/colony/agents', '/api/license/verify',
                '/api/license/issue', '/api/revenue/split'],
    capabilities: ['license_enforcement', 'revenue_split', 'stripe_connect',
                   'jwt_licensing', 'kill_switch', 'soul_ledger'],
    version: '1.0.0',
  });
}
