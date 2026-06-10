import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { sendWelcomeEmail } from '@/lib/email'

const LAS_URL = process.env.NEXT_PUBLIC_LAS_URL

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const db = getDb()
    const id = `wl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

    try {
      db.prepare('INSERT INTO waitlist (id, email, name) VALUES (?, ?, ?)')
        .run(id, email, name || email.split('@')[0])
    } catch (e: any) {
      if (e.message.includes('UNIQUE constraint failed')) {
        return NextResponse.json({ error: 'Email already on waitlist' }, { status: 409 })
      }
      throw e
    }

    // Sync to LAS if available
    if (LAS_URL) {
      try {
        await fetch(`${LAS_URL}/api/sync/waitlist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.LAS_API_KEY || '' },
          body: JSON.stringify({ id, email, name, timestamp: Date.now() }),
        })
        db.prepare('UPDATE waitlist SET synced_to_las = 1 WHERE id = ?').run(id)
      } catch (syncError) {
        console.error('LAS sync failed:', syncError)
        // Don't fail the user request if sync fails
      }
    }

    await sendWelcomeEmail(email, name || email.split('@')[0])

    return NextResponse.json({ 
      success: true, 
      message: 'Welcome! You have been added to the waitlist.' 
    })
  } catch (error) {
    console.error('Waitlist error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
