import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';

function soulHash(): string {
  try {
    const p = path.join(process.cwd(), 'soul.md');
    return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 16);
  } catch { return 'none'; }
}

export async function GET() {
  return NextResponse.json({
    colony_id: 'aether', colony_name: 'Aether', role: 'colony',
    archetype: 'commerce', layer: 7, entity: 'CHILD (Commerce Expression)',
    guilds: ['commerce', 'licensing', 'revenue'],
    hive: 'sovereign-hive', queen: 'https://github.com/TehutiRaEl/-sovereign-hive-meta',
    version: '1.0.0', soul_md_hash: soulHash(), port: 3000,
  });
}
