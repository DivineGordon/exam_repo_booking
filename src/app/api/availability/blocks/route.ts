import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'
import { z } from 'zod'

const blockSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
  endTime: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
})

// GET /api/availability/blocks - Get blocked hours for a business
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

    const blocks = await prisma.blockedTime.findMany({
      where: { businessId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    })

    return NextResponse.json({ blocks }, { status: 200 })
  } catch (error) {
    console.error('Error fetching blocked hours:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/availability/blocks - Create a blocked time range (BUSINESS only)
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'BUSINESS') {
      return NextResponse.json(
        { error: 'Only businesses can manage blocked hours' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { dayOfWeek, startTime, endTime } = blockSchema.parse(body)

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

    const block = await prisma.blockedTime.create({
      data: {
        businessId: user.id,
        dayOfWeek,
        startTime,
        endTime,
      },
    })

    return NextResponse.json({ block }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating blocked time:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/availability/blocks - Delete a blocked time range (BUSINESS only)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromSession()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'BUSINESS') {
      return NextResponse.json(
        { error: 'Only businesses can manage blocked hours' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const id = body?.id as string | undefined

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    // Ensure the block belongs to this business
    const existing = await prisma.blockedTime.findFirst({
      where: {
        id,
        businessId: user.id,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Blocked time not found' },
        { status: 404 }
      )
    }

    await prisma.blockedTime.delete({
      where: { id },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error deleting blocked time:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

