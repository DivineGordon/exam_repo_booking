import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'
import { z } from 'zod'

const availabilitySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
})

// GET /api/availability - Get availability for a business
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      )
    }

    const availability = await prisma.availability.findMany({
      where: { businessId },
      orderBy: { dayOfWeek: 'asc' },
    })

    return NextResponse.json({ availability }, { status: 200 })
  } catch (error) {
    console.error('Error fetching availability:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/availability - Create or update availability (BUSINESS only)
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'BUSINESS') {
      return NextResponse.json(
        { error: 'Only businesses can manage availability' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { dayOfWeek, startTime, endTime } = availabilitySchema.parse(body)

    // Validate that startTime < endTime
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin

    if (startMinutes >= endMinutes) {
      return NextResponse.json(
        { error: 'Start time must be before end time' },
        { status: 400 }
      )
    }

    const availability = await prisma.availability.upsert({
      where: {
        businessId_dayOfWeek: {
          businessId: user.id,
          dayOfWeek,
        },
      },
      update: {
        startTime,
        endTime,
      },
      create: {
        businessId: user.id,
        dayOfWeek,
        startTime,
        endTime,
      },
    })

    return NextResponse.json({ availability }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating/updating availability:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
