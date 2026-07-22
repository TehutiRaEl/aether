import { NextRequest, NextResponse } from 'next/server';
import { randomUUID, createHmac, timingSafeEqual } from 'crypto';

// Same HMAC-over-raw-body pattern as every other colony's /colony/events
// (automatisch's packages/backend/src/routes/colony.js, LocalAGI's
// pkg/colony/colony.go, colony_sdk.py's _verify_hive_signature) — permissive
// when HIVE_JWT_SECRET is unset (local dev), fail-closed once it's set.
const HIVE_SECRET = process.env.HIVE_JWT_SECRET || '';

function verifyHiveSignature(req: NextRequest, rawBody: string): boolean {
  if (!HIVE_SECRET) return true; // permissive — no secret configured
  const sig = req.headers.get('x-hive-signature') || '';
  if (!sig.startsWith('sha256=')) return false;
  const expected = 'sha256=' + createHmac('sha256', HIVE_SECRET).update(rawBody).digest('hex');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return false;
  try {
    return timingSafeEqual(sigBuf, expectedBuf);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!verifyHiveSignature(req, rawBody)) {
    return NextResponse.json({ error: 'invalid or missing X-Hive-Signature' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
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
