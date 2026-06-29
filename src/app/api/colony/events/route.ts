import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>).event_type !== 'string' ||
    (body as Record<string, unknown>).event_type === ''
  ) {
    return NextResponse.json({ error: 'event_type is required' }, { status: 400 });
  }

  return NextResponse.json({
    event_id: randomUUID(), status: 'received', colony_id: 'aether',
  });
}
