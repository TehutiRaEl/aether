import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
export async function POST() {
  return NextResponse.json({
    event_id: randomUUID(), status: 'received', colony_id: 'aether',
  });
}
