import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json([
    { agent_id: 'license-authority', name: 'License Authority', status: 'active', role: 'commerce' },
  ]);
}
