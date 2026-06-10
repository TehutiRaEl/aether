import { NextRequest, NextResponse } from 'next/server'

const LAS_URL = process.env.NEXT_PUBLIC_LAS_URL

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!LAS_URL) {
      return NextResponse.json({ 
        valid: false, 
        error: 'LAS not configured',
        action: 'RETRY_LATER'
      }, { status: 503 })
    }

    const res = await fetch(`${LAS_URL}/api/license-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error: any) {
    return NextResponse.json({ 
      valid: false, 
      error: 'Proxy error: ' + error.message,
      action: 'RETRY_LATER'
    }, { status: 502 })
  }
}
