import { NextResponse } from 'next/server';
const start = Date.now();
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    colony_id: 'aether',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor((Date.now() - start) / 1000),
  });
}
