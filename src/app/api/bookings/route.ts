import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'
import { z } from 'zod'
import { getAvailableSlots } from '@/services/availability'

const createBookingSchema = z.object({
  serviceId: z.string().uuid('Invalid service ID'),
  slotStart: z.string().datetime('Invalid date format'),
})

// GET /api/bookings - List bookings with pagination
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // Build where clause based on user role
    const where: any = {}
    if (user.role === 'BUSINESS') {
      where.businessId = user.id
    } else {
      where.consumerId = user.id
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          service: {
            select: {
              id: true,
              name: true,
              duration: true,
              price: true,
            },
          },
          consumer: {
            select: {
              id: true,
              email: true,
            },
          },
          business: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: {
          slotStart: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ])

    return NextResponse.json(
      {
        bookings,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/bookings - Create a booking (CONSUMER only)
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'CONSUMER') {
      return NextResponse.json(
        { error: 'Only consumers can create bookings' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { serviceId, slotStart } = createBookingSchema.parse(body)

    const slotStartDate = new Date(slotStart)

    // Get the service to know its duration and business
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    })

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      )
    }

    // Calculate slot end time
    const slotEndDate = new Date(slotStartDate)
    slotEndDate.setMinutes(slotEndDate.getMinutes() + service.duration)

    // Use a transaction to prevent double-booking
    const booking = await prisma.$transaction(async (tx) => {
      // Check for overlapping bookings
      const overlappingBooking = await tx.booking.findFirst({
        where: {
          businessId: service.businessId,
          status: 'CONFIRMED',
          OR: [
            {
              // New booking starts during existing booking
              AND: [
                { slotStart: { lte: slotStartDate } },
                { slotEnd: { gt: slotStartDate } },
              ],
            },
            {
              // New booking ends during existing booking
              AND: [
                { slotStart: { lt: slotEndDate } },
                { slotEnd: { gte: slotEndDate } },
              ],
            },
            {
              // New booking completely contains existing booking
              AND: [
                { slotStart: { gte: slotStartDate } },
                { slotEnd: { lte: slotEndDate } },
              ],
            },
          ],
        },
      })

      if (overlappingBooking) {
        throw new Error('Time slot is already booked')
      }

      // Verify the slot is available using the availability engine
      const availableSlots = await getAvailableSlots(
        service.businessId,
        serviceId,
        slotStartDate
      )

      const isSlotAvailable = availableSlots.some(
        (slot) =>
          slot.start.getTime() === slotStartDate.getTime() &&
          slot.end.getTime() === slotEndDate.getTime()
      )

      if (!isSlotAvailable) {
        throw new Error('Time slot is not available')
      }

      // Create the booking
      return await tx.booking.create({
        data: {
          serviceId,
          consumerId: user.id,
          businessId: service.businessId,
          slotStart: slotStartDate,
          slotEnd: slotEndDate,
          status: 'CONFIRMED',
        },
        include: {
          service: {
            select: {
              id: true,
              name: true,
              duration: true,
              price: true,
            },
          },
          business: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      })
    })

    return NextResponse.json({ booking }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      if (error.message.includes('already booked') || error.message.includes('not available')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        )
      }
    }

    console.error('Error creating booking:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
