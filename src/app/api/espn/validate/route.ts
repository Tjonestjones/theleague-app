import { NextRequest, NextResponse } from 'next/server'

const ESPN_SERVICE_URL = process.env.ESPN_SERVICE_URL || 'http://127.0.0.1:8001'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    const { league_id, year, espn_s2, swid } = body
    
    if (!league_id || !year) {
      return NextResponse.json(
        { error: 'Missing required fields: league_id, year' },
        { status: 400 }
      )
    }

    // Build payload — cookies are optional (only needed for private leagues)
    const payload: Record<string, unknown> = {
      league_id: parseInt(league_id),
      year: parseInt(year),
    }
    if (espn_s2) payload.espn_s2 = espn_s2
    if (swid) payload.swid = swid

    // Call Python service
    const response = await fetch(`${ESPN_SERVICE_URL}/api/espn/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(
        { error: error.detail || 'ESPN validation failed' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('ESPN validation error:', error)
    return NextResponse.json(
      { error: 'Failed to validate ESPN credentials' },
      { status: 500 }
    )
  }
}
