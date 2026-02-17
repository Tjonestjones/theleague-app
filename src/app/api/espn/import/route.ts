import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

const ESPN_SERVICE_URL = process.env.ESPN_SERVICE_URL || 'http://127.0.0.1:8001'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const clerkUser = await currentUser()
    if (!clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { clerkId: clerkUser.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { league_id, year, espn_s2, swid } = body

    if (!league_id || !year || !espn_s2 || !swid) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Call Python service to import data
    const response = await fetch(`${ESPN_SERVICE_URL}/api/espn/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        league_id: parseInt(league_id),
        year: parseInt(year),
        espn_s2,
        swid,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(
        { error: error.detail || 'ESPN import failed' },
        { status: response.status }
      )
    }

    const espnData = await response.json()

    // TODO: Save to database
    // For now, just return the data
    // In Phase 2, we'll parse and save to Prisma

    return NextResponse.json({
      success: true,
      data: espnData,
      message: 'Import successful (data not yet saved to database)',
    })
    
  } catch (error) {
    console.error('ESPN import error:', error)
    return NextResponse.json(
      { error: 'Failed to import ESPN league data' },
      { status: 500 }
    )
  }
}
